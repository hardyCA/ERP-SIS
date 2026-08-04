'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createTransferSchema } from './types'
import type { ActionResponse } from './types'

async function getAdminClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
}

export async function getTransfers(params?: {
  branchId?: string
  page?: number
  pageSize?: number
  dateFrom?: string
  dateTo?: string
  search?: string
}) {
  try {
    const supabase = await createClient()
    const page = params?.page ?? 1
    const pageSize = params?.pageSize ?? 20
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('transfers')
      .select('*, from_branch:branches!from_branch_id(name), to_branch:branches!to_branch_id(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (params?.branchId) query = query.or(`from_branch_id.eq.${params.branchId},to_branch_id.eq.${params.branchId}`)
    if (params?.dateFrom) query = query.gte('created_at', params.dateFrom)
    if (params?.dateTo) query = query.lte('created_at', params.dateTo)
    if (params?.search?.trim()) {
      const term = params.search.trim()
      query = query.or(
        `number::text.ilike.%${term}%,status.ilike.%${term}%,from_branch.name.ilike.%${term}%,to_branch.name.ilike.%${term}%`
      )
    }

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

    const allIds = [...new Set((data ?? []).flatMap(t => [t.created_by, t.sent_by, t.received_by].filter(Boolean)))]
    for (const uid of allIds) {
      if (!userMap[uid as string]) {
        try {
          const { data: u } = await admin.auth.admin.getUserById(uid as string)
          if (u?.user) userMap[uid as string] = (u.user.user_metadata?.full_name as string) || u.user.email || 'Usuario'
        } catch {}
      }
    }

    const enriched = (data ?? []).map(t => ({
      ...t,
      created_by_name: t.created_by ? userMap[t.created_by] ?? 'Usuario' : null,
      sent_by_name: t.sent_by ? userMap[t.sent_by] ?? 'Usuario' : null,
      received_by_name: t.received_by ? userMap[t.received_by] ?? 'Usuario' : null,
    }))

    return { success: true, data: enriched, total: count ?? 0 }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getTransferById(id: string) {
  try {
    const supabase = await createClient()
    const { data: transfer, error } = await supabase
      .from('transfers')
      .select('*, from_branch:branches!from_branch_id(name, address, phone), to_branch:branches!to_branch_id(name, address, phone)')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)

    const { data: items } = await supabase
      .from('transfer_items')
      .select('*, products(name, image_url)')
      .eq('transfer_id', id)

    const admin = await getAdminClient()
    async function getUserName(uid: string | null | undefined): Promise<string | null> {
      if (!uid) return null
      try {
        const { data: u } = await admin.auth.admin.getUserById(uid)
        const meta = u?.user?.user_metadata as Record<string, unknown> | undefined
        return (meta?.full_name as string) || u?.user?.email || 'Usuario'
      } catch { return 'Usuario' }
    }

    const [created_by_name, sent_by_name, received_by_name] = await Promise.all([
      getUserName(transfer.created_by),
      getUserName(transfer.sent_by),
      getUserName(transfer.received_by),
    ])

    return { success: true, data: { ...transfer, items: items ?? [], created_by_name, sent_by_name, received_by_name } }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getBranchesList() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('branches').select('id, name').eq('is_active', true).order('name')
    if (error) throw new Error(error.message)
    return { success: true, data: data ?? [] }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getTransferProducts(brandId: string, categoryId: string, branchId?: string) {
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

    const stockMap: Record<string, number> = {}
    if (branchId) {
      const { data: inventory } = await supabase
        .from('inventory_items')
        .select('product_id, quantity')
        .eq('branch_id', branchId)
      for (const inv of inventory ?? []) {
        stockMap[inv.product_id] = inv.quantity
      }
    }

    const enriched = (products ?? []).map(p => ({
      ...p,
      stock: stockMap[p.id] ?? 0,
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

    const stockMap: Record<string, number> = {}
    if (branchId) {
      const { data: inventory } = await supabase
        .from('inventory_items')
        .select('product_id, quantity')
        .eq('branch_id', branchId)
      for (const inv of inventory ?? []) {
        stockMap[inv.product_id] = inv.quantity
      }
    }

    const enriched = (data ?? []).map(p => ({
      ...p,
      stock: stockMap[p.id] ?? 0,
    }))

    return { success: true, data: enriched }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function createTransfer(formData: FormData): Promise<ActionResponse> {
  try {
    const from_branch_id = formData.get('from_branch_id') as string
    const to_branch_id = formData.get('to_branch_id') as string
    const notes = formData.get('notes') as string
    const itemsJson = formData.get('items') as string

    let items: Array<{ product_id: string; quantity: number; unit_cost: number }> = []
    try { items = JSON.parse(itemsJson) } catch { return { success: false, message: 'Error al procesar los productos' } }

    const validated = createTransferSchema.safeParse({ from_branch_id, to_branch_id, notes, items })
    if (!validated.success) {
      return { success: false, message: 'Datos inválidos', errors: validated.error.flatten().fieldErrors }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: transfer, error: transferError } = await supabase
      .from('transfers')
      .insert({
        from_branch_id: validated.data.from_branch_id,
        to_branch_id: validated.data.to_branch_id,
        status: 'pending',
        notes: validated.data.notes || null,
        created_by: user?.id,
      })
      .select()
      .single()
    if (transferError) throw new Error(transferError.message)

    const transferItems = validated.data.items.map(i => ({
      transfer_id: transfer.id,
      product_id: i.product_id,
      quantity: i.quantity,
      unit_cost: i.unit_cost,
    }))

    const { error: itemsError } = await supabase.from('transfer_items').insert(transferItems)
    if (itemsError) throw new Error(itemsError.message)

    revalidatePath('/transfers')
    return { success: true, message: 'Traspaso creado exitosamente', data: transfer }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function completeTransfer(id: string) {
  try {
    const supabase = await createClient()

    const { data: transfer } = await supabase
      .from('transfers')
      .select('*, transfer_items(*)')
      .eq('id', id)
      .single()
    if (!transfer) return { success: false, message: 'Traspaso no encontrado' }
    if (transfer.status !== 'sent') return { success: false, message: 'El traspaso debe estar en estado "Enviado" para recibirlo' }

    for (const item of transfer.transfer_items ?? []) {
      const { data: destInv } = await supabase
        .from('inventory_items')
        .select('id, quantity, sale_price')
        .eq('product_id', item.product_id)
        .eq('branch_id', transfer.to_branch_id)
        .single()

      if (destInv) {
        await supabase.from('inventory_items').update({ quantity: destInv.quantity + item.quantity }).eq('id', destInv.id)
      } else {
        await supabase.from('inventory_items').insert({
          product_id: item.product_id,
          branch_id: transfer.to_branch_id,
          quantity: item.quantity,
          sale_price: 0,
        })
      }
    }

    const { data: { user: recvUser } } = await supabase.auth.getUser()
    await supabase.from('transfers').update({ status: 'received', received_by: recvUser?.id }).eq('id', id)

    revalidatePath('/transfers')
    return { success: true, message: 'Traspaso recibido exitosamente' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function sendTransfer(id: string) {
  try {
    const supabase = await createClient()

    const { data: transfer } = await supabase
      .from('transfers')
      .select('*, transfer_items(*, products(name))')
      .eq('id', id)
      .single()
    if (!transfer) return { success: false, message: 'Traspaso no encontrado' }
    if (transfer.status !== 'pending') return { success: false, message: 'El traspaso debe estar pendiente para enviarlo' }

    for (const item of transfer.transfer_items ?? []) {
      const { data: fromInv } = await supabase
        .from('inventory_items')
        .select('id, quantity')
        .eq('product_id', item.product_id)
        .eq('branch_id', transfer.from_branch_id)
        .single()

      if (!fromInv || fromInv.quantity < item.quantity) {
        const productName = (item as { products: { name: string } | null }).products?.name ?? 'producto'
        return { success: false, message: `Stock insuficiente de "${productName}" en sucursal origen` }
      }

      await supabase.from('inventory_items').update({ quantity: fromInv.quantity - item.quantity }).eq('id', fromInv.id)
    }

    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('transfers').update({ status: 'sent', sent_by: user?.id }).eq('id', id)

    revalidatePath('/transfers')
    return { success: true, message: 'Traspaso enviado exitosamente' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function cancelTransfer(id: string) {
  try {
    const supabase = await createClient()

    const { data: transfer } = await supabase.from('transfers').select('status').eq('id', id).single()
    if (!transfer) return { success: false, message: 'Traspaso no encontrado' }
    if (transfer.status === 'received') return { success: false, message: 'No se puede cancelar un traspaso ya recibido' }

    if (transfer.status === 'sent') {
      const { data: items } = await supabase.from('transfer_items').select('*').eq('transfer_id', id)
      if (items) {
        for (const item of items) {
          const { data: fromInv } = await supabase
            .from('inventory_items')
            .select('id, quantity')
            .eq('product_id', item.product_id)
            .eq('branch_id', (await supabase.from('transfers').select('from_branch_id').eq('id', id).single()).data?.from_branch_id)
            .single()
          if (fromInv) {
            await supabase.from('inventory_items').update({ quantity: fromInv.quantity + item.quantity }).eq('id', fromInv.id)
          }
        }
      }
    }

    await supabase.from('transfers').update({ status: 'cancelled' }).eq('id', id)

    revalidatePath('/transfers')
    return { success: true, message: 'Traspaso cancelado' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}
