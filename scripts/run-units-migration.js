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

const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20240809_000018_units_of_measure.sql'), 'utf8')

async function main() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/pg_query_sql`, {
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
      console.log('Migración 018 ejecutada con éxito:', JSON.stringify(result, null, 2))
      return
    }
    console.log('pg_query_sql no disponible, ejecuta el SQL manualmente:')
  } catch (e) {
    console.log('Error:', e.message)
  }

  console.log('\n---')
  console.log('No se pudo ejecutar automáticamente.')
  console.log('Ejecuta el SQL en Supabase Dashboard → SQL Editor.')
  console.log('SQL file: supabase/migrations/20240809_000018_units_of_measure.sql')
}

main().catch(console.error)