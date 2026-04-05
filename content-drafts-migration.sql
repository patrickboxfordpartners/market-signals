-- Content drafts: AI-generated posts/articles for review
-- Run this in the market-signals Supabase SQL Editor

CREATE TABLE content_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,        -- 'market-signals', 'reviewsniper', 'roundtaible'
  type TEXT NOT NULL,           -- 'linkedin', 'newsletter', 'blog'
  title TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',  -- 'draft', 'approved', 'rejected', 'published'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_drafts_status ON content_drafts(status);
CREATE INDEX idx_content_drafts_source ON content_drafts(source);
CREATE INDEX idx_content_drafts_created ON content_drafts(created_at DESC);

-- RLS: service role only (accessed from boxford-crm server-side)
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON content_drafts
  FOR ALL
  USING (auth.role() = 'service_role');
