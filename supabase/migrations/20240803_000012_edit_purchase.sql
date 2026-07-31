-- ============================================================
-- MIGRATION 012: Compras — editar compras pendientes
--   - update_purchase: actualiza datos/cabecera, reemplaza items y
--     gastos operativos de forma transaccional.
--     Solo se permite sobre compras en estado 'pending' (no afecta stock).
--     Solo admin/manager. SECURITY DEFINER para evitar fricción con las
--     políticas DELETE (migración 011) al reemplazar items/gastos.
-- Ejecutar en Supabase Studio > SQL Editor
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_purchase(
    p_purchase_id uuid,
    p_branch_id   uuid,
    p_supplier_id uuid,
    p_notes       text,
    p_items       jsonb,
    p_expenses    jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_can_manage boolean;
    v_total      numeric := 0;
    v_item       record;
    v_exp        record;
    v_quantity   integer;
    v_unit_cost  numeric;
BEGIN
    -- Solo admin o manager
    SELECT (auth.jwt() ->> 'email') = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM user_branches ub
            WHERE ub.user_id = auth.uid() AND ub.role IN ('admin', 'manager')
        )
    INTO v_can_manage;

    IF NOT COALESCE(v_can_manage, false) THEN
        RAISE EXCEPTION 'Solo administradores o gerentes pueden editar compras';
    END IF;

    -- Solo compras pendientes
    IF NOT EXISTS (SELECT 1 FROM purchases WHERE id = p_purchase_id AND status = 'pending') THEN
        RAISE EXCEPTION 'Solo se pueden editar compras pendientes';
    END IF;

    -- Calcular total (productos + gastos)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) item
    LOOP
        v_quantity := COALESCE((v_item.value->>'quantity')::integer, 0);
        v_unit_cost := COALESCE((v_item.value->>'unit_cost')::numeric, 0);
        v_total := v_total + v_quantity * v_unit_cost;
    END LOOP;

    IF p_expenses IS NOT NULL THEN
        FOR v_exp IN SELECT * FROM jsonb_array_elements(p_expenses) exp
        LOOP
            v_total := v_total + COALESCE((v_exp.value->>'cost')::numeric, 0);
        END LOOP;
    END IF;

    -- Actualizar cabecera
    UPDATE purchases
    SET branch_id    = p_branch_id,
        supplier_id  = p_supplier_id,
        notes        = p_notes,
        total        = v_total,
        updated_at   = now()
    WHERE id = p_purchase_id;

    -- Reemplazar items y gastos
    DELETE FROM purchase_expenses WHERE purchase_id = p_purchase_id;
    DELETE FROM purchase_items WHERE purchase_id = p_purchase_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) item
    LOOP
        INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost, subtotal)
        VALUES (
            p_purchase_id,
            (v_item.value->>'product_id')::uuid,
            (v_item.value->>'quantity')::integer,
            (v_item.value->>'unit_cost')::numeric,
            (v_item.value->>'quantity')::integer * (v_item.value->>'unit_cost')::numeric
        );
    END LOOP;

    IF p_expenses IS NOT NULL AND jsonb_array_length(p_expenses) > 0 THEN
        FOR v_exp IN SELECT * FROM jsonb_array_elements(p_expenses) exp
        LOOP
            INSERT INTO purchase_expenses (purchase_id, description, cost)
            VALUES (p_purchase_id, v_exp.value->>'description', (v_exp.value->>'cost')::numeric);
        END LOOP;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_purchase(uuid, uuid, uuid, text, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_purchase(uuid, uuid, uuid, text, jsonb, jsonb) TO authenticated;
