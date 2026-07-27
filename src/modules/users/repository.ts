import { createClient } from '@/shared/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { UserRole, BranchAssignment } from './types'

async function createAdminClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
        },
      },
    }
  )
}

export async function listAuthUsers() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) throw new Error(error.message)
  return data.users
}

export async function createAuthUser(email: string, password: string, name: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  })
  if (error) throw new Error(error.message)
  return data.user
}

export async function getBranchAssignments(userId: string): Promise<BranchAssignment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_branches')
    .select(`
      id,
      branch_id,
      role,
      branches ( name )
    `)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return (data ?? []).map(item => {
    const branchData = item.branches as { name: string } | { name: string }[] | null
    const branchName = Array.isArray(branchData) ? branchData[0]?.name : branchData?.name
    return {
      id: item.id,
      branchId: item.branch_id,
      branchName: branchName ?? '',
      role: item.role as UserRole,
    }
  })
}

export async function listBranches() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('branches')
    .select('id, name, is_active')
    .eq('is_active', true)
    .order('name')

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function assignUserToBranch(userId: string, branchId: string, role: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('user_branches')
    .insert({ user_id: userId, branch_id: branchId, role })
  if (error) throw new Error(error.message)
}

export async function updateUserRole(userId: string, branchId: string, role: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('user_branches')
    .update({ role })
    .eq('user_id', userId)
    .eq('branch_id', branchId)
  if (error) throw new Error(error.message)
}

export async function removeUserFromBranch(userId: string, branchId: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('user_branches')
    .delete()
    .eq('user_id', userId)
    .eq('branch_id', branchId)
  if (error) throw new Error(error.message)
}

export async function listBranchesForAdmin() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('branches')
    .select('id, name, is_active')
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function updateAuthUser(userId: string, name: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { full_name: name },
  })
  if (error) throw new Error(error.message)
  return data.user
}

export async function resetAuthUserPassword(userId: string, newPassword: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  })
  if (error) throw new Error(error.message)
  return data.user
}

export async function deleteAuthUser(userId: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)
}

export async function getAssignmentsForUser(userId: string): Promise<BranchAssignment[]> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('user_branches')
    .select(`
      id,
      branch_id,
      role,
      branches ( name )
    `)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  return (data ?? []).map(item => {
    const branchData = item.branches as { name: string } | { name: string }[] | null
    const branchName = Array.isArray(branchData) ? branchData[0]?.name : branchData?.name
    return {
      id: item.id,
      branchId: item.branch_id,
      branchName: branchName ?? '',
      role: item.role as UserRole,
    }
  })
}
