-- ============================================================
-- MIGRATION 011: Compras — aprobar/cancelar/eliminar seguros
--   - approve_purchase: transaccional + atómico (solo pending→approved),
--     incrementa stock y recalcula costo promedio ponderado.
--     Solo admin/manager.
--   - cancel_purchase: atómico (solo pending→cancelled). Solo admin/manager.
--   - delete_purchase: elimina la compra. Si fue aprobada, revierte stock
--     y costo promedio. Solo admin.
--   - Endurece RLS de purchases/purchase_items/purchase_expenses.
-- Ejecutar en Supabase Studio > SQL Editor
-- ============================================================

-- ============================================================
-- approve_purchase
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_purchase(p_purchase_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_can_manage   boolean;
    v_branch_id    uuid;
    v_item         record;
    v_existing_id  uuid;
    v_existing_qty integer;
    v_stock_total  numeric;
    v_stock_old    numeric;
    v_cost_now     numeric;
    v_new_cost     numeric;
BEGIN
    -- Solo admin o manager
    SELECT (auth.jwt() ->> 'email') = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM user_branches ub
            WHERE ub.user_id = auth.uid() AND ub.role IN ('admin', 'manager')
        )
    INTO v_can_manage;

    IF NOT COALESCE(v_can_manage, false) THEN
        RAISE EXCEPTION 'Solo administradores o gerentes pueden aprobar compras';
    END IF;

    -- Atómico: solo pasa de pending a approved (evita doble aprobación)
    UPDATE purchases
    SET status = 'approved', updated_at = now()
    WHERE id = p_purchase_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solo se pueden aprobar compras pendientes';
    END IF;

    SELECT branch_id INTO v_branch_id FROM purchases WHERE id = p_purchase_id;

    FOR v_item IN
        SELECT product_id, quantity, unit_cost
        FROM purchase_items
        WHERE purchase_id = p_purchase_id
    LOOP
        -- Incrementar stock en la sucursal (upsert)
        SELECT id, quantity INTO v_existing_id, v_existing_qty
        FROM inventory_items
        WHERE product_id = v_item.product_id AND branch_id = v_branch_id;

        IF v_existing_id IS NULL THEN
            INSERT INTO inventory_items (product_id, branch_id, quantity, sale_price)
            VALUES (v_item.product_id, v_branch_id, v_item.quantity, 0);
        ELSE
            UPDATE inventory_items
            SET quantity = v_existing_qty + v_item.quantity
            WHERE id = v_existing_id;
        END IF;

        -- Costo promedio ponderado (global entre sucursales)
        SELECT COALESCE(SUM(quantity), 0) INTO v_stock_total
        FROM inventory_items
        WHERE product_id = v_item.product_id;

        v_stock_old := v_stock_total - v_item.quantity;
        SELECT COALESCE(cost, 0) INTO v_cost_now
        FROM products WHERE id = v_item.product_id;

        IF v_stock_old > 0 THEN
            v_new_cost := (v_stock_old * v_cost_now + v_item.quantity * v_item.unit_cost) / v_stock_total;
        ELSE
            v_new_cost := v_item.unit_cost;
        END IF;

        UPDATE products
        SET cost = ROUND(v_new_cost, 2)
        WHERE id = v_item.product_id;
    END LOOP;
END;
$$;

-- ============================================================
-- cancel_purchase
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_purchase(p_purchase_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_can_manage boolean;
BEGIN
    SELECT (auth.jwt() ->> 'email') = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM user_branches ub
            WHERE ub.user_id = auth.uid() AND ub.role IN ('admin', 'manager')
        )
    INTO v_can_manage;

    IF NOT COALESCE(v_can_manage, false) THEN
        RAISE EXCEPTION 'Solo administradores o gerentes pueden cancelar compras';
    END IF;

    UPDATE purchases
    SET status = 'cancelled', updated_at = now()
    WHERE id = p_purchase_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solo se pueden cancelar compras pendientes';
    END IF;
END;
$$;

-- ============================================================
-- delete_purchase
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_purchase(p_purchase_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin    boolean;
    v_status      text;
    v_branch_id   uuid;
    v_item        record;
    v_cur_qty     integer;
    v_stock_now   numeric;
    v_stock_old   numeric;
    v_cost_now    numeric;
    v_new_cost    numeric;
BEGIN
    -- Solo admin
    SELECT (auth.jwt() ->> 'email') = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM user_branches ub
            WHERE ub.user_id = auth.uid() AND ub.role = 'admin'
        )
    INTO v_is_admin;

    IF NOT COALESCE(v_is_admin, false) THEN
        RAISE EXCEPTION 'Solo los administradores pueden eliminar compras';
    END IF;

    SELECT status, branch_id INTO v_status, v_branch_id
    FROM purchases WHERE id = p_purchase_id;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Compra no encontrada';
    END IF;

    -- Si fue aprobada, revertir stock y costo promedio ponderado
    IF v_status = 'approved' THEN
        FOR v_item IN
            SELECT product_id, quantity, unit_cost
            FROM purchase_items
            WHERE purchase_id = p_purchase_id
        LOOP
            SELECT quantity INTO v_cur_qty
            FROM inventory_items
            WHERE product_id = v_item.product_id AND branch_id = v_branch_id;

            IF v_cur_qty IS NULL OR v_cur_qty < v_item.quantity THEN
                RAISE EXCEPTION 'No se puede revertir: stock actual del producto % es insuficiente en la sucursal', v_item.product_id;
            END IF;

            -- Stock antes de revertir (incluye la cantidad de esta compra)
            SELECT COALESCE(SUM(quantity), 0), COALESCE(cost, 0)
            INTO v_stock_now, v_cost_now
            FROM inventory_items
            WHERE product_id = v_item.product_id;

            UPDATE inventory_items
            SET quantity = quantity - v_item.quantity
            WHERE product_id = v_item.product_id AND branch_id = v_branch_id;

            v_stock_old := v_stock_now - v_item.quantity;
            IF v_stock_old > 0 THEN
                v_new_cost := (v_stock_now * v_cost_now - v_item.quantity * v_item.unit_cost) / v_stock_old;
            ELSE
                v_new_cost := 0;
            END IF;

            UPDATE products
            SET cost = ROUND(v_new_cost, 2)
            WHERE id = v_item.product_id;
        END LOOP;
    END IF;

    DELETE FROM purchase_expenses WHERE purchase_id = p_purchase_id;
    DELETE FROM purchase_items WHERE purchase_id = p_purchase_id;
    DELETE FROM purchases WHERE id = p_purchase_id;
END;
$$;

-- ============================================================
-- Permisos de ejecución
-- ============================================================
REVOKE ALL ON FUNCTION public.approve_purchase(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_purchase(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_purchase(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_purchase(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_purchase(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_purchase(uuid) TO authenticated;

-- ============================================================
-- Defensa en profundidad: RLS
--   - UPDATE purchases: admin/manager (aprobar/cancelar pasan por RPC)
--   - DELETE purchases/purchase_items/purchase_expenses: solo admin
-- ============================================================

DROP POLICY IF EXISTS "auth_update_purchases" ON purchases;
CREATE POLICY "auth_update_purchases" ON purchases FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND (
        auth.jwt() ->> 'email' = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM user_branches ub
            WHERE ub.user_id = auth.uid() AND ub.role IN ('admin', 'manager')
        )
    )
);

DROP POLICY IF EXISTS "auth_delete_purchases" ON purchases;
CREATE POLICY "auth_delete_purchases" ON purchases FOR DELETE USING (
    auth.role() = 'authenticated'
    AND (
        auth.jwt() ->> 'email' = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM user_branches ub
            WHERE ub.user_id = auth.uid() AND ub.role = 'admin'
        )
    )
);

DROP POLICY IF EXISTS "auth_delete_purchase_items" ON purchase_items;
CREATE POLICY "auth_delete_purchase_items" ON purchase_items FOR DELETE USING (
    auth.role() = 'authenticated'
    AND (
        auth.jwt() ->> 'email' = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM user_branches ub
            WHERE ub.user_id = auth.uid() AND ub.role = 'admin'
        )
    )
);

DROP POLICY IF EXISTS "auth_delete_purchase_expenses" ON purchase_expenses;
CREATE POLICY "auth_delete_purchase_expenses" ON purchase_expenses FOR DELETE USING (
    auth.role() = 'authenticated'
    AND (
        auth.jwt() ->> 'email' = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM user_branches ub
            WHERE ub.user_id = auth.uid() AND ub.role = 'admin'
        )
    )
);
