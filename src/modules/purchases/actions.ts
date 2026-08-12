'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { assertAdmin, assertAdminOrManager } from '@/modules/users/service'
import { createPurchaseSchema } from './types'
import type { ActionResponse } from './types'
import type { Branches, Products } from '@/shared/types/database.types'

async function getAdminClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
}

export async function getPurchases(params?: {
  branchId?: string
  fromDate?: string
  toDate?: string
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
      .from('purchases')
      .select('*, branches(name), suppliers(name, document_id), purchase_expenses(description, cost)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (params?.branchId) query = query.eq('branch_id', params.branchId)
    if (params?.fromDate) query = query.gte('created_at', params.fromDate)
    if (params?.toDate) query = query.lte('created_at', params.toDate + 'T23:59:59.999Z')

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    const admin = await getAdminClient()
    const userIds = [...new Set((data ?? []).map(p => p.created_by).filter(Boolean))]
    const userMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: users } = await admin.auth.admin.listUsers()
      for (const u of users?.users ?? []) {
        userMap[u.id] = (u.user_metadata?.full_name as string) || u.email || u.phone || 'Usuario'
      }
    }

    const enriched = (data ?? []).map(p => ({
      ...p,
      created_by_name: p.created_by ? userMap[p.created_by] ?? 'Usuario' : null,
    }))

    return { success: true, message: '', data: enriched, total: count ?? 0 }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getPurchaseById(id: string) {
  try {
    const supabase = await createClient()
    const { data: purchase, error } = await supabase
      .from('purchases')
      .select('*, branches(name, address, phone), suppliers(id, name, document_id)')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)

    const { data: items } = await supabase
      .from('purchase_items')
      .select('*, products(name, image_url, units_of_measure(name, abbreviation))')
      .eq('purchase_id', id)

    const { data: expenses } = await supabase
      .from('purchase_expenses')
      .select('*')
      .eq('purchase_id', id)

    let created_by_name: string | null = null
    if (purchase.created_by) {
      const admin = await getAdminClient()
      const { data: user } = await admin.auth.admin.getUserById(purchase.created_by)
      const meta = user?.user?.user_metadata as Record<string, unknown> | undefined
      created_by_name = (meta?.full_name as string) || user?.user?.email || 'Usuario'
    }

    return { success: true, message: '', data: { ...purchase, items: items ?? [], expenses: expenses ?? [], created_by_name } }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getBranchesList(): Promise<ActionResponse<Branches[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('branches').select('*').eq('is_active', true).order('name')
    if (error) throw new Error(error.message)
    return { success: true, message: '', data: data ?? [] }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function searchProducts(query: string): Promise<ActionResponse<Products[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select('*, units_of_measure(name, abbreviation)')
      .eq('is_active', true)
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(10)
    if (error) throw new Error(error.message)
    return { success: true, message: '', data: data ?? [] }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function createPurchase(formData: FormData): Promise<ActionResponse> {
  try {
    const branch_id = formData.get('branch_id') as string
    const supplier_id = formData.get('supplier_id') as string
    const notes = formData.get('notes') as string

    const itemsJson = formData.get('items') as string
    let items: Array<{ product_id: string; quantity: number; unit_cost: number }> = []
    try { items = JSON.parse(itemsJson) } catch { return { success: false, message: 'Error al procesar los productos' } }

    const expensesJson = formData.get('expenses') as string
    let expenses: Array<{ description: string; cost: number }> = []
    try { if (expensesJson) expenses = JSON.parse(expensesJson) } catch {}

    const validated = createPurchaseSchema.safeParse({ branch_id, supplier_id, notes, items, expenses })
    if (!validated.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    const totalProductos = validated.data.items.reduce((sum, i) => sum + (i.quantity * i.unit_cost), 0)
    const totalGastos = (validated.data.expenses ?? []).reduce((sum, e) => sum + e.cost, 0)
    const total = totalProductos + totalGastos

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        branch_id: validated.data.branch_id,
        supplier_id: validated.data.supplier_id || null,
        total,
        notes: validated.data.notes || null,
        created_by: user?.id,
        status: 'pending',
      })
      .select()
      .single()
    if (purchaseError) throw new Error(purchaseError.message)

    const purchaseItems = validated.data.items.map(i => ({
      purchase_id: purchase.id,
      product_id: i.product_id,
      quantity: i.quantity,
      unit_cost: i.unit_cost,
      subtotal: i.quantity * i.unit_cost,
    }))

    const { error: itemsError } = await supabase.from('purchase_items').insert(purchaseItems)
    if (itemsError) throw new Error(itemsError.message)

    if (validated.data.expenses && validated.data.expenses.length > 0) {
      const expenseRows = validated.data.expenses.map(e => ({
        purchase_id: purchase.id,
        description: e.description,
        cost: e.cost,
      }))
      const { error: expensesError } = await supabase.from('purchase_expenses').insert(expenseRows)
      if (expensesError) throw new Error(expensesError.message)
    }

    revalidatePath('/purchases')
    return { success: true, message: 'Proforma guardada exitosamente', data: purchase }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function updatePurchase(formData: FormData): Promise<ActionResponse> {
  try {
    const purchase_id = formData.get('purchase_id') as string
    const branch_id = formData.get('branch_id') as string
    const supplier_id = formData.get('supplier_id') as string
    const notes = formData.get('notes') as string

    const itemsJson = formData.get('items') as string
    let items: Array<{ product_id: string; quantity: number; unit_cost: number }> = []
    try { items = JSON.parse(itemsJson) } catch { return { success: false, message: 'Error al procesar los productos' } }

    const expensesJson = formData.get('expenses') as string
    let expenses: Array<{ description: string; cost: number }> = []
    try { if (expensesJson) expenses = JSON.parse(expensesJson) } catch {}

    const pid = z.string().uuid('ID de compra inválido').safeParse(purchase_id)
    if (!pid.success) {
      return { success: false, message: 'ID de compra inválido' }
    }

    const validated = createPurchaseSchema.safeParse({ branch_id, supplier_id, notes, items, expenses })
    if (!validated.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    await assertAdminOrManager()

    const supabase = await createClient()
    const { error } = await supabase.rpc('update_purchase', {
      p_purchase_id: pid.data,
      p_branch_id: validated.data.branch_id,
      p_supplier_id: validated.data.supplier_id || null,
      p_notes: validated.data.notes || null,
      p_items: validated.data.items,
      p_expenses: validated.data.expenses ?? [],
    })
    if (error) {
      throw new Error(error.message)
    }

    revalidatePath('/purchases')
    revalidatePath(`/purchases/${pid.data}`)
    return { success: true, message: 'Compra actualizada exitosamente', data: { id: pid.data } }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function approvePurchase(id: string): Promise<ActionResponse> {
  try {
    const validated = z.string().uuid('ID de compra inválido').safeParse(id)
    if (!validated.success) {
      return { success: false, message: 'ID de compra inválido' }
    }

    await assertAdminOrManager()

    const supabase = await createClient()
    const { error } = await supabase.rpc('approve_purchase', { p_purchase_id: validated.data })
    if (error) {
      throw new Error(error.message)
    }

    revalidatePath('/purchases')
    revalidatePath(`/purchases/${validated.data}`)
    revalidatePath('/inventory')
    return { success: true, message: 'Compra aprobada exitosamente' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function cancelPurchase(id: string): Promise<ActionResponse> {
  try {
    const validated = z.string().uuid('ID de compra inválido').safeParse(id)
    if (!validated.success) {
      return { success: false, message: 'ID de compra inválido' }
    }

    await assertAdminOrManager()

    const supabase = await createClient()
    const { error } = await supabase.rpc('cancel_purchase', { p_purchase_id: validated.data })
    if (error) {
      throw new Error(error.message)
    }

    revalidatePath('/purchases')
    revalidatePath(`/purchases/${validated.data}`)
    return { success: true, message: 'Compra cancelada' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function deletePurchase(formData: FormData): Promise<ActionResponse> {
  try {
    const purchaseId = formData.get('purchase_id') as string
    const validated = z.string().uuid('ID de compra inválido').safeParse(purchaseId)
    if (!validated.success) {
      return { success: false, message: 'ID de compra inválido' }
    }

    await assertAdmin()

    const supabase = await createClient()
    const { error } = await supabase.rpc('delete_purchase', { p_purchase_id: validated.data })
    if (error) {
      throw new Error(error.message)
    }

    revalidatePath('/purchases')
    revalidatePath('/inventory')
    return { success: true, message: 'Compra eliminada correctamente' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}
