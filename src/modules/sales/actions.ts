'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { assertAdmin } from '@/modules/users/service'
import { createSaleSchema } from './types'
import type { ActionResponse } from './types'

async function getAdminClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
}

export async function getSales(params?: {
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
      .from('sales')
      .select('*, branches(name), customers(name, phone), sale_credits(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (params?.branchId) query = query.eq('branch_id', params.branchId)
    if (params?.fromDate) query = query.gte('created_at', params.fromDate)
    if (params?.toDate) query = query.lte('created_at', params.toDate + 'T23:59:59.999Z')

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    const admin = await getAdminClient()
    const userIds = [...new Set((data ?? []).map(s => s.created_by).filter(Boolean))]
    const userMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: users } = await admin.auth.admin.listUsers()
      for (const u of users?.users ?? []) {
        userMap[u.id] = (u.user_metadata?.full_name as string) || u.email || u.phone || 'Usuario'
      }
    }

    const enriched = (data ?? []).map(s => ({
      ...s,
      created_by_name: s.created_by ? userMap[s.created_by] ?? 'Usuario' : null,
    }))

    return { success: true, data: enriched, total: count ?? 0 }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getSaleById(id: string) {
  try {
    const supabase = await createClient()
    const { data: sale, error } = await supabase
      .from('sales')
      .select('*, branches(name, address, phone), customers(name, phone), sale_credits(*)')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)

    const { data: items } = await supabase
      .from('sale_items')
      .select('*, products(name, image_url)')
      .eq('sale_id', id)

    // Fetch payments for each credit
    const credits = (sale.sale_credits as Array<Record<string, unknown>>) || []
    for (const credit of credits) {
      const { data: payments } = await supabase
        .from('credit_payments')
        .select('*')
        .eq('sale_credit_id', credit.id)
        .order('created_at', { ascending: false })
      credit.payments = payments ?? []
    }

    let created_by_name: string | null = null
    if (sale.created_by) {
      const admin = await getAdminClient()
      const { data: user } = await admin.auth.admin.getUserById(sale.created_by)
      const meta = user?.user?.user_metadata as Record<string, unknown> | undefined
      created_by_name = (meta?.full_name as string) || user?.user?.email || 'Usuario'
    }

    return { success: true, data: { ...sale, items: items ?? [], created_by_name } }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getSaleProducts(brandId: string, categoryId: string, branchId?: string) {
  try {
    const supabase = await createClient()
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, image_url, cost')
      .eq('brand_id', brandId)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('name')
    if (error) throw new Error(error.message)

    const stockMap: Record<string, { quantity: number; sale_price: number }> = {}
    if (branchId) {
      const { data: inventory } = await supabase
        .from('inventory_items')
        .select('product_id, quantity, sale_price')
        .eq('branch_id', branchId)
      for (const inv of inventory ?? []) {
        stockMap[inv.product_id] = { quantity: inv.quantity, sale_price: inv.sale_price }
      }
    }

    const enriched = (products ?? []).map(p => ({
      ...p,
      stock: stockMap[p.id]?.quantity ?? 0,
      sale_price: stockMap[p.id]?.sale_price ?? 0,
    }))

    return { success: true, data: enriched }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function searchProducts(query: string, branchId?: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select('id, name, image_url, cost')
      .eq('is_active', true)
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(10)
    if (error) throw new Error(error.message)

    const stockMap: Record<string, { quantity: number; sale_price: number }> = {}
    if (branchId) {
      const { data: inventory } = await supabase
        .from('inventory_items')
        .select('product_id, quantity, sale_price')
        .eq('branch_id', branchId)
      for (const inv of inventory ?? []) {
        stockMap[inv.product_id] = { quantity: inv.quantity, sale_price: inv.sale_price }
      }
    }

    const enriched = (data ?? []).map(p => ({
      ...p,
      stock: stockMap[p.id]?.quantity ?? 0,
      sale_price: stockMap[p.id]?.sale_price ?? 0,
    }))

    return { success: true, data: enriched }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function searchCustomers(query: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
      .order('name')
      .limit(10)
    if (error) throw new Error(error.message)
    return { success: true, data: data ?? [] }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function createCustomer(formData: FormData) {
  try {
    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    if (!name) return { success: false, message: 'El nombre es requerido' }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('customers')
      .insert({ name, phone: phone || null })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return { success: true, data }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function createSale(formData: FormData): Promise<ActionResponse> {
  try {
    const branch_id = formData.get('branch_id') as string
    const payment_type = formData.get('payment_type') as string
    const cash_amount = parseFloat(formData.get('cash_amount') as string) || 0
    const qr_amount = parseFloat(formData.get('qr_amount') as string) || 0
    const credit_anticipo = parseFloat(formData.get('credit_anticipo') as string) || 0
    const discount = parseFloat(formData.get('discount') as string) || 0
    const notes = formData.get('notes') as string
    const customer_id = formData.get('customer_id') as string
    const customer_name = formData.get('customer_name') as string
    const customer_phone = formData.get('customer_phone') as string
    const itemsJson = formData.get('items') as string

    let items: Array<{ product_id: string; quantity: number; price: number }> = []
    try { items = JSON.parse(itemsJson) } catch { return { success: false, message: 'Error al procesar los productos' } }

    const validated = createSaleSchema.safeParse({
      branch_id, payment_type, cash_amount, qr_amount, credit_anticipo, discount, notes,
      customer_id: customer_id || undefined,
      customer_name: customer_name || undefined,
      customer_phone: customer_phone || undefined,
      items,
    })
    if (!validated.success) {
      return { success: false, message: 'Datos inválidos', errors: validated.error.flatten().fieldErrors }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const itemsTotal = validated.data.items.reduce((sum, i) => sum + (i.quantity * i.price), 0)
    const discountVal = validated.data.discount || 0
    const total = Math.max(0, itemsTotal - discountVal)

    if (validated.data.payment_type === 'mixed') {
      const totalPay = (validated.data.cash_amount || 0) + (validated.data.qr_amount || 0)
      if (Math.abs(totalPay - total) > 0.01) {
        return { success: false, message: `La suma de efectivo (Bs ${validated.data.cash_amount.toFixed(2)}) y QR (Bs ${validated.data.qr_amount.toFixed(2)}) debe ser igual al total (Bs ${total.toFixed(2)})` }
      }
    }

    if (validated.data.payment_type === 'credit' && !validated.data.customer_id && !validated.data.customer_name) {
      return { success: false, message: 'Para ventas a crédito debes seleccionar o registrar un cliente' }
    }

    // Verify stock
    for (const item of validated.data.items) {
      const { data: inv } = await supabase
        .from('inventory_items')
        .select('quantity')
        .eq('product_id', item.product_id)
        .eq('branch_id', validated.data.branch_id)
        .single()
      if (!inv || inv.quantity < item.quantity) {
        return { success: false, message: `Stock insuficiente para uno de los productos` }
      }
    }

    // Determine amounts
    let cashAmt = 0
    let qrAmt = 0
    if (validated.data.payment_type === 'cash') cashAmt = total
    else if (validated.data.payment_type === 'qr') qrAmt = total
    else if (validated.data.payment_type === 'mixed') { cashAmt = validated.data.cash_amount || 0; qrAmt = validated.data.qr_amount || 0 }
    else if (validated.data.payment_type === 'credit') cashAmt = validated.data.credit_anticipo || 0

    // Create sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        branch_id: validated.data.branch_id,
        total,
        discount: discountVal,
        payment_type: validated.data.payment_type,
        cash_amount: cashAmt,
        qr_amount: qrAmt,
        credit_anticipo: validated.data.credit_anticipo || 0,
        notes: validated.data.notes || null,
        customer_id: validated.data.customer_id || null,
        customer_name: validated.data.customer_name || null,
        customer_phone: validated.data.customer_phone || null,
        created_by: user?.id,
      })
      .select()
      .single()
    if (saleError) throw new Error(saleError.message)

    // Create sale items
    const saleItems = validated.data.items.map(i => ({
      sale_id: sale.id,
      product_id: i.product_id,
      quantity: i.quantity,
      price: i.price,
      subtotal: i.quantity * i.price,
    }))
    const { error: itemsError } = await supabase.from('sale_items').insert(saleItems)
    if (itemsError) throw new Error(itemsError.message)

    // Deduct stock
    for (const item of validated.data.items) {
      const { data: inv } = await supabase
        .from('inventory_items')
        .select('id, quantity')
        .eq('product_id', item.product_id)
        .eq('branch_id', validated.data.branch_id)
        .single()
      if (inv) {
        await supabase.from('inventory_items').update({ quantity: inv.quantity - item.quantity }).eq('id', inv.id)
      }
    }

    // Cash register movement for cash portion
    if (cashAmt > 0) {
      await supabase.from('cash_register_movements').insert({
        branch_id: validated.data.branch_id,
        type: 'cash_sale',
        amount: cashAmt,
        payment_method: 'cash',
        cash_amount: cashAmt,
        qr_amount: 0,
        reference_type: 'sale',
        reference_id: sale.id,
        description: validated.data.payment_type === 'credit'
          ? `Venta #${sale.number} - Anticipo (Crédito)`
          : `Venta #${sale.number} - Efectivo`,
      })
    }

    // Cash register movement for QR portion
    if (qrAmt > 0) {
      await supabase.from('cash_register_movements').insert({
        branch_id: validated.data.branch_id,
        type: 'manual_income',
        amount: qrAmt,
        payment_method: 'qr',
        cash_amount: 0,
        qr_amount: qrAmt,
        reference_type: 'sale',
        reference_id: sale.id,
        description: `Venta #${sale.number} - QR`,
      })
    }

    // Create sale_credits record for credit sales
    if (validated.data.payment_type === 'credit') {
      const remaining = total - (validated.data.credit_anticipo || 0)
      if (remaining > 0) {
        await supabase.from('sale_credits').insert({
          sale_id: sale.id,
          total: remaining,
          balance: remaining,
          created_by: user?.id,
        })
      }
    }

    revalidatePath('/sales')
    return { success: true, message: 'Venta registrada exitosamente', data: sale }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function deleteSale(formData: FormData): Promise<ActionResponse> {
  try {
    const saleId = formData.get('sale_id') as string
    const validated = z.string().uuid('ID de venta inválido').safeParse(saleId)
    if (!validated.success) {
      return { success: false, message: 'ID de venta inválido' }
    }

    await assertAdmin()

    const supabase = await createClient()
    const { error } = await supabase.rpc('delete_sale', { p_sale_id: validated.data })
    if (error) {
      throw new Error(error.message)
    }

    revalidatePath('/sales')
    revalidatePath('/cash-register')
    revalidatePath('/credits')
    return { success: true, message: 'Venta eliminada correctamente' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}
