'use server'

import { createClient } from '@/shared/lib/supabase/server'

export async function getActiveBranches() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('branches').select('id, name').eq('is_active', true).order('name')
    if (error) throw new Error(error.message)
    return { success: true, data: data ?? [] }
  } catch {
    return { success: false, data: [] }
  }
}
