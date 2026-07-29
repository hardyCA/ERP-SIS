'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getMenuItems, upsertMenuItem, deleteMenuItem, reorderMenu } from '../actions'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Switch } from '@/shared/components/ui/switch'
import { Label } from '@/shared/components/ui/label'
import {
  GripVertical, Plus, Pencil, Trash2, ArrowUp, ArrowDown,
  LayoutDashboard, FolderTree, Warehouse, ShoppingCart, Receipt,
  CreditCard, ArrowLeftRight, Banknote, Users, BarChart3,
  Store, Truck, Package, Folder, Settings, User,
  Building2, Sparkles, Activity, TrendingUp, DollarSign,
  FileText, Printer, Download, Upload, RefreshCw,
  MoreHorizontal, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Circle, Home, Info, AlertTriangle, Shield,
  Minus, X, Check, Search, Menu,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { MenuItem } from '../types'

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, FolderTree, Warehouse, ShoppingCart, Receipt,
  CreditCard, ArrowLeftRight, Banknote, Users, BarChart3,
  Store, Truck, Package, Folder, Settings, User,
  Building2, Sparkles, Activity, TrendingUp, DollarSign,
  FileText, Printer, Download, Upload, RefreshCw,
  Plus, Minus, X, Check, Search, Menu,
  MoreHorizontal, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Circle, Home, Info, AlertTriangle, Shield,
}

const iconLabels: Record<string, string> = {
  LayoutDashboard: 'Panel',
  FolderTree: 'Carpetas',
  Warehouse: 'Bodega',
  ShoppingCart: 'Carrito',
  Receipt: 'Recibo',
  CreditCard: 'Tarjeta',
  ArrowLeftRight: 'Transferir',
  Banknote: 'Efectivo',
  Users: 'Usuarios',
  BarChart3: 'Gráfico',
  Store: 'Tienda',
  Truck: 'Camión',
  Package: 'Paquete',
  Folder: 'Carpeta',
  Settings: 'Ajustes',
  User: 'Usuario',
  Building2: 'Edificio',
  Sparkles: 'Destellos',
  Activity: 'Actividad',
  TrendingUp: 'Tendencia',
  DollarSign: 'Dólar',
  FileText: 'Documento',
  Printer: 'Impresora',
  Download: 'Descargar',
  Upload: 'Subir',
  RefreshCw: 'Actualizar',
  Plus: 'Agregar',
  Minus: 'Quitar',
  X: 'Cerrar',
  Check: 'Verificar',
  Search: 'Buscar',
  Menu: 'Menú',
  MoreHorizontal: 'Más',
  ChevronDown: 'Abajo',
  ChevronUp: 'Arriba',
  ChevronLeft: 'Izquierda',
  ChevronRight: 'Derecha',
  Circle: 'Círculo',
  Home: 'Inicio',
  Info: 'Información',
  AlertTriangle: 'Alerta',
  Shield: 'Escudo',
}

const iconOptions = [
  'LayoutDashboard', 'FolderTree', 'Warehouse', 'ShoppingCart', 'Receipt',
  'CreditCard', 'ArrowLeftRight', 'Banknote', 'Users', 'BarChart3',
  'Store', 'Truck', 'Package', 'Folder', 'Settings', 'User',
  'Building2', 'Sparkles', 'Activity', 'TrendingUp', 'DollarSign',
  'FileText', 'Printer', 'Download', 'Upload', 'RefreshCw',
  'Plus', 'Minus', 'X', 'Check', 'Search', 'Menu',
  'MoreHorizontal', 'ChevronDown', 'ChevronUp', 'ChevronLeft', 'ChevronRight',
  'Circle', 'Home', 'Info', 'AlertTriangle', 'Shield',
]

export function MenuManager() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [form, setForm] = useState({
    id: '',
    group_title: '',
    name: '',
    href: '',
    icon: 'Circle',
    sort_order: 0,
    is_active: true,
    required_role: '',
  })

  const { data: items = [] } = useQuery({
    queryKey: ['menu-items'],
    queryFn: getMenuItems,
  })

  const groups = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.group_title]) acc[item.group_title] = []
    acc[item.group_title].push(item)
    return acc
  }, {})

  const openNew = () => {
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order)) + 10 : 10
    setForm({ id: '', group_title: '', name: '', href: '/', icon: 'Circle', sort_order: maxOrder, is_active: true, required_role: '' })
    setEditing(null)
    setOpen(true)
  }

  const openEdit = (item: MenuItem) => {
    setForm({
      id: item.id,
      group_title: item.group_title,
      name: item.name,
      href: item.href,
      icon: item.icon,
      sort_order: item.sort_order,
      is_active: item.is_active,
      required_role: item.required_role ?? '',
    })
    setEditing(item)
    setOpen(true)
  }

  const handleSave = async () => {
    const fd = new FormData()
    if (form.id) fd.set('id', form.id)
    fd.set('group_title', form.group_title)
    fd.set('name', form.name)
    fd.set('href', form.href)
    fd.set('icon', form.icon)
    fd.set('sort_order', String(form.sort_order))
    fd.set('is_active', form.is_active ? 'true' : 'false')
    fd.set('required_role', form.required_role)

    const res = await upsertMenuItem(fd)
    if (res.success) {
      toast.success(res.message)
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ['menu-items'] })
    } else {
      toast.error(res.message)
    }
  }

  const handleDelete = async (id: string) => {
    const fd = new FormData()
    fd.set('id', id)
    const res = await deleteMenuItem(fd)
    if (res.success) {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['menu-items'] })
    } else {
      toast.error(res.message)
    }
  }

  const handleReorder = async (itemId: string, direction: 'up' | 'down') => {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex(i => i.id === itemId)
    if (idx === -1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const updates = [
      { id: sorted[idx].id, sort_order: sorted[swapIdx].sort_order },
      { id: sorted[swapIdx].id, sort_order: sorted[idx].sort_order },
    ]
    const res = await reorderMenu(updates)
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] })
    } else {
      toast.error(res.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Menú Lateral</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona los items del menú de navegación</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1.5" /> Nuevo Item
        </Button>
      </div>

      <div className="space-y-6">
        {Object.entries(groups).map(([groupTitle, groupItems]) => (
          <Card key={groupTitle}>
            <CardHeader className="pb-3">
              <CardTitle>{groupTitle}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {groupItems
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((item, idx, arr) => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 cursor-grab" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{item.name}</span>
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 font-normal">
                            {(() => {
                              const Icon = iconMap[item.icon] || Circle
                              return <><Icon className="h-3 w-3" />{iconLabels[item.icon] || item.icon}</>
                            })()}
                          </Badge>
                          {item.required_role && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{item.required_role}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{item.href}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={cn(
                          'text-[10px] font-medium px-2 py-0.5 rounded-full',
                          item.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                        )}>
                          {item.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        <Button variant="ghost" size="icon-xs" onClick={() => handleReorder(item.id, 'up')} disabled={idx === 0}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => handleReorder(item.id, 'down')} disabled={idx === arr.length - 1}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => openEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Item' : 'Nuevo Item'}</DialogTitle>
            <DialogDescription>Configura el item del menú lateral</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grupo</Label>
                <Input value={form.group_title} onChange={(e) => setForm(f => ({ ...f, group_title: e.target.value }))}
                  placeholder="Ej: Visión General" />
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Dashboard" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ruta</Label>
                <Input value={form.href} onChange={(e) => setForm(f => ({ ...f, href: e.target.value }))}
                  placeholder="Ej: /dashboard" />
              </div>
              <div className="space-y-2">
                <Label>Icono</Label>
                <Select value={form.icon} onValueChange={(v) => setForm(f => ({ ...f, icon: v ?? 'Circle' }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {iconOptions.map(icon => (
                      <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Orden</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>Rol requerido</Label>
                <Select value={form.required_role} onValueChange={(v) => setForm(f => ({ ...f, required_role: v ?? '' }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="seller">Vendedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Activo</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>{editing ? 'Guardar' : 'Crear'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
