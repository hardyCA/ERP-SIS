import { z } from 'zod'

export const quoteItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1, 'La cantidad debe ser mayor a 0'),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
})

export const createQuoteSchema = z.object({
  branch_id: z.string().uuid('Selecciona una sucursal'),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  expires_at: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, 'Agrega al menos un producto'),
})

export const updateQuoteSchema = createQuoteSchema.partial().extend({
  items: z.array(quoteItemSchema).min(1, 'Agrega al menos un producto'),
})

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>

export type ActionResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string[]>
}

export const quoteStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  sent: { label: 'Enviada', variant: 'secondary' },
  accepted: { label: 'Aceptada', variant: 'success' },
  expired: { label: 'Expirada', variant: 'destructive' },
  converted: { label: 'Convertida', variant: 'default' },
}