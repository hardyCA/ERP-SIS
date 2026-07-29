import { z } from 'zod'

export const movementTypeLabels: Record<string, string> = {
  cash_sale: 'Venta (Efectivo)',
  credit_payment: 'Pago de Crédito',
  manual_income: 'Ingreso Manual',
  manual_expense: 'Egreso Manual',
  owner_withdrawal: 'Retiro de Propietario',
  cash_transfer_out: 'Transferencia (Envío)',
  cash_transfer_in: 'Transferencia (Recepción)',
}

export const reverseTypes: Record<string, number> = {
  cash_sale: 1,
  credit_payment: 1,
  manual_income: 1,
  manual_expense: -1,
  owner_withdrawal: -1,
  cash_transfer_out: -1,
  cash_transfer_in: 1,
}

export const createMovementSchema = z.object({
  branch_id: z.string().uuid(),
  type: z.enum(['manual_income', 'manual_expense', 'owner_withdrawal']),
  amount: z.coerce.number().min(0.01, 'El monto debe ser mayor a 0'),
  transfer_method: z.enum(['cash', 'qr', 'mixed']),
  cash_amount: z.coerce.number().min(0).default(0),
  qr_amount: z.coerce.number().min(0).default(0),
  description: z.string().min(1, 'La descripción es requerida'),
}).refine(
  (data) => {
    if (data.transfer_method === 'mixed') {
      return data.cash_amount + data.qr_amount === data.amount
    }
    return true
  },
  { message: 'La suma de efectivo y QR debe ser igual al monto total', path: ['cash_amount'] }
).refine(
  (data) => {
    if (data.transfer_method !== 'mixed') return true
    return data.cash_amount > 0 && data.qr_amount > 0
  },
  { message: 'En método mixto ambos montos deben ser mayor a 0', path: ['cash_amount'] }
)

export type CreateMovementInput = z.infer<typeof createMovementSchema>

export const cashTransferSchema = z.object({
  origin_branch_id: z.string().uuid('Selecciona la sucursal origen'),
  destination_branch_id: z.string().uuid('Selecciona la sucursal destino'),
  amount: z.coerce.number().min(0.01, 'El monto debe ser mayor a 0'),
  transfer_method: z.enum(['cash', 'qr', 'mixed']),
  cash_amount: z.coerce.number().min(0).default(0),
  qr_amount: z.coerce.number().min(0).default(0),
  description: z.string().min(1, 'La descripción es requerida'),
}).refine(
  (data) => {
    if (data.transfer_method === 'mixed') {
      return data.cash_amount + data.qr_amount === data.amount
    }
    return true
  },
  { message: 'La suma de efectivo y QR debe ser igual al monto total', path: ['cash_amount'] }
).refine(
  (data) => {
    if (data.transfer_method !== 'mixed') {
      return true
    }
    return data.cash_amount > 0 && data.qr_amount > 0
  },
  { message: 'En método mixto ambos montos deben ser mayor a 0', path: ['cash_amount'] }
)

export type CashTransferInput = z.infer<typeof cashTransferSchema>

export const transferMethodLabels: Record<string, string> = {
  cash: 'Efectivo',
  qr: 'QR',
  mixed: 'Mixto (Efectivo + QR)',
}

export type ActionResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string[]>
}
