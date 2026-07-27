'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createMovementSchema } from './types'
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
      .select('type, amount')
    if (branchId) query = query.eq('branch_id', branchId)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    const typeSign: Record<string, number> = {
      cash_sale: 1,
      credit_payment: 1,
      manual_income: 1,
      manual_expense: -1,
      owner_withdrawal: -1,
    }

    const balance = (data ?? []).reduce((sum, m) => sum + ((typeSign[m.type] ?? 0) * Number(m.amount)), 0)

    const totals = (data ?? []).reduce((acc, m) => {
      const sign = typeSign[m.type] ?? 0
      if (sign > 0) acc.income += Number(m.amount)
      else if (sign < 0) acc.expense += Number(m.amount)
      return acc
    }, { income: 0, expense: 0 })

    return { success: true, data: { balance, income: totals.income, expense: totals.expense } }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function createMovement(formData: FormData): Promise<ActionResponse> {
  try {
    const branch_id = formData.get('branch_id') as string
    const type = formData.get('type') as string
    const amount = formData.get('amount') as string
    const description = formData.get('description') as string

    const validated = createMovementSchema.safeParse({ branch_id, type, amount, description })
    if (!validated.success) {
      return { success: false, message: 'Datos inválidos', errors: validated.error.flatten().fieldErrors }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('cash_register_movements').insert({
      branch_id: validated.data.branch_id,
      type: validated.data.type,
      amount: validated.data.amount,
      description: validated.data.description,
      created_by: user?.id,
    })
    if (error) throw new Error(error.message)

    revalidatePath('/cash-register')
    return { success: true, message: 'Movimiento registrado exitosamente' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}
