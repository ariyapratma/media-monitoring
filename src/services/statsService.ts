import { pool } from '../db';

export interface StatRow {
  label: string;
  count: number;
}

export async function getStats(groupBy: string): Promise<StatRow[]> {
  if (groupBy === 'source') {
    const result = await pool.query(
      `SELECT normalized_source as label, COUNT(*) as count FROM mentions GROUP BY normalized_source ORDER BY count DESC`
    );
    return result.rows.map((row) => ({ label: row.label, count: parseInt(row.count, 10) }));
  }

  if (groupBy === 'day') {
    const result = await pool.query(
      `SELECT TO_CHAR(published_at, 'YYYY-MM-DD') as label, COUNT(*) as count FROM mentions WHERE published_at IS NOT NULL GROUP BY TO_CHAR(published_at, 'YYYY-MM-DD') ORDER BY label DESC`
    );
    return result.rows.map((row) => ({ label: row.label, count: parseInt(row.count, 10) }));
  }

  return [];
}
