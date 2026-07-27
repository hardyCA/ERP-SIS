import { createClient } from '@/shared/lib/supabase/server'
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

export async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { count } = await supabase
    .from('user_branches')
    .select('*', { count: 'exact', head: true })

  const isFirstSetup = count === 0

  if (isFirstSetup) {
    return user
  }

  const { data } = await supabase
    .from('user_branches')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle()

  if (!data) throw new Error('Solo los administradores pueden gestionar usuarios')
  return user
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
