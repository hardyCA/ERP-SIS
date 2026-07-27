'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getBranches, toggleBranchStatus, deleteBranch } from '../actions'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Pencil, Power, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'

export function BranchList() {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const { data: result, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches,
    staleTime: 0,
  })

  const handleToggle = async (id: string) => {
    await toggleBranchStatus(id)
    queryClient.invalidateQueries({ queryKey: ['branches'] })
  }

  const handleDelete = async (id: string, name: string) => {
    const res = await deleteBranch(id)
    setDeleteTarget(null)
    if (res.success) {
      toast.success(`Sucursal "${name}" eliminada`)
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    } else {
      toast.error(res.message)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  const branches = (result?.success ? (result.data ?? []) : []) as Array<{ id: string; name: string; address: string | null; phone: string | null; is_active: boolean }>

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Dirección</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No hay sucursales registradas
              </TableCell>
            </TableRow>
          )}
          {branches.map((branch) => (
            <TableRow key={branch.id}>
              <TableCell className="font-medium">{branch.name}</TableCell>
              <TableCell className="text-muted-foreground">{branch.address ?? '-'}</TableCell>
              <TableCell className="text-muted-foreground">{branch.phone ?? '-'}</TableCell>
              <TableCell>
                <Badge variant={branch.is_active ? 'default' : 'secondary'}>
                  {branch.is_active ? 'Activa' : 'Inactiva'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" nativeButton={false} render={<Link href={`/branches/${branch.id}`} />}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleToggle(branch.id)}>
                    <Power className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: branch.id, name: branch.name })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id, deleteTarget.name)}
        title="Eliminar sucursal"
        description={deleteTarget ? `¿Eliminar la sucursal "${deleteTarget.name}"? Esta acción no se puede deshacer.` : ''}
      />
    </div>
  )
}
