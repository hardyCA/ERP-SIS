'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { brandSchema, type BrandInput } from '../types'
import { createBrand, updateBrand, getBrandById } from '../actions'
import { useQuery } from '@tanstack/react-query'
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

interface BrandFormProps {
  brandId?: string | null
  onSuccess: () => void
  onCancel: () => void
}

export function BrandForm({ brandId, onSuccess, onCancel }: BrandFormProps) {
  const isEditing = !!brandId

  const { data: brand } = useQuery({
    queryKey: ['brand', brandId],
    queryFn: async () => {
      if (!brandId) return null
      const result = await getBrandById(brandId)
      return result.success ? result.data : null
    },
    enabled: isEditing,
  })

  const form = useForm<BrandInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(brandSchema) as any,
    defaultValues: { name: '' },
    values: brand ? { name: brand.name } : undefined,
  })

  useEffect(() => {
    if (brand) form.reset({ name: brand.name })
  }, [brand, form])

  const onSubmit = async (data: BrandInput) => {
    const formData = new FormData()
    formData.set('name', data.name)
    const result = isEditing
      ? await updateBrand(brandId, formData)
      : await createBrand(formData)
    if (result.success) {
      toast.success(isEditing ? 'Marca actualizada' : 'Marca creada')
      onSuccess()
    } else {
      toast.error(result.message)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Nombre de la marca" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Marca'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
