'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { categorySchema, type CategoryInput } from '../types'
import { createCategory, updateCategory, getCategoryById } from '../actions'
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

interface CategoryFormProps {
  brandId: string
  categoryId?: string | null
  onSuccess: () => void
  onCancel: () => void
}

export function CategoryForm({ brandId, categoryId, onSuccess, onCancel }: CategoryFormProps) {
  const isEditing = !!categoryId

  const { data: category } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      if (!categoryId) return null
      const result = await getCategoryById(categoryId)
      return result.success ? result.data : null
    },
    enabled: isEditing,
  })

  const form = useForm<CategoryInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(categorySchema) as any,
    defaultValues: { name: '', brand_id: brandId },
    values: category ? { name: category.name, brand_id: brandId } : undefined,
  })

  useEffect(() => {
    if (category) form.reset({ name: category.name, brand_id: brandId })
  }, [category, form, brandId])

  const onSubmit = async (data: CategoryInput) => {
    const formData = new FormData()
    formData.set('name', data.name)
    formData.set('brand_id', brandId)
    const result = isEditing
      ? await updateCategory(categoryId, brandId, formData)
      : await createCategory(formData)
    if (result.success) {
      toast.success(isEditing ? 'Categoría actualizada' : 'Categoría creada')
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
                <Input placeholder="Nombre de la categoría" {...field} />
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
            {form.formState.isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Categoría'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
