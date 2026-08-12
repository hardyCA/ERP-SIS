'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { unitSchema, type UnitInput } from '../types'
import { createUnit, updateUnit } from '../actions'
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

interface UnitFormProps {
  unitId?: string | null
  initialName?: string
  initialAbbreviation?: string | null
  onSuccess: () => void
  onCancel: () => void
}

export function UnitForm({ unitId, initialName = '', initialAbbreviation, onSuccess, onCancel }: UnitFormProps) {
  const isEditing = !!unitId

  const form = useForm<UnitInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(unitSchema) as any,
    defaultValues: { name: initialName, abbreviation: initialAbbreviation ?? '' },
  })

  const onSubmit = async (data: UnitInput) => {
    const formData = new FormData()
    formData.set('name', data.name)
    if (data.abbreviation) formData.set('abbreviation', data.abbreviation)

    const result = isEditing && unitId
      ? await updateUnit(unitId, formData)
      : await createUnit(formData)
    if (result.success) {
      toast.success(isEditing ? 'Unidad actualizada' : 'Unidad de medida creada')
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
                <Input placeholder="Ej: Caja, Kilo, Litro, Unidad" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="abbreviation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Abreviación (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ej: CJA, KG, LT, UND" {...field} value={field.value ?? ''} />
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
            {form.formState.isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Unidad'}
          </Button>
        </div>
      </form>
    </Form>
  )
}