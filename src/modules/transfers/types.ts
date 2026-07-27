import { z } from 'zod'

export const transferItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1, 'La cantidad debe ser mayor a 0'),
  unit_cost: z.coerce.number().min(0, 'El costo no puede ser negativo'),
})

export const createTransferSchema = z.object({
  from_branch_id: z.string().uuid('Selecciona sucursal origen'),
  to_branch_id: z.string().uuid('Selecciona sucursal destino'),
  notes: z.string().optional(),
  items: z.array(transferItemSchema).min(1, 'Agrega al menos un producto'),
}).refine(d => d.from_branch_id !== d.to_branch_id, {
  message: 'La sucursal origen y destino deben ser diferentes',
  path: ['to_branch_id'],
})

export type CreateTransferInput = z.infer<typeof createTransferSchema>
export type TransferItemInput = z.infer<typeof transferItemSchema>

export type ActionResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string[]>
}
