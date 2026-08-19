import { searchMentions } from '../src/services/searchService';
import { pool } from '../src/db';

jest.mock('../src/db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('searchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns paginated data with stable sort', async () => {
    const mockRows = [
      { id: 1, published_at: new Date('2026-08-10T08:00:00Z') },
      { id: 2, published_at: new Date('2026-08-09T08:00:00Z') },
    ];

    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })
      .mockResolvedValueOnce({ rows: mockRows });

    const result = await searchMentions({ page: 1, limit: 20 });

    expect(result.data).toEqual(mockRows);
    expect(result.total).toBe(2);
    expect(result.totalPages).toBe(1);
  });

  it('builds correct SQL with filters', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [] });

    await searchMentions({
      q: 'ringgit',
      source: 'the star',
      from: '2026-08-10',
      to: '2026-08-12',
      page: 1,
      limit: 10,
    });

    const calls = (pool.query as jest.Mock).mock.calls;
    const countSql = calls[0][0];
    const dataSql = calls[1][0];

    expect(countSql).toContain('to_tsvector');
    expect(countSql).toContain('plainto_tsquery');
    expect(countSql).toContain('normalized_source');
    expect(dataSql).toContain('ORDER BY published_at DESC NULLS LAST, id ASC');
  });

  it('applies LIMIT and OFFSET for pagination', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '100' }] })
      .mockResolvedValueOnce({ rows: [] });

    await searchMentions({ page: 3, limit: 20 });

    const calls = (pool.query as jest.Mock).mock.calls;
    const dataSql = calls[1][0];
    const dataParams = calls[1][1];

    expect(dataSql).toContain('LIMIT');
    expect(dataSql).toContain('OFFSET');
    expect(dataParams[dataParams.length - 2]).toBe(20);
    expect(dataParams[dataParams.length - 1]).toBe(40);
  });
});
