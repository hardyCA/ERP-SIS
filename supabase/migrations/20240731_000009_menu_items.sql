-- ============================================================
-- SIIM - Menú Dinámico
-- Tabla para gestionar el menú lateral desde administración
-- ============================================================

CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_title TEXT NOT NULL,
    name TEXT NOT NULL,
    href TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'Circle',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    required_role TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed: menú por defecto (mismo orden que el sidebar actual)
INSERT INTO menu_items (group_title, name, href, icon, sort_order, required_role) VALUES
    ('Visión General', 'Panel Principal', '/', 'LayoutDashboard', 10, NULL),
    ('Inventario y Catálogo', 'Catálogo', '/brands', 'FolderTree', 20, NULL),
    ('Inventario y Catálogo', 'Unidad de Medida', '/brands?tab=units', 'Ruler', 25, NULL),
    ('Inventario y Catálogo', 'Inventario', '/inventory', 'Warehouse', 30, NULL),
    ('Inventario y Catálogo', 'Proveedores', '/suppliers', 'Truck', 40, NULL),
    ('Inventario y Catálogo', 'Traspasos', '/transfers', 'ArrowLeftRight', 50, NULL),
    ('Ventas y Operaciones', 'Punto de Venta', '/sales', 'Receipt', 60, NULL),
    ('Ventas y Operaciones', 'Compras', '/purchases', 'ShoppingCart', 70, NULL),
    ('Ventas y Operaciones', 'Créditos', '/credits', 'CreditCard', 80, NULL),
    ('Ventas y Operaciones', 'Caja Chica', '/cash-register', 'Banknote', 90, NULL),
    ('Gestión y Reportes', 'Sucursales', '/branches', 'Store', 100, NULL),
    ('Gestión y Reportes', 'Usuarios', '/users', 'Users', 110, 'admin'),
    ('Gestión y Reportes', 'Reportes ERP', '/reports', 'BarChart3', 120, NULL);

CREATE INDEX idx_menu_items_sort ON menu_items(sort_order);
CREATE INDEX idx_menu_items_active ON menu_items(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_menu_items" ON menu_items;
CREATE POLICY "auth_select_menu_items" ON menu_items FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_menu_items" ON menu_items;
CREATE POLICY "auth_insert_menu_items" ON menu_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_menu_items" ON menu_items;
CREATE POLICY "auth_update_menu_items" ON menu_items FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_delete_menu_items" ON menu_items;
CREATE POLICY "auth_delete_menu_items" ON menu_items FOR DELETE USING (auth.role() = 'authenticated');

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
