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
