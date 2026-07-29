import { z } from 'zod'

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  document_id: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
})

export type ActionResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string[]>
}
