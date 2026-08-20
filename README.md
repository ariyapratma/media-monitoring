# Media Monitoring Backend — People & Pixel

A Node.js + TypeScript backend service for a media monitoring platform that consumes media event data (mentions) from various sources, normalizes them, and exposes APIs for search and statistics.

## Technology Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (accessed via `pg` — no ORM)
- **Migrations**: Raw SQL files that are committed
- **Testing**: Jest

## Project Structure

```
people-pixel-media-monitoring/
├── src/
│   ├── app.ts                 # Express configuration
│   ├── server.ts              # Entry point & listener
│   ├── config.ts              # Environment variables
│   ├── db.ts                  # PostgreSQL connection pool
│   ├── routes/
│   │   ├── internal.ts        # POST /internal/mentions/bulk
│   │   ├── mentions.ts        # GET /mentions
│   │   └── stats.ts           # GET /mentions/stats
│   ├── controllers/
│   │   ├── internalController.ts
│   │   ├── mentionsController.ts
│   │   └── statsController.ts
│   ├── services/
│   │   ├── ingestionService.ts
│   │   ├── searchService.ts
│   │   └── statsService.ts
│   └── utils/
│       ├── normalizer.ts      # Date parsing, HTML stripping, number cleaning
│       └── sanitizer.ts       # XSS/HTML protection
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

## How to Run

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 12
- npm

### Steps

```bash
# 1. Enter the project folder
cd people-pixel-media-monitoring

# 2. Install dependencies
npm install

# 3. Make sure the PostgreSQL database is created
#    Database: media_monitoring
#    User: postgres
#    Password: admin

# 4. Run the migration to create the table
psql -U postgres -d media_monitoring -f migrations/001_create_mentions_table.sql

# 5. Run the application
npm run dev
```

The server will run on `http://localhost:3005`.

### Running Tests

```bash
npm test
```

### Seeding Sample Data

```bash
# With the server running, seed the database with seed_mentions.json
npm run seed
```

This posts `seed_mentions.json` to `POST /internal/mentions/bulk`. The endpoint is idempotent, so re-running it will skip duplicates instead of creating them.

## Quick Links

When the server is running on http://localhost:3005:

- **Bulk Ingest**: POST http://localhost:3005/internal/mentions/bulk
- **Search**: GET http://localhost:3005/mentions?q=ringgit
- **Stats by Source**: GET http://localhost:3005/mentions/stats?group_by=source
- **Stats by Day**: GET http://localhost:3005/mentions/stats?group_by=day

## API Endpoints

### 1. Bulk Ingest

**`POST /internal/mentions/bulk`**

Accepts an array of mention JSON objects. Each record is normalized and saved. Duplicates (based on `url`) are skipped.

Request body (example):
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

- **400 Bad Request** — if the request body is not an array, or if a record does not have a `url`.

### 2. Search

**`GET /mentions`**

Query parameters:
- `q` (optional) — full-text search on `title` and `content`
- `source` (optional) — filter by `normalized_source`
- `from` (optional) — lower bound for `published_at` (ISO format)
- `to` (optional) — upper bound for `published_at` (ISO format)
- `page` (default: 1)
- `limit` (default: 20, max: 100)

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

Stable sort order: `published_at DESC NULLS LAST, id ASC`.

### 3. Stats

**`GET /mentions/stats?group_by=source`**

Response:
```json
[
  { "label": "the star", "count": 5 },
  { "label": "new straits times", "count": 3 }
]
```

**`GET /mentions/stats?group_by=day`**

Response:
```json
[
  { "label": "2026-08-10", "count": 3 },
  { "label": "2026-08-11", "count": 1 }
]
```

- **400 Bad Request** — if `group_by` is invalid (only `source` and `day` are allowed).

## Database Schema

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

### Design Rationale

- **`url` as unique key**: URL is the canonical identifier for a single piece of media content. With the `UNIQUE` constraint and `ON CONFLICT DO NOTHING`, the system guarantees idempotency. A failed pipeline that is retried will not produce duplicates.
- **`normalized_source`**: Stored in `LOWER(TRIM())` format so filtering by source is consistent, even when raw data has different casing (`"thestar"`, `"TWITTER"`, `"malaysiakini "`).
- **`published_at TIMESTAMPTZ`**: Handles accurate date ranges and supports time zones. Data without a date is stored as `NULL`.
- **`engagement INTEGER`**: Removes commas and converts to integer so statistical calculations are valid.
- **Indexes**:
  - `idx_mentions_published_at` — speeds up date range filtering and sorting.
  - `idx_mentions_normalized_source` — speeds up filtering by source.
  - GIN index on `to_tsvector('english', title || ' ' || content)` — speeds up full-text search.

## Duplicate Detection Rules

> **Decision**: A mention is considered a duplicate if its `url` already exists in the database.

**Reasons**:
- In a media monitoring platform, URL is the canonical identifier for a single content item.
- The `seed_mentions.json` data shows consistent URLs for the same article.
- `ON CONFLICT (url) DO NOTHING` guarantees idempotency: posting the same file twice will not produce duplicate rows.
- If the pipeline receives a record without a `url`, the system rejects the insert (returns 400) because it cannot guarantee idempotency.

## Data Normalization

Each record goes through a normalization stage before being saved:

1. **HTML stripping**: All HTML tags are removed from `content` and `title` (e.g., `<p>`, `<div>`, `<script>`).
2. **Source normalization**: `LOWER(TRIM(source))` → stored in `normalized_source`. The original value is kept in `source`.
3. **Date parsing**: Supports the following formats:
   - ISO 8601 (`2026-08-10T08:15:00Z`)
   - `YYYY-MM-DD HH:MM:SS`
   - `DD/MM/YYYY`
   - Unix timestamp (10-digit number)
   - If null/invalid → stored as `NULL`
4. **Engagement**: Commas are removed and converted to `INTEGER`. If null or non-numeric → stored as `NULL`.

## Assumptions & Trade-offs

- **Assumption**: URL is a stable identifier for deduplication. If the pipeline receives a record without a URL, it is considered invalid for this bulk ingest.
- **Trade-off**: Using raw SQL (`pg`) instead of an ORM. More verbose, but transparent and meets the requirement of seeing the designed table.
- **Trade-off**: Full-text search with PostgreSQL GIN index, not Elasticsearch. Sufficient for small datasets, but not scalable to millions of records.
- **Trade-off**: Source normalization only uses `LOWER(TRIM())`, without manual spelling variation mapping. If "thestar" → "The Star" mapping is needed later, a lookup table can be added.

