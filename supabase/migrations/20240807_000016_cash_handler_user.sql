-- ============================================================
-- MIGRATION 016: Caja — quién cobró/retiró el monto
--   - Agrega handler_user_id a cash_register_movements para
--     registrar quién cobró (ingresos) o retiró (egresos/retiros).
--     distinto de created_by (quién registró el movimiento).
--   - Backfill: los movimientos existentes toman handler_user_id = created_by.
-- Ejecutar en Supabase Studio > SQL Editor
-- ============================================================

ALTER TABLE cash_register_movements
    ADD COLUMN IF NOT EXISTS handler_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE cash_register_movements
SET handler_user_id = COALESCE(handler_user_id, created_by)
WHERE handler_user_id IS NULL AND created_by IS NOT NULL;