'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getCategoriesByBrand } from '@/modules/categories/actions'
import { Package } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { Categories } from '@/shared/types/database.types'

interface CategorySwitcherProps {
  branchId: string
  brandId: string
  currentCategoryId?: string
  className?: string
}

export function CategorySwitcher({ branchId, brandId, currentCategoryId, className }: CategorySwitcherProps) {
  const { data: result, isLoading } = useQuery({
    queryKey: ['categories', brandId],
    queryFn: () => getCategoriesByBrand(brandId),
    staleTime: 30000,
    enabled: !!brandId,
  })

  const categories = (result?.success ? result.data : []) as Categories[]

  if (isLoading || categories.length === 0) return null

  return (
    <nav className={cn('mb-4', className)} aria-label="Categorías">
      <div className="flex items-center gap-2 overflow-x-auto px-2 pb-2 -mx-2 scrollbar-hide">
        <span className="text-xs font-medium text-muted-foreground mr-2 whitespace-nowrap shrink-0">Categorías:</span>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/inventory?branch=${branchId}&brand=${brandId}&category=${category.id}`}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap shrink-0 transition-all',
              category.id === currentCategoryId
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            aria-current={category.id === currentCategoryId ? 'page' : undefined}
          >
            <Package className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{category.name}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}