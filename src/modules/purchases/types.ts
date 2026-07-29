import { z } from 'zod'

export const purchaseItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1, 'La cantidad debe ser mayor a 0'),
  unit_cost: z.coerce.number().min(0, 'El costo no puede ser negativo'),
})

export const expenseSchema = z.object({
  description: z.string().min(1, 'La descripción es requerida'),
  cost: z.coerce.number().min(0, 'El costo no puede ser negativo'),
})

export const createPurchaseSchema = z.object({
  branch_id: z.string().uuid('Selecciona una sucursal'),
  supplier_id: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'Agrega al menos un producto'),
  expenses: z.array(expenseSchema).optional(),
})
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>

export type ActionResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  total?: number
  errors?: Record<string, string[]>
}
