'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { unitSchema } from './types'
import type { ActionResponse } from './types'
import type { UnitsOfMeasure } from '@/shared/types/database.types'

export async function getUnits(includeInactive = false): Promise<ActionResponse<UnitsOfMeasure[]>> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('units_of_measure')
      .select('*')
      .order('name')

    if (!includeInactive) query = query.eq('is_active', true)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return { success: true, message: '', data: data ?? [] }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function createUnit(formData: FormData): Promise<ActionResponse<UnitsOfMeasure>> {
  try {
    const validated = unitSchema.safeParse({
      name: formData.get('name'),
      abbreviation: (formData.get('abbreviation') as string || '').trim() || null,
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
      .from('units_of_measure')
      .select('id')
      .eq('name', validated.data.name)
      .maybeSingle()
    if (existing) return { success: false, message: 'Ya existe una unidad de medida con ese nombre' }

    const { data, error } = await supabase
      .from('units_of_measure')
      .insert({
        name: validated.data.name,
        abbreviation: validated.data.abbreviation || null,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)

    revalidatePath('/brands')
    return { success: true, message: 'Unidad de medida creada', data }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function updateUnit(id: string, formData: FormData): Promise<ActionResponse> {
  try {
    const validated = unitSchema.safeParse({
      name: formData.get('name'),
      abbreviation: (formData.get('abbreviation') as string || '').trim() || null,
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
      .from('units_of_measure')
      .select('id')
      .eq('name', validated.data.name)
      .neq('id', id)
      .maybeSingle()
    if (existing) return { success: false, message: 'Ya existe otra unidad de medida con ese nombre' }

    const { error } = await supabase
      .from('units_of_measure')
      .update({
        name: validated.data.name,
        abbreviation: validated.data.abbreviation || null,
      })
      .eq('id', id)
    if (error) throw new Error(error.message)

    revalidatePath('/brands')
    return { success: true, message: 'Unidad de medida actualizada' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function toggleUnitStatus(id: string): Promise<ActionResponse> {
  try {
    const supabase = await createClient()
    const { data: existing } = await supabase
      .from('units_of_measure')
      .select('is_active')
      .eq('id', id)
      .single()
    if (!existing) throw new Error('Unidad no encontrada')

    const { error } = await supabase
      .from('units_of_measure')
      .update({ is_active: !existing.is_active })
      .eq('id', id)
    if (error) throw new Error(error.message)

    revalidatePath('/brands')
    return { success: true, message: 'Estado actualizado' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function deleteUnit(id: string): Promise<ActionResponse> {
  try {
    const supabase = await createClient()
    const { data: productWithUnit } = await supabase
      .from('products')
      .select('id')
      .eq('unit_id', id)
      .limit(1)
      .maybeSingle()
    if (productWithUnit) {
      return { success: false, message: 'No se puede eliminar: hay productos usando esta unidad de medida.' }
    }

    const { error } = await supabase.from('units_of_measure').delete().eq('id', id)
    if (error) throw new Error(error.message)

    revalidatePath('/brands')
    return { success: true, message: 'Unidad de medida eliminada' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}