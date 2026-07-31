import { z } from 'zod'

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  document_id: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
})

export type ActionResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string[]>
}
