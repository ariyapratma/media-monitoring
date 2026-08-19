import { normalizeMention, bulkIngest } from '../src/services/ingestionService';
import { pool } from '../src/db';

jest.mock('../src/db', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn(),
  },
}));

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

describe('ingestionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    mockClient.query.mockClear();
    mockClient.release.mockClear();
  });

  describe('normalizeMention', () => {
    it('normalizes a complete record', () => {
      const raw = {
        external_id: 'str-1',
        source: 'The Star',
        title: '<p>Title</p>',
        content: '<p>Content</p>',
        url: 'https://example.com/1',
        author: 'Author',
        published_at: '2026-08-10T08:15:00Z',
        engagement: '1,204',
      };

      const result = normalizeMention(raw);
      expect(result.url).toBe('https://example.com/1');
      expect(result.source).toBe('The Star');
      expect(result.normalized_source).toBe('the star');
      expect(result.title).toBe('Title');
      expect(result.content).toBe('Content');
      expect(result.author).toBe('Author');
      expect(result.published_at).toEqual(new Date('2026-08-10T08:15:00Z'));
      expect(result.engagement).toBe(1204);
    });

    it('throws when url is missing', () => {
      expect(() => normalizeMention({ source: 'The Star', url: '' })).toThrow('URL is required');
      expect(() => normalizeMention({ source: 'The Star', url: null as any })).toThrow('URL is required');
      expect(() => normalizeMention({ source: 'The Star' })).toThrow('URL is required');
    });

    it('throws when source is empty', () => {
      expect(() => normalizeMention({ source: '   ', url: 'https://example.com/1' })).toThrow('Source is required');
    });

    it('handles null title and content', () => {
      const result = normalizeMention({ source: 'The Star', url: 'https://example.com/1', title: null, content: null });
      expect(result.title).toBeNull();
      expect(result.content).toBeNull();
    });

    it('parses unix timestamp and DD/MM/YYYY', () => {
      const result1 = normalizeMention({ source: 'NST', url: 'https://example.com/1', published_at: 1786435200 });
      expect(result1.published_at).toEqual(new Date('2026-08-11T08:00:00Z'));

      const result2 = normalizeMention({ source: 'NST', url: 'https://example.com/2', published_at: '11/08/2026' });
      expect(result2.published_at).toEqual(new Date('2026-08-11T00:00:00Z'));
    });
  });

  describe('bulkIngest', () => {
    it('inserts records and skips duplicates', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rowCount: 0 })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 });

      const result = await bulkIngest([
        { source: 'A', url: 'https://a.com/1' },
        { source: 'B', url: 'https://a.com/1' },
        { source: 'C', url: 'https://c.com/1' },
      ]);

      expect(result.inserted).toBe(2);
      expect(result.skipped).toBe(1);
    });
  });
});
