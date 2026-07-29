'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getCategoriesByBrand } from '../actions'
import { Package } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { Categories } from '@/shared/types/database.types'

interface CategorySwitcherProps {
  brandId: string
  currentCategoryId?: string
  className?: string
}

export function CategorySwitcher({ brandId, currentCategoryId, className }: CategorySwitcherProps) {
  const { data: result, isLoading } = useQuery({
    queryKey: ['categories', brandId],
    queryFn: () => getCategoriesByBrand(brandId),
    staleTime: 0,
  })

  const categories = (result?.success ? result.data : []) as Categories[]

  if (isLoading || categories.length === 0) return null

  return (
    <nav className={cn('flex flex-wrap gap-2', className)} aria-label="Categorías">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/brands/${brandId}/categories/${category.id}`}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all',
            category.id === currentCategoryId
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
          )}
          aria-current={category.id === currentCategoryId ? 'page' : undefined}
        >
          <Package className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{category.name}</span>
        </Link>
      ))}
    </nav>
  )
}