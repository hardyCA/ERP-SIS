import { z } from 'zod'

export const customerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  phone: z.string().optional().nullable(),
  document_id: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
})
export type CustomerInput = z.infer<typeof customerSchema>

export type ActionResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string[]>
}
