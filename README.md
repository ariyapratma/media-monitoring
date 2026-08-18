# Media Monitoring Backend — People & Pixel

Backend service Node.js + TypeScript untuk platform pemantauan media yang mengonsumsi data acara media (mentions) dari berbagai sumber, menormalkannya, dan mengekspos API untuk pencarian dan statistik.

## Tumpukan Teknologi

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (diakses via `pg` — tanpa ORM)
- **Migrasi**: File SQL mentah yang di-commit
- **Testing**: Jest

## Struktur Proyek

```
people-pixel-media-monitoring/
├── src/
│   ├── app.ts                 # Konfigurasi Express
│   ├── server.ts              # Entry point & listener
│   ├── config.ts              # Environment variables
│   ├── db.ts                  # PostgreSQL connection pool
│   ├── routes/
│   │   ├── internal.ts        # POST /internal/mentions/bulk
│   │   ├── mentions.ts        # GET /internal/mentions
│   │   └── stats.ts           # GET /internal/mentions/stats
│   ├── controllers/
│   │   ├── internalController.ts
│   │   ├── mentionsController.ts
│   │   └── statsController.ts
│   ├── services/
│   │   ├── ingestionService.ts
│   │   ├── searchService.ts
│   │   └── statsService.ts
│   └── utils/
│       ├── normalizer.ts      # Parsing tanggal, strip HTML, bersihkan angka
│       └── sanitizer.ts       # Proteksi XSS/HTML
├── migrations/
│   └── 001_create_mentions_table.sql
├── tests/
│   ├── normalizer.test.ts
│   ├── ingestion.test.ts
│   └── search.test.ts
├── .env.example
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Cara Menjalankan

### Prasyarat

- Node.js >= 18
- PostgreSQL >= 12
- npm atau yarn

### Langkah-langkah

```bash
# 1. Clone repository
git clone <repository-url>
cd people-pixel-media-monitoring

# 2. Install dependencies
npm install

# 3. Salin file environment
cp .env.example .env

# 4. Edit .env sesuai dengan kredensial PostgreSQL lokal
#    Pastikan database media_monitoring sudah dibuat

# 5. Jalankan migrasi
psql -U <username> -d media_monitoring -f migrations/001_create_mentions_table.sql

# 6. Build dan jalankan
npm run dev
```

Server akan berjalan di `http://localhost:3000`.

### Menjalankan Test

```bash
npm test
```

## Endpoint API

### 1. Bulk Ingest

**`POST /internal/mentions/bulk`**

Menerima array JSON mention. Setiap record dinormalisasi dan disimpan. Duplikat (berdasarkan `url`) dilewati.

Request body (contoh):
```json
[
  {
    "external_id": "str-99120",
    "source": "The Star",
    "title": "Ringgit strengthens",
    "content": "<p>The ringgit opened higher...</p>",
    "url": "https://www.thestar.com.my/business/2026/08/10/ringgit-strengthens",
    "author": "Aisyah Rahman",
    "published_at": "2026-08-10T08:15:00Z",
    "engagement": 412
  }
]
```

Response:
```json
{
  "inserted": 15,
  "skipped": 2
}
```

- **400 Bad Request** — jika request body bukan array, atau record tanpa `url`.

### 2. Search

**`GET /internal/mentions`**

Query parameters:
- `q` (opsional) — pencarian full-text pada `title` dan `content`
- `source` (opsional) — filter berdasarkan `normalized_source`
- `from` (opsional) — batas bawah `published_at` (format ISO)
- `to` (opsional) — batas atas `published_at` (format ISO)
- `page` (default: 1)
- `limit` (default: 20, maks: 100)

Response:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

Urutan pengurutan yang stabil: `published_at DESC NULLS LAST, id ASC`.

### 3. Stats

**`GET /internal/mentions/stats?group_by=source`**

Response:
```json
[
  { "label": "the star", "count": 5 },
  { "label": "new straits times", "count": 3 }
]
```

**`GET /internal/mentions/stats?group_by=day`**

Response:
```json
[
  { "label": "2026-08-10", "count": 3 },
  { "label": "2026-08-11", "count": 1 }
]
```

- **400 Bad Request** — jika `group_by` tidak valid (hanya `source` dan `day` yang diizinkan).

## Skema Database

```sql
CREATE TABLE IF NOT EXISTS mentions (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255),
  source TEXT NOT NULL,
  normalized_source TEXT NOT NULL,
  title TEXT,
  content TEXT,
  url TEXT NOT NULL UNIQUE,
  author TEXT,
  published_at TIMESTAMPTZ,
  engagement INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentions_published_at ON mentions(published_at);
CREATE INDEX IF NOT EXISTS idx_mentions_normalized_source ON mentions(normalized_source);
CREATE INDEX IF NOT EXISTS idx_mentions_content_title ON mentions USING GIN (to_tsvector('english', title || ' ' || content));
```

### Alasan Desain

- **`url` sebagai kunci unik**: URL adalah identifier kanonik untuk satu konten media. Dengan `UNIQUE` constraint dan `ON CONFLICT DO NOTHING`, sistem menjamin idempotenansi. Pipeline yang gagal dan di-retry tidak akan menghasilkan duplikat.
- **`normalized_source`**: Disimpan dalam format `LOWER(TRIM())` agar filtering berdasarkan sumber konsisten, meskipun data mentah memiliki casing berbeda (`"thestar"`, `"TWITTER"`, `"malaysiakini "`).
- **`published_at TIMESTAMPTZ`**: Menangani rentang tanggal yang akurat dan mendukung zona waktu. Data tanpa tanggal disimpan sebagai `NULL`.
- **`engagement INTEGER`**: Menghilangkan koma dan mengonversi ke bilangan bulat agar perhitungan statistik valid.
- **Index**:
  - `idx_mentions_published_at` — mempercepat filter rentang tanggal dan pengurutan.
  - `idx_mentions_normalized_source` — mempercepat filter berdasarkan sumber.
  - GIN index pada `to_tsvector('english', title || ' ' || content)` — mempercepat pencarian full-text.

## Aturan Deteksi Duplikat

> **Keputusan**: Sebuah mention dianggap duplikat jika `url`-nya sudah ada di database.

**Alasan**:
- Dalam platform pemantauan media, URL adalah identifier kanonik untuk satu konten.
- Data `seed_mentions.json` menunjukkan URL yang konsisten untuk artikel yang sama.
- `ON CONFLICT (url) DO NOTHING` menjamin idempotenansi: posting file yang sama dua kali tidak menghasilkan baris ganda.
- Jika pipeline menerima record tanpa `url`, sistem menolak insert-nya (return 400) karena tidak bisa menjamin idempotenansi.

## Normalisasi Data

Setiap record melewati tahap normalisasi sebelum disimpan:

1. **HTML stripping**: Semua tag HTML dihapus dari `content` dan `title` (misal `<p>`, `<div>`, `<script>`).
2. **Source normalization**: `LOWER(TRIM(source))` → disimpan di `normalized_source`. Nilai asli tetap disimpan di `source`.
3. **Date parsing**: Mendukung format berikut:
   - ISO 8601 (`2026-08-10T08:15:00Z`)
   - `YYYY-MM-DD HH:MM:SS`
   - `DD/MM/YYYY`
   - Unix timestamp (angka 10 digit)
   - Jika null/tidak valid → disimpan `NULL`
4. **Engagement**: Koma dihapus, dikonversi ke `INTEGER`. Jika null atau non-numeric → disimpan `NULL`.

## Asumsi & Trade-off

- **Asumsi**: URL adalah identifier yang stabil untuk duplikasi. Jika pipeline menerima record tanpa URL, dianggap invalid untuk bulk ingest ini.
- **Trade-off**: Menggunakan raw SQL (`pg`) alih-alih ORM. Lebih verbose, tetapi transparan dan sesuai requirement "lihat tabel yang didesain".
- **Trade-off**: Full-text search dengan GIN index PostgreSQL, bukan Elasticsearch. Cukup untuk dataset kecil, tapi tidak scalable ke jutaan record.
- **Trade-off**: Normalisasi source hanya `LOWER(TRIM())`, tanpa mapping manual variasi ejaan. Jika nanti butuh mapping "thestar" → "The Star", bisa ditambahkan tabel lookup.

## Estimasi Waktu

| Fase | Waktu |
|------|-------|
| Setup proyek & konfigurasi | ~1 jam |
| Skema & normalisasi | ~1.5 jam |
| Endpoint ingest + idempoten | ~1.5 jam |
| Endpoint search + stats | ~2 jam |
| Testing | ~1.5 jam |
| README & polishing | ~1 jam |
| **Total** | **~8.5 jam dalam 1–2 sesi** |

## Dengan Satu Minggu Lagi

1. Menambahkan validasi schema input dengan `zod`.
2. Menambahkan soft delete untuk audit trail.
3. Menambahkan endpoint `/health` dan metrics.
4. Menambahkan rate limiting pada endpoint publik.
5. Menambahkan Docker Compose untuk setup database lokal yang mudah.
6. Migrasi ke connection pooling yang lebih robust.
