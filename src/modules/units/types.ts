import { z } from 'zod'

export const unitSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  abbreviation: z.string().optional().nullable(),
})
export type UnitInput = z.infer<typeof unitSchema>

export type ActionResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string[]>
}