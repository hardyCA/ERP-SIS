'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getCustomers, deleteCustomer } from '../actions'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Card,
  CardContent,
} from '@/shared/components/ui/card'
import { Pencil, Trash2, Search, Users, Phone, MapPin, IdCard, ChevronLeft, ChevronRight } from 'lucide-react'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'
import type { Customers } from '@/shared/types/database.types'

const PAGE_SIZE = 20

interface CustomerListProps {
  onEdit: (id: string) => void
}

export function CustomerList({ onEdit }: CustomerListProps) {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const { data: result, isLoading } = useQuery({
    queryKey: ['customers', page, debouncedSearch],
    queryFn: () => getCustomers(page, PAGE_SIZE, debouncedSearch),
    staleTime: 0,
  })

  const handleDelete = async (id: string, name: string) => {
    const res = await deleteCustomer(id)
    setDeleteTarget(null)
    if (res.success) {
      toast.success(`Cliente "${name}" eliminado`)
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    } else {
      toast.error(res.message)
    }
  }

  const items = (result?.success ? result.data?.items ?? [] : []) as Customers[]
  const total = result?.success ? result.data?.total ?? 0 : 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {total > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente por nombre o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl border-border/60 bg-card/60 backdrop-blur-sm"
          />
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center text-muted-foreground py-12 border border-dashed rounded-2xl bg-muted/20">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">
            {searchQuery ? `No se encontraron clientes para "${searchQuery}"` : 'No hay clientes registrados. Crea el primero.'}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {items.map((customer) => (
          <Card key={customer.id} className="border-border/70 bg-card/90 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{customer.name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                    {customer.document_id && (
                      <span className="flex items-center gap-1">
                        <IdCard className="h-3 w-3" />
                        {customer.document_id}
                      </span>
                    )}
                    {customer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </span>
                    )}
                    {customer.address && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3" />
                        {customer.address}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
                  onClick={() => onEdit(customer.id)}
                  title="Editar cliente"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget({ id: customer.id, name: customer.name })}
                  title="Eliminar cliente"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground px-3 tabular-nums">
            Pág. {page} de {totalPages} ({total} clientes)
          </span>
          <Button variant="outline" size="sm" className="h-8 text-xs"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id, deleteTarget.name)}
        title="Eliminar cliente"
        description={deleteTarget ? `¿Eliminar al cliente "${deleteTarget.name}"?` : ''}
      />
    </div>
  )
}
