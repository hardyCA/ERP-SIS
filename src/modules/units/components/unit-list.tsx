'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getUnits, deleteUnit, toggleUnitStatus } from '../actions'
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
import { Pencil, Power, Trash2, Ruler } from 'lucide-react'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'

interface UnitListProps {
  onEdit: (unit: { id: string; name: string; abbreviation: string | null }) => void
}

export function UnitList({ onEdit }: UnitListProps) {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const { data: result, isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: () => getUnits(true),
    staleTime: 0,
  })

  const handleToggle = async (id: string) => {
    const res = await toggleUnitStatus(id)
    if (!res.success) toast.error(res.message)
    queryClient.invalidateQueries({ queryKey: ['units'] })
  }

  const handleDelete = async (id: string, name: string) => {
    const res = await deleteUnit(id)
    setDeleteTarget(null)
    if (res.success) {
      toast.success(`Unidad "${name}" eliminada`)
      queryClient.invalidateQueries({ queryKey: ['units'] })
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

  const units = (result?.success ? (result.data ?? []) : []) as Array<{
    id: string
    name: string
    abbreviation: string | null
    is_active: boolean
  }>

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Unidad</TableHead>
            <TableHead>Abreviación</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                <Ruler className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No hay unidades de medida registradas
              </TableCell>
            </TableRow>
          )}
          {units.map((unit) => (
            <TableRow key={unit.id}>
              <TableCell className="font-medium">{unit.name}</TableCell>
              <TableCell className="text-muted-foreground">{unit.abbreviation ?? '-'}</TableCell>
              <TableCell>
                <Badge variant={unit.is_active ? 'default' : 'secondary'}>
                  {unit.is_active ? 'Activa' : 'Inactiva'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit({ id: unit.id, name: unit.name, abbreviation: unit.abbreviation })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleToggle(unit.id)}>
                    <Power className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: unit.id, name: unit.name })}>
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
        title="Eliminar unidad de medida"
        description={deleteTarget ? `¿Eliminar la unidad "${deleteTarget.name}"? Esta acción no se puede deshacer.` : ''}
      />
    </div>
  )
}