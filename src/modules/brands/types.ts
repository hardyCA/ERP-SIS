import { z } from 'zod'

export const brandSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
})
export type BrandInput = z.infer<typeof brandSchema>

export type ActionResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string[]>
}
