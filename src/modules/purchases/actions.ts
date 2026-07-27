'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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
      .select('*, branches(name)', { count: 'exact' })
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
      .select('*, branches(name, address, phone)')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)

    const { data: items } = await supabase
      .from('purchase_items')
      .select('*, products(name, image_url)')
      .eq('purchase_id', id)

    let created_by_name: string | null = null
    if (purchase.created_by) {
      const admin = await getAdminClient()
      const { data: user } = await admin.auth.admin.getUserById(purchase.created_by)
      const meta = user?.user?.user_metadata as Record<string, unknown> | undefined
      created_by_name = (meta?.full_name as string) || user?.user?.email || 'Usuario'
    }

    return { success: true, message: '', data: { ...purchase, items: items ?? [], created_by_name } }
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
      .select('*')
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
    const notes = formData.get('notes') as string

    const itemsJson = formData.get('items') as string
    let items: Array<{ product_id: string; quantity: number; unit_cost: number }> = []
    try { items = JSON.parse(itemsJson) } catch { return { success: false, message: 'Error al procesar los productos' } }

    const validated = createPurchaseSchema.safeParse({ branch_id, notes, items })
    if (!validated.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    const total = validated.data.items.reduce((sum, i) => sum + (i.quantity * i.unit_cost), 0)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({ branch_id: validated.data.branch_id, total, notes: validated.data.notes || null, created_by: user?.id })
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

    for (const item of validated.data.items) {
      const { data: existing } = await supabase
        .from('inventory_items')
        .select('id, quantity')
        .eq('product_id', item.product_id)
        .eq('branch_id', validated.data.branch_id)
        .single()

      if (existing) {
        await supabase
          .from('inventory_items')
          .update({ quantity: existing.quantity + item.quantity })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('inventory_items')
          .insert({
            product_id: item.product_id,
            branch_id: validated.data.branch_id,
            quantity: item.quantity,
            sale_price: 0,
          })
      }

      // Recalcular costo promedio ponderado del producto
      const { data: invData } = await supabase
        .from('inventory_items')
        .select('quantity')
        .eq('product_id', item.product_id)
        .eq('branch_id', validated.data.branch_id)
        .single()

      if (invData) {
        const { data: productData } = await supabase
          .from('products')
          .select('cost')
          .eq('id', item.product_id)
          .single()

        if (productData) {
          const stockTotal = invData.quantity
          const stockAnterior = stockTotal - item.quantity
          const costoAnterior = Number(productData.cost)

          // Costo promedio ponderado
          const nuevoCosto = stockAnterior > 0
            ? (stockAnterior * costoAnterior + item.quantity * item.unit_cost) / stockTotal
            : item.unit_cost

          await supabase
            .from('products')
            .update({ cost: Math.round(nuevoCosto * 100) / 100 })
            .eq('id', item.product_id)
        }
      }
    }

    revalidatePath('/purchases')
    return { success: true, message: 'Compra registrada exitosamente', data: purchase }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}
