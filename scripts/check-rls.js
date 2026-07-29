const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(url, key)

async function main() {
  // Check RLS on key tables
  for (const table of ['branches', 'brands', 'menu_items']) {
    const { data, error } = await supabase.from(table).select('*').limit(1)
    console.log(`${table}: rows=${data?.length ?? 0}, error=${error?.message ?? 'none'}`)
  }
}

main().catch(console.error)
