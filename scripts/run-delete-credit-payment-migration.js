const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars')
  process.exit(1)
}

async function main() {
  const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '20240811_000019_delete_credit_payment.sql')
  const sql = fs.readFileSync(sqlFile, 'utf8')

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
    console.log('Migración 019 ejecutada con éxito:', JSON.stringify(result, null, 2))
    return
  }

  const text = await res.text()
  console.log('Status:', res.status)
  console.log('Response:', text)
  console.log('\n---')
  console.log('No se pudo ejecutar automáticamente.')
  console.log('Ejecuta el SQL en Supabase Dashboard → SQL Editor.')
  console.log('SQL file: supabase/migrations/20240811_000019_delete_credit_payment.sql')
}

main().catch(console.error)