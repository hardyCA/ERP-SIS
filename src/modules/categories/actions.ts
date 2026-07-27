'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { categorySchema } from './types'
import type { ActionResponse } from './types'
import type { Categories, Brands } from '@/shared/types/database.types'

export async function getCategoriesByBrand(brandId: string): Promise<ActionResponse<Categories[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('brand_id', brandId)
      .order('name')
    if (error) throw new Error(error.message)
    return { success: true, message: '', data: data ?? [] }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function getCategoryById(id: string): Promise<ActionResponse<Categories | null>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('categories')
      .select('*, brands(name)')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return { success: true, message: '', data }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function createCategory(formData: FormData): Promise<ActionResponse> {
  try {
    const validated = categorySchema.safeParse({
      name: formData.get('name'),
      brand_id: formData.get('brand_id'),
    })
    if (!validated.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('name', validated.data.name)
      .eq('brand_id', validated.data.brand_id)
      .maybeSingle()
    if (existing) return { success: false, message: 'Ya existe una categoría con ese nombre en esta marca' }

    const { error } = await supabase.from('categories').insert(validated.data)
    if (error) throw new Error(error.message)

    revalidatePath(`/brands/${validated.data.brand_id}`)
    return { success: true, message: 'Categoría creada exitosamente' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function updateCategory(id: string, brandId: string, formData: FormData): Promise<ActionResponse> {
  try {
    const validated = categorySchema.safeParse({
      name: formData.get('name'),
      brand_id: brandId,
    })
    if (!validated.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('name', validated.data.name)
      .eq('brand_id', brandId)
      .neq('id', id)
      .maybeSingle()
    if (existing) return { success: false, message: 'Ya existe otra categoría con ese nombre en esta marca' }

    const { error } = await supabase.from('categories').update({ name: validated.data.name }).eq('id', id)
    if (error) throw new Error(error.message)

    revalidatePath(`/brands/${brandId}`)
    return { success: true, message: 'Categoría actualizada exitosamente' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function deleteCategory(id: string, brandId: string): Promise<ActionResponse> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) {
      const msg = error.message || 'Error al eliminar la categoría'
      if (msg.includes('foreign key')) {
        return { success: false, message: 'No se puede eliminar: esta categoría tiene productos asociados. Elimina primero los productos.' }
      }
      throw new Error(msg)
    }
    revalidatePath(`/brands/${brandId}`)
    return { success: true, message: 'Categoría eliminada correctamente' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function getBrandById(brandId: string): Promise<ActionResponse<Brands | null>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('brands').select('*').eq('id', brandId).single()
    if (error) throw new Error(error.message)
    return { success: true, message: '', data }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}