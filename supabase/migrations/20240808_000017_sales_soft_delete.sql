-- ============================================================
-- MIGRATION 017: Ventas — soft delete (anular, no borrar)
--   - Agrega deleted_at a sales.
--   - Reemplaza delete_sale: en lugar de borrar la fila, la marca
--     como eliminada (deleted_at = now()). Todo lo demás se mantiene
--     igual: restaura stock, revierte movimientos de caja y cancela
--     el crédito/pagos en la misma transacción.
--   - La venta permanece en la BD para trazabilidad, pero deja de
--     aparecer en listas y reportes (se filtra deleted_at IS NULL).
-- Ejecutar en Supabase Studio > SQL Editor
-- ============================================================

ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sales_deleted_at ON sales(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- Reemplazar RPC delete_sale (soft delete)
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_sale(p_sale_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_branch_id   uuid;
    v_is_admin    boolean;
    v_sale_item   record;
BEGIN
    -- ============================================================
    -- Solo administradores pueden eliminar ventas
    -- (super admin por email o rol admin en user_branches)
    -- ============================================================
    SELECT (auth.jwt() ->> 'email') = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1
            FROM user_branches ub
            WHERE ub.user_id = auth.uid()
              AND ub.role = 'admin'
        )
    INTO v_is_admin;

    IF NOT COALESCE(v_is_admin, false) THEN
        RAISE EXCEPTION 'Solo los administradores pueden eliminar ventas';
    END IF;

    -- ============================================================
    -- Verificar que la venta exista, esté activa y obtener sucursal
    -- ============================================================
    SELECT branch_id INTO v_branch_id
    FROM sales
    WHERE id = p_sale_id AND deleted_at IS NULL;

    IF v_branch_id IS NULL THEN
        RAISE EXCEPTION 'Venta no encontrada o ya anulada';
    END IF;

    -- ============================================================
    -- 1) Restaurar stock en la sucursal
    -- ============================================================
    FOR v_sale_item IN
        SELECT product_id, quantity
        FROM sale_items
        WHERE sale_id = p_sale_id
    LOOP
        UPDATE inventory_items
        SET quantity = quantity + v_sale_item.quantity
        WHERE product_id = v_sale_item.product_id
          AND branch_id = v_branch_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No se encontró inventario del producto % en la sucursal', v_sale_item.product_id;
        END IF;
    END LOOP;

    -- ============================================================
    -- 2) Eliminar pagos de crédito y el crédito de la venta
    -- ============================================================
    DELETE FROM credit_payments
    WHERE sale_credit_id IN (
        SELECT id FROM sale_credits WHERE sale_id = p_sale_id
    );

    DELETE FROM sale_credits
    WHERE sale_id = p_sale_id;

    -- ============================================================
    -- 3) Eliminar movimientos de caja ligados a la venta
    -- ============================================================
    DELETE FROM cash_register_movements
    WHERE reference_type = 'sale'
      AND reference_id = p_sale_id;

    -- ============================================================
    -- 4) Marcar la venta como eliminada (NO se borra la fila)
    --    Los sale_items se conservan para trazabilidad.
    -- ============================================================
    UPDATE sales
    SET deleted_at = now()
    WHERE id = p_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_sale(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_sale(uuid) TO authenticated;