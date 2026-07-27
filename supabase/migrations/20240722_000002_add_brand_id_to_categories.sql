-- ============================================================
-- MIGRATION: 20240722_000002_add_brand_id_to_categories
-- ============================================================

-- UP
-- ============================================================

ALTER TABLE categories ADD COLUMN brand_id UUID REFERENCES brands(id) ON DELETE RESTRICT;
CREATE INDEX idx_categories_brand ON categories(brand_id);
ALTER TABLE categories DROP CONSTRAINT categories_name_key;
ALTER TABLE categories ADD UNIQUE(name, brand_id);

-- DOWN
-- ============================================================
/*
ALTER TABLE categories DROP CONSTRAINT categories_name_brand_id_key;
ALTER TABLE categories ADD UNIQUE(name);
DROP INDEX IF EXISTS idx_categories_brand;
ALTER TABLE categories DROP COLUMN brand_id;
*/
