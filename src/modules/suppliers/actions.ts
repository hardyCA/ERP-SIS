'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { createSupplierSchema } from './types'
import type { ActionResponse } from './types'

export async function getSuppliers(search?: string) {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('suppliers')
      .select('*')
      .order('name')

    if (search) query = query.ilike('name', `%${search}%`)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return { success: true, message: '', data: data ?? [] }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function createSupplier(formData: FormData): Promise<ActionResponse> {
  try {
    const validated = createSupplierSchema.safeParse({
      name: formData.get('name'),
      document_id: formData.get('document_id'),
      phone: formData.get('phone'),
      address: formData.get('address'),
    })
    if (!validated.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        name: validated.data.name,
        document_id: validated.data.document_id || null,
        phone: validated.data.phone || null,
        address: validated.data.address || null,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    revalidatePath('/purchases')
    return { success: true, message: 'Proveedor creado', data }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}
