'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { Button } from '@/shared/components/ui/button'
import { CustomerList } from '@/modules/customers/components/customer-list'
import { CustomerForm } from '@/modules/customers/components/customer-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Plus } from 'lucide-react'

export default function CustomersPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['customers'] })
    setOpen(false)
    setEditId(null)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Clientes"
        description="Administra los clientes registrados en el sistema"
        action={
          <Button onClick={() => { setEditId(null); setOpen(true) }}>
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        }
      />
      <CustomerList onEdit={(id) => { setEditId(id); setOpen(true) }} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
          </DialogHeader>
          <CustomerForm
            customerId={editId}
            onSuccess={handleSuccess}
            onCancel={() => { setOpen(false); setEditId(null) }}
          />
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
