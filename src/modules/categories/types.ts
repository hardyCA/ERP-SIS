import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  brand_id: z.string().uuid('Marca inválida'),
})
export type CategoryInput = z.infer<typeof categorySchema>

export type ActionResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string[]>
}
