'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { createQuoteSchema, updateQuoteSchema } from './types'
import type { ActionResponse } from './types'

async function getAdminClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
}

export async function getQuotes(params?: {
  branchId?: string
  fromDate?: string
  toDate?: string
  page?: number
  pageSize?: number
  status?: 'draft' | 'sent' | 'accepted' | 'expired' | 'converted'
}) {
  try {
    const supabase = await createClient()
    const page = params?.page ?? 1
    const pageSize = params?.pageSize ?? 20
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('quotes')
      .select('*, branches(name), customers(name, phone)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (params?.status) query = query.eq('status', params.status)

    if (params?.branchId) query = query.eq('branch_id', params.branchId)
    if (params?.fromDate) query = query.gte('created_at', params.fromDate)
    if (params?.toDate) query = query.lte('created_at', params.toDate + 'T23:59:59.999Z')

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    const admin = await getAdminClient()
    const userIds = [...new Set((data ?? []).flatMap(q => [q.created_by]).filter(Boolean))]
    const userMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: users } = await admin.auth.admin.listUsers()
      for (const u of users?.users ?? []) {
        userMap[u.id] = (u.user_metadata?.full_name as string) || u.email || u.phone || 'Usuario'
      }
    }

    const enriched = (data ?? []).map(q => ({
      ...q,
      created_by_name: q.created_by ? userMap[q.created_by] ?? 'Usuario' : null,
    }))

    return { success: true, data: enriched, total: count ?? 0 }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getQuoteById(id: string) {
  try {
    const supabase = await createClient()
    const { data: quote, error } = await supabase
      .from('quotes')
      .select('*, branches(name, address, phone), customers(name, phone)')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)

    const { data: items } = await supabase
      .from('quote_items')
      .select('*, products(name, image_url, units_of_measure(name, abbreviation))')
      .eq('quote_id', id)

    let created_by_name: string | null = null
    const admin = await getAdminClient()
    if (quote.created_by) {
      const { data: user } = await admin.auth.admin.getUserById(quote.created_by)
      const meta = user?.user?.user_metadata as Record<string, unknown> | undefined
      created_by_name = (meta?.full_name as string) || user?.user?.email || 'Usuario'
    }

    return { success: true, data: { ...quote, items: items ?? [], created_by_name } }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getQuoteProducts(brandId: string, categoryId: string, branchId?: string) {
  try {
    const supabase = await createClient()
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, image_url, cost, units_of_measure(name, abbreviation)')
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
      .select('id, name, image_url, cost, units_of_measure(name, abbreviation)')
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

export async function createQuote(formData: FormData): Promise<ActionResponse> {
  try {
    const branch_id = formData.get('branch_id') as string
    const discount = parseFloat(formData.get('discount') as string) || 0
    const notes = formData.get('notes') as string
    const customer_id = formData.get('customer_id') as string
    const customer_name = formData.get('customer_name') as string
    const customer_phone = formData.get('customer_phone') as string
    const expires_at = formData.get('expires_at') as string
    const itemsJson = formData.get('items') as string

    let items: Array<{ product_id: string; quantity: number; price: number }> = []
    try { items = JSON.parse(itemsJson) } catch { return { success: false, message: 'Error al procesar los productos' } }

    const validated = createQuoteSchema.safeParse({
      branch_id,
      discount,
      notes,
      customer_id: customer_id || undefined,
      customer_name: customer_name || undefined,
      customer_phone: customer_phone || undefined,
      expires_at: expires_at || undefined,
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

    // Create quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        branch_id: validated.data.branch_id,
        total,
        discount: discountVal,
        notes: validated.data.notes || null,
        customer_id: validated.data.customer_id || null,
        customer_name: validated.data.customer_name || null,
        customer_phone: validated.data.customer_phone || null,
        expires_at: validated.data.expires_at || null,
        created_by: user?.id,
        status: 'draft',
      })
      .select()
      .single()
    if (quoteError) throw new Error(quoteError.message)

    // Create quote items
    const quoteItems = validated.data.items.map(i => ({
      quote_id: quote.id,
      product_id: i.product_id,
      quantity: i.quantity,
      price: i.price,
    }))
    const { error: itemsError } = await supabase.from('quote_items').insert(quoteItems)
    if (itemsError) throw new Error(itemsError.message)

    revalidatePath('/quotes')
    return { success: true, message: 'Cotización registrada exitosamente', data: quote }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function updateQuote(id: string, formData: FormData): Promise<ActionResponse> {
  try {
    const discount = parseFloat(formData.get('discount') as string) || 0
    const notes = formData.get('notes') as string
    const customer_id = formData.get('customer_id') as string
    const customer_name = formData.get('customer_name') as string
    const customer_phone = formData.get('customer_phone') as string
    const expires_at = formData.get('expires_at') as string
    const itemsJson = formData.get('items') as string

    let items: Array<{ product_id: string; quantity: number; price: number }> = []
    try { items = JSON.parse(itemsJson) } catch { return { success: false, message: 'Error al procesar los productos' } }

    const validated = updateQuoteSchema.safeParse({
      discount,
      notes,
      customer_id: customer_id || undefined,
      customer_name: customer_name || undefined,
      customer_phone: customer_phone || undefined,
      expires_at: expires_at || undefined,
      items,
    })
    if (!validated.success) {
      return { success: false, message: 'Datos inválidos', errors: validated.error.flatten().fieldErrors }
    }

    const supabase = await createClient()

    const itemsTotal = validated.data.items.reduce((sum, i) => sum + (i.quantity * i.price), 0)
    const discountVal = validated.data.discount || 0
    const total = Math.max(0, itemsTotal - discountVal)

    // Update quote
    const { error: quoteError } = await supabase
      .from('quotes')
      .update({
        total,
        discount: discountVal,
        notes: validated.data.notes || null,
        customer_id: validated.data.customer_id || null,
        customer_name: validated.data.customer_name || null,
        customer_phone: validated.data.customer_phone || null,
        expires_at: validated.data.expires_at || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (quoteError) throw new Error(quoteError.message)

    // Delete old items and insert new ones
    await supabase.from('quote_items').delete().eq('quote_id', id)

    const quoteItems = validated.data.items.map(i => ({
      quote_id: id,
      product_id: i.product_id,
      quantity: i.quantity,
      price: i.price,
    }))
    const { error: itemsError } = await supabase.from('quote_items').insert(quoteItems)
    if (itemsError) throw new Error(itemsError.message)

    revalidatePath('/quotes')
    revalidatePath(`/quotes/${id}`)
    return { success: true, message: 'Cotización actualizada exitosamente' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function convertQuoteToSale(quoteId: string): Promise<ActionResponse<{ saleId: string }>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('convert_quote_to_sale', { p_quote_id: quoteId })
    if (error) throw new Error(error.message)

    revalidatePath('/quotes')
    revalidatePath('/sales')
    revalidatePath('/cash-register')
    revalidatePath('/inventory')
    return { success: true, message: 'Cotización convertida a venta exitosamente', data: { saleId: data } }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function updateQuoteStatus(quoteId: string, status: 'draft' | 'sent' | 'accepted' | 'expired'): Promise<ActionResponse> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc('update_quote_status', { p_quote_id: quoteId, p_status: status })
    if (error) throw new Error(error.message)

    revalidatePath('/quotes')
    revalidatePath(`/quotes/${quoteId}`)
    return { success: true, message: 'Estado actualizado' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function deleteQuote(formData: FormData): Promise<ActionResponse> {
  try {
    const quoteId = formData.get('quote_id') as string
    const validated = z.string().uuid('ID de cotización inválido').safeParse(quoteId)
    if (!validated.success) {
      return { success: false, message: 'ID de cotización inválido' }
    }

    const supabase = await createClient()
    const { error } = await supabase.rpc('delete_quote', { p_quote_id: validated.data })
    if (error) throw new Error(error.message)

    revalidatePath('/quotes')
    return { success: true, message: 'Cotización eliminada correctamente' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}