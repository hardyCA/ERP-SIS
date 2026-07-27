'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { adjustStockSchema, updatePriceSchema } from './types'
import type { ActionResponse } from './types'
import type { Branches, Brands, Categories } from '@/shared/types/database.types'

export async function getInventory(branchId: string, brandId?: string, categoryId?: string) {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('inventory_items')
      .select('*, products!inner(name, cost, image_url, is_active, brand_id, category_id, brands(name), categories(name))')
      .eq('branch_id', branchId)
      .gt('quantity', 0)
      .eq('products.is_active', true)
    
    if (brandId) {
      query = query.eq('products.brand_id', brandId)
    }
    if (categoryId) {
      query = query.eq('products.category_id', categoryId)
    }
    
    query = query.order('products(name)')
    
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return { success: true, message: '', data: data ?? [] }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function getBrandsWithInventory(branchId: string): Promise<ActionResponse<(Brands & { product_count: number })[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('brands')
      .select(`
        *,
        products!inner (
          id,
          inventory_items!inner (id, branch_id, quantity)
        )
      `)
      .eq('products.inventory_items.branch_id', branchId)
      .gt('products.inventory_items.quantity', 0)
      .order('name')
    if (error) throw new Error(error.message)
    
    const brandsWithCount = (data ?? []).map(brand => ({
      ...brand,
      product_count: Array.isArray(brand.products) ? brand.products.length : 0
    }))
    return { success: true, message: '', data: brandsWithCount }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function getCategoriesWithInventory(branchId: string, brandId: string): Promise<ActionResponse<(Categories & { product_count: number })[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('categories')
      .select(`
        *,
        products!inner (
          id,
          inventory_items!inner (id, branch_id, quantity)
        )
      `)
      .eq('brand_id', brandId)
      .eq('products.inventory_items.branch_id', branchId)
      .gt('products.inventory_items.quantity', 0)
      .order('name')
    if (error) throw new Error(error.message)
    
    const categoriesWithCount = (data ?? []).map(cat => ({
      ...cat,
      product_count: Array.isArray(cat.products) ? cat.products.length : 0
    }))
    return { success: true, message: '', data: categoriesWithCount }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function getBranchesList(): Promise<ActionResponse<Branches[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('branches').select('*').eq('is_active', true).order('name')
    if (error) throw new Error(error.message)
    return { success: true, message: '', data: data ?? [] }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function adjustStock(formData: FormData): Promise<ActionResponse> {
  try {
    const validated = adjustStockSchema.safeParse({
      product_id: formData.get('product_id'),
      branch_id: formData.get('branch_id'),
      quantity: formData.get('quantity'),
      reason: formData.get('reason'),
    })
    if (!validated.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    const supabase = await createClient()
    const { data: item } = await supabase
      .from('inventory_items')
      .select('id, quantity')
      .eq('product_id', validated.data.product_id)
      .eq('branch_id', validated.data.branch_id)
      .single()

    if (!item) {
      const { error: insertError } = await supabase
        .from('inventory_items')
        .insert({
          product_id: validated.data.product_id,
          branch_id: validated.data.branch_id,
          quantity: validated.data.quantity,
          sale_price: 0,
        })
      if (insertError) throw new Error(insertError.message)
    } else {
      const newQty = item.quantity + validated.data.quantity
      if (newQty < 0) {
        return { success: false, message: 'El stock no puede ser negativo' }
      }
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ quantity: newQty })
        .eq('id', item.id)
      if (updateError) throw new Error(updateError.message)
    }

    revalidatePath('/inventory')
    return { success: true, message: 'Stock ajustado correctamente' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function updateSalePrice(formData: FormData): Promise<ActionResponse> {
  try {
    const validated = updatePriceSchema.safeParse({
      product_id: formData.get('product_id'),
      branch_id: formData.get('branch_id'),
      sale_price: formData.get('sale_price'),
    })
    if (!validated.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    const supabase = await createClient()
    const { data: item } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('product_id', validated.data.product_id)
      .eq('branch_id', validated.data.branch_id)
      .single()

    if (item) {
      const { error } = await supabase
        .from('inventory_items')
        .update({ sale_price: validated.data.sale_price })
        .eq('id', item.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase
        .from('inventory_items')
        .insert({
          product_id: validated.data.product_id,
          branch_id: validated.data.branch_id,
          quantity: 0,
          sale_price: validated.data.sale_price,
        })
      if (error) throw new Error(error.message)
    }

    revalidatePath('/inventory')
    return { success: true, message: 'Precio actualizado correctamente' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}
