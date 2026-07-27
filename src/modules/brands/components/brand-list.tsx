'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getBrands, deleteBrand } from '../actions'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Card,
  CardContent,
} from '@/shared/components/ui/card'
import { Pencil, Trash2, FolderTree, Search, ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'

interface BrandListProps {
  onEdit: (id: string) => void
}

export function BrandList({ onEdit }: BrandListProps) {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: result, isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: getBrands,
    staleTime: 0,
  })

  const handleDelete = async (id: string, name: string) => {
    const res = await deleteBrand(id)
    setDeleteTarget(null)
    if (res.success) {
      toast.success(`Marca "${name}" eliminada`)
      queryClient.invalidateQueries({ queryKey: ['brands'] })
    } else {
      toast.error(res.message)
    }
  }

  const brands = (result?.success ? (result.data ?? []) : []) as Array<{ id: string; name: string }>

  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return brands
    return brands.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [brands, searchQuery])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Buscador de Marcas */}
      {brands.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar marca en catálogo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl border-border/60 bg-card/60 backdrop-blur-sm"
          />
        </div>
      )}

      {/* Grid de Marcas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBrands.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-12 border border-dashed rounded-2xl bg-muted/20">
            <FolderTree className="h-8 w-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
            <p className="text-sm font-medium">
              {searchQuery ? `No se encontraron marcas para "${searchQuery}"` : 'No hay marcas registradas. Crea la primera.'}
            </p>
          </div>
        )}

        {filteredBrands.map((brand, i) => (
          <div key={brand.id} className="group relative">
            <Link href={`/brands/${brand.id}`} className="block">
              <Card className="premium-card relative overflow-hidden border border-border/70 bg-card/90 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 rounded-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3.5 min-w-0 pr-16 sm:pr-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs group-hover:scale-105 transition-transform">
                      <FolderTree className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base tracking-tight text-foreground truncate group-hover:text-primary transition-colors">
                        {brand.name}
                      </h3>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <span>Ver categorías y productos</span>
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Acciones directas (siempre visibles en pantallas táctiles, con estilo sutil) */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10 sm:opacity-90 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-md p-1 rounded-xl border border-border/50 shadow-xs">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onEdit(brand.id)
                }}
                title="Editar marca"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDeleteTarget({ id: brand.id, name: brand.name })
                }}
                title="Eliminar marca"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id, deleteTarget.name)}
        title="Eliminar marca"
        description={deleteTarget ? `¿Eliminar la marca "${deleteTarget.name}"? Esta acción eliminará sus categorías y productos asociados.` : ''}
      />
    </div>
  )
}

