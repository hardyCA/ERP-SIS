import { z } from 'zod'

export const movementTypeLabels: Record<string, string> = {
  cash_sale: 'Venta (Efectivo)',
  credit_payment: 'Pago de Crédito',
  manual_income: 'Ingreso Manual',
  manual_expense: 'Egreso Manual',
  owner_withdrawal: 'Retiro de Propietario',
}

export const reverseTypes: Record<string, number> = {
  cash_sale: 1,
  credit_payment: 1,
  manual_income: 1,
  manual_expense: -1,
  owner_withdrawal: -1,
}

export const createMovementSchema = z.object({
  branch_id: z.string().uuid(),
  type: z.enum(['manual_income', 'manual_expense', 'owner_withdrawal']),
  amount: z.coerce.number().min(0.01, 'El monto debe ser mayor a 0'),
  description: z.string().min(1, 'La descripción es requerida'),
})

export type CreateMovementInput = z.infer<typeof createMovementSchema>

export type ActionResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string[]>
}
