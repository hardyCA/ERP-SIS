'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getCategoriesByBrand, deleteCategory } from '../actions'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Card,
  CardContent,
} from '@/shared/components/ui/card'
import { Pencil, Trash2, FolderOpen } from 'lucide-react'
import Link from 'next/link'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'

interface CategoryListProps {
  brandId: string
  onEdit: (id: string) => void
}

export function CategoryList({ brandId, onEdit }: CategoryListProps) {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const { data: result, isLoading } = useQuery({
    queryKey: ['categories', brandId],
    queryFn: () => getCategoriesByBrand(brandId),
    staleTime: 0,
  })

  const handleDelete = async (id: string, name: string) => {
    const res = await deleteCategory(id, brandId)
    setDeleteTarget(null)
    if (res.success) {
      toast.success(`Categoría "${name}" eliminada`)
      queryClient.invalidateQueries({ queryKey: ['categories', brandId] })
    } else {
      toast.error(res.message)
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  const categories = (result?.success ? (result.data ?? []) : []) as Array<{ id: string; name: string }>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.length === 0 && (
        <div className="col-span-full text-center text-muted-foreground py-12">
          No hay categorías en esta marca. Crea la primera.
        </div>
      )}
      {categories.map((cat, i) => (
        <Link key={cat.id} href={`/brands/${brandId}/categories/${cat.id}`} className="block group animate-in fade-in-0 slide-in-from-bottom-4" style={{ animationDuration: `${300 + i * 80}ms` }}>
          <Card className="h-full transition-all hover:ring-2 hover:ring-primary/50 hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center justify-between p-5 h-full">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-pending/10 text-pending">
                  <FolderOpen className="h-6 w-6" />
                </div>
                <span className="font-medium text-base">{cat.name}</span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" onClick={() => onEdit(cat.id)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: cat.id, name: cat.name })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id, deleteTarget.name)}
        title="Eliminar categoría"
        description={deleteTarget ? `¿Eliminar la categoría "${deleteTarget.name}"? Esta acción no se puede deshacer.` : ''}
      />
    </div>
  )
}
