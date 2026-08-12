const sql = `
ALTER TABLE cash_register_movements
    ADD COLUMN IF NOT EXISTS handler_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE cash_register_movements
SET handler_user_id = COALESCE(handler_user_id, created_by)
WHERE handler_user_id IS NULL AND created_by IS NOT NULL;
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
    console.log('Migración 016 ejecutada con éxito:', JSON.stringify(result, null, 2))
    return
  }

  const text = await res.text()
  console.log('Status:', res.status)
  console.log('Response:', text)
  console.log('\n---')
  console.log('No se pudo ejecutar automáticamente.')
  console.log('Ejecuta el SQL en Supabase Dashboard → SQL Editor.')
  console.log('SQL file: supabase/migrations/20240807_000016_cash_handler_user.sql')
}

main().catch(console.error)