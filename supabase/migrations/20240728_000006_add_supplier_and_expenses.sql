-- ============================================================
-- MIGRATION 006: Proveedores, gastos operativos
-- ============================================================

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    document_id TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_suppliers" ON suppliers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_suppliers" ON suppliers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_suppliers" ON suppliers FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_delete_suppliers" ON suppliers FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);

CREATE TABLE IF NOT EXISTS purchase_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    cost NUMERIC(12,2) NOT NULL CHECK (cost >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_expenses_purchase ON purchase_expenses(purchase_id);

ALTER TABLE purchase_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_purchase_expenses" ON purchase_expenses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_purchase_expenses" ON purchase_expenses FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_purchase_expenses" ON purchase_expenses FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_delete_purchase_expenses" ON purchase_expenses FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger updated_at for suppliers
CREATE TRIGGER set_updated_at_suppliers
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
