const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

async function main() {
  // Attempt to query RLS info via raw SQL endpoint  
  // First, try to disable RLS on menu_items
  const sql = `ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;`
  
  const res = await fetch(url + '/rest/v1/rpc/pg_query_sql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': 'Bearer ' + key,
    },
    body: JSON.stringify({ query: sql }),
  })
  
  const text = await res.text()
  console.log('Disable RLS result:', res.status, text)
  
  // Try again
  const supabase = createClient(url, key)
  const { data } = await supabase.from('menu_items').select('*').limit(1)
  console.log('After disable, rows:', data?.length ?? 0)
}

main().catch(console.error)
