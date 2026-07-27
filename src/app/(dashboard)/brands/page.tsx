'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/shared/components/page-header'
import { Button } from '@/shared/components/ui/button'
import { BrandList } from '@/modules/brands/components/brand-list'
import { BrandForm } from '@/modules/brands/components/brand-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Plus } from 'lucide-react'

export default function BrandsPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['brands'] })
    setOpen(false)
    setEditId(null)
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Catálogo"
        description="Selecciona una marca para ver sus categorías y productos"
        action={
          <Button onClick={() => { setEditId(null); setOpen(true) }}>
            <Plus className="h-4 w-4" />
            Nueva Marca
          </Button>
        }
      />
      <BrandList onEdit={(id) => { setEditId(id); setOpen(true) }} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Marca' : 'Nueva Marca'}</DialogTitle>
          </DialogHeader>
          <BrandForm
            brandId={editId}
            onSuccess={handleSuccess}
            onCancel={() => { setOpen(false); setEditId(null) }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}