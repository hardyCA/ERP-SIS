-- ============================================================
-- MIGRATION 010: Eliminar venta (hard delete, solo admin)
-- Crea el RPC delete_sale que revierte TODO en una transacción:
--   - Restaura stock en la sucursal
--   - Elimina pagos de crédito y el crédito de la venta
--   - Elimina movimientos de caja ligados a la venta
--   - Elimina la venta (cascadea sale_items)
-- También endurece las policies DELETE para que solo admins
-- puedan borrar directamente estas tablas.
-- Ejecutar en Supabase Studio > SQL Editor
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
    -- Verificar que la venta exista y obtener su sucursal
    -- ============================================================
    SELECT branch_id INTO v_branch_id
    FROM sales
    WHERE id = p_sale_id;

    IF v_branch_id IS NULL THEN
        RAISE EXCEPTION 'Venta no encontrada';
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
    --    (cash_sale efectivo/anticipo + manual_income QR/pagos crédito)
    -- ============================================================
    DELETE FROM cash_register_movements
    WHERE reference_type = 'sale'
      AND reference_id = p_sale_id;

    -- ============================================================
    -- 4) Eliminar la venta (sale_items se borran en cascada)
    -- ============================================================
    DELETE FROM sales
    WHERE id = p_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_sale(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_sale(uuid) TO authenticated;

-- ============================================================
-- Defensa en profundidad: DELETE directo solo para admins.
-- El borrado real pasa por el RPC delete_sale.
-- ============================================================

DROP POLICY IF EXISTS "auth_delete_sales" ON sales;
CREATE POLICY "auth_delete_sales" ON sales FOR DELETE USING (
    auth.role() = 'authenticated'
    AND (
        auth.jwt() ->> 'email' = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM user_branches ub
            WHERE ub.user_id = auth.uid() AND ub.role = 'admin'
        )
    )
);

DROP POLICY IF EXISTS "auth_delete_sale_items" ON sale_items;
CREATE POLICY "auth_delete_sale_items" ON sale_items FOR DELETE USING (
    auth.role() = 'authenticated'
    AND (
        auth.jwt() ->> 'email' = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM user_branches ub
            WHERE ub.user_id = auth.uid() AND ub.role = 'admin'
        )
    )
);

DROP POLICY IF EXISTS "auth_delete_sale_credits" ON sale_credits;
CREATE POLICY "auth_delete_sale_credits" ON sale_credits FOR DELETE USING (
    auth.role() = 'authenticated'
    AND (
        auth.jwt() ->> 'email' = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM user_branches ub
            WHERE ub.user_id = auth.uid() AND ub.role = 'admin'
        )
    )
);

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
