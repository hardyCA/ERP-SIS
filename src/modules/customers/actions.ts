'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { customerSchema } from './types'
import type { ActionResponse } from './types'
import type { Customers } from '@/shared/types/database.types'

export async function getCustomers(page = 1, pageSize = 20): Promise<ActionResponse<{ items: Customers[]; total: number }>> {
  try {
    const supabase = await createClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { count, error: countError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
    if (countError) throw new Error(countError.message)

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name')
      .range(from, to)
    if (error) throw new Error(error.message)

    return { success: true, message: '', data: { items: data ?? [], total: count ?? 0 } }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function getCustomerById(id: string): Promise<ActionResponse<Customers | null>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return { success: true, message: '', data }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function createCustomer(formData: FormData): Promise<ActionResponse> {
  try {
    const validated = customerSchema.safeParse({
      name: formData.get('name'),
      phone: formData.get('phone') || null,
      document_id: formData.get('document_id') || null,
      address: formData.get('address') || null,
    })
    if (!validated.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    const supabase = await createClient()
    const { error } = await supabase.from('customers').insert(validated.data)
    if (error) throw new Error(error.message)

    revalidatePath('/customers')
    return { success: true, message: 'Cliente creado exitosamente' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function updateCustomer(id: string, formData: FormData): Promise<ActionResponse> {
  try {
    const validated = customerSchema.safeParse({
      name: formData.get('name'),
      phone: formData.get('phone') || null,
      document_id: formData.get('document_id') || null,
      address: formData.get('address') || null,
    })
    if (!validated.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    const supabase = await createClient()
    const { error } = await supabase.from('customers').update(validated.data).eq('id', id)
    if (error) throw new Error(error.message)

    revalidatePath('/customers')
    return { success: true, message: 'Cliente actualizado exitosamente' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function deleteCustomer(id: string): Promise<ActionResponse> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) {
      const msg = error.message || 'Error al eliminar el cliente'
      if (msg.includes('foreign key')) {
        return { success: false, message: 'No se puede eliminar: el cliente tiene ventas asociadas.' }
      }
      throw new Error(msg)
    }
    revalidatePath('/customers')
    return { success: true, message: 'Cliente eliminado correctamente' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}
