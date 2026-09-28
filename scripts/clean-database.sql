-- ============================================================================
-- LIMPIEZA GENERAL DE LA BASE DE DATOS (PRODUCCIÓN)
-- Fecha: 2026-09-28
--
-- CONSERVA (no se toca):
--   auth.users .............. cuentas/login de usuarios
--   user_branches ........... asignación usuario <-> sucursal
--   branches ................ sucursales
--   menu_items .............. configuración del menú lateral
--   units_of_measure ........ unidades de medida
--
-- BORRA:
--   Catálogo ................ brands, categories, products, suppliers
--   Clientes ................ customers
--   Inventario .............. inventory_items
--   Ventas .................. sales, sale_items, sale_credits, credit_payments
--   Compras ................. purchases, purchase_items, purchase_expenses
--   Cotizaciones ............ quotes, quote_items
--   Traspasos ............... transfers, transfer_items
--   Caja .................... cash_register_movements
--
-- DÓNDE EJECUTARLO:
--   Supabase Dashboard -> SQL Editor -> New query -> pegar todo -> Run
--
-- SEGURIDAD:
--   Todo va dentro de BEGIN/COMMIT: o se aplica completo o se revierte completo.
--   RESTART IDENTITY reinicia los contadores (quotes.number vuelve a 1).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) CONTEOS ANTES (para tu referencia)
-- ---------------------------------------------------------------------------
SELECT 'antes' AS momento, x.tabla, x.filas
FROM (
  SELECT 'branches' AS tabla, count(*) AS filas FROM branches
  UNION ALL SELECT 'brands', count(*) FROM brands
  UNION ALL SELECT 'categories', count(*) FROM categories
  UNION ALL SELECT 'products', count(*) FROM products
  UNION ALL SELECT 'suppliers', count(*) FROM suppliers
  UNION ALL SELECT 'customers', count(*) FROM customers
  UNION ALL SELECT 'inventory_items', count(*) FROM inventory_items
  UNION ALL SELECT 'sales', count(*) FROM sales
  UNION ALL SELECT 'sale_items', count(*) FROM sale_items
  UNION ALL SELECT 'sale_credits', count(*) FROM sale_credits
  UNION ALL SELECT 'credit_payments', count(*) FROM credit_payments
  UNION ALL SELECT 'purchases', count(*) FROM purchases
  UNION ALL SELECT 'purchase_items', count(*) FROM purchase_items
  UNION ALL SELECT 'purchase_expenses', count(*) FROM purchase_expenses
  UNION ALL SELECT 'quotes', count(*) FROM quotes
  UNION ALL SELECT 'quote_items', count(*) FROM quote_items
  UNION ALL SELECT 'transfers', count(*) FROM transfers
  UNION ALL SELECT 'transfer_items', count(*) FROM transfer_items
  UNION ALL SELECT 'cash_register_movements', count(*) FROM cash_register_movements
  UNION ALL SELECT 'menu_items', count(*) FROM menu_items
  UNION ALL SELECT 'units_of_measure', count(*) FROM units_of_measure
  UNION ALL SELECT 'user_branches', count(*) FROM user_branches
  UNION ALL SELECT 'auth.users', count(*) FROM auth.users
) x
ORDER BY x.tabla;

-- ---------------------------------------------------------------------------
-- 2) LIMPIEZA
--    Orden hijo->padre no es obligatorio porque se usa TRUNCATE ... CASCADE,
--    que resuelve las dependencias de claves foráneas automáticamente.
--    Ninguna tabla conservada referencia a las que se truncan, así que
--    CASCADE no puede arrastrar branches, menu_items, units_of_measure
--    ni user_branches.
-- ---------------------------------------------------------------------------
TRUNCATE TABLE
    quote_items,
    quotes,
    sale_items,
    sale_credits,
    credit_payments,
    sales,
    purchase_items,
    purchase_expenses,
    purchases,
    transfer_items,
    transfers,
    cash_register_movements,
    inventory_items,
    products,
    categories,
    brands,
    suppliers,
    customers
RESTART IDENTITY
CASCADE;

COMMIT;

-- ---------------------------------------------------------------------------
-- 3) VERIFICACIÓN DESPUÉS
--    Esperado:
--      - filas = 0 en todas las tablas listadas arriba
--      - branches = 6, menu_items = 15, units_of_measure = 8,
--        user_branches = 18 (o los tuyos), auth.users = sin cambios
-- ---------------------------------------------------------------------------
SELECT 'despues' AS momento, x.tabla, x.filas
FROM (
  SELECT 'branches' AS tabla, count(*) AS filas FROM branches
  UNION ALL SELECT 'brands', count(*) FROM brands
  UNION ALL SELECT 'categories', count(*) FROM categories
  UNION ALL SELECT 'products', count(*) FROM products
  UNION ALL SELECT 'suppliers', count(*) FROM suppliers
  UNION ALL SELECT 'customers', count(*) FROM customers
  UNION ALL SELECT 'inventory_items', count(*) FROM inventory_items
  UNION ALL SELECT 'sales', count(*) FROM sales
  UNION ALL SELECT 'sale_items', count(*) FROM sale_items
  UNION ALL SELECT 'sale_credits', count(*) FROM sale_credits
  UNION ALL SELECT 'credit_payments', count(*) FROM credit_payments
  UNION ALL SELECT 'purchases', count(*) FROM purchases
  UNION ALL SELECT 'purchase_items', count(*) FROM purchase_items
  UNION ALL SELECT 'purchase_expenses', count(*) FROM purchase_expenses
  UNION ALL SELECT 'quotes', count(*) FROM quotes
  UNION ALL SELECT 'quote_items', count(*) FROM quote_items
  UNION ALL SELECT 'transfers', count(*) FROM transfers
  UNION ALL SELECT 'transfer_items', count(*) FROM transfer_items
  UNION ALL SELECT 'cash_register_movements', count(*) FROM cash_register_movements
  UNION ALL SELECT 'menu_items', count(*) FROM menu_items
  UNION ALL SELECT 'units_of_measure', count(*) FROM units_of_measure
  UNION ALL SELECT 'user_branches', count(*) FROM user_branches
  UNION ALL SELECT 'auth.users', count(*) FROM auth.users
) x
ORDER BY x.tabla;

-- Contador de cotizaciones reiniciado (debe volver a 1)
SELECT COALESCE(max(number), 0) + 1 AS proximo_numero_quote FROM quotes;

-- ============================================================================
-- (OPCIONAL) VACIAR EL BUCKET DE IMÁGENES "products"
-- Quedan ~11 archivos huérfanos porque products se vació.
-- Si quieres eliminarlos, ejecuta esto en un SEGUNDO paso, tras verificar
-- que la limpieza anterior salió bien:
--
-- DELETE FROM storage.objects WHERE bucket_id = 'products';
-- ============================================================================
