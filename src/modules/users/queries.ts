'use client'

import { useQuery } from '@tanstack/react-query'
import { getUsers, getUser, getAvailableBranches } from './actions'
import type { UserWithAssignments } from './types'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const result = await getUsers()
      if (!result.success) throw new Error(result.message)
      return result.data as UserWithAssignments[]
    },
    staleTime: 0,
  })
}

export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: async () => {
      if (!userId) return null
      const result = await getUser(userId)
      if (!result.success) throw new Error(result.message)
      return result.data as UserWithAssignments | null
    },
    enabled: !!userId,
  })
}

export function useAvailableBranches() {
  return useQuery({
    queryKey: ['branches', 'available'],
    queryFn: async () => {
      const result = await getAvailableBranches()
      if (!result.success) throw new Error(result.message)
      return result.data as { id: string; name: string; is_active: boolean }[]
    },
  })
}
