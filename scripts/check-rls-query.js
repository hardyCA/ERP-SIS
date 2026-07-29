const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

// Try to query RLS info via pg_catalog
async function main() {
  // Use fetch to Supabase REST API with raw SQL via the custom function endpoint
  // First, check if pg_query_sql exists
  const checkRes = await fetch(`${url}/rest/v1/rpc/pg_query_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': 'Bearer ' + key,
    },
    body: JSON.stringify({ query: `SELECT 1 AS test` }),
  })
  console.log('pg_query_sql exists:', checkRes.status, await checkRes.text())
}

main().catch(console.error)
