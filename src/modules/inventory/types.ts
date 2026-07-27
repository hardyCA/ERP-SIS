import { z } from 'zod'

export const adjustStockSchema = z.object({
  product_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  quantity: z.coerce.number().int('Debe ser un número entero'),
  reason: z.string().min(1, 'El motivo es requerido'),
})
export type AdjustStockInput = z.infer<typeof adjustStockSchema>

export const updatePriceSchema = z.object({
  product_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  sale_price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
})
export type UpdatePriceInput = z.infer<typeof updatePriceSchema>

export type ActionResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string[]>
}
