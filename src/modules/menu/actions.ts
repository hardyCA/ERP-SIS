'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { upsertMenuSchema, type MenuItem } from './types'

export async function getMenuItems() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('sort_order')

  if (error) throw new Error(error.message)
  return (data ?? []) as MenuItem[]
}

export async function getActiveMenuItems(branchId?: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let userRole: string | null = null

  if (user.email === 'admin@gmail.com') {
    userRole = 'admin'
  } else {
    const query = supabase
      .from('user_branches')
      .select('role')
      .eq('user_id', user.id)

    if (branchId) {
      query.eq('branch_id', branchId)
    }

    const { data: roles } = await query

    if (roles && roles.length > 0) {
      if (roles.some(r => r.role === 'admin')) {
        userRole = 'admin'
      } else {
        userRole = roles[0].role
      }
    }
  }

  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw new Error(error.message)

  const items = (data ?? []) as MenuItem[]
  if (userRole === 'admin') return items
  return items.filter(item => {
    if (!item.required_role) return true
    return userRole === item.required_role
  })
}

export async function upsertMenuItem(formData: FormData) {
  const raw = {
    id: formData.get('id') as string || undefined,
    group_title: formData.get('group_title'),
    name: formData.get('name'),
    href: formData.get('href'),
    icon: formData.get('icon'),
    sort_order: formData.get('sort_order'),
    is_active: formData.get('is_active') === 'true',
    required_role: formData.get('required_role') as string || null,
  }

  const validated = upsertMenuSchema.safeParse(raw)
  if (!validated.success) {
    return { success: false, message: 'Datos inválidos', errors: validated.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'No autenticado' }

  const isAdmin = user.email === 'admin@gmail.com'
  if (!isAdmin) {
    const { data: roleData } = await supabase
      .from('user_branches')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()
    if (!roleData) return { success: false, message: 'Solo administradores' }
  }

  const { id, ...data } = validated.data

  if (id) {
    const { error } = await supabase
      .from('menu_items')
      .update(data)
      .eq('id', id)
    if (error) return { success: false, message: error.message }
  } else {
    const { error } = await supabase
      .from('menu_items')
      .insert(data)
    if (error) return { success: false, message: error.message }
  }

  revalidatePath('/settings/menu')
  revalidatePath('/', 'layout')
  return { success: true, message: id ? 'Item actualizado' : 'Item creado' }
}

export async function deleteMenuItem(formData: FormData) {
  const id = formData.get('id') as string
  if (!id) return { success: false, message: 'ID requerido' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id)

  if (error) return { success: false, message: error.message }

  revalidatePath('/settings/menu')
  revalidatePath('/', 'layout')
  return { success: true, message: 'Item eliminado' }
}

export async function reorderMenu(items: { id: string; sort_order: number }[]) {
  const supabase = await createClient()

  for (const item of items) {
    const { error } = await supabase
      .from('menu_items')
      .update({ sort_order: item.sort_order })
      .eq('id', item.id)
    if (error) return { success: false, message: error.message }
  }

  revalidatePath('/settings/menu')
  revalidatePath('/', 'layout')
  return { success: true, message: 'Orden actualizado' }
}
