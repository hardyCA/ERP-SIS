-- ============================================================
-- MIGRATION 015: RLS para customers
--   La tabla customers se creó manualmente en Supabase (fuera de
--   migraciones) y NUNCA tuvo RLS activado: cualquiera con la anon
--   key podía leer/borrar clientes (verificado: anon SELECT devuelve
--   filas). Esta migración habilita RLS y crea las políticas.
-- Ejecutar en Supabase Studio > SQL Editor
-- Es seguro ejecutarlo múltiples veces (idempotente)
-- ============================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_customers" ON customers;
CREATE POLICY "auth_select_customers" ON customers FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_insert_customers" ON customers;
CREATE POLICY "auth_insert_customers" ON customers FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_update_customers" ON customers;
CREATE POLICY "auth_update_customers" ON customers FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_delete_customers" ON customers;
CREATE POLICY "auth_delete_customers" ON customers FOR DELETE USING (auth.role() = 'authenticated');
