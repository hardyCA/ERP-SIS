const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const service = createClient(url, serviceKey)
const anon = createClient(url, anonKey)

async function checkColumns() {
  const checks = [
    ['cash_register_movements', 'payment_method'],
    ['cash_register_movements', 'cash_amount'],
    ['cash_register_movements', 'qr_amount'],
    ['customers', 'address'],
    ['customers', 'document_id'],
    ['purchases', 'supplier_id'],
    ['purchases', 'status'],
    ['sales', 'discount'],
  ]
  for (const [table, column] of checks) {
    const { error } = await service.from(table).select(column).limit(1)
    console.log(`column ${table}.${column}: ${error ? 'FALTA → ' + error.message : 'ok'}`)
  }
}

async function checkAnonLocked() {
  const tables = ['customers', 'suppliers', 'menu_items', 'purchases', 'cash_register_movements', 'user_branches', 'products']
  for (const table of tables) {
    const [{ data: anonData, error: anonErr }, { count, error: svcErr }] = await Promise.all([
      anon.from(table).select('*').limit(1),
      service.from(table).select('id', { count: 'exact', head: true }),
    ])
    if (anonErr) {
      console.log(`anon ${table}: BLOQUEADO (ok) → ${anonErr.message}`)
    } else if ((anonData?.length ?? 0) > 0) {
      console.log(`anon ${table}: EXPUESTO (riesgo RLS!) filas=${anonData.length}`)
    } else if ((count ?? 0) > 0) {
      console.log(`anon ${table}: protegido (${count} filas en BD, anon ve 0)`)
    } else if (svcErr) {
      console.log(`anon ${table}: sin verificar → ${svcErr.message}`)
    } else {
      console.log(`anon ${table}: tabla vacía (0 filas, no concluyente)`)
    }
  }
}

async function checkRpc() {
  const dummyId = '00000000-0000-0000-0000-000000000000'
  const calls = [
    ['approve_purchase', { p_purchase_id: dummyId }],
    ['cancel_purchase', { p_purchase_id: dummyId }],
    ['delete_purchase', { p_purchase_id: dummyId }],
    ['update_purchase', { p_purchase_id: dummyId, p_branch_id: dummyId, p_supplier_id: null, p_notes: 'x', p_items: '[]', p_expenses: '[]' }],
    ['delete_sale', { p_sale_id: dummyId }],
  ]
  for (const [fn, args] of calls) {
    const { error } = await anon.rpc(fn, args)
    const missing = error?.message?.includes('Could not find the function')
    if (missing) {
      console.log(`rpc ${fn}: NO existe → ${error.message}`)
    } else if (error?.message?.includes('permission denied')) {
      console.log(`rpc ${fn}: existe y está protegido (anon: permiso denegado)`)
    } else {
      console.log(`rpc ${fn}: existe (error esperado de validación: ${error?.message ?? 'sin error'})`)
    }
  }
}

async function checkCounts() {
  for (const table of ['menu_items', 'customers', 'products', 'sales']) {
    const { count, error } = await service.from(table).select('id', { count: 'exact', head: true })
    console.log(`service ${table}: ${error ? 'error → ' + error.message : count + ' filas'}`)
  }
}

async function checkAnonInsert() {
  const { data, error } = await anon.from('brands').insert({ name: '__rls_test__' }).select('id')
  if (error) {
    console.log(`anon INSERT brands: BLOQUEADO (ok) → ${error.message}`)
  } else {
    console.log(`anon INSERT brands: PERMITIDO (¡RLS APAGADO!) id=${data?.[0]?.id}`)
    if (data?.[0]?.id) {
      await service.from('brands').delete().eq('name', '__rls_test__')
      console.log('  (fila de prueba eliminada vía service role)')
    }
  }
}

async function main() {
  console.log('--- Columnas (service role) ---')
  await checkColumns()
  console.log('\n--- RLS / acceso anon (SELECT) ---')
  await checkAnonLocked()
  console.log('\n--- RLS (prueba de INSERT anon) ---')
  await checkAnonInsert()
  console.log('\n--- Conteos (service role) ---')
  await checkCounts()
  console.log('\n--- RPCs (función presente) ---')
  await checkRpc()
}

main().catch(console.error)
