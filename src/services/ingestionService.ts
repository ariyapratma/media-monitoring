import { pool } from '../db';
import { stripHtml, parseDate, parseEngagement, normalizeSource } from '../utils/normalizer';

export interface RawMention {
  external_id?: string | null;
  source: string;
  title?: string | null;
  content?: string | null;
  url?: string | null;
  author?: string | null;
  published_at?: string | number | null;
  engagement?: unknown;
}

export interface NormalizedMention {
  external_id: string | null;
  source: string;
  normalized_source: string;
  title: string | null;
  content: string | null;
  url: string;
  author: string | null;
  published_at: Date | null;
  engagement: number | null;
}

export function normalizeMention(raw: RawMention): NormalizedMention {
  if (!raw.url || raw.url.trim() === '') {
    throw new Error('URL is required for each mention');
  }

  const source = String(raw.source || '').trim();
  if (!source) {
    throw new Error('Source is required for each mention');
  }

  const normalizedSource = normalizeSource(source);
  const content = raw.content ? stripHtml(String(raw.content)) : null;
  const title = raw.title ? stripHtml(String(raw.title)) : null;
  const publishedAt = parseDate(raw.published_at ?? null);
  const engagement = parseEngagement(raw.engagement);
  const externalId = raw.external_id ? String(raw.external_id) : null;

  return {
    external_id: externalId,
    source,
    normalized_source: normalizedSource,
    title: title || null,
    content: content || null,
    url: raw.url.trim(),
    author: raw.author ? String(raw.author) : null,
    published_at: publishedAt,
    engagement,
  };
}

export async function bulkIngest(records: RawMention[]): Promise<{ inserted: number; skipped: number }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let inserted = 0;
    let skipped = 0;

    for (const raw of records) {
      try {
        const mention = normalizeMention(raw);
        const result = await client.query(
          `INSERT INTO mentions (external_id, source, normalized_source, title, content, url, author, published_at, engagement)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (url) DO NOTHING`,
          [
            mention.external_id,
            mention.source,
            mention.normalized_source,
            mention.title,
            mention.content,
            mention.url,
            mention.author,
            mention.published_at,
            mention.engagement,
          ]
        );
        if (result.rowCount && result.rowCount > 0) {
          inserted += 1;
        } else {
          skipped += 1;
        }
      } catch (err) {
        skipped += 1;
      }
    }

    await client.query('COMMIT');
    return { inserted, skipped };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getMentionById(id: number) {
  const result = await pool.query('SELECT * FROM mentions WHERE id = $1', [id]);
  return result.rows[0] || null;
}
