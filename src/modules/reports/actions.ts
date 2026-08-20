'use server'

import { createClient } from '@/shared/lib/supabase/server'
import type { ActionResponse, DashboardStats, SalesReportItem, TopProductItem, InventoryReportItem, CashReportItem, CreditReportItem, ProfitReportItem, PurchaseStats, PurchaseReportItem } from './types'

export async function getWeeklySalesChart(branchId?: string): Promise<ActionResponse<Array<{ day: string; amount: number; count: number }>>> {
  try {
    const supabase = await createClient()

    const days: Array<{ day: string; dateStr: string; amount: number; count: number }> = []
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' })
      const dateStr = d.toISOString().split('T')[0]
      days.push({
        day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        dateStr,
        amount: 0,
        count: 0,
      })
    }

    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    let query = supabase
      .from('sales')
      .select('total, created_at')
      .is('deleted_at', null)
      .gte('created_at', sevenDaysAgo.toISOString())

    if (branchId) query = query.eq('branch_id', branchId)

    const { data: sales, error: queryErr } = await query
    if (queryErr) { throw new TypeError(queryErr.message) }

    (sales ?? []).forEach((s: { created_at: string; total: number }) => {
      const sDateStr = new Date(s.created_at).toISOString().split('T')[0]
      const match = days.find(d => d.dateStr === sDateStr)
      if (match) {
        match.amount += Number(s.total)
        match.count += 1
      }
    })

    return {
      success: true,
      message: '',
      data: days.map(({ day, amount, count }) => ({ day, amount: Math.round(amount * 100) / 100, count })),
    }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error al obtener gráfico') }
  }
}

export async function getDashboardStats(branchId?: string): Promise<ActionResponse<DashboardStats>> {
  try {
    const supabase = await createClient()

    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    let salesQuery = supabase
      .from('sales')
      .select('total')
      .is('deleted_at', null)
      .gte('created_at', todayStart.toISOString())

    if (branchId) salesQuery = salesQuery.eq('branch_id', branchId)

    const { data: todaySales } = await salesQuery
    const salesTodayAmount = (todaySales ?? []).reduce((sum, s) => sum + Number(s.total), 0)
    const salesToday = todaySales?.length ?? 0

    let creditsQuery = supabase
      .from('sale_credits')
      .select('total, sales(branch_id)')
      .gt('balance', 0)

    if (branchId) {
      creditsQuery = creditsQuery.eq('sales.branch_id', branchId)
    }

    const { data: activeCredits, error: creditsError } = await creditsQuery
    if (creditsError) throw new Error(creditsError.message)
    const activeCreditsCount = activeCredits?.length ?? 0
    const activeCreditsAmount = (activeCredits ?? []).reduce((sum, c) => sum + Number(c.total), 0)

    let cashQuery = supabase
      .from('cash_register_movements')
      .select('type, amount')

    if (branchId) cashQuery = cashQuery.eq('branch_id', branchId)

    const { data: movements } = await cashQuery
    const cashBalance = (movements ?? []).reduce((sum, m) => {
      if (m.type === 'cash_sale' || m.type === 'credit_payment' || m.type === 'manual_income') {
        return sum + Number(m.amount)
      }
      return sum - Number(m.amount)
    }, 0)

    let lowStockQuery = supabase
      .from('inventory_items')
      .select('id', { count: 'exact', head: true })
      .lte('quantity', 5)
      .gt('quantity', 0)

    if (branchId) lowStockQuery = lowStockQuery.eq('branch_id', branchId)

    const { count: lowStockCount } = await lowStockQuery

    let purchaseQuery = supabase.from('purchases').select('total, status')

    let pendingQuery = supabase.from('purchases').select('total').eq('status', 'pending')

    if (branchId) {
      purchaseQuery = purchaseQuery.eq('branch_id', branchId)
      pendingQuery = pendingQuery.eq('branch_id', branchId)
    }

    const { data: allPurchases } = await purchaseQuery
    const { data: pendingPurchases } = await pendingQuery

    const totalPurchaseAmount = (allPurchases ?? []).reduce((sum, p) => sum + Number(p.total), 0)
    const pendingPurchaseAmount = (pendingPurchases ?? []).reduce((sum, p) => sum + Number(p.total), 0)

    return {
      success: true,
      message: '',
      data: {
        totalProducts: totalProducts ?? 0,
        salesToday,
        salesTodayAmount,
        activeCredits: activeCreditsCount,
        activeCreditsAmount,
        cashBalance,
        lowStockCount: lowStockCount ?? 0,
        pendingPurchases: pendingPurchases?.length ?? 0,
        pendingPurchaseAmount,
        totalPurchases: allPurchases?.length ?? 0,
        totalPurchaseAmount,
      },
    }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getSalesReport(branchId?: string, dateFrom?: string, dateTo?: string, sellerId?: string): Promise<ActionResponse<SalesReportItem[]>> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('sales')
      .select('*, branches(name)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (branchId) query = query.eq('branch_id', branchId)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)
    if (sellerId) query = query.eq('created_by', sellerId)

    const { data, error: queryErr } = await query
    if (queryErr) { throw new TypeError(queryErr.message) }

    const userIds = [...new Set((data ?? []).map(s => s.created_by).filter(Boolean))]
    const userMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { cookies } = await import('next/headers')
      const { createServerClient } = await import('@supabase/ssr')
      const cookieStore = await cookies()
      const admin = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
      )
      const { data: users } = await admin.auth.admin.listUsers()
      for (const u of users?.users ?? []) {
        userMap[u.id] = (u.user_metadata?.full_name as string) || u.email || u.phone || 'Usuario'
      }
    }

    const enriched = (data ?? []).map(s => ({
      id: s.id,
      number: s.number,
      total: Number(s.total),
      payment_type: s.payment_type,
      customer_name: s.customer_name,
      created_at: s.created_at,
      created_by: (s.created_by as string | null) ?? null,
      created_by_name: s.created_by ? (userMap[s.created_by as string] ?? 'Usuario') : null,
      branches: s.branches ? { name: (s.branches as Record<string, unknown>).name as string } : null,
    }))

    return { success: true, message: '', data: enriched as SalesReportItem[] }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getTopProducts(branchId?: string, dateFrom?: string, dateTo?: string, sellerId?: string, limit = 10): Promise<ActionResponse<TopProductItem[]>> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('sale_items')
      .select('product_id, quantity, subtotal, sales!inner(created_at, branch_id, created_by, deleted_at), products(name, brands(name), categories(name), units_of_measure(name, abbreviation), image_url)')
      .is('sales.deleted_at', null)

    if (branchId) query = query.eq('sales.branch_id', branchId)
    if (dateFrom) query = query.gte('sales.created_at', dateFrom)
    if (dateTo) query = query.lte('sales.created_at', dateTo)
    if (sellerId) query = query.eq('sales.created_by', sellerId)

    const { data, error: queryErr } = await query
    if (queryErr) { throw new TypeError(queryErr.message) }

    const agg = new Map<string, TopProductItem>()

    for (const si of data ?? []) {
      const rawProduct = si.products as Record<string, unknown> | Array<Record<string, unknown>> | undefined
      const product = Array.isArray(rawProduct) ? rawProduct[0] : rawProduct
      if (!product) continue
      const pid = si.product_id as string
      const qty = Number(si.quantity) || 0
      const amount = Number(si.subtotal) || 0

      const unit = (product.units_of_measure as Record<string, unknown> | undefined) ?? null
      const existing = agg.get(pid)
      if (existing) {
        existing.total_quantity += qty
        existing.total_amount += amount
      } else {
        agg.set(pid, {
          product_id: pid,
          product_name: (product.name as string) ?? '—',
          brand_name: ((product.brands as Record<string, unknown> | undefined)?.name as string) ?? '',
          category_name: ((product.categories as Record<string, unknown> | undefined)?.name as string) ?? '',
          unit: unit ? (unit.abbreviation as string | null) ?? (unit.name as string) : null,
          image_url: (product.image_url as string | null) ?? null,
          total_quantity: qty,
          total_amount: amount,
        })
      }
    }

    const top = Array.from(agg.values())
      .map(p => ({ ...p, total_quantity: Math.round(p.total_quantity * 100) / 100, total_amount: Math.round(p.total_amount * 100) / 100 }))
      .sort((a, b) => b.total_quantity - a.total_quantity || b.total_amount - a.total_amount)
      .slice(0, limit)

    return { success: true, message: '', data: top }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getSalesSellers(branchId?: string): Promise<ActionResponse<Array<{ id: string; name: string }>>> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('sales')
      .select('created_by')
      .is('deleted_at', null)
      .not('created_by', 'is', null)

    if (branchId) query = query.eq('branch_id', branchId)

    const { data, error: queryErr } = await query
    if (queryErr) { throw new TypeError(queryErr.message) }

    const userIds = [...new Set((data ?? []).map(s => s.created_by).filter(Boolean))] as string[]
    const userMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { cookies } = await import('next/headers')
      const { createServerClient } = await import('@supabase/ssr')
      const cookieStore = await cookies()
      const admin = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
      )
      const { data: users } = await admin.auth.admin.listUsers()
      for (const u of users?.users ?? []) {
        userMap[u.id] = (u.user_metadata?.full_name as string) || u.email || u.phone || 'Usuario'
      }
    }

    const sellers = userIds
      .map(id => ({ id, name: userMap[id] ?? 'Usuario' }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return { success: true, message: '', data: sellers }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getInventoryReport(branchId?: string): Promise<ActionResponse<InventoryReportItem[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('inventory_items')
      .select('*, products!inner(name, cost, image_url, brands(name), categories(name), units_of_measure(name, abbreviation))')
      .gt('quantity', 0)

    if (branchId) query = query.eq('branch_id', branchId)

    query = query.order('products(name)')

    const { data, error: queryErr } = await query
    if (queryErr) { throw new TypeError(queryErr.message) }

    const items = (data ?? []).map(i => {
      const product = i.products as Record<string, unknown> | undefined
      const unit = (product?.units_of_measure as Record<string, unknown> | undefined) ?? null
      return {
        product_id: i.product_id as string,
        product_name: (product?.name as string) ?? '—',
        brand_name: ((product?.brands as Record<string, unknown> | undefined)?.name as string) ?? '—',
        category_name: ((product?.categories as Record<string, unknown> | undefined)?.name as string) ?? '—',
        unit: unit ? (unit.abbreviation as string | null) ?? (unit.name as string) : null,
        cost: Number((product?.cost as number) ?? 0),
        sale_price: Number(i.sale_price as number),
        quantity: i.quantity as number,
        image_url: (product?.image_url as string | null) ?? null,
      }
    })

    return { success: true, message: '', data: items }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getCashReport(branchId?: string, dateFrom?: string, dateTo?: string): Promise<ActionResponse<CashReportItem[]>> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('cash_register_movements')
      .select('*')
      .order('created_at', { ascending: false })

    if (branchId) query = query.eq('branch_id', branchId)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)

    const { data, error: queryErr } = await query
    if (queryErr) { throw new TypeError(queryErr.message) }

    const items = (data ?? []).map(m => ({
      id: m.id,
      number: m.number ?? 0,
      type: m.type,
      amount: Number(m.amount),
      description: m.description,
      reference_type: m.reference_type,
      created_at: m.created_at,
    }))

    return { success: true, message: '', data: items }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getCreditReport(branchId?: string, sellerId?: string): Promise<ActionResponse<CreditReportItem[]>> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('sale_credits')
      .select('*, sales!inner(number, branch_id, created_by, customer_name, created_at), credit_payments(count)')
      .order('created_at', { ascending: false })

    if (branchId) query = query.eq('sales.branch_id', branchId)
    if (sellerId) query = query.eq('sales.created_by', sellerId)

    const { data, error: queryErr } = await query
    if (queryErr) { throw new TypeError(queryErr.message) }

    const now = Date.now()

    const saleRecords = (data ?? []) as Array<Record<string, unknown>>
    const sellerIds = [...new Set(saleRecords.map(c => (c.sales as Record<string, unknown> | undefined)?.created_by as string).filter(Boolean))]
    const userMap: Record<string, string> = {}
    if (sellerIds.length > 0) {
      const { cookies } = await import('next/headers')
      const { createServerClient } = await import('@supabase/ssr')
      const cookieStore = await cookies()
      const admin = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
      )
      const { data: users } = await admin.auth.admin.listUsers()
      for (const u of users?.users ?? []) {
        userMap[u.id] = (u.user_metadata?.full_name as string) || u.email || u.phone || 'Usuario'
      }
    }

    const items = saleRecords.map(c => {
      const sale = c.sales as Record<string, unknown> | undefined
      const createdDate = (sale?.created_at as string) ?? c.created_at
      const createdBy = (sale?.created_by as string | null) ?? null
      return {
        id: c.id as string,
        sale_id: c.sale_id as string,
        sale_number: (sale?.number as number) ?? 0,
        total: Number(c.total),
        balance: Number(c.balance),
        customer_name: (sale?.customer_name as string | null) ?? null,
        created_at: c.created_at as string,
        payment_count: Array.isArray(c.credit_payments) ? (c.credit_payments as unknown[]).length : 0,
        days: Math.floor((now - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24)),
        created_by: createdBy,
        created_by_name: createdBy ? (userMap[createdBy] ?? 'Usuario') : null,
      }
    })

    return { success: true, message: '', data: items }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getCreditSellers(branchId?: string): Promise<ActionResponse<Array<{ id: string; name: string }>>> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('sale_credits')
      .select('sales!inner(created_by)')
      .not('sales.created_by', 'is', null)

    if (branchId) query = query.eq('sales.branch_id', branchId)

    const { data, error: queryErr } = await query
    if (queryErr) { throw new TypeError(queryErr.message) }

    const userIds = [...new Set((data ?? []).map(c => {
      const sales = c.sales as Array<Record<string, unknown>> | Record<string, unknown> | undefined
      return Array.isArray(sales) ? (sales[0]?.created_by as string | undefined) : (sales?.created_by as string | undefined)
    }).filter(Boolean))] as string[]
    const userMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { cookies } = await import('next/headers')
      const { createServerClient } = await import('@supabase/ssr')
      const cookieStore = await cookies()
      const admin = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
      )
      const { data: users } = await admin.auth.admin.listUsers()
      for (const u of users?.users ?? []) {
        userMap[u.id] = (u.user_metadata?.full_name as string) || u.email || u.phone || 'Usuario'
      }
    }

    const sellers = userIds
      .map(id => ({ id, name: userMap[id] ?? 'Usuario' }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return { success: true, message: '', data: sellers }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getProfitReport(branchId?: string, dateFrom?: string, dateTo?: string): Promise<ActionResponse<ProfitReportItem[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('sales')
      .select('*, branches(name), sale_items(*, products(cost))')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (branchId) query = query.eq('branch_id', branchId)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)

    const { data, error: queryErr } = await query
    if (queryErr) { throw new TypeError(queryErr.message) }

    const items: ProfitReportItem[] = (data ?? []).map(s => {
      const saleItems = Array.isArray(s.sale_items) ? s.sale_items : []
      const costTotal = saleItems.reduce((sum: number, si: Record<string, unknown>) => {
        const product = si.products as Record<string, unknown> | undefined
        return sum + Number(si.quantity) * Number(product?.cost ?? 0)
      }, 0)
      const total = Number(s.total)
      const profit = total - costTotal
      const margin = total > 0 ? (profit / total) * 100 : 0

      return {
        id: s.id,
        number: s.number,
        total,
        cost_total: Math.round(costTotal * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        margin: Math.round(margin * 100) / 100,
        payment_type: s.payment_type,
        customer_name: s.customer_name,
        created_at: s.created_at,
        branches: s.branches ? { name: (s.branches as Record<string, unknown>).name as string } : null,
      }
    })

    return { success: true, message: '', data: items }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getPurchaseStats(branchId?: string): Promise<ActionResponse<PurchaseStats>> {
  try {
    const supabase = await createClient()
    let query = supabase.from('purchases').select('status, total')
    if (branchId) query = query.eq('branch_id', branchId)

    const { data } = await query

    const pending = (data ?? []).filter(p => p.status === 'pending')
    const approved = (data ?? []).filter(p => p.status === 'approved')
    const cancelled = (data ?? []).filter(p => p.status === 'cancelled')

    return {
      success: true,
      message: '',
      data: {
        pendingCount: pending.length,
        pendingAmount: pending.reduce((s, p) => s + Number(p.total), 0),
        approvedCount: approved.length,
        approvedAmount: approved.reduce((s, p) => s + Number(p.total), 0),
        cancelledCount: cancelled.length,
        cancelledAmount: cancelled.reduce((s, p) => s + Number(p.total), 0),
      },
    }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getPurchaseReport(branchId?: string, dateFrom?: string, dateTo?: string): Promise<ActionResponse<PurchaseReportItem[]>> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('purchases')
      .select('*, branches(name), suppliers(name)')
      .order('created_at', { ascending: false })

    if (branchId) query = query.eq('branch_id', branchId)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)

    const { data, error: queryErr } = await query
    if (queryErr) throw new TypeError(queryErr.message)

    const userIds = [...new Set((data ?? []).map(p => (p as Record<string, unknown>).created_by as string).filter(Boolean))]
    const userMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { cookies } = await import('next/headers')
      const { createServerClient } = await import('@supabase/ssr')
      const cookieStore = await cookies()
      const admin = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
      )
      const { data: users } = await admin.auth.admin.listUsers()
      for (const u of users?.users ?? []) {
        userMap[u.id] = (u.user_metadata?.full_name as string) || u.email || u.phone || 'Usuario'
      }
    }

    const enriched = (data ?? []).map(p => {
      const pd = p as Record<string, unknown>
      return {
        id: pd.id as string,
        number: pd.number as number,
        total: Number(pd.total),
        status: pd.status as string,
        supplier_name: ((pd.suppliers as Record<string, unknown> | undefined)?.name as string) ?? null,
        branches: pd.branches ? { name: ((pd.branches as Record<string, unknown>).name as string) } : null,
        created_at: pd.created_at as string,
        created_by_name: (pd.created_by ? (userMap[pd.created_by as string] ?? 'Usuario') : null) as string | null,
      }
    })

    return { success: true, message: '', data: enriched }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}
