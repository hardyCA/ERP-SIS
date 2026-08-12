'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { productSchema, type ProductInput } from '../types'
import { createProduct, updateProduct, getProductById, getProductBranchPrices } from '../actions'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useBranch } from '@/shared/contexts/branch-context'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Separator } from '@/shared/components/ui/separator'
import Image from 'next/image'
import { useState, useRef, useMemo } from 'react'
import { Package, ImageUp, CircleDollarSign, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useShowCost } from '@/shared/lib/use-role'
import { UnitSelector } from '@/modules/units/components/unit-selector'

interface ProductFormProps {
  brandId: string
  categoryId: string
  productId?: string
  onSuccess?: () => void
}

export function ProductForm({ brandId, categoryId, productId, onSuccess }: ProductFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { branchId, branchName } = useBranch()
  const isEditing = !!productId
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: product } = useQuery({
    queryKey: ['product-edit', productId],
    queryFn: async () => {
      if (!productId) return null
      const result = await getProductById(productId)
      return result.success ? result.data : null
    },
    enabled: isEditing,
  })

  const { data: branchPricesData } = useQuery({
    queryKey: ['product-branch-price', productId, branchId],
    queryFn: () => getProductBranchPrices(productId ?? ''),
    enabled: isEditing && !!productId && !!branchId,
  })

  const currentBranchPrice = useMemo(() => {
    if (!branchId) return 0
    const prices = branchPricesData?.success ? (branchPricesData.data ?? []) : []
    const found = prices.find((p: Record<string, unknown>) => p.branch_id === branchId)
    return found ? Number(found.sale_price ?? 0) : 0
  }, [branchPricesData, branchId])

  const showCost = useShowCost()

  const form = useForm<ProductInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: '',
      brand_id: brandId,
      category_id: categoryId,
      sale_price: 0,
    },
    values: product ? {
      name: product.name,
      brand_id: brandId,
      category_id: categoryId,
      unit_id: (product.unit_id as string | null) ?? null,
      sale_price: currentBranchPrice,
    } : undefined,
  })

  const handleFile = (file: File | undefined) => {
    if (file) {
      setSelectedFile(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  const removeImage = () => {
    setSelectedFile(null)
    setPreview(null)
  }

  const onSubmit = async (data: ProductInput) => {
    const formData = new FormData()
    formData.set('name', data.name)
    formData.set('brand_id', brandId)
    formData.set('category_id', categoryId)
    if (data.unit_id) formData.set('unit_id', data.unit_id)
    if (branchId) {
      formData.set('branch_id', branchId)
      formData.set('sale_price', data.sale_price !== undefined ? String(data.sale_price) : '')
    }
    if (selectedFile) {
      formData.set('image', selectedFile)
    }

    const result = isEditing
      ? await updateProduct(productId, brandId, categoryId, formData)
      : await createProduct(formData)
    if (result.success) {
      toast.success(isEditing ? 'Producto actualizado' : 'Producto creado')
      queryClient.invalidateQueries({ queryKey: ['products', brandId, categoryId] })
      if (onSuccess) onSuccess()
      router.push(`/brands/${brandId}/categories/${categoryId}`)
      router.refresh()
    } else {
      toast.error(result.message)
    }
  }

  const hasImage = !!(preview || product?.image_url)
  const imageSrc = preview ?? product?.image_url ?? ''

  return (
    <div className="w-full">
      <Card className="border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader className="space-y-1 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isEditing ? 'Actualiza los datos del producto' : 'Registra un nuevo producto en el catálogo'}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-5">
                <div className="space-y-4 lg:col-span-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Información General
                  </h3>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del producto</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Package className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="Ej: Camiseta básica negra" className="pl-8" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unit_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidad de medida</FormLabel>
                        <FormControl>
                          <div className="space-y-1">
                            <UnitSelector
                              value={field.value ?? null}
                              onChange={(id) => field.onChange(id)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Si la unidad no existe, puedes registrarla desde aquí.
                            </p>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {branchId && (
                    <FormField
                      control={form.control}
                      name="sale_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio de venta (Bs)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <CircleDollarSign className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                className="pl-8"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Se aplicará como precio inicial en la sucursal:{' '}
                            <span className="font-medium">{branchName || branchId}</span>
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {showCost && (
                    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info/10">
                          <CircleDollarSign className="h-4 w-4 text-info" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">Costo promedio ponderado</p>
                          <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
                            {product ? `Bs ${Number(product.cost).toFixed(2)}` : 'Bs 0.00'}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            El costo se calcula automáticamente al registrar compras usando el promedio ponderado del inventario
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 lg:col-span-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Imagen
                  </h3>
                  <div>
                    <input
                      ref={fileInputRef}
                      id="product-image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFile(e.target.files?.[0])}
                    />
                    {hasImage ? (
                      <div className="relative overflow-hidden rounded-xl border">
                        <div className="absolute right-2 top-2 z-10">
                          <button
                            type="button"
                            onClick={removeImage}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-background hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="relative flex items-center justify-center bg-muted/30 p-4">
                          <div className="relative h-40 w-40 overflow-hidden rounded-lg">
                            <Image src={imageSrc} alt="Preview" fill className="object-cover" />
                          </div>
                        </div>
                        <div className="border-t px-4 py-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Cambiar imagen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]) }}
                        className={cn(
                          'flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-all',
                          dragOver
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                        )}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <ImageUp className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground">Subir imagen</p>
                          <p className="text-xs text-muted-foreground">Arrastra o haz clic</p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => router.back()} className="sm:order-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting} className="sm:order-2">
                  {form.formState.isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Guardando...
                    </span>
                  ) : isEditing ? (
                    'Guardar Cambios'
                  ) : (
                    'Crear Producto'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
