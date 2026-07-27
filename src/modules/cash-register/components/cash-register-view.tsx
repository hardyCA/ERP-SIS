'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getMovements, getBalance, createMovement } from '../actions'
import { useBranch } from '@/shared/contexts/branch-context'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { ArrowDown, ArrowUp, Plus, Minus, Wallet, ChevronLeft, ChevronRight } from 'lucide-react'
import { movementTypeLabels, reverseTypes } from '../types'

const PAGE_SIZE = 15

export function CashRegisterView() {
  const queryClient = useQueryClient()
  const { branchId } = useBranch()

  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'manual_income' | 'manual_expense' | 'owner_withdrawal'>('manual_income')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(1)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1) }, [branchId])

  const { data: movementsData, isLoading } = useQuery({
    queryKey: ['cash-movements', branchId, page],
    queryFn: () => getMovements({ branchId: branchId || undefined, page, pageSize: PAGE_SIZE }),
    staleTime: 0,
  })

  const { data: balanceData } = useQuery({
    queryKey: ['cash-balance', branchId],
    queryFn: () => getBalance(branchId || undefined),
    staleTime: 0,
  })

  const movements = Array.isArray(movementsData?.data) ? movementsData.data : []
  const movementsTotal = movementsData?.total ?? 0
  const movementsPages = Math.max(1, Math.ceil(movementsTotal / PAGE_SIZE))
  const balance = balanceData?.data as { balance: number; income: number; expense: number } | undefined

  const openModal = (type: 'manual_income' | 'manual_expense' | 'owner_withdrawal') => {
    setModalType(type)
    setAmount('')
    setDescription('')
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!branchId) { toast.error('Selecciona una sucursal en el menú lateral'); return }
    if (!amount || parseFloat(amount) <= 0) { toast.error('Ingresa un monto válido'); return }
    if (!description) { toast.error('Ingresa una descripción'); return }

    setSubmitting(true)
    const formData = new FormData()
    formData.set('branch_id', branchId)
    formData.set('type', modalType)
    formData.set('amount', amount)
    formData.set('description', description)
    const res = await createMovement(formData)
    setSubmitting(false)

    if (res.success) {
      toast.success('Movimiento registrado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] })
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] })
      setShowModal(false)
    } else {
      toast.error(res.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Balance cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Saldo Actual</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span className={`text-2xl font-bold ${(balance?.balance ?? 0) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                Bs {(balance?.balance ?? 0).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ingresos</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ArrowUp className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">Bs {(balance?.income ?? 0).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Egresos</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ArrowDown className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold text-destructive">Bs {(balance?.expense ?? 0).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {branchId && (
        <Card>
          <CardContent className="pt-4 flex gap-3">
            <Button onClick={() => openModal('manual_income')}>
              <Plus className="h-4 w-4" /> Ingreso Manual
            </Button>
            <Button variant="outline" onClick={() => openModal('manual_expense')}>
              <Minus className="h-4 w-4" /> Egreso Manual
            </Button>
            <Button variant="secondary" onClick={() => openModal('owner_withdrawal')}>
              <Minus className="h-4 w-4" /> Retiro Propietario
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Movements list */}
      {!branchId ? (
        <div className="text-center text-muted-foreground py-12">Selecciona una sucursal en el menú lateral</div>
      ) : isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Registrado por</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay movimientos</TableCell>
                </TableRow>
              )}
              {movements.map((m: Record<string, unknown>) => {
                const mt = m.type as string
                const sign = reverseTypes[mt] ?? 0
                return (
                  <TableRow key={m.id as string}>
                    <TableCell className="font-mono text-xs">#{((m.number as number)?.toString().padStart(4, '0') ?? (m.id as string).slice(0, 8))}</TableCell>
                    <TableCell>
                      <Badge variant={sign > 0 ? 'default' : sign < 0 ? 'destructive' : 'secondary'}>
                        {movementTypeLabels[mt] ?? mt}
                      </Badge>
                    </TableCell>
                    <TableCell className={`font-mono font-medium ${sign > 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {sign > 0 ? '+' : ''}Bs {Number(m.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-48 truncate">{(m.description as string) ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{(m.created_by_name as string) ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(m.created_at as string).toLocaleString()}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {branchId && !isLoading && movementsTotal > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-xs text-muted-foreground">
            {movementsTotal} movimiento{movementsTotal !== 1 ? 's' : ''} · Página {page} de {movementsPages}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0"
              disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(movementsPages, 5) }).map((_, i) => {
              const start = Math.max(1, Math.min(page - 2, movementsPages - 4))
              const p = start + i
              if (p > movementsPages) return null
              return (
                <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0 text-xs"
                  onClick={() => setPage(p)}>
                  {p}
                </Button>
              )
            })}
            <Button variant="outline" size="sm" className="h-8 w-8 p-0"
              disabled={page >= movementsPages} onClick={() => setPage(p => Math.min(movementsPages, p + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {modalType === 'manual_income' ? 'Ingreso Manual' : modalType === 'manual_expense' ? 'Egreso Manual' : 'Retiro de Propietario'}
            </DialogTitle>
            <DialogDescription>Registrar un movimiento manual de caja</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Monto (Bs)</label>
              <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Motivo del movimiento" />
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? 'Guardando...' : 'Registrar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
