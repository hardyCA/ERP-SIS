'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { Button } from '@/shared/components/ui/button'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getBrandById } from '@/modules/brands/actions'
import { CategoryList } from '@/modules/categories/components/category-list'
import { CategoryForm } from '@/modules/categories/components/category-form'
import { BrandSwitcher } from '@/modules/brands/components/brand-switcher'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@/shared/components/ui/breadcrumb'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default function BrandCategoriesPage() {
  const queryClient = useQueryClient()
  const params = useParams()
  const brandId = params.brandId as string
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['categories', brandId] })
    setOpen(false)
    setEditId(null)
  }

  const { data: brandData } = useQuery({
    queryKey: ['brand', brandId],
    queryFn: () => getBrandById(brandId),
  })

  const brandName = brandData?.data?.name ?? '...'

  return (
    <PageContainer>
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/brands" />}>Marcas</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink>{brandName}</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <BrandSwitcher currentBrandId={brandId} />

      <PageHeader
        title={brandName}
        description="Selecciona una categoría para ver sus productos"
        action={
          <Button onClick={() => { setEditId(null); setOpen(true) }}>
            <Plus className="h-4 w-4" />
            Nueva Categoría
          </Button>
        }
      />

      <CategoryList brandId={brandId} onEdit={(id) => { setEditId(id); setOpen(true) }} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
          </DialogHeader>
          <CategoryForm
            brandId={brandId}
            categoryId={editId ?? undefined}
            onSuccess={handleSuccess}
            onCancel={() => { setOpen(false); setEditId(null) }}
          />
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}