'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from './auth-context'
import { useBranch } from '@/shared/contexts/branch-context'
import { createClient } from '@/shared/lib/supabase/browser'

function useIsAdmin() {
  const { user } = useAuth()
  const { branchId } = useBranch()

  return useQuery({
    queryKey: ['user-role', user?.id, branchId],
    queryFn: async () => {
      if (!user) return false
      const supabase = createClient()
      let query = supabase
        .from('user_branches')
        .select('role')
        .eq('user_id', user.id)

      if (branchId) {
        query = query.eq('branch_id', branchId)
      }

      const { data } = await query
      return data?.some(r => r.role === 'admin') ?? false
    },
    enabled: !!user,
    staleTime: 30000,
  })
}

export function useShowCost() {
  const { data: isAdmin } = useIsAdmin()
  return isAdmin ?? false
}
