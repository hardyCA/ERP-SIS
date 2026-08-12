'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getMovements, getBalance, createMovement, createCashTransfer, getCashUsers } from '../actions'
import { useBranch } from '@/shared/contexts/branch-context'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { ArrowDown, ArrowUp, Plus, Minus, Wallet, ChevronLeft, ChevronRight, ArrowLeftRight, FileText, Printer } from 'lucide-react'
import { movementTypeLabels, reverseTypes } from '../types'
import { exportToPdf, printElement } from '@/shared/lib/export'

const PAGE_SIZE = 15

export function CashRegisterView() {
  const queryClient = useQueryClient()
  const { branchId, branchName } = useBranch()

  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'manual_income' | 'manual_expense' | 'owner_withdrawal'>('manual_income')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'cash' | 'qr' | 'mixed'>('cash')
  const [cashAmt, setCashAmt] = useState('')
  const [qrAmt, setQrAmt] = useState('')
  const [description, setDescription] = useState('')
  const [handlerUserId, setHandlerUserId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')

  const [showTransfer, setShowTransfer] = useState(false)
  const [transferDest, setTransferDest] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferMethod, setTransferMethod] = useState<'cash' | 'qr' | 'mixed'>('cash')
  const [transferCashAmt, setTransferCashAmt] = useState('')
  const [transferQrAmt, setTransferQrAmt] = useState('')
  const [transferDesc, setTransferDesc] = useState('')
  const [transferSubmitting, setTransferSubmitting] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1) }, [branchId, filter])

  const { data: movementsData, isLoading } = useQuery({
    queryKey: ['cash-movements', branchId, page, filter],
    queryFn: () => getMovements({ branchId: branchId || undefined, page, pageSize: PAGE_SIZE, filter }),
    staleTime: 0,
    enabled: !!branchId,
  })

  const { data: balanceData } = useQuery({
    queryKey: ['cash-balance', branchId],
    queryFn: () => getBalance(branchId || undefined),
    staleTime: 0,
    enabled: !!branchId,
  })

  const { data: usersData } = useQuery({
    queryKey: ['cash-users'],
    queryFn: () => getCashUsers(),
    staleTime: 60_000,
  })
  const users = (usersData?.success ? usersData.data : []) as Array<{ id: string; name: string }>

  const { data: branchesData } = useQuery({
    queryKey: ['active-branches'],
    queryFn: () => import('@/shared/actions/branches').then(m => m.getActiveBranches()),
    staleTime: 60000,
  })
  const branches = (branchesData?.success ? branchesData.data : []) as Array<{ id: string; name: string }>

  const movements = Array.isArray(movementsData?.data) ? movementsData.data : []
  const movementsTotal = movementsData?.total ?? 0
  const movementsPages = Math.max(1, Math.ceil(movementsTotal / PAGE_SIZE))
  const balance = balanceData?.data as {
    balance: number
    income: number
    expense: number
    cashBalance: number
    qrBalance: number
    incomeCash: number
    incomeQr: number
    expenseCash: number
    expenseQr: number
  } | undefined

  const openModal = (type: 'manual_income' | 'manual_expense' | 'owner_withdrawal') => {
    setModalType(type)
    setAmount('')
    setMethod('cash')
    setCashAmt('')
    setQrAmt('')
    setDescription('')
    setHandlerUserId('')
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!branchId) { toast.error('Selecciona una sucursal en el menú lateral'); return }
    if (method === 'mixed') {
      const c = parseFloat(cashAmt) || 0
      const q = parseFloat(qrAmt) || 0
      if (c <= 0 || q <= 0) {
        toast.error('En método mixto ambos montos deben ser mayor a 0'); return
      }
    } else if (!amount || parseFloat(amount) <= 0) {
      toast.error('Ingresa un monto válido'); return
    }
    if (!description) { toast.error('Ingresa una descripción'); return }
    if (!handlerUserId) { toast.error('Selecciona quién cobró o retiró el monto'); return }

    setSubmitting(true)
    const finalAmount = method === 'mixed' ? String((parseFloat(cashAmt) || 0) + (parseFloat(qrAmt) || 0)) : amount
    const formData = new FormData()
    formData.set('branch_id', branchId)
    formData.set('type', modalType)
    formData.set('amount', finalAmount)
    formData.set('transfer_method', method)
    formData.set('cash_amount', method === 'mixed' ? cashAmt : '0')
    formData.set('qr_amount', method === 'mixed' ? qrAmt : '0')
    formData.set('description', description)
    formData.set('handler_user_id', handlerUserId)
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

  const handleTransferSubmit = async () => {
    if (!branchId) { toast.error('Selecciona una sucursal en el menú lateral'); return }
    if (!transferDest) { toast.error('Selecciona la sucursal destino'); return }
    if (!transferDesc) { toast.error('Ingresa una descripción'); return }
    if (transferMethod === 'mixed') {
      const cash = parseFloat(transferCashAmt) || 0
      const qr = parseFloat(transferQrAmt) || 0
      if (cash <= 0 || qr <= 0) {
        toast.error('En método mixto ambos montos deben ser mayor a 0'); return
      }
    } else if (!transferAmount || parseFloat(transferAmount) <= 0) {
      toast.error('Ingresa un monto válido'); return
    }

    setTransferSubmitting(true)
    const finalAmount = transferMethod === 'mixed' ? String((parseFloat(transferCashAmt) || 0) + (parseFloat(transferQrAmt) || 0)) : transferAmount
    const formData = new FormData()
    formData.set('origin_branch_id', branchId)
    formData.set('destination_branch_id', transferDest)
    formData.set('amount', finalAmount)
    formData.set('transfer_method', transferMethod)
    formData.set('cash_amount', transferMethod === 'mixed' ? transferCashAmt : '0')
    formData.set('qr_amount', transferMethod === 'mixed' ? transferQrAmt : '0')
    formData.set('description', transferDesc)
    const res = await createCashTransfer(formData)
    setTransferSubmitting(false)

    if (res.success) {
      toast.success('Transferencia realizada exitosamente')
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] })
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] })
      setShowTransfer(false)
    } else {
      toast.error(res.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Balance cards */}
      {!branchId ? (
        <div className="text-center text-muted-foreground py-12">Selecciona una sucursal en el menú lateral</div>
      ) : (
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
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              <p>QR: <span className="font-semibold text-blue-600">Bs {(balance?.qrBalance ?? 0).toFixed(2)}</span></p>
              <p>Efectivo: <span className="font-semibold text-emerald-600">Bs {(balance?.cashBalance ?? 0).toFixed(2)}</span></p>
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
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              <p>QR: <span className="font-semibold text-blue-600">Bs {(balance?.incomeQr ?? 0).toFixed(2)}</span></p>
              <p>Efectivo: <span className="font-semibold text-emerald-600">Bs {(balance?.incomeCash ?? 0).toFixed(2)}</span></p>
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
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              <p>QR: <span className="font-semibold text-blue-600">Bs {(balance?.expenseQr ?? 0).toFixed(2)}</span></p>
              <p>Efectivo: <span className="font-semibold text-emerald-600">Bs {(balance?.expenseCash ?? 0).toFixed(2)}</span></p>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Actions */}
      {branchId && (
        <Card>
          <CardContent className="pt-4 flex flex-wrap gap-3">
            <Button onClick={() => openModal('manual_income')}>
              <Plus className="h-4 w-4" /> Ingreso Manual
            </Button>
            <Button variant="outline" onClick={() => openModal('manual_expense')}>
              <Minus className="h-4 w-4" /> Egreso Manual
            </Button>
            <Button variant="secondary" onClick={() => openModal('owner_withdrawal')}>
              <Minus className="h-4 w-4" /> Retiro Propietario
            </Button>
            <Button variant="default" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => { setTransferDest(''); setTransferAmount(''); setTransferMethod('cash'); setTransferCashAmt(''); setTransferQrAmt(''); setTransferDesc(''); setShowTransfer(true) }}>
              <ArrowLeftRight className="h-4 w-4" /> Transferir
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[11px] ml-auto"
              onClick={() => {
                exportToPdf(
                  `Caja - ${branchName || 'Sucursal'}`,
                  'Reporte de movimientos de caja',
                  [
                    { header: '#', dataKey: '#' },
                    { header: 'Tipo', dataKey: 'Tipo' },
                    { header: 'Monto', dataKey: 'Monto' },
                    { header: 'Efectivo', dataKey: 'Efectivo' },
                    { header: 'QR', dataKey: 'QR' },
                    { header: 'Descripción', dataKey: 'Descripción' },
                    { header: 'Cobró / Retiró', dataKey: 'Cobró / Retiró' },
                    { header: 'Registrado por', dataKey: 'Registrado por' },
                    { header: 'Fecha', dataKey: 'Fecha' },
                  ],
                  movements.map((m: Record<string, unknown>) => ({
                    '#': (m.number as number)?.toString().padStart(4, '0') ?? (m.id as string).slice(0, 8),
                    Tipo: movementTypeLabels[m.type as string] ?? m.type,
                    Monto: `${(reverseTypes[m.type as string] ?? 0) > 0 ? '+' : ''}Bs ${Number(m.amount).toFixed(2)}`,
                    Efectivo: `Bs ${Number(m.cash_amount ?? 0).toFixed(2)}`,
                    QR: `Bs ${Number(m.qr_amount ?? 0).toFixed(2)}`,
                    Descripción: (m.description as string) ?? '—',
                    'Cobró / Retiró': (m.handler_name as string) ?? '—',
                    'Registrado por': (m.created_by_name as string) ?? '—',
                    Fecha: new Date(m.created_at as string).toLocaleString(),
                  })),
                  [
                    { label: 'Saldo actual', value: `Bs ${(balance?.balance ?? 0).toFixed(2)}` },
                    { label: 'Ingresos', value: `Bs ${(balance?.income ?? 0).toFixed(2)}` },
                    { label: 'Egresos', value: `Bs ${(balance?.expense ?? 0).toFixed(2)}` },
                    { label: 'Balance Efectivo', value: `Bs ${(balance?.cashBalance ?? 0).toFixed(2)}` },
                    { label: 'Balance QR', value: `Bs ${(balance?.qrBalance ?? 0).toFixed(2)}` },
                  ],
                  'caja'
                )
              }}>
              <FileText className="h-3 w-3 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[11px]"
              onClick={() => printElement('cash-print')}>
              <Printer className="h-3 w-3 mr-1" /> Imprimir
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filter tabs + movements list */}
      {!branchId ? (
        <div className="text-center text-muted-foreground py-12">Selecciona una sucursal en el menú lateral</div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div className="flex items-center gap-1 rounded-lg border p-0.5 bg-muted/50">
                {([
                  ['all', 'Todos'],
                  ['income', 'Ingresos'],
                  ['expense', 'Egresos'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                      filter === key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {key === 'income' ? <ArrowUp className="h-4 w-4" /> : key === 'expense' ? <ArrowDown className="h-4 w-4" /> : null}
                    {label}
                  </button>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                {filter === 'all' && (
                  <>
                    <span className="font-semibold text-green-600">Ingresos Bs {(balance?.income ?? 0).toFixed(2)}</span>
                    {' · '}
                    <span className="font-semibold text-destructive">Egresos Bs {(balance?.expense ?? 0).toFixed(2)}</span>
                  </>
                )}
                {filter === 'income' && (
                  <>
                    <span className="font-semibold text-green-600">Total ingresos Bs {(balance?.income ?? 0).toFixed(2)}</span>
                    {' · '}Efectivo{' '}
                    <span className="font-semibold text-emerald-600">Bs {(balance?.incomeCash ?? 0).toFixed(2)}</span>
                    {' · '}QR{' '}
                    <span className="font-semibold text-blue-600">Bs {(balance?.incomeQr ?? 0).toFixed(2)}</span>
                  </>
                )}
                {filter === 'expense' && (
                  <>
                    <span className="font-semibold text-destructive">Total egresos Bs {(balance?.expense ?? 0).toFixed(2)}</span>
                    {' · '}Efectivo{' '}
                    <span className="font-semibold text-emerald-600">Bs {(balance?.expenseCash ?? 0).toFixed(2)}</span>
                    {' · '}QR{' '}
                    <span className="font-semibold text-blue-600">Bs {(balance?.expenseQr ?? 0).toFixed(2)}</span>
                  </>
                )}
              </div>
            </div>
            {isLoading ? (
              <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Cobró / Retiró</TableHead>
                    <TableHead>Registrado por</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay movimientos</TableCell>
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
                        <TableCell className="font-medium">{(m.handler_name as string) ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{(m.created_by_name as string) ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{new Date(m.created_at as string).toLocaleString()}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
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

      <div id="cash-print" className="hidden">
        <h1>Caja - {branchName || 'Sucursal'}</h1>
        <h2>Reporte de movimientos de caja</h2>
        <div className="summary">
          <div className="summary-row"><span>Saldo actual</span><span>Bs {(balance?.balance ?? 0).toFixed(2)}</span></div>
          <div className="summary-row"><span>Ingresos</span><span>Bs {(balance?.income ?? 0).toFixed(2)}</span></div>
          <div className="summary-row"><span>Egresos</span><span>Bs {(balance?.expense ?? 0).toFixed(2)}</span></div>
          <div className="summary-row"><span>Balance Efectivo</span><span>Bs {(balance?.cashBalance ?? 0).toFixed(2)}</span></div>
          <div className="summary-row"><span>Balance QR</span><span>Bs {(balance?.qrBalance ?? 0).toFixed(2)}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Tipo</th>
              <th>Monto</th>
              <th>Efectivo</th>
              <th>QR</th>
              <th>Descripción</th>
              <th>Cobró / Retiró</th>
              <th>Registrado por</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m: Record<string, unknown>) => (
              <tr key={m.id as string}>
                <td>#{((m.number as number)?.toString().padStart(4, '0') ?? (m.id as string).slice(0, 8))}</td>
                <td>{movementTypeLabels[m.type as string] ?? m.type}</td>
                <td>{`${(reverseTypes[m.type as string] ?? 0) > 0 ? '+' : ''}Bs ${Number(m.amount).toFixed(2)}`}</td>
                <td>Bs {Number(m.cash_amount ?? 0).toFixed(2)}</td>
                <td>Bs {Number(m.qr_amount ?? 0).toFixed(2)}</td>
                <td>{(m.description as string) ?? '—'}</td>
                <td>{(m.handler_name as string) ?? '—'}</td>
                <td>{(m.created_by_name as string) ?? '—'}</td>
                <td>{new Date(m.created_at as string).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal - Movimientos Manuales */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {modalType === 'manual_income' ? 'Ingreso Manual' : modalType === 'manual_expense' ? 'Egreso Manual' : 'Retiro de Propietario'}
            </DialogTitle>
            <DialogDescription>Registrar un movimiento manual de caja</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Método</label>
              <div className="flex gap-2">
                <Button type="button" variant={method === 'cash' ? 'default' : 'outline'} size="sm" className="flex-1 h-9 text-xs" onClick={() => setMethod('cash')}>Efectivo</Button>
                <Button type="button" variant={method === 'qr' ? 'default' : 'outline'} size="sm" className="flex-1 h-9 text-xs" onClick={() => setMethod('qr')}>QR</Button>
                <Button type="button" variant={method === 'mixed' ? 'default' : 'outline'} size="sm" className="flex-1 h-9 text-xs" onClick={() => setMethod('mixed')}>Mixto</Button>
              </div>
            </div>
            {method !== 'mixed' && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Monto (Bs)</label>
                <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </div>
            )}
            {method === 'mixed' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Efectivo (Bs)</label>
                    <Input type="number" step="0.01" min="0" value={cashAmt} onChange={(e) => setCashAmt(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">QR (Bs)</label>
                    <Input type="number" step="0.01" min="0" value={qrAmt} onChange={(e) => setQrAmt(e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold font-mono text-foreground">Bs {((parseFloat(cashAmt) || 0) + (parseFloat(qrAmt) || 0)).toFixed(2)}</span>
                </div>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Motivo del movimiento" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {modalType === 'manual_income' ? '¿Quién cobró el monto?' : '¿Quién retiró el monto?'}
              </label>
              <Select value={handlerUserId} onValueChange={(v) => setHandlerUserId(v ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar usuario">
                    {handlerUserId ? users.find(u => u.id === handlerUserId)?.name ?? '' : ''}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? 'Guardando...' : 'Registrar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal - Transferencia entre Sucursales */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transferencia entre Sucursales</DialogTitle>
            <DialogDescription>Envía dinero desde la sucursal actual a otra sucursal</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Sucursal Origen</label>
              <Input value={branches.find(b => b.id === branchId)?.name ?? 'Actual'} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Sucursal Destino</label>
              <Select value={transferDest} onValueChange={(v) => { if (v) setTransferDest(v) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sucursal">{transferDest ? branches.find(b => b.id === transferDest)?.name : ''}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {branches
                    .filter(b => b.id !== branchId)
                    .map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Método de Transferencia</label>
              <div className="flex gap-2">
                <Button type="button" variant={transferMethod === 'cash' ? 'default' : 'outline'} size="sm" className="flex-1 h-9 text-xs" onClick={() => setTransferMethod('cash')}>Efectivo</Button>
                <Button type="button" variant={transferMethod === 'qr' ? 'default' : 'outline'} size="sm" className="flex-1 h-9 text-xs" onClick={() => setTransferMethod('qr')}>QR</Button>
                <Button type="button" variant={transferMethod === 'mixed' ? 'default' : 'outline'} size="sm" className="flex-1 h-9 text-xs" onClick={() => setTransferMethod('mixed')}>Mixto</Button>
              </div>
            </div>
            {transferMethod !== 'mixed' && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Monto (Bs)</label>
                <Input type="number" step="0.01" min="0.01" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="0.00" />
              </div>
            )}
            {transferMethod === 'mixed' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Efectivo (Bs)</label>
                    <Input type="number" step="0.01" min="0" value={transferCashAmt} onChange={(e) => setTransferCashAmt(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">QR (Bs)</label>
                    <Input type="number" step="0.01" min="0" value={transferQrAmt} onChange={(e) => setTransferQrAmt(e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold font-mono text-foreground">Bs {((parseFloat(transferCashAmt) || 0) + (parseFloat(transferQrAmt) || 0)).toFixed(2)}</span>
                </div>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea value={transferDesc} onChange={(e) => setTransferDesc(e.target.value)} placeholder="Motivo de la transferencia" />
            </div>
            <Button onClick={handleTransferSubmit} disabled={transferSubmitting} className="w-full">
              {transferSubmitting ? 'Procesando...' : 'Realizar Transferencia'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
