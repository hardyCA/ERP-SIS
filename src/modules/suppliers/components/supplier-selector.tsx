'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getSuppliers, createSupplier } from '../actions'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command'
import { Plus, Search, Check, User, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface SupplierSelectorProps {
  value: string | null
  onChange: (supplierId: string | null, supplierName: string) => void
}

export function SupplierSelector({ value, onChange }: SupplierSelectorProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [newDoc, setNewDoc] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [creating, setCreating] = useState(false)

  const { data: result } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => getSuppliers(search || undefined),
    staleTime: 0,
  })

  const suppliers = (result?.success ? result.data : []) as Array<{ id: string; name: string; document_id: string | null }>
  const selected = suppliers.find(s => s.id === value)

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('El nombre es requerido'); return }
    setCreating(true)
    const formData = new FormData()
    formData.set('name', newName.trim())
    formData.set('document_id', newDoc)
    formData.set('phone', newPhone)
    const res = await createSupplier(formData)
    setCreating(false)
    if (res.success) {
      toast.success('Proveedor creado')
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      onChange((res.data as { id: string }).id, newName.trim())
      setCreateOpen(false)
      setOpen(false)
      setNewName('')
      setNewDoc('')
      setNewPhone('')
    } else {
      toast.error(res.message)
    }
  }

  return (
    <div className="space-y-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline" className="w-full h-8 justify-between text-xs font-normal" />}>
          {selected ? (
            <span className="flex items-center gap-1.5">
              <User className="h-3 w-3 text-muted-foreground" />
              {selected.name}
            </span>
          ) : (
            <span className="text-muted-foreground">Seleccionar proveedor...</span>
          )}
          <Search className="h-3 w-3 text-muted-foreground" />
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Seleccionar Proveedor</DialogTitle>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Buscar proveedor..." onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>
                <div className="py-4 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">No se encontró proveedor</p>
                  <Button size="sm" variant="outline" className="text-xs"
                    onClick={() => { setOpen(false); setTimeout(() => setCreateOpen(true), 100) }}>
                    <Plus className="h-3 w-3 mr-1" /> Crear nuevo
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {suppliers.map(s => (
                  <CommandItem key={s.id} value={s.name}
                    onSelect={() => { onChange(s.id, s.name); setOpen(false) }}
                    className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      {s.document_id && <p className="text-[10px] text-muted-foreground">ID: {s.document_id}</p>}
                    </div>
                    {s.id === value && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="border-t p-2">
              <Button size="sm" variant="ghost" className="w-full h-8 text-xs justify-start"
                onClick={() => { setOpen(false); setTimeout(() => setCreateOpen(true), 100) }}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Crear nuevo proveedor
              </Button>
            </div>
          </Command>
        </DialogContent>
      </Dialog>

      {value && (
        <button type="button" className="text-[10px] text-destructive hover:underline flex items-center gap-0.5"
          onClick={() => onChange(null, '')}>
          <X className="h-3 w-3" /> Quitar proveedor
        </button>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo Proveedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Nombre *</label>
              <Input placeholder="Nombre del proveedor" value={newName}
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
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs"
                onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleCreate}
                disabled={creating}>
                {creating ? 'Creando...' : 'Crear Proveedor'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
