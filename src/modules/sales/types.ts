import { z } from 'zod'

export const saleItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1, 'La cantidad debe ser mayor a 0'),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
})

export const createSaleSchema = z.object({
  branch_id: z.string().uuid('Selecciona una sucursal'),
  payment_type: z.enum(['cash', 'qr', 'mixed', 'credit']),
  cash_amount: z.coerce.number().min(0).default(0),
  qr_amount: z.coerce.number().min(0).default(0),
  credit_anticipo: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'Agrega al menos un producto'),
})

export type CreateSaleInput = z.infer<typeof createSaleSchema>

export type ActionResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string[]>
}
