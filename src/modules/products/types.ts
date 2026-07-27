import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  brand_id: z.string().uuid(),
  category_id: z.string().uuid(),
})
export type ProductInput = z.infer<typeof productSchema>

export type ActionResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string[]>
}
