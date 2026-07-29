'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { Button } from '@/shared/components/ui/button'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getBrandById } from '@/modules/brands/actions'
import { getCategoryById } from '@/modules/categories/actions'
import { ProductList } from '@/modules/products/components/product-list'
import { ProductForm } from '@/modules/products/components/product-form'
import { BrandSwitcher } from '@/modules/brands/components/brand-switcher'
import { CategorySwitcher } from '@/modules/categories/components/category-switcher'
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

export default function CategoryProductsPage() {
  const queryClient = useQueryClient()
  const params = useParams()
  const brandId = params.brandId as string
  const categoryId = params.categoryId as string
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['products', brandId, categoryId] })
    setOpen(false)
    setEditId(null)
  }

  const { data: brandData } = useQuery({
    queryKey: ['brand', brandId],
    queryFn: () => getBrandById(brandId),
  })

  const { data: categoryData } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: () => getCategoryById(categoryId),
  })

  const brandName = brandData?.data?.name ?? '...'
  const categoryName = categoryData?.data?.name ?? '...'

  return (
    <PageContainer>
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/brands" />}>Marcas</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href={`/brands/${brandId}`} />}>{brandName}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink>{categoryName}</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <BrandSwitcher currentBrandId={brandId} />
      <CategorySwitcher brandId={brandId} currentCategoryId={categoryId} />

      <PageHeader
        title={categoryName}
        description="Productos en esta categoría"
        action={
          <Button onClick={() => { setEditId(null); setOpen(true) }}>
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </Button>
        }
      />

      <ProductList brandId={brandId} categoryId={categoryId} onEdit={(id) => { setEditId(id); setOpen(true) }} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <ProductForm
            brandId={brandId}
            categoryId={categoryId}
            productId={editId ?? undefined}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}