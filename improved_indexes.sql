-- =====================================================
-- DATABASE PERFORMANCE IMPROVEMENTS
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. ENABLE EXTENSION FOR FAST TEXT SEARCH
-- This is required for "GIN" indexes to work with LIKE/ILIKE queries
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. TRIGRAM INDEXES (Make searches instant)
-- These allow queries like "WHERE name ILIKE '%saqlaini%'" to use an index
CREATE INDEX IF NOT EXISTS idx_chanda_name_trgm ON db_chanda USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_chanda_hindi_name_trgm ON db_chanda USING gin (hindi_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_chanda_remarks_trgm ON db_chanda USING gin (remarks gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_user_list_name_trgm ON user_list USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_user_list_hindi_name_trgm ON user_list USING gin (hindi_name gin_trgm_ops);

-- 3. STANDARD INDEXES (For sorting and filtering)
CREATE INDEX IF NOT EXISTS idx_daily_verses_date ON daily_verses(verse_date);
CREATE INDEX IF NOT EXISTS idx_daily_content_created ON daily_content(created_at);
CREATE INDEX IF NOT EXISTS idx_user_list_phone ON user_list(phone);

-- 4. OPTIMIZED FUNCTION FOR CATEGORIES
-- Replaces fetching ALL expenses just to get a list of categories
CREATE OR REPLACE FUNCTION get_unique_categories()
RETURNS TABLE (category text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT e.category
  FROM expenses e
  WHERE e.category IS NOT NULL
  ORDER BY e.category;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. REFRESH STATISTICS
-- Tells the query planner about the new indexes
-- Note: VACUUM cannot run in a transaction block (like Supabase Editor). 
-- You can run this line separately if you want, otherwise auto-vacuum will handle it.
-- VACUUM ANALYZE;
