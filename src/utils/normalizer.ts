export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function parseDate(dateStr: string | null | number | undefined): Date | null {
  if (dateStr === null || dateStr === undefined || dateStr === '') {
    return null;
  }

  const trimmed = String(dateStr).trim();

  if (/^\d{10}$/.test(trimmed)) {
    return new Date(parseInt(trimmed, 10) * 1000);
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed + 'Z');
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(trimmed + 'T00:00:00Z');
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/');
    const iso = `${year}-${month}-${day}T00:00:00Z`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

export function parseEngagement(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const str = String(value).replace(/,/g, '').trim();
  if (str === '') {
    return null;
  }

  const num = Number(str);
  return Number.isInteger(num) ? num : null;
}

export function normalizeSource(source: string): string {
  return source.toLowerCase().trim();
}
