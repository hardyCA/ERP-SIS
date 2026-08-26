-- ============================================================
-- MIGRATION 018: Cotizaciones (quotes)
--   - quotes: cabecera de cotización (similar a sales sin pagos/stock/caja)
--   - quote_items: líneas de cotización
--   - RPC convert_quote_to_sale: convierte cotización a venta (transaccional)
--   - RLS habilitado
-- Ejecutar en Supabase Studio > SQL Editor
-- ============================================================

-- ============================================================
-- Tabla quotes
-- ============================================================
CREATE TABLE IF NOT EXISTS quotes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    number int GENERATED ALWAYS AS IDENTITY,
    branch_id uuid NOT NULL REFERENCES branches(id),
    customer_id uuid REFERENCES customers(id),
    customer_name text,
    customer_phone text,
    subtotal numeric(12,2) NOT NULL DEFAULT 0,
    discount numeric(12,2) NOT NULL DEFAULT 0,
    total numeric(12,2) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','expired','converted')),
    expires_at timestamptz,
    notes text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    converted_to_sale_id uuid REFERENCES sales(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_quotes_branch_id ON quotes(branch_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_converted_to_sale ON quotes(converted_to_sale_id);

-- Trigger para updated_at
CREATE TRIGGER update_quotes_updated_at
    BEFORE UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Tabla quote_items
-- ============================================================
CREATE TABLE IF NOT EXISTS quote_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id),
    quantity int NOT NULL CHECK (quantity > 0),
    price numeric(12,2) NOT NULL CHECK (price >= 0),
    subtotal numeric(12,2) GENERATED ALWAYS AS (quantity * price) STORED
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_product_id ON quote_items(product_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- Políticas quotes
CREATE POLICY "Users can view quotes from their branches"
    ON quotes FOR SELECT
    USING (branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert quotes in their branches"
    ON quotes FOR INSERT
    WITH CHECK (branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()));

CREATE POLICY "Users can update quotes in their branches"
    ON quotes FOR UPDATE
    USING (branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()));

CREATE POLICY "Admins can delete quotes"
    ON quotes FOR DELETE
    USING (
        (auth.jwt() ->> 'email') = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM user_branches ub
            WHERE ub.user_id = auth.uid() AND ub.role = 'admin'
        )
    );

-- Políticas quote_items
CREATE POLICY "Users can view quote_items from their branches"
    ON quote_items FOR SELECT
    USING (quote_id IN (SELECT id FROM quotes WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert quote_items in their branches"
    ON quote_items FOR INSERT
    WITH CHECK (quote_id IN (SELECT id FROM quotes WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())));

CREATE POLICY "Users can update quote_items in their branches"
    ON quote_items FOR UPDATE
    USING (quote_id IN (SELECT id FROM quotes WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())));

CREATE POLICY "Admins can delete quote_items"
    ON quote_items FOR DELETE
    USING (
        (auth.jwt() ->> 'email') = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM user_branches ub
            WHERE ub.user_id = auth.uid() AND ub.role = 'admin'
        )
    );

-- ============================================================
-- RPC: convert_quote_to_sale
-- Convierte una cotización en venta (transaccional)
-- ============================================================
CREATE OR REPLACE FUNCTION public.convert_quote_to_sale(p_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quote           record;
    v_sale_id         uuid;
    v_user_id         uuid := auth.uid();
    v_is_admin        boolean;
    v_quote_item      record;
    v_items_total     numeric(12,2) := 0;
    v_discount        numeric(12,2) := 0;
    v_total           numeric(12,2) := 0;
    v_cash_amount     numeric(12,2) := 0;
    v_qr_amount       numeric(12,2) := 0;
    v_credit_anticipo numeric(12,2) := 0;
BEGIN
    -- ============================================================
    -- Verificar permisos (admin/manager/vendedor en la sucursal)
    -- ============================================================
    SELECT (auth.jwt() ->> 'email') = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1
            FROM user_branches ub
            WHERE ub.user_id = auth.uid()
              AND ub.branch_id = (SELECT branch_id FROM quotes WHERE id = p_quote_id)
              AND ub.role IN ('admin', 'manager', 'seller')
        )
    INTO v_is_admin;

    IF NOT COALESCE(v_is_admin, false) THEN
        RAISE EXCEPTION 'No tienes permisos para convertir esta cotización';
    END IF;

    -- ============================================================
    -- Obtener cotización (solo draft/sent/accepted)
    -- ============================================================
    SELECT * INTO v_quote
    FROM quotes
    WHERE id = p_quote_id
      AND status IN ('draft', 'sent', 'accepted');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cotización no encontrada, ya convertida o estado no válido';
    END IF;

    -- ============================================================
    -- Verificar stock disponible para cada item
    -- ============================================================
    FOR v_quote_item IN
        SELECT qi.product_id, qi.quantity, qi.price
        FROM quote_items qi
        WHERE qi.quote_id = p_quote_id
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM inventory_items
            WHERE product_id = v_quote_item.product_id
              AND branch_id = v_quote.branch_id
              AND quantity >= v_quote_item.quantity
        ) THEN
            RAISE EXCEPTION 'Stock insuficiente para producto %', v_quote_item.product_id;
        END IF;
        v_items_total := v_items_total + (v_quote_item.quantity * v_quote_item.price);
    END LOOP;

    v_discount := v_quote.discount;
    v_total := GREATEST(0, v_items_total - v_discount);

    -- Para conversión directa, asumimos pago en efectivo (el usuario puede cambiar después en la venta)
    v_cash_amount := v_total;

    -- ============================================================
    -- 1) Crear venta
    -- ============================================================
    INSERT INTO sales (
        branch_id,
        total,
        discount,
        payment_type,
        cash_amount,
        qr_amount,
        credit_anticipo,
        notes,
        customer_id,
        customer_name,
        customer_phone,
        created_by
    ) VALUES (
        v_quote.branch_id,
        v_total,
        v_discount,
        'cash',
        v_cash_amount,
        0,
        0,
        v_quote.notes,
        v_quote.customer_id,
        v_quote.customer_name,
        v_quote.customer_phone,
        v_user_id
    ) RETURNING id INTO v_sale_id;

    -- ============================================================
    -- 2) Crear sale_items + descontar stock
    -- ============================================================
    FOR v_quote_item IN
        SELECT product_id, quantity, price
        FROM quote_items
        WHERE quote_id = p_quote_id
    LOOP
        INSERT INTO sale_items (sale_id, product_id, quantity, price, subtotal)
        VALUES (v_sale_id, v_quote_item.product_id, v_quote_item.quantity, v_quote_item.price, v_quote_item.quantity * v_quote_item.price);

        UPDATE inventory_items
        SET quantity = quantity - v_quote_item.quantity
        WHERE product_id = v_quote_item.product_id
          AND branch_id = v_quote.branch_id;
    END LOOP;

    -- ============================================================
    -- 3) Movimiento de caja (efectivo)
    -- ============================================================
    INSERT INTO cash_register_movements (
        branch_id,
        type,
        amount,
        payment_method,
        cash_amount,
        qr_amount,
        reference_type,
        reference_id,
        description,
        created_by,
        handler_user_id
    ) VALUES (
        v_quote.branch_id,
        'cash_sale',
        v_cash_amount,
        'cash',
        v_cash_amount,
        0,
        'sale',
        v_sale_id,
        'Venta #' || (SELECT number FROM sales WHERE id = v_sale_id) || ' (desde cotización)',
        v_user_id,
        v_user_id
    );

    -- ============================================================
    -- 4) Actualizar cotización: status=converted, converted_to_sale_id
    -- ============================================================
    UPDATE quotes
    SET status = 'converted',
        converted_to_sale_id = v_sale_id,
        updated_at = now()
    WHERE id = p_quote_id;

    RETURN v_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_quote_to_sale(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_quote_to_sale(uuid) TO authenticated;

-- ============================================================
-- RPC: delete_quote (solo borradores, solo admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_quote(p_quote_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin boolean;
BEGIN
    SELECT (auth.jwt() ->> 'email') = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1
            FROM user_branches ub
            WHERE ub.user_id = auth.uid()
              AND ub.role = 'admin'
        )
    INTO v_is_admin;

    IF NOT COALESCE(v_is_admin, false) THEN
        RAISE EXCEPTION 'Solo los administradores pueden eliminar cotizaciones';
    END IF;

    DELETE FROM quotes
    WHERE id = p_quote_id
      AND status = 'draft';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cotización no encontrada o no está en borrador';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_quote(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_quote(uuid) TO authenticated;

-- ============================================================
-- RPC: update_quote_status (cambiar status: draft→sent→accepted→expired)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_quote_status(p_quote_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quote_branch uuid;
BEGIN
    SELECT branch_id INTO v_quote_branch
    FROM quotes
    WHERE id = p_quote_id;

    IF v_quote_branch IS NULL THEN
        RAISE EXCEPTION 'Cotización no encontrada';
    END IF;

    -- Verificar permisos en la sucursal
    IF NOT EXISTS (
        SELECT 1 FROM user_branches ub
        WHERE ub.user_id = auth.uid()
          AND ub.branch_id = v_quote_branch
          AND ub.role IN ('admin', 'manager', 'seller')
    ) THEN
        RAISE EXCEPTION 'No tienes permisos para cambiar el estado de esta cotización';
    END IF;

    UPDATE quotes
    SET status = p_status,
        updated_at = now()
    WHERE id = p_quote_id
      AND status IN ('draft', 'sent', 'accepted');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se puede cambiar el estado desde la posición actual';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_quote_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_quote_status(uuid, text) TO authenticated;