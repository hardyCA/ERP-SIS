'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { productSchema } from './types'
import type { ActionResponse } from './types'
import type { Products } from '@/shared/types/database.types'

export async function getProductsByCategory(brandId: string, categoryId: string): Promise<ActionResponse<Array<Products & {
  units_of_measure: { name: string; abbreviation: string | null } | null
  inventory_items: Array<{ branch_id: string; sale_price: number }>
}>>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select('*, units_of_measure(name, abbreviation), inventory_items(branch_id, sale_price)')
      .eq('brand_id', brandId)
      .eq('category_id', categoryId)
      .order('name')
    if (error) throw new Error(error.message)
    return { success: true, message: '', data: data ?? [] }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function getProductById(id: string): Promise<ActionResponse<Products | null>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select('*, brands(name), categories(name), units_of_measure(name, abbreviation)')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return { success: true, message: '', data }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function createProduct(formData: FormData): Promise<ActionResponse> {
  try {
    const validated = productSchema.safeParse({
      name: formData.get('name'),
      brand_id: formData.get('brand_id'),
      category_id: formData.get('category_id'),
      unit_id: (formData.get('unit_id') as string || null),
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
      .from('products')
      .select('id')
      .eq('name', validated.data.name)
      .eq('brand_id', validated.data.brand_id)
      .maybeSingle()
    if (existing) return { success: false, message: 'Ya existe un producto con ese nombre en esta marca' }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name: validated.data.name,
        brand_id: validated.data.brand_id,
        category_id: validated.data.category_id,
        unit_id: validated.data.unit_id ?? null,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)

    const image = formData.get('image') as File | null
    if (image && image.size > 0 && product) {
      const ext = image.name.split('.').pop()
      const filePath = `${product.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, image, { upsert: true })
      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = supabase.storage.from('products').getPublicUrl(filePath)
      await supabase.from('products').update({ image_url: urlData.publicUrl }).eq('id', product.id)
    }

    const { branchId, salePrice } = parsePriceFromForm(formData)
    if (branchId && salePrice !== null) {
      await setBranchPrice(product.id, branchId, salePrice)
    }

    revalidatePath(`/brands/${validated.data.brand_id}/categories/${validated.data.category_id}`)
    return { success: true, message: 'Producto creado exitosamente' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function updateProduct(id: string, brandId: string, categoryId: string, formData: FormData): Promise<ActionResponse> {
  try {
    const validated = productSchema.safeParse({
      name: formData.get('name'),
      brand_id: brandId,
      category_id: categoryId,
      unit_id: (formData.get('unit_id') as string || null),
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
      .from('products')
      .select('id')
      .eq('name', validated.data.name)
      .eq('brand_id', brandId)
      .neq('id', id)
      .maybeSingle()
    if (existing) return { success: false, message: 'Ya existe otro producto con ese nombre en esta marca' }

    const { error } = await supabase
      .from('products')
      .update({ name: validated.data.name, unit_id: validated.data.unit_id ?? null })
      .eq('id', id)
    if (error) throw new Error(error.message)

    const image = formData.get('image') as File | null
    if (image && image.size > 0) {
      const { data: old } = await supabase.from('products').select('image_url').eq('id', id).single()
      if (old?.image_url) {
        const oldPath = old.image_url.split('/').slice(-2).join('/')
        await supabase.storage.from('products').remove([oldPath])
      }

      const ext = image.name.split('.').pop()
      const filePath = `${id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, image, { upsert: true })
      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = supabase.storage.from('products').getPublicUrl(filePath)
      await supabase.from('products').update({ image_url: urlData.publicUrl }).eq('id', id)
    }

    const { branchId, salePrice } = parsePriceFromForm(formData)
    if (branchId && salePrice !== null) {
      await setBranchPrice(id, branchId, salePrice)
    }

    revalidatePath(`/brands/${brandId}/categories/${categoryId}`)
    return { success: true, message: 'Producto actualizado exitosamente' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function deleteProduct(id: string, brandId: string, categoryId: string): Promise<ActionResponse> {
  try {
    const supabase = await createClient()

    const { data: product } = await supabase.from('products').select('image_url').eq('id', id).single()
    if (product?.image_url) {
      const oldPath = product.image_url.split('/').slice(-2).join('/')
      await supabase.storage.from('products').remove([oldPath])
    }

    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      const msg = error.message || 'Error al eliminar el producto'
      if (msg.includes('foreign key')) {
        return { success: false, message: 'No se puede eliminar: el producto tiene transacciones asociadas.' }
      }
      throw new Error(msg)
    }
    revalidatePath(`/brands/${brandId}/categories/${categoryId}`)
    return { success: true, message: 'Producto eliminado correctamente' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function toggleProductStatus(id: string, brandId: string, categoryId: string): Promise<ActionResponse> {
  try {
    const supabase = await createClient()
    const { data: product } = await supabase.from('products').select('is_active').eq('id', id).single()
    if (!product) throw new Error('Producto no encontrado')

    const { error } = await supabase
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', id)
    if (error) throw new Error(error.message)

    revalidatePath(`/brands/${brandId}/categories/${categoryId}`)
    return { success: true, message: 'Estado actualizado' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

async function setBranchPrice(productId: string, branchId: string, salePrice: number): Promise<void> {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('inventory_items')
    .select('id')
    .eq('product_id', productId)
    .eq('branch_id', branchId)
    .maybeSingle()
  if (existing) {
    await supabase.from('inventory_items').update({ sale_price: salePrice }).eq('id', existing.id)
  } else {
    await supabase.from('inventory_items').insert({
      product_id: productId,
      branch_id: branchId,
      quantity: 0,
      sale_price: salePrice,
    })
  }
}

function parsePriceFromForm(formData: FormData): { branchId: string | null; salePrice: number | null } {
  const branchId = (formData.get('branch_id') as string | null) || null
  const raw = (formData.get('sale_price') as string | null) || null
  const salePrice = raw && raw.trim() !== '' ? parseFloat(raw) : null
  return { branchId, salePrice: salePrice !== null && Number.isFinite(salePrice) ? Math.max(0, salePrice) : null }
}

export async function getCategoryName(categoryId: string): Promise<ActionResponse<{ name: string; brand_id: string } | null>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('categories')
      .select('name, brand_id')
      .eq('id', categoryId)
      .single()
    if (error) throw new Error(error.message)
    return { success: true, message: '', data }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function getActiveBranches() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('branches').select('id, name').eq('is_active', true).order('name')
    if (error) throw new Error(error.message)
    return { success: true, message: '', data: data ?? [] }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function getProductBranchPrices(productId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('inventory_items')
      .select('branch_id, sale_price, quantity, branches!inner(name)')
      .eq('product_id', productId)
    if (error) throw new Error(error.message)
    return { success: true, message: '', data: data ?? [] }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function setProductBranchPrice(formData: FormData) {
  try {
    const product_id = formData.get('product_id') as string
    const branch_id = formData.get('branch_id') as string
    const sale_price = parseFloat(formData.get('sale_price') as string) || 0

    if (!product_id || !branch_id) return { success: false, message: 'Faltan datos' }

    await setBranchPrice(product_id, branch_id, Math.max(0, sale_price))

    return { success: true, message: 'Precio actualizado' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}
