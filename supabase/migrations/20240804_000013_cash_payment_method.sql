-- ============================================================
-- MIGRATION 013: Caja — desglose de método de pago (efectivo/QR)
--   - Agrega payment_method ('cash'|'qr'|'mixed'), cash_amount y
--     qr_amount a cash_register_movements.
--   - Backfill de movimientos existentes parseando las descripciones
--     generadas por la app (formato conocido y determinista):
--       * "Venta #N - Efectivo" / "Anticipo (Crédito)" -> efectivo
--       * "Venta #N - QR"                            -> QR
--       * "Tipo - Efectivo Bs X + QR Bs Y"            -> mixto
--       * "Pago de crédito - Venta #N" (sin método)   -> efectivo
--   - Los pagos de crédito antiguos no guardan método: se asumen
--     efectivo. Desde esta migración, la app registra el método real.
-- Ejecutar en Supabase Studio > SQL Editor
-- ============================================================

ALTER TABLE cash_register_movements
    ADD COLUMN IF NOT EXISTS payment_method TEXT,
    ADD COLUMN IF NOT EXISTS cash_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS qr_amount     NUMERIC(12,2) NOT NULL DEFAULT 0;

WITH parsed AS (
    SELECT
        id,
        type,
        amount,
        description,
        NULLIF(substring(description from 'Efectivo[[:space:]]*Bs[[:space:]]*([0-9.]+)'), '')::numeric AS cash_x,
        NULLIF(substring(description from 'QR[[:space:]]*Bs[[:space:]]*([0-9.]+)'), '')::numeric AS qr_y
    FROM cash_register_movements
),
computed AS (
    SELECT
        id,
        CASE
            WHEN cash_x IS NOT NULL AND qr_y IS NOT NULL THEN 'mixed'
            WHEN qr_y IS NOT NULL OR description ILIKE '%QR%' THEN 'qr'
            ELSE 'cash'
        END AS method,
        CASE
            WHEN cash_x IS NOT NULL AND qr_y IS NOT NULL THEN cash_x
            WHEN qr_y IS NOT NULL OR description ILIKE '%QR%' THEN 0
            ELSE amount
        END AS cash_final,
        CASE
            WHEN cash_x IS NOT NULL AND qr_y IS NOT NULL THEN qr_y
            WHEN qr_y IS NOT NULL OR description ILIKE '%QR%' THEN amount
            ELSE 0
        END AS qr_final
    FROM parsed
)
UPDATE cash_register_movements m
SET payment_method = c.method,
    cash_amount    = c.cash_final,
    qr_amount      = c.qr_final
FROM computed c
WHERE m.id = c.id;
