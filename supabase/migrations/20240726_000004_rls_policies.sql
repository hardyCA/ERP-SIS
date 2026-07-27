-- ============================================================
-- RLS Policies para todas las tablas del SIIM
-- Ejecutar en Supabase Studio > SQL Editor
-- Es seguro ejecutarlo múltiples veces (DROP + CREATE)
-- ============================================================

-- Habilitar RLS en todas las tablas (idempotente)
ALTER TABLE IF EXISTS brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sale_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS credit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cash_register_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_branches ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- brands
-- ============================================================
DROP POLICY IF EXISTS "auth_select_brands" ON brands;
CREATE POLICY "auth_select_brands" ON brands FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_brands" ON brands;
CREATE POLICY "auth_insert_brands" ON brands FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_brands" ON brands;
CREATE POLICY "auth_update_brands" ON brands FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_delete_brands" ON brands;
CREATE POLICY "auth_delete_brands" ON brands FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- categories
-- ============================================================
DROP POLICY IF EXISTS "auth_select_categories" ON categories;
CREATE POLICY "auth_select_categories" ON categories FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_categories" ON categories;
CREATE POLICY "auth_insert_categories" ON categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_categories" ON categories;
CREATE POLICY "auth_update_categories" ON categories FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_delete_categories" ON categories;
CREATE POLICY "auth_delete_categories" ON categories FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- products
-- ============================================================
DROP POLICY IF EXISTS "auth_select_products" ON products;
CREATE POLICY "auth_select_products" ON products FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_products" ON products;
CREATE POLICY "auth_insert_products" ON products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_products" ON products;
CREATE POLICY "auth_update_products" ON products FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_delete_products" ON products;
CREATE POLICY "auth_delete_products" ON products FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- branches
-- ============================================================
DROP POLICY IF EXISTS "auth_select_branches" ON branches;
CREATE POLICY "auth_select_branches" ON branches FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_branches" ON branches;
CREATE POLICY "auth_insert_branches" ON branches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_branches" ON branches;
CREATE POLICY "auth_update_branches" ON branches FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_delete_branches" ON branches;
CREATE POLICY "auth_delete_branches" ON branches FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- inventory_items
-- ============================================================
DROP POLICY IF EXISTS "auth_select_inventory_items" ON inventory_items;
CREATE POLICY "auth_select_inventory_items" ON inventory_items FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_inventory_items" ON inventory_items;
CREATE POLICY "auth_insert_inventory_items" ON inventory_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_inventory_items" ON inventory_items;
CREATE POLICY "auth_update_inventory_items" ON inventory_items FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_delete_inventory_items" ON inventory_items;
CREATE POLICY "auth_delete_inventory_items" ON inventory_items FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- purchases
-- ============================================================
DROP POLICY IF EXISTS "auth_select_purchases" ON purchases;
CREATE POLICY "auth_select_purchases" ON purchases FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_purchases" ON purchases;
CREATE POLICY "auth_insert_purchases" ON purchases FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_purchases" ON purchases;
CREATE POLICY "auth_update_purchases" ON purchases FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_delete_purchases" ON purchases;
CREATE POLICY "auth_delete_purchases" ON purchases FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- purchase_items
-- ============================================================
DROP POLICY IF EXISTS "auth_select_purchase_items" ON purchase_items;
CREATE POLICY "auth_select_purchase_items" ON purchase_items FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_purchase_items" ON purchase_items;
CREATE POLICY "auth_insert_purchase_items" ON purchase_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_purchase_items" ON purchase_items;
CREATE POLICY "auth_update_purchase_items" ON purchase_items FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_delete_purchase_items" ON purchase_items;
CREATE POLICY "auth_delete_purchase_items" ON purchase_items FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- sales
-- ============================================================
DROP POLICY IF EXISTS "auth_select_sales" ON sales;
CREATE POLICY "auth_select_sales" ON sales FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_sales" ON sales;
CREATE POLICY "auth_insert_sales" ON sales FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_sales" ON sales;
CREATE POLICY "auth_update_sales" ON sales FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_delete_sales" ON sales;
CREATE POLICY "auth_delete_sales" ON sales FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- sale_items
-- ============================================================
DROP POLICY IF EXISTS "auth_select_sale_items" ON sale_items;
CREATE POLICY "auth_select_sale_items" ON sale_items FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_sale_items" ON sale_items;
CREATE POLICY "auth_insert_sale_items" ON sale_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_sale_items" ON sale_items;
CREATE POLICY "auth_update_sale_items" ON sale_items FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_delete_sale_items" ON sale_items;
CREATE POLICY "auth_delete_sale_items" ON sale_items FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- sale_credits
-- ============================================================
DROP POLICY IF EXISTS "auth_select_sale_credits" ON sale_credits;
CREATE POLICY "auth_select_sale_credits" ON sale_credits FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_sale_credits" ON sale_credits;
CREATE POLICY "auth_insert_sale_credits" ON sale_credits FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_sale_credits" ON sale_credits;
CREATE POLICY "auth_update_sale_credits" ON sale_credits FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_delete_sale_credits" ON sale_credits;
CREATE POLICY "auth_delete_sale_credits" ON sale_credits FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- credit_payments
-- ============================================================
DROP POLICY IF EXISTS "auth_select_credit_payments" ON credit_payments;
CREATE POLICY "auth_select_credit_payments" ON credit_payments FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_credit_payments" ON credit_payments;
CREATE POLICY "auth_insert_credit_payments" ON credit_payments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_credit_payments" ON credit_payments;
CREATE POLICY "auth_update_credit_payments" ON credit_payments FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_delete_credit_payments" ON credit_payments;
CREATE POLICY "auth_delete_credit_payments" ON credit_payments FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- transfers
-- ============================================================
DROP POLICY IF EXISTS "auth_select_transfers" ON transfers;
CREATE POLICY "auth_select_transfers" ON transfers FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_transfers" ON transfers;
CREATE POLICY "auth_insert_transfers" ON transfers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_transfers" ON transfers;
CREATE POLICY "auth_update_transfers" ON transfers FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_delete_transfers" ON transfers;
CREATE POLICY "auth_delete_transfers" ON transfers FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- transfer_items
-- ============================================================
DROP POLICY IF EXISTS "auth_select_transfer_items" ON transfer_items;
CREATE POLICY "auth_select_transfer_items" ON transfer_items FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_transfer_items" ON transfer_items;
CREATE POLICY "auth_insert_transfer_items" ON transfer_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_transfer_items" ON transfer_items;
CREATE POLICY "auth_update_transfer_items" ON transfer_items FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_delete_transfer_items" ON transfer_items;
CREATE POLICY "auth_delete_transfer_items" ON transfer_items FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- cash_register_movements
-- ============================================================
DROP POLICY IF EXISTS "auth_select_cash_register_movements" ON cash_register_movements;
CREATE POLICY "auth_select_cash_register_movements" ON cash_register_movements FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_cash_register_movements" ON cash_register_movements;
CREATE POLICY "auth_insert_cash_register_movements" ON cash_register_movements FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_cash_register_movements" ON cash_register_movements;
CREATE POLICY "auth_update_cash_register_movements" ON cash_register_movements FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_delete_cash_register_movements" ON cash_register_movements;
CREATE POLICY "auth_delete_cash_register_movements" ON cash_register_movements FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- user_branches
-- ============================================================
DROP POLICY IF EXISTS "auth_select_user_branches" ON user_branches;
CREATE POLICY "auth_select_user_branches" ON user_branches FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_user_branches" ON user_branches;
CREATE POLICY "auth_insert_user_branches" ON user_branches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_user_branches" ON user_branches;
CREATE POLICY "auth_update_user_branches" ON user_branches FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_delete_user_branches" ON user_branches;
CREATE POLICY "auth_delete_user_branches" ON user_branches FOR DELETE USING (auth.role() = 'authenticated');
