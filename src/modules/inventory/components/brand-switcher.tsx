'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getBrands } from '@/modules/brands/actions'
import { Folder } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { Brands } from '@/shared/types/database.types'

interface BrandSwitcherProps {
  branchId: string
  currentBrandId?: string
  className?: string
}

export function BrandSwitcher({ branchId, currentBrandId, className }: BrandSwitcherProps) {
  const { data: result, isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: getBrands,
    staleTime: 0,
  })

  const brands = (result?.success ? result.data : []) as Brands[]

  if (isLoading || brands.length === 0) return null

  return (
    <nav className={cn('mb-4', className)} aria-label="Marcas">
      <div className="flex items-center gap-2 overflow-x-auto px-2 pb-2 -mx-2 scrollbar-hide">
        <span className="text-xs font-medium text-muted-foreground mr-2 whitespace-nowrap shrink-0">Marcas:</span>
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/inventory?branch=${branchId}&brand=${brand.id}`}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap shrink-0 transition-all',
              brand.id === currentBrandId
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            aria-current={brand.id === currentBrandId ? 'page' : undefined}
          >
            <Folder className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{brand.name}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}