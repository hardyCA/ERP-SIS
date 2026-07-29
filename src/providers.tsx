'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from 'sonner'
import { BranchProvider } from '@/shared/contexts/branch-context'

const isDev = process.env.NODE_ENV === 'development'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: isDev ? 0 : 30 * 1000,
            gcTime: isDev ? 0 : 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: true,
            refetchOnMount: true,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <BranchProvider>
        {children}
      </BranchProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  )
}
