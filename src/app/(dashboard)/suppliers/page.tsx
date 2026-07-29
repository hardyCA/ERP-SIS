'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getSuppliers, createSupplier } from '@/modules/suppliers/actions'
import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Plus, Search, Truck, Phone, MapPin, CreditCard } from 'lucide-react'

export default function SuppliersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDoc, setNewDoc] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [creating, setCreating] = useState(false)

  const { data: result, isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => getSuppliers(search || undefined),
    staleTime: 0,
  })

  const suppliers = (result?.success ? result.data : []) as Array<{
    id: string
    name: string
    document_id: string | null
    phone: string | null
    address: string | null
    created_at: string
  }>

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('El nombre es requerido'); return }
    setCreating(true)
    const formData = new FormData()
    formData.set('name', newName.trim())
    formData.set('document_id', newDoc)
    formData.set('phone', newPhone)
    formData.set('address', newAddress)
    const res = await createSupplier(formData)
    setCreating(false)
    if (res.success) {
      toast.success('Proveedor creado')
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setOpen(false)
      setNewName('')
      setNewDoc('')
      setNewPhone('')
      setNewAddress('')
    } else {
      toast.error(res.message)
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Proveedores"
        description="Gestiona tus proveedores"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" className="h-9 text-xs"><Plus className="h-4 w-4 mr-1" /> Nuevo Proveedor</Button>} />
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Nuevo Proveedor</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Nombre *</label>
                  <Input placeholder="Nombre" value={newName}
                    onChange={e => setNewName(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Cédula / ID</label>
                  <Input placeholder="Número de identificación" value={newDoc}
                    onChange={e => setNewDoc(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Teléfono</label>
                  <Input placeholder="Número de teléfono" value={newPhone}
                    onChange={e => setNewPhone(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Dirección</label>
                  <Input placeholder="Dirección" value={newAddress}
                    onChange={e => setNewAddress(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs"
                    onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleCreate}
                    disabled={creating}>
                    {creating ? 'Creando...' : 'Crear'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar proveedor..." value={search}
          onChange={e => setSearch(e.target.value)} className="h-9 text-xs" />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Cédula / ID</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead className="w-28">Registrado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {search ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
                  </TableCell>
                </TableRow>
              )}
              {suppliers.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    {s.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {s.document_id ? <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> {s.document_id}</span> : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {s.phone ? <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {s.phone}</span> : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {s.address ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.address}</span> : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(s.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageContainer>
  )
}
