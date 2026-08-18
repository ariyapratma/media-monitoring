import { stripHtml, parseDate, parseEngagement, normalizeSource } from '../src/utils/normalizer';

describe('normalizer', () => {
  describe('stripHtml', () => {
    it('removes simple HTML tags', () => {
      expect(stripHtml('<p>Hello</p>')).toBe('Hello');
    });

    it('removes script tags safely', () => {
      const result = stripHtml('<p>Text</p><script>alert(1)</script>');
      expect(result).toBe('Text');
    });

    it('removes style tags', () => {
      const result = stripHtml('<div><style>body{} </style>Content</div>');
      expect(result).toBe('Content');
    });

    it('decodes common HTML entities', () => {
      expect(stripHtml('<p>&quot;Hello&quot; &amp; world</p>')).toBe('"Hello" & world');
      expect(stripHtml('&nbsp;')).toBe('');
      expect(stripHtml('&#39;')).toBe("'");
    });

    it('returns empty string for empty input', () => {
      expect(stripHtml('')).toBe('');
    });

    it('handles content with nested tags and extra whitespace', () => {
      const result = stripHtml('<div class="article">   Works on the MRT3 Circle Line have reached 40 per cent, said the transport minister.</div>');
      expect(result).toBe('Works on the MRT3 Circle Line have reached 40 per cent, said the transport minister.');
    });
  });

  describe('parseDate', () => {
    it('parses ISO 8601', () => {
      const result = parseDate('2026-08-10T08:15:00Z');
      expect(result).toEqual(new Date('2026-08-10T08:15:00Z'));
    });

    it('parses YYYY-MM-DD HH:MM:SS', () => {
      const result = parseDate('2026-08-10 08:20:00');
      expect(result).toEqual(new Date('2026-08-10T08:20:00Z'));
    });

    it('parses DD/MM/YYYY', () => {
      const result = parseDate('11/08/2026');
      expect(result).toEqual(new Date('2026-08-11T00:00:00Z'));
    });

    it('parses unix timestamp (10 digits)', () => {
      const result = parseDate('1786435200');
      expect(result).toEqual(new Date('2026-08-11T08:00:00Z'));
    });

    it('returns null for null input', () => {
      expect(parseDate(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(parseDate(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseDate('')).toBeNull();
    });

    it('returns null for invalid date string', () => {
      expect(parseDate('not-a-date')).toBeNull();
    });
  });

  describe('parseEngagement', () => {
    it('parses integer values', () => {
      expect(parseEngagement(412)).toBe(412);
      expect(parseEngagement('412')).toBe(412);
    });

    it('removes commas from string numbers', () => {
      expect(parseEngagement('1,204')).toBe(1204);
      expect(parseEngagement('3,402')).toBe(3402);
    });

    it('returns null for null', () => {
      expect(parseEngagement(null)).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(parseEngagement(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseEngagement('')).toBeNull();
    });

    it('returns null for non-numeric strings', () => {
      expect(parseEngagement('N/A')).toBeNull();
      expect(parseEngagement('abc')).toBeNull();
    });

    it('returns null for floats', () => {
      expect(parseEngagement('12.5')).toBeNull();
    });
  });

  describe('normalizeSource', () => {
    it('lowercases and trims', () => {
      expect(normalizeSource('The Star')).toBe('the star');
      expect(normalizeSource('thestar')).toBe('thestar');
      expect(normalizeSource('TWITTER')).toBe('twitter');
      expect(normalizeSource('malaysiakini ')).toBe('malaysiakini');
      expect(normalizeSource('  New Straits Times  ')).toBe('new straits times');
    });
  });
});
