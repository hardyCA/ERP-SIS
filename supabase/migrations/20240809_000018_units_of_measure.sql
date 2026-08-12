-- ============================================================
-- MIGRATION 018: Unidades de medida
--   - units_of_measure: tabla de unidades (CRUD desde Catálogo)
--   - products.unit_id: FK a la unidad de medida del producto
--   - Seed de unidades por defecto
--   - RLS + trigger updated_at
-- Ejecutar en Supabase Studio > SQL Editor
-- Es seguro ejecutarlo múltiples veces (idempotente)
-- ============================================================

CREATE TABLE IF NOT EXISTS units_of_measure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    abbreviation TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK en products (nullable, ON DELETE SET NULL)
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units_of_measure(id) ON DELETE SET NULL;

ALTER TABLE units_of_measure ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_units_of_measure" ON units_of_measure;
CREATE POLICY "auth_select_units_of_measure" ON units_of_measure FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_insert_units_of_measure" ON units_of_measure;
CREATE POLICY "auth_insert_units_of_measure" ON units_of_measure FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_update_units_of_measure" ON units_of_measure;
CREATE POLICY "auth_update_units_of_measure" ON units_of_measure FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_delete_units_of_measure" ON units_of_measure;
CREATE POLICY "auth_delete_units_of_measure" ON units_of_measure FOR DELETE USING (auth.role() = 'authenticated');

-- Seed: unidades por defecto
INSERT INTO units_of_measure (name, abbreviation) VALUES
    ('Unidad', 'UND'),
    ('Caja', 'CJA'),
    ('Docena', 'DOC'),
    ('Kilogramo', 'KG'),
    ('Litro', 'LT'),
    ('Metro', 'MT'),
    ('Paquete', 'PQT')
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_units_of_measure_name ON units_of_measure(name);
CREATE INDEX IF NOT EXISTS idx_units_of_measure_active ON units_of_measure(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_unit ON products(unit_id);

DROP TRIGGER IF EXISTS update_units_of_measure_updated_at ON units_of_measure;
CREATE TRIGGER update_units_of_measure_updated_at BEFORE UPDATE ON units_of_measure FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();