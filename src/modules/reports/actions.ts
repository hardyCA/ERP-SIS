'use server'

import { createClient } from '@/shared/lib/supabase/server'
import type { ActionResponse, DashboardStats, SalesReportItem, InventoryReportItem, CashReportItem, CreditReportItem, ProfitReportItem } from './types'

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
      .gte('created_at', todayStart.toISOString())

    if (branchId) salesQuery = salesQuery.eq('branch_id', branchId)

    const { data: todaySales } = await salesQuery
    const salesTodayAmount = (todaySales ?? []).reduce((sum, s) => sum + Number(s.total), 0)
    const salesToday = todaySales?.length ?? 0

    let creditsQuery = supabase
      .from('sale_credits')
      .select('total')
      .gt('balance', 0)

    if (branchId) {
      creditsQuery = creditsQuery.eq('sales.branch_id', branchId)
    }

    const { data: activeCredits } = await creditsQuery
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
      },
    }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getSalesReport(branchId?: string, dateFrom?: string, dateTo?: string): Promise<ActionResponse<SalesReportItem[]>> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('sales')
      .select('*, branches(name)')
      .order('created_at', { ascending: false })

    if (branchId) query = query.eq('branch_id', branchId)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)

    const { data, error: queryErr } = await query
    if (queryErr) { throw new TypeError(queryErr.message) }

    const enriched = (data ?? []).map(s => ({
      id: s.id,
      number: s.number,
      total: Number(s.total),
      payment_type: s.payment_type,
      customer_name: s.customer_name,
      created_at: s.created_at,
      created_by_name: null as string | null,
      branches: s.branches ? { name: (s.branches as Record<string, unknown>).name as string } : null,
    }))

    return { success: true, message: '', data: enriched as SalesReportItem[] }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getInventoryReport(branchId?: string): Promise<ActionResponse<InventoryReportItem[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('inventory_items')
      .select('*, products!inner(name, cost, image_url, brands(name), categories(name))')
      .gt('quantity', 0)

    if (branchId) query = query.eq('branch_id', branchId)

    query = query.order('products(name)')

    const { data, error: queryErr } = await query
    if (queryErr) { throw new TypeError(queryErr.message) }

    const items = (data ?? []).map(i => {
      const product = i.products as Record<string, unknown> | undefined
      return {
        product_id: i.product_id as string,
        product_name: (product?.name as string) ?? '—',
        brand_name: ((product?.brands as Record<string, unknown> | undefined)?.name as string) ?? '—',
        category_name: ((product?.categories as Record<string, unknown> | undefined)?.name as string) ?? '—',
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

export async function getCreditReport(branchId?: string): Promise<ActionResponse<CreditReportItem[]>> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('sale_credits')
      .select('*, sales!inner(number, branch_id, customer_name, created_at), credit_payments(count)')
      .order('created_at', { ascending: false })

    if (branchId) query = query.eq('sales.branch_id', branchId)

    const { data, error: queryErr } = await query
    if (queryErr) { throw new TypeError(queryErr.message) }

    const now = Date.now()

    const items = (data ?? []).map(c => {
      const sale = c.sales as Record<string, unknown> | undefined
      const createdDate = (sale?.created_at as string) ?? c.created_at
      return {
        id: c.id,
        sale_id: c.sale_id,
        sale_number: (sale?.number as number) ?? 0,
        total: Number(c.total),
        balance: Number(c.balance),
        customer_name: (sale?.customer_name as string | null) ?? null,
        created_at: c.created_at,
        payment_count: Array.isArray(c.credit_payments) ? c.credit_payments.length : 0,
        days: Math.floor((now - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24)),
      }
    })

    return { success: true, message: '', data: items }
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
