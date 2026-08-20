-- ============================================================
-- MIGRATION 019: Eliminar cobro de un crédito
-- Objetivo: poder anular un cobro (pago a crédito) registrado por
-- error, revirtiendo TODO en una transacción:
--   - Elimina el movimiento de caja ligado al cobro
--   - Restaura el saldo pendiente del crédito
--   - Elimina el pago de credit_payments
-- Para identificar el movimiento de caja de cada cobro se agrega
-- la columna credit_payment_id a cash_register_movements.
-- Permisos: quien registró el cobro, admin o gerente.
-- Ejecutar en Supabase Studio > SQL Editor
-- ============================================================

-- 1) Vínculo cobro -> movimiento de caja
ALTER TABLE cash_register_movements
    ADD COLUMN IF NOT EXISTS credit_payment_id uuid REFERENCES credit_payments(id) ON DELETE CASCADE;

-- Índice para localizar el movimiento de un cobro
CREATE INDEX IF NOT EXISTS idx_cash_movements_credit_payment
    ON cash_register_movements (credit_payment_id);

-- 2) Backfill: vincular movimientos de caja de cobros existentes con
--    su pago (match por venta + monto + cercanía temporal si hay empates)
WITH candidates AS (
    SELECT
        m.id                AS movement_id,
        cp.id               AS payment_id,
        abs(extract(epoch FROM (m.created_at - cp.created_at))) AS delta
    FROM cash_register_movements m
    JOIN sale_credits sc    ON sc.sale_id = m.reference_id
    JOIN credit_payments cp ON cp.sale_credit_id = sc.id AND cp.amount = m.amount
    WHERE m.reference_type = 'sale'
      AND m.type = 'manual_income'
      AND m.description ILIKE 'Pago de crédito%'
      AND m.credit_payment_id IS NULL
),
ranked AS (
    SELECT movement_id, payment_id,
           row_number() OVER (PARTITION BY movement_id ORDER BY delta) AS rn
    FROM candidates
)
UPDATE cash_register_movements m
SET credit_payment_id = r.payment_id
FROM ranked r
WHERE m.id = r.movement_id
  AND r.rn = 1;

-- 3) RPC transaccional para eliminar un cobro
CREATE OR REPLACE FUNCTION public.delete_credit_payment(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment record;
    v_allowed boolean;
BEGIN
    -- Obtener el cobro
    SELECT cp.id, cp.sale_credit_id, cp.amount, cp.created_by
    INTO v_payment
    FROM credit_payments cp
    WHERE cp.id = p_payment_id;

    IF v_payment.id IS NULL THEN
        RAISE EXCEPTION 'Cobro no encontrado';
    END IF;

    -- Permisos: quien registró el cobro, admin o gerente
    SELECT (
        auth.uid() = v_payment.created_by
        OR auth.jwt() ->> 'email' = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM user_branches ub
            WHERE ub.user_id = auth.uid() AND ub.role IN ('admin', 'manager')
        )
    )
    INTO v_allowed;

    IF NOT COALESCE(v_allowed, false) THEN
        RAISE EXCEPTION 'No tienes permisos para eliminar este cobro';
    END IF;

    -- 1) Eliminar el movimiento de caja ligado al cobro
    DELETE FROM cash_register_movements
    WHERE credit_payment_id = p_payment_id;

    -- 2) Restaurar el saldo pendiente del crédito
    UPDATE sale_credits
    SET balance = balance + v_payment.amount
    WHERE id = v_payment.sale_credit_id;

    -- 3) Eliminar el pago
    DELETE FROM credit_payments WHERE id = p_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_credit_payment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_credit_payment(uuid) TO authenticated;

-- 4) Defensa en profundidad: DELETE directo de cobros y movimientos
--    de caja solo para admins. Las eliminaciones reales pasan por el RPC.
DROP POLICY IF EXISTS "auth_delete_credit_payments" ON credit_payments;
CREATE POLICY "auth_delete_credit_payments" ON credit_payments FOR DELETE USING (
    auth.role() = 'authenticated'
    AND (
        auth.jwt() ->> 'email' = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM user_branches ub
            WHERE ub.user_id = auth.uid() AND ub.role = 'admin'
        )
    )
);

DROP POLICY IF EXISTS "auth_delete_cash_register_movements" ON cash_register_movements;
CREATE POLICY "auth_delete_cash_register_movements" ON cash_register_movements FOR DELETE USING (
    auth.role() = 'authenticated'
    AND (
        auth.jwt() ->> 'email' = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM user_branches ub
            WHERE ub.user_id = auth.uid() AND ub.role = 'admin'
        )
    )
);