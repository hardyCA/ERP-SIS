'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { Button } from '@/shared/components/ui/button'
import { BrandList } from '@/modules/brands/components/brand-list'
import { BrandForm } from '@/modules/brands/components/brand-form'
import { UnitList } from '@/modules/units/components/unit-list'
import { UnitForm } from '@/modules/units/components/unit-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { Plus, FolderTree, Ruler } from 'lucide-react'

type Tab = 'brands' | 'units'

export default function BrandsPage() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab')
  const tab: Tab = urlTab === 'units' ? 'units' : 'brands'
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editUnit, setEditUnit] = useState<{ id: string; name: string; abbreviation: string | null } | null>(null)

  const setTab = (key: Tab) => {
    router.replace(key === 'brands' ? '/brands' : '/brands?tab=units', { scroll: false })
  }

  const handleBrandSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['brands'] })
    setOpen(false)
    setEditId(null)
  }

  const handleUnitSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['units'] })
    setOpen(false)
    setEditUnit(null)
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg border p-0.5 bg-muted/50">
          {([
            ['brands', FolderTree, 'Marcas'] as const,
            ['units', Ruler, 'Unidades de Medida'] as const,
          ]).map(([key, Icon, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setTab(key); setOpen(false); setEditId(null); setEditUnit(null) }}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                tab === key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'brands' ? (
        <>
          <PageHeader
            title="Marcas"
            description="Selecciona una marca para ver sus categorías y productos"
            action={
              <Button onClick={() => { setEditId(null); setOpen(true) }}>
                <Plus className="h-4 w-4" />
                Nueva Marca
              </Button>
            }
          />
          <BrandList onEdit={(id) => { setEditId(id); setOpen(true) }} />

          <Dialog open={open && tab === 'brands'} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setEditUnit(null) } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? 'Editar Marca' : 'Nueva Marca'}</DialogTitle>
              </DialogHeader>
              <BrandForm
                brandId={editId}
                onSuccess={handleBrandSuccess}
                onCancel={() => { setOpen(false); setEditId(null) }}
              />
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <>
          <PageHeader
            title="Unidades de Medida"
            description="Gestiona las unidades de medida de tus productos"
            action={
              <Button onClick={() => { setEditUnit(null); setOpen(true) }}>
                <Plus className="h-4 w-4" />
                Nueva Unidad
              </Button>
            }
          />
          <UnitList onEdit={(unit) => { setEditUnit(unit); setOpen(true) }} />

          <Dialog open={open && tab === 'units'} onOpenChange={(o) => { setOpen(o); if (!o) { setEditUnit(null); setEditId(null) } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editUnit ? 'Editar Unidad' : 'Nueva Unidad'}</DialogTitle>
              </DialogHeader>
              <UnitForm
                unitId={editUnit?.id}
                initialName={editUnit?.name}
                initialAbbreviation={editUnit?.abbreviation ?? null}
                onSuccess={handleUnitSuccess}
                onCancel={() => { setOpen(false); setEditUnit(null) }}
              />
            </DialogContent>
          </Dialog>
        </>
      )}
    </PageContainer>
  )
}