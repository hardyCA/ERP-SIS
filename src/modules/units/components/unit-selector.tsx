'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getUnits, createUnit } from '../actions'
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
import { Plus, Search, Check, Ruler, X } from 'lucide-react'

interface UnitSelectorProps {
  value: string | null
  onChange: (unitId: string | null, unitName: string) => void
}

export function UnitSelector({ value, onChange }: UnitSelectorProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [newAbbreviation, setNewAbbreviation] = useState('')
  const [creating, setCreating] = useState(false)

  const { data: result } = useQuery({
    queryKey: ['units', search],
    queryFn: () => getUnits(false),
    staleTime: 0,
  })

  const units = (result?.success ? result.data : []) as Array<{ id: string; name: string; abbreviation: string | null }>
  const filtered = search
    ? units.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || (u.abbreviation ?? '').toLowerCase().includes(search.toLowerCase()))
    : units
  const selected = units.find(u => u.id === value)

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('El nombre es requerido'); return }
    setCreating(true)
    const formData = new FormData()
    formData.set('name', newName.trim())
    if (newAbbreviation.trim()) formData.set('abbreviation', newAbbreviation.trim())
    const res = await createUnit(formData)
    setCreating(false)
    if (res.success && res.data?.id) {
      toast.success('Unidad de medida creada')
      queryClient.invalidateQueries({ queryKey: ['units'] })
      onChange(res.data.id, newName.trim())
      setCreateOpen(false)
      setOpen(false)
      setNewName('')
      setNewAbbreviation('')
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
              <Ruler className="h-3 w-3 text-muted-foreground" />
              {selected.name}
              {selected.abbreviation && <span className="text-muted-foreground">({selected.abbreviation})</span>}
            </span>
          ) : (
            <span className="text-muted-foreground">Seleccionar unidad de medida...</span>
          )}
          <Search className="h-3 w-3 text-muted-foreground" />
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Seleccionar Unidad de Medida</DialogTitle>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Buscar unidad..." onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>
                <div className="py-4 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">No se encontró la unidad</p>
                  <Button size="sm" variant="outline" className="text-xs"
                    onClick={() => { setOpen(false); setTimeout(() => setCreateOpen(true), 100) }}>
                    <Plus className="h-3 w-3 mr-1" /> Registrar nueva unidad
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filtered.map(u => (
                  <CommandItem key={u.id} value={u.name}
                    onSelect={() => { onChange(u.id, u.name); setOpen(false) }}
                    className="flex items-center gap-2">
                    <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      {u.abbreviation && <p className="text-[10px] text-muted-foreground">{u.abbreviation}</p>}
                    </div>
                    {u.id === value && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="border-t p-2">
              <Button size="sm" variant="ghost" className="w-full h-8 text-xs justify-start"
                onClick={() => { setOpen(false); setTimeout(() => setCreateOpen(true), 100) }}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Registrar nueva unidad de medida
              </Button>
            </div>
          </Command>
        </DialogContent>
      </Dialog>

      {value && (
        <button type="button" className="text-[10px] text-destructive hover:underline flex items-center gap-0.5"
          onClick={() => onChange(null, '')}>
          <X className="h-3 w-3" /> Quitar unidad
        </button>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva Unidad de Medida</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Nombre *</label>
              <Input placeholder="Ej: Caja, Kilo, Litro" value={newName}
                onChange={e => setNewName(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Abreviación</label>
              <Input placeholder="Ej: CJA, KG, LT" value={newAbbreviation}
                onChange={e => setNewAbbreviation(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs"
                onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleCreate} disabled={creating}>
                {creating ? 'Creando...' : 'Crear Unidad'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}