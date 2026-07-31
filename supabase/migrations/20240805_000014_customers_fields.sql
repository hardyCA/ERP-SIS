-- ============================================================
-- MIGRATION 014: Clientes — campos adicionales
--   - address: dirección del cliente (TEXT, opcional)
--   - document_id: cédula / documento de identidad (TEXT, opcional)
-- Ejecutar en Supabase Studio > SQL Editor
-- ============================================================

ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS address     TEXT,
    ADD COLUMN IF NOT EXISTS document_id TEXT;
