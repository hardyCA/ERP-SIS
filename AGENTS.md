<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project State (2026-07-23)

### ✅ Completed
- [x] Migration SQL ejecutada en Supabase (15 tablas, índices, triggers, ENUMs, RLS-ready)
- [x] Bucket "products" creado en Storage (público)
- [x] Types generados: `src/shared/types/database.types.ts` (de la DB real vía script)
- [x] Branch types actualizados para usar Database types
- [x] Build, typecheck, lint pasan
- [x] Auth: login, register, logout funcionales
- [x] Proxy (middleware) configurado para proteger rutas
- [x] Dashboard con sidebar, layout responsive y selector de sucursal global
- [x] Costo promedio ponderado implementado (al registrar compra)
- [x] Usuario admin creado: admin@gmail.com
- [x] Supabase Auth: Site URL configurado, Redirect URLs configurado, "Confirm email" deshabilitado
- [x] Módulo Branches completo (CRUD + activar/desactivar)
- [x] Módulo Users completo (CRUD + asignación a sucursales + roles)
- [x] Módulo Brands refactorizado como raíz del Catálogo (CRUD + modal)
- [x] Módulo Categories refactorizado con brand_id (CRUD + modal)
- [x] Módulo Products refactorizado anidado bajo Brand > Category (CRUD + imagen + costo)
- [x] Módulo Inventory (stock por sucursal, ajuste, precios de venta, alerta stock bajo)
- [x] Módulo Purchases (CRUD, aumento automático de stock, costo promedio, sucursal global)
- [x] Módulo Sales (ventas contado/QR/mixto/crédito, clientes, descuento de stock)
- [x] Módulo Credits (lista de créditos, registro de pagos)
- [x] Módulo Transfers (flujo pendiente→enviado→recibido/cancelado)
- [x] Módulo Cash Register (movimientos, saldo)
- [x] Sidebar actualizado: "Catálogo" como entrada única
- [x] Módulo Reports (Dashboard con KPIs reales, reportes de ventas/inventario/caja/créditos)
- [x] Dashboard con datos reales (productos, ventas hoy, créditos activos, saldo caja, alerta stock bajo)
- [x] Admin puede restablecer contraseña de usuarios desde /users/[id]
- [x] Usuario puede cambiar su propia contraseña desde /profile
- [x] Módulo Reports completo (dashboard KPIs, reportes ventas/inventario/caja/créditos)
- [x] Transferencias de efectivo entre sucursales desde Caja (método: Efectivo/QR/Mixto)
- [x] Eliminar venta (hard delete, solo admin): RPC delete_sale restaura stock, revierte caja y elimina crédito/pagos en una transacción (migración 010 pendiente de ejecutar)
- [x] Compras seguras: RPCs approve/cancel/delete_purchase (transaccionales, aprobar/cancelar solo admin/manager, eliminar solo admin), confirmaciones en UI, migración 011 pendiente de ejecutar
- [x] Editar compras pendientes: RPC update_purchase (transaccional, solo pending, admin/manager, reemplaza items/gastos), formulario con modo edición (/purchases/[id]/edit), botón "Editar" en detalle para compras pending (migración 012 pendiente de ejecutar). Registrar proveedor desde Compras ya disponible vía SupplierSelector
- [x] Caja Chica desglose efectivo/QR: columnas payment_method/cash_amount/qr_amount en cash_register_movements, backfill parseando descripciones, todos los flujos (ventas, movimientos manuales, transferencias, pagos de crédito) registran el método; desglose QR/Efectivo bajo Saldo/Ingresos/Egresos (migración 013 pendiente de ejecutar)
- [x] Clientes con más datos: columnas address y document_id, formulario y lista actualizados (migración 014 pendiente de ejecutar)
- [x] Migraciones 010–015 ejecutadas en Supabase y verificadas con `scripts/verify-production.js` (columnas, RLS en todas las tablas incl. customers, RPCs protegidos)
- [x] Registro público eliminado: /register removido, login sin "crear cuenta" ni "olvidé contraseña". La creación de usuarios y el restablecimiento de contraseña son SOLO por admin desde /users (assertAdmin + service role). El email de recuperación (auth/callback) fue descartado por decisión del usuario
- [x] Verificación de producción: `node scripts/verify-production.js` (todo verde)

### 🔜 Próximos pasos
- Fase 7: Pulido, pruebas, despliegue
- Lint completo: errores preexistentes en scripts/*.js (no-require-imports) y src/app/(dashboard)/layout-client.tsx:48 (no-children-prop); no bloquean build
