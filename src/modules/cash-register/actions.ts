'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createMovementSchema, cashTransferSchema } from './types'
import type { ActionResponse } from './types'

async function getAdminClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
}

export async function getMovements(params?: {
  branchId?: string
  page?: number
  pageSize?: number
}) {
  try {
    const supabase = await createClient()
    const page = params?.page ?? 1
    const pageSize = params?.pageSize ?? 20
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('cash_register_movements')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (params?.branchId) query = query.eq('branch_id', params.branchId)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    const admin = await getAdminClient()
    const userIds = [...new Set((data ?? []).map(m => m.created_by).filter(Boolean))]
    const userMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: users } = await admin.auth.admin.listUsers()
      for (const u of users?.users ?? []) {
        userMap[u.id] = (u.user_metadata?.full_name as string) || u.email || u.phone || 'Usuario'
      }
    }

    const enriched = (data ?? []).map(m => ({
      ...m,
      created_by_name: m.created_by ? userMap[m.created_by] ?? 'Usuario' : null,
    }))

    return { success: true, data: enriched, total: count ?? 0 }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getBalance(branchId?: string) {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('cash_register_movements')
      .select('type, amount, cash_amount, qr_amount')
    if (branchId) query = query.eq('branch_id', branchId)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    const typeSign: Record<string, number> = {
      cash_sale: 1,
      credit_payment: 1,
      manual_income: 1,
      manual_expense: -1,
      owner_withdrawal: -1,
      cash_transfer_out: -1,
      cash_transfer_in: 1,
    }

    const balance = (data ?? []).reduce((sum, m) => sum + ((typeSign[m.type] ?? 0) * Number(m.amount)), 0)

    let cashBalance = 0
    let qrBalance = 0
    let income = 0
    let expense = 0
    let incomeCash = 0
    let incomeQr = 0
    let expenseCash = 0
    let expenseQr = 0

    for (const m of data ?? []) {
      const sign = typeSign[m.type] ?? 0
      const cashPart = Number(m.cash_amount ?? 0)
      const qrPart = Number(m.qr_amount ?? 0)
      cashBalance += sign * cashPart
      qrBalance += sign * qrPart
      if (sign > 0) {
        income += Number(m.amount)
        incomeCash += cashPart
        incomeQr += qrPart
      } else if (sign < 0) {
        expense += Number(m.amount)
        expenseCash += cashPart
        expenseQr += qrPart
      }
    }

    return {
      success: true,
      data: {
        balance,
        income,
        expense,
        cashBalance,
        qrBalance,
        incomeCash,
        incomeQr,
        expenseCash,
        expenseQr,
      },
    }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function createMovement(formData: FormData): Promise<ActionResponse> {
  try {
    const branch_id = formData.get('branch_id') as string
    const type = formData.get('type') as string
    const amount = formData.get('amount') as string
    const transfer_method = formData.get('transfer_method') as string
    const cash_amount = formData.get('cash_amount') as string || '0'
    const qr_amount = formData.get('qr_amount') as string || '0'
    const description = formData.get('description') as string

    const validated = createMovementSchema.safeParse({ branch_id, type, amount, transfer_method, cash_amount, qr_amount, description })
    if (!validated.success) {
      return { success: false, message: 'Datos inválidos', errors: validated.error.flatten().fieldErrors }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const typeLabels: Record<string, string> = {
      manual_income: 'Ingreso Manual',
      manual_expense: 'Egreso Manual',
      owner_withdrawal: 'Retiro Propietario',
    }
    const methodLabels: Record<string, string> = { cash: 'Efectivo', qr: 'QR', mixed: 'Mixto' }
    const method = validated.data.transfer_method
    const methodDetail = method === 'mixed'
      ? `Efectivo Bs ${validated.data.cash_amount.toFixed(2)} + QR Bs ${validated.data.qr_amount.toFixed(2)}`
      : methodLabels[method] ?? method

    const desc = `${typeLabels[validated.data.type] ?? validated.data.type} - ${methodDetail}${description ? ` - ${description}` : ''}`

    let cashPart = 0
    let qrPart = 0
    if (method === 'cash') cashPart = validated.data.amount
    else if (method === 'qr') qrPart = validated.data.amount
    else { cashPart = validated.data.cash_amount; qrPart = validated.data.qr_amount }

    const { error } = await supabase.from('cash_register_movements').insert({
      branch_id: validated.data.branch_id,
      type: validated.data.type,
      amount: validated.data.amount,
      payment_method: method,
      cash_amount: cashPart,
      qr_amount: qrPart,
      description: desc,
      created_by: user?.id,
    })
    if (error) throw new Error(error.message)

    revalidatePath('/cash-register')
    return { success: true, message: 'Movimiento registrado exitosamente' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getBranchBalance(branchId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cash_register_movements')
      .select('type, amount, cash_amount, qr_amount')
      .eq('branch_id', branchId)
    if (error) throw new Error(error.message)

    const typeSign: Record<string, number> = {
      cash_sale: 1,
      credit_payment: 1,
      manual_income: 1,
      manual_expense: -1,
      owner_withdrawal: -1,
      cash_transfer_out: -1,
      cash_transfer_in: 1,
    }

    const balance = (data ?? []).reduce((sum, m) => sum + ((typeSign[m.type] ?? 0) * Number(m.amount)), 0)

    let cashBalance = 0
    let qrBalance = 0
    for (const m of data ?? []) {
      const sign = typeSign[m.type] ?? 0
      cashBalance += sign * Number(m.cash_amount ?? 0)
      qrBalance += sign * Number(m.qr_amount ?? 0)
    }

    return { success: true, data: { balance, cashBalance, qrBalance } }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function createCashTransfer(formData: FormData): Promise<ActionResponse> {
  try {
    const origin_branch_id = formData.get('origin_branch_id') as string
    const destination_branch_id = formData.get('destination_branch_id') as string
    const amount = formData.get('amount') as string
    const transfer_method = formData.get('transfer_method') as string
    const cash_amount = formData.get('cash_amount') as string || '0'
    const qr_amount = formData.get('qr_amount') as string || '0'
    const description = formData.get('description') as string

    const validated = cashTransferSchema.safeParse({ origin_branch_id, destination_branch_id, amount, transfer_method, cash_amount, qr_amount, description })
    if (!validated.success) {
      return { success: false, message: 'Datos inválidos', errors: validated.error.flatten().fieldErrors }
    }

    if (validated.data.origin_branch_id === validated.data.destination_branch_id) {
      return { success: false, message: 'La sucursal origen y destino deben ser diferentes' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const typeSign: Record<string, number> = {
      cash_sale: 1, credit_payment: 1, manual_income: 1,
      manual_expense: -1, owner_withdrawal: -1, cash_transfer_out: -1, cash_transfer_in: 1,
    }

    const { data: originMovements } = await supabase
      .from('cash_register_movements')
      .select('type, amount')
      .eq('branch_id', validated.data.origin_branch_id)
    const originBalance = (originMovements ?? []).reduce((sum, m) => sum + ((typeSign[m.type] ?? 0) * Number(m.amount)), 0)

    if (originBalance < validated.data.amount) {
      return { success: false, message: `Saldo insuficiente en la sucursal origen. Disponible: Bs ${originBalance.toFixed(2)}` }
    }

    const { data: destBranch } = await supabase
      .from('branches')
      .select('name')
      .eq('id', validated.data.destination_branch_id)
      .single()
    const destName = destBranch?.name ?? 'Destino'

    const { data: originBranch } = await supabase
      .from('branches')
      .select('name')
      .eq('id', validated.data.origin_branch_id)
      .single()
    const originName = originBranch?.name ?? 'Origen'

    const methodLabels: Record<string, string> = { cash: 'Efectivo', qr: 'QR', mixed: 'Mixto' }
    const method = validated.data.transfer_method
    const methodDetail = method === 'mixed'
      ? `Efectivo Bs ${validated.data.cash_amount.toFixed(2)} + QR Bs ${validated.data.qr_amount.toFixed(2)}`
      : methodLabels[method] ?? method

    let cashPart = 0
    let qrPart = 0
    if (method === 'cash') cashPart = validated.data.amount
    else if (method === 'qr') qrPart = validated.data.amount
    else { cashPart = validated.data.cash_amount; qrPart = validated.data.qr_amount }

    const outDesc = `Transferencia a: ${destName} - ${methodDetail}${description ? ` - ${description}` : ''}`
    const inDesc = `Transferencia desde: ${originName} - ${methodDetail}${description ? ` - ${description}` : ''}`

    const transferId = crypto.randomUUID()

    const { error: errorOut } = await supabase.from('cash_register_movements').insert({
      branch_id: validated.data.origin_branch_id,
      type: 'cash_transfer_out',
      amount: validated.data.amount,
      payment_method: method,
      cash_amount: cashPart,
      qr_amount: qrPart,
      description: outDesc,
      reference_type: 'cash_transfer',
      reference_id: transferId,
      created_by: user?.id,
    })
    if (errorOut) throw new Error(errorOut.message)

    const { error: errorIn } = await supabase.from('cash_register_movements').insert({
      branch_id: validated.data.destination_branch_id,
      type: 'cash_transfer_in',
      amount: validated.data.amount,
      payment_method: method,
      cash_amount: cashPart,
      qr_amount: qrPart,
      description: inDesc,
      reference_type: 'cash_transfer',
      reference_id: transferId,
      created_by: user?.id,
    })
    if (errorIn) throw new Error(errorIn.message)

    revalidatePath('/cash-register')
    return { success: true, message: 'Transferencia realizada exitosamente' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}
