import { createClient } from '@/shared/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  listAuthUsers,
  createAuthUser,
  updateAuthUser,
  resetAuthUserPassword,
  deleteAuthUser,
  getAssignmentsForUser,
  assignUserToBranch,
  updateUserRole,
  removeUserFromBranch,
} from './repository'
import type { UserWithAssignments } from './types'

async function getAdminClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
}

export async function requireRole(allowedRoles: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  // Super admin por email
  if (user.email === 'admin@gmail.com') return user

  const admin = await getAdminClient()
  const { count } = await admin
    .from('user_branches')
    .select('*', { count: 'exact', head: true })

  const isFirstSetup = count === 0
  if (isFirstSetup) return user

  const { count: roleCount } = await admin
    .from('user_branches')
    .select('*', { count: 'exact', head: true })
    .in('role', allowedRoles)

  if (roleCount === 0) return user

  const { data } = await admin
    .from('user_branches')
    .select('role')
    .eq('user_id', user.id)
    .in('role', allowedRoles)
    .maybeSingle()

  if (!data) throw new Error('No tienes permisos para realizar esta acción')
  return user
}

export async function assertAdmin() {
  return requireRole(['admin'])
}

export async function assertAdminOrManager() {
  return requireRole(['admin', 'manager'])
}

export async function getUsersWithAssignments(): Promise<UserWithAssignments[]> {
  await assertAdmin()
  const authUsers = await listAuthUsers()
  const users: UserWithAssignments[] = []

  for (const u of authUsers) {
    const assignments = await getAssignmentsForUser(u.id)
    users.push({
      id: u.id,
      name: (u.user_metadata as { full_name?: string } | null)?.full_name ?? u.email ?? '',
      email: u.email ?? '',
      createdAt: u.created_at ?? '',
      lastSignInAt: u.last_sign_in_at ?? null,
      assignments,
    })
  }

  return users
}

export async function getUserWithAssignments(userId: string): Promise<UserWithAssignments | null> {
  await assertAdmin()
  const authUsers = await listAuthUsers()
  const user = authUsers.find(u => u.id === userId)
  if (!user) return null

  const assignments = await getAssignmentsForUser(user.id)
  return {
    id: user.id,
    name: (user.user_metadata as { full_name?: string } | null)?.full_name ?? user.email ?? '',
    email: user.email ?? '',
    createdAt: user.created_at ?? '',
    lastSignInAt: user.last_sign_in_at ?? null,
    assignments,
  }
}

export async function createUserAndAssign(email: string, password: string, name: string) {
  await assertAdmin()
  const authUser = await createAuthUser(email, password, name)
  return authUser
}

export async function assignBranch(userId: string, branchId: string, role: string) {
  await assertAdmin()
  await assignUserToBranch(userId, branchId, role)
}

export async function changeUserRole(userId: string, branchId: string, role: string) {
  await assertAdmin()
  await updateUserRole(userId, branchId, role)
}

export async function removeBranch(userId: string, branchId: string) {
  await assertAdmin()
  await removeUserFromBranch(userId, branchId)
}

export async function resetPassword(userId: string, newPassword: string) {
  await assertAdmin()
  await resetAuthUserPassword(userId, newPassword)
}

export async function updateUser(userId: string, name: string) {
  await assertAdmin()
  await updateAuthUser(userId, name)
}

export async function deleteUser(userId: string) {
  await assertAdmin()
  await deleteAuthUser(userId)
}
