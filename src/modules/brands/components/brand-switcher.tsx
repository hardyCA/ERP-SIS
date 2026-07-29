'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getBrands } from '../actions'
import { Folder } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { Brands } from '@/shared/types/database.types'

interface BrandSwitcherProps {
  currentBrandId: string
  className?: string
}

export function BrandSwitcher({ currentBrandId, className }: BrandSwitcherProps) {
  const { data: result, isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: getBrands,
    staleTime: 0,
  })

  const brands = (result?.success ? result.data : []) as Brands[]

  if (isLoading || brands.length === 0) return null

  return (
    <nav className={cn('flex flex-wrap gap-2', className)} aria-label="Marcas">
      {brands.map((brand) => (
        <Link
          key={brand.id}
          href={`/brands/${brand.id}`}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all',
            brand.id === currentBrandId
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
          )}
          aria-current={brand.id === currentBrandId ? 'page' : undefined}
        >
          <Folder className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{brand.name}</span>
        </Link>
      ))}
    </nav>
  )
}