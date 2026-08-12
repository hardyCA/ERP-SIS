import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  brand_id: z.string().uuid(),
  category_id: z.string().uuid(),
  unit_id: z.string().uuid().nullable().optional(),
  sale_price: z.coerce.number().min(0, 'El precio no puede ser negativo').optional(),
})
export type ProductInput = z.infer<typeof productSchema>

export type ActionResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string[]>
}
