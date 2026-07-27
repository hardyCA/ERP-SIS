'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { adjustStockSchema, type AdjustStockInput } from '../types'
import { adjustStock } from '../actions'
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

interface InventoryAdjustFormProps {
  productId: string
  productName: string
  currentQty: number
  branchId: string
  onSuccess: () => void
  onCancel: () => void
}

export function InventoryAdjustForm({ productId, productName, currentQty, branchId, onSuccess, onCancel }: InventoryAdjustFormProps) {
  const queryClient = useQueryClient()

  const form = useForm<AdjustStockInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(adjustStockSchema) as any,
    defaultValues: {
      product_id: productId,
      branch_id: branchId,
      quantity: 0,
      reason: '',
    },
  })

  const onSubmit = async (data: AdjustStockInput) => {
    const formData = new FormData()
    formData.set('product_id', data.product_id)
    formData.set('branch_id', data.branch_id)
    formData.set('quantity', String(data.quantity))
    formData.set('reason', data.reason)
    const result = await adjustStock(formData)
    if (result.success) {
      toast.success('Stock ajustado correctamente')
      queryClient.invalidateQueries({ queryKey: ['inventory', branchId] })
      onSuccess()
    } else {
      toast.error(result.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <span className="text-muted-foreground">Producto: </span>
        <span className="font-medium">{productName}</span>
      </div>
      <div className="text-sm">
        <span className="text-muted-foreground">Stock actual: </span>
        <span className="font-medium">{currentQty}</span>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cantidad a ajustar</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Usa valores positivos (añadir) o negativos (restar)"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Positivo para añadir stock, negativo para reducir
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo del ajuste</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Ajuste por inventario físico, merma, etc." {...field} />
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
              {form.formState.isSubmitting ? 'Ajustando...' : 'Ajustar Stock'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
