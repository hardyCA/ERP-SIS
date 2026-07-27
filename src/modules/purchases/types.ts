import { z } from 'zod'

export const purchaseItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1, 'La cantidad debe ser mayor a 0'),
  unit_cost: z.coerce.number().min(0, 'El costo no puede ser negativo'),
})

export const createPurchaseSchema = z.object({
  branch_id: z.string().uuid('Selecciona una sucursal'),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'Agrega al menos un producto'),
})
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>

export type ActionResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  total?: number
  errors?: Record<string, string[]>
}
