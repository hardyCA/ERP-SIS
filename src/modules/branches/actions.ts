'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { branchSchema } from './types'
import type { ActionResponse } from './types'
import type { Branches } from '@/shared/types/database.types'

async function createAdminClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
}

export async function getBranches(): Promise<ActionResponse<Branches[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name')
    if (error) throw new Error(error.message)
    return { success: true, message: '', data: data ?? [] }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function getBranchById(id: string): Promise<ActionResponse<Branches | null>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return { success: true, message: '', data }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function createBranch(formData: FormData): Promise<ActionResponse> {
  try {
    const validated = branchSchema.safeParse({
      name: formData.get('name'),
      address: formData.get('address'),
      phone: formData.get('phone'),
    })
    if (!validated.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    const supabase = await createAdminClient()
    const { error } = await supabase.from('branches').insert(validated.data)
    if (error) throw new Error(error.message)

    revalidatePath('/branches')
    return { success: true, message: 'Sucursal creada exitosamente' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function updateBranch(id: string, formData: FormData): Promise<ActionResponse> {
  try {
    const validated = branchSchema.safeParse({
      name: formData.get('name'),
      address: formData.get('address'),
      phone: formData.get('phone'),
    })
    if (!validated.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    const supabase = await createAdminClient()
    const { error } = await supabase.from('branches').update(validated.data).eq('id', id)
    if (error) throw new Error(error.message)

    revalidatePath('/branches')
    return { success: true, message: 'Sucursal actualizada exitosamente' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function deleteBranch(id: string): Promise<ActionResponse> {
  try {
    const supabase = await createAdminClient()
    const { error } = await supabase.from('branches').delete().eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/branches')
    return { success: true, message: 'Sucursal eliminada correctamente' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function toggleBranchStatus(id: string): Promise<ActionResponse> {
  try {
    const supabaseAdmin = await createAdminClient()
    const { data: branch } = await supabaseAdmin.from('branches').select('is_active').eq('id', id).single()
    if (!branch) throw new Error('Sucursal no encontrada')

    const { error } = await supabaseAdmin
      .from('branches')
      .update({ is_active: !branch.is_active })
      .eq('id', id)
    if (error) throw new Error(error.message)

    revalidatePath('/branches')
    return { success: true, message: 'Estado actualizado' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}
