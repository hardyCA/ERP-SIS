'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/shared/lib/supabase/browser'

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsAdmin(false); return }

      if (user.email === 'admin@gmail.com') {
        setIsAdmin(true)
        return
      }

      const { data: roles } = await supabase
        .from('user_branches')
        .select('role')
        .eq('user_id', user.id)

      setIsAdmin(!!roles?.some(r => r.role === 'admin'))
    })()
  }, [])

  return isAdmin
}

export function useIsAdminOrManager() {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAllowed(false); return }

      if (user.email === 'admin@gmail.com') {
        setAllowed(true)
        return
      }

      const { data: roles } = await supabase
        .from('user_branches')
        .select('role')
        .eq('user_id', user.id)

      setAllowed(!!roles?.some(r => r.role === 'admin' || r.role === 'manager'))
    })()
  }, [])

  return allowed
}

export function useShowCost() {
  return useIsAdmin()
}

export function useCurrentUser(): { name: string; isLoading: boolean } {
  const [name, setName] = useState('Usuario')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const meta = user.user_metadata as Record<string, unknown> | undefined
        const fullName = (meta?.full_name as string) || ''
        setName(fullName || user.email || user.phone || 'Usuario')
      }
      setIsLoading(false)
    })()
  }, [])

  return { name, isLoading }
}

export function useCurrentUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)
    })()
  }, [])

  return userId
}
