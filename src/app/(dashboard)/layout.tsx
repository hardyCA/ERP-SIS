import { createClient } from '@/shared/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayoutClient } from './layout-client'

async function getServerBranches(userId: string, email: string) {
  const supabase = await createClient()

  let isAdmin = email === 'admin@gmail.com'
  if (!isAdmin) {
    const { data: roles } = await supabase
      .from('user_branches')
      .select('role')
      .eq('user_id', userId)
    if (roles?.some(r => r.role === 'admin')) isAdmin = true
  }

  if (isAdmin) {
    const { data } = await supabase
      .from('branches')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
    return data ?? []
  }

  const { data: assignments } = await supabase
    .from('user_branches')
    .select('branch_id')
    .eq('user_id', userId)

  if (!assignments || assignments.length === 0) return []

  const branchIds = assignments.map(a => a.branch_id)
  const { data } = await supabase
    .from('branches')
    .select('id, name')
    .in('id', branchIds)
    .eq('is_active', true)
    .order('name')
  return data ?? []
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const serverBranches = await getServerBranches(user.id, user.email ?? '')

  return (
    <DashboardLayoutClient serverBranches={serverBranches}>
      {children}
    </DashboardLayoutClient>
  )
}
