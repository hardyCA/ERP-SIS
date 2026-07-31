'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { customerSchema, type CustomerInput } from '../types'
import { createCustomer, updateCustomer, getCustomerById } from '../actions'
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

interface CustomerFormProps {
  customerId?: string | null
  onSuccess: () => void
  onCancel: () => void
}

export function CustomerForm({ customerId, onSuccess, onCancel }: CustomerFormProps) {
  const isEditing = !!customerId

  const { data: customer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      if (!customerId) return null
      const result = await getCustomerById(customerId)
      return result.success ? result.data : null
    },
    enabled: isEditing,
  })

  const form = useForm<CustomerInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(customerSchema) as any,
    defaultValues: { name: '', phone: '', document_id: '', address: '' },
    values: customer ? {
      name: customer.name,
      phone: customer.phone ?? '',
      document_id: customer.document_id ?? '',
      address: customer.address ?? '',
    } : undefined,
  })

  useEffect(() => {
    if (customer) form.reset({
      name: customer.name,
      phone: customer.phone ?? '',
      document_id: customer.document_id ?? '',
      address: customer.address ?? '',
    })
  }, [customer, form])

  const onSubmit = async (data: CustomerInput) => {
    const formData = new FormData()
    formData.set('name', data.name)
    formData.set('phone', data.phone ?? '')
    formData.set('document_id', data.document_id ?? '')
    formData.set('address', data.address ?? '')
    const result = isEditing
      ? await updateCustomer(customerId, formData)
      : await createCustomer(formData)
    if (result.success) {
      toast.success(isEditing ? 'Cliente actualizado' : 'Cliente creado')
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
                <Input placeholder="Nombre del cliente" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input placeholder="Número de teléfono (opcional)" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="document_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cédula / ID</FormLabel>
              <FormControl>
                <Input placeholder="Cédula o documento (opcional)" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Input placeholder="Dirección del cliente (opcional)" {...field} value={field.value ?? ''} />
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
            {form.formState.isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Cliente'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
