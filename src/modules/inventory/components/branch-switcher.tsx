'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getActiveBranches } from '@/shared/actions/branches'
import { Store } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface BranchSwitcherProps {
  currentBranchId: string
  className?: string
}

export function BranchSwitcher({ currentBranchId, className }: BranchSwitcherProps) {
  const { data: result, isLoading } = useQuery({
    queryKey: ['active-branches'],
    queryFn: getActiveBranches,
    staleTime: 30000,
  })

  const branches = (result?.success ? result.data : []) as Array<{ id: string; name: string }>

  if (isLoading || branches.length === 0) return null

  return (
    <nav className={cn('flex flex-wrap gap-2', className)} aria-label="Sucursales">
      {branches.map((branch) => (
        <Link
          key={branch.id}
          href={`/inventory?branch=${branch.id}`}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all',
            branch.id === currentBranchId
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
          )}
          aria-current={branch.id === currentBranchId ? 'page' : undefined}
        >
          <Store className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{branch.name}</span>
        </Link>
      ))}
    </nav>
  )
}