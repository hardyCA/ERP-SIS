const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(url, anonKey)

async function main() {
  for (const table of ['branches', 'brands', 'categories', 'menu_items']) {
    const { data, error } = await supabase.from(table).select('*').limit(1)
    console.log(`${table}: rows=${data?.length ?? 0}, error=${error?.message ?? 'none'}`)
  }
}

main().catch(console.error)
