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

export async function getUserBranches() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: true, data: [] }

    let isAdmin = user.email === 'admin@gmail.com'
    if (!isAdmin) {
      const { data: roles } = await supabase
        .from('user_branches')
        .select('role')
        .eq('user_id', user.id)
      if (roles?.some(r => r.role === 'admin')) isAdmin = true
    }

    if (isAdmin) {
      const { data, error } = await supabase.from('branches').select('id, name').eq('is_active', true).order('name')
      if (error) throw new Error(error.message)
      return { success: true, data: data ?? [] }
    }

    const { data: assignments, error: asgnErr } = await supabase
      .from('user_branches')
      .select('branch_id')
      .eq('user_id', user.id)
    if (asgnErr) throw new Error(asgnErr.message)

    if (!assignments || assignments.length === 0) return { success: true, data: [] }

    const branchIds = assignments.map(a => a.branch_id)
    const { data: branches, error: brErr } = await supabase
      .from('branches')
      .select('id, name')
      .in('id', branchIds)
      .eq('is_active', true)
      .order('name')
    if (brErr) throw new Error(brErr.message)

    return { success: true, data: branches ?? [] }
  } catch {
    return { success: false, data: [] }
  }
}
