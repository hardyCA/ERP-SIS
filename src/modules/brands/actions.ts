'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { brandSchema } from './types'
import type { ActionResponse } from './types'
import type { Brands } from '@/shared/types/database.types'

export async function getBrands(): Promise<ActionResponse<Brands[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name')
    if (error) throw new Error(error.message)
    return { success: true, message: '', data: data ?? [] }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function getBrandById(id: string): Promise<ActionResponse<Brands | null>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return { success: true, message: '', data }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function createBrand(formData: FormData): Promise<ActionResponse> {
  try {
    const validated = brandSchema.safeParse({
      name: formData.get('name'),
    })
    if (!validated.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    const supabase = await createClient()

    const { data: existing } = await supabase.from('brands').select('id').eq('name', validated.data.name).maybeSingle()
    if (existing) return { success: false, message: 'Ya existe una marca con ese nombre' }

    const { error } = await supabase.from('brands').insert(validated.data)
    if (error) throw new Error(error.message)

    revalidatePath('/brands')
    return { success: true, message: 'Marca creada exitosamente' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function updateBrand(id: string, formData: FormData): Promise<ActionResponse> {
  try {
    const validated = brandSchema.safeParse({
      name: formData.get('name'),
    })
    if (!validated.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    const supabase = await createClient()

    const { data: existing } = await supabase.from('brands').select('id').eq('name', validated.data.name).neq('id', id).maybeSingle()
    if (existing) return { success: false, message: 'Ya existe otra marca con ese nombre' }

    const { error } = await supabase.from('brands').update(validated.data).eq('id', id)
    if (error) throw new Error(error.message)

    revalidatePath('/brands')
    return { success: true, message: 'Marca actualizada exitosamente' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function deleteBrand(id: string): Promise<ActionResponse> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('brands').delete().eq('id', id)
    if (error) {
      const msg = error.message || 'Error al eliminar la marca'
      if (msg.includes('foreign key')) {
        return { success: false, message: 'No se puede eliminar: esta marca tiene categorías asociadas. Elimina primero las categorías.' }
      }
      throw new Error(msg)
    }
    revalidatePath('/brands')
    return { success: true, message: 'Marca eliminada correctamente' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}