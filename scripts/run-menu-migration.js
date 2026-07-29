// Run migration: create menu_items table + seed data
const sql = `
-- ============================================================
-- SIIM - Menú Dinámico
-- Tabla para gestionar el menú lateral desde administración
-- ============================================================

CREATE TABLE IF NOT EXISTS menu_items (
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

-- Seed
INSERT INTO menu_items (group_title, name, href, icon, sort_order, required_role) VALUES
    ('Visión General', 'Dashboard', '/', 'LayoutDashboard', 10, NULL),
    ('Inventario & Catálogo', 'Catálogo', '/brands', 'FolderTree', 20, NULL),
    ('Inventario & Catálogo', 'Inventario', '/inventory', 'Warehouse', 30, NULL),
    ('Inventario & Catálogo', 'Proveedores', '/suppliers', 'Truck', 40, NULL),
    ('Inventario & Catálogo', 'Traspasos', '/transfers', 'ArrowLeftRight', 50, NULL),
    ('Ventas & Operaciones', 'Ventas (POS)', '/sales', 'Receipt', 60, NULL),
    ('Ventas & Operaciones', 'Compras', '/purchases', 'ShoppingCart', 70, NULL),
    ('Ventas & Operaciones', 'Créditos', '/credits', 'CreditCard', 80, NULL),
    ('Ventas & Operaciones', 'Caja Chica', '/cash-register', 'Banknote', 90, NULL),
    ('Gestión & Reportes', 'Sucursales', '/branches', 'Store', 100, NULL),
    ('Gestión & Reportes', 'Usuarios', '/users', 'Users', 110, 'admin'),
    ('Gestión & Reportes', 'Reportes ERP', '/reports', 'BarChart3', 120, NULL)
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_menu_items_sort ON menu_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_active ON menu_items(is_active) WHERE is_active = true;
`;

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars')
  process.exit(1)
}

async function main() {
  // Try using pg_query_sql RPC (available on Supabase Pro)
  const supabase = createClient(supabaseUrl, serviceRoleKey)
  
  // First try via direct fetch to pg_query_sql
  const url = `${supabaseUrl}/rest/v1/rpc/pg_query_sql`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ query: sql }),
  })

  if (res.ok) {
    const result = await res.json()
    console.log('Migration executed successfully via pg_query_sql:', JSON.stringify(result, null, 2))
    return
  }

  // Fallback: try direct SQL endpoint
  console.log('pg_query_sql not found, trying direct SQL...')
  const res2 = await fetch(`${supabaseUrl}/rest/v1/?query=${encodeURIComponent(sql)}`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
  })

  if (res2.ok) {
    console.log('Migration executed successfully via direct SQL')
    return
  }

  // Last resort: try via the pg-manager API
  console.log('Direct SQL failed, trying create table via REST API...')
  
  // Create table by doing a simple INSERT - REST API auto-creates tables? No.
  // Just try with a smaller query
  const testSql = `SELECT 1`
  const res3 = await fetch(`${supabaseUrl}/rest/v1/rpc/pg_query_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ query: testSql }),
  })
  
  const text = await res3.text()
  console.log('Status:', res3.status)
  console.log('Response:', text)
  console.log('\n---')
  console.log('Failed to run migration automatically.')
  console.log('Please run the SQL in Supabase Dashboard → SQL Editor.')
  console.log(`SQL file: supabase/migrations/20240731_000009_menu_items.sql`)
}

main().catch(console.error)
