import { pool } from '../db';

export interface SearchQuery {
  q?: string;
  source?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

export interface MentionRow {
  id: number;
  external_id: string | null;
  source: string;
  normalized_source: string;
  title: string | null;
  content: string | null;
  url: string;
  author: string | null;
  published_at: Date | null;
  engagement: number | null;
  created_at: Date;
  updated_at: Date;
}

export async function searchMentions(query: SearchQuery): Promise<{ data: MentionRow[]; total: number; totalPages: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (query.q && query.q.trim() !== '') {
    conditions.push(`to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '')) @@ plainto_tsquery('english', $${idx})`);
    params.push(query.q.trim());
    idx += 1;
  }

  if (query.source && query.source.trim() !== '') {
    conditions.push(`normalized_source = $${idx}`);
    params.push(query.source.trim().toLowerCase());
    idx += 1;
  }

  if (query.from) {
    conditions.push(`published_at >= $${idx}`);
    params.push(query.from);
    idx += 1;
  }

  if (query.to) {
    conditions.push(`published_at <= $${idx}`);
    params.push(query.to);
    idx += 1;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(`SELECT COUNT(*) as count FROM mentions ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  const offset = (query.page - 1) * query.limit;
  const dataResult = await pool.query(
    `SELECT * FROM mentions ${whereClause} ORDER BY published_at DESC NULLS LAST, id ASC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, query.limit, offset]
  );

  const totalPages = Math.max(1, Math.ceil(total / query.limit));

  return {
    data: dataResult.rows,
    total,
    totalPages,
  };
}
