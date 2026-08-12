'use server'

import { createClient } from '@/shared/lib/supabase/server'

export type ActionResponse<T = unknown> = {
  success: boolean
  message?: string
  data?: T
}

export async function getCredits(branchId?: string) {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('sale_credits')
      .select(`
        *,
        sale:sales!inner(number, branch_id, customer_name, created_at, customer_phone),
        payments:credit_payments(*)
      `)
      .order('created_at', { ascending: false })

    if (branchId) query = query.eq('sales.branch_id', branchId)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return { success: true, data: data ?? [] }
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function registerPayment(formData: FormData): Promise<ActionResponse> {
  try {
    const sale_credit_id = formData.get('sale_credit_id') as string
    const amount = parseFloat(formData.get('amount') as string) || 0
    const payment_type = formData.get('payment_type') as string || 'cash'

    if (!sale_credit_id || amount <= 0) {
      return { success: false, message: 'Datos inválidos' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Get credit balance
    const { data: credit } = await supabase
      .from('sale_credits')
      .select('id, balance, sale_id')
      .eq('id', sale_credit_id)
      .single()

    if (!credit) return { success: false, message: 'Crédito no encontrado' }
    if (amount > credit.balance) {
      return { success: false, message: `El pago excede el saldo pendiente (Bs ${credit.balance.toFixed(2)})` }
    }

    // Create payment
    const { data: payment, error: payError } = await supabase
      .from('credit_payments')
      .insert({
        sale_credit_id,
        amount,
        payment_type,
        created_by: user?.id,
      })
      .select()
      .single()
    if (payError) throw new Error(payError.message)

    // Update balance
    const newBalance = credit.balance - amount
    await supabase
      .from('sale_credits')
      .update({ balance: newBalance })
      .eq('id', sale_credit_id)

    // Create cash register movement
    const { data: sale } = await supabase
      .from('sales')
      .select('branch_id, number')
      .eq('id', credit.sale_id)
      .single()

    if (sale) {
      await supabase.from('cash_register_movements').insert({
        branch_id: sale.branch_id,
        type: 'manual_income',
        amount,
        payment_method: payment_type === 'qr' ? 'qr' : 'cash',
        cash_amount: payment_type === 'qr' ? 0 : amount,
        qr_amount: payment_type === 'qr' ? amount : 0,
        reference_type: 'sale',
        reference_id: credit.sale_id,
        description: `Pago de crédito - Venta #${sale.number}`,
        created_by: user?.id,
        handler_user_id: user?.id,
      })
    }

    return { success: true, data: payment }
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
