'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/shared/lib/supabase/browser'

export function useShowCost() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setShow(false); return }

      if (user.email === 'admin@gmail.com') {
        setShow(true)
        return
      }

      const { data: roles } = await supabase
        .from('user_branches')
        .select('role')
        .eq('user_id', user.id)

      if (roles?.some(r => r.role === 'admin')) {
        setShow(true)
      }
    })()
  }, [])

  return show
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
