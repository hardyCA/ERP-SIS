'use server'

import { createClient } from '@/shared/lib/supabase/actions'
import { revalidatePath } from 'next/cache'
import { loginSchema, registerSchema, recoverSchema, changePasswordSchema } from './types'
import type { ActionResponse } from './types'

export async function loginUser(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()

  const validated = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validated.success) {
    return {
      success: false,
      message: 'Datos inválidos',
      errors: validated.error.flatten().fieldErrors,
    }
  }

  const { error } = await supabase.auth.signInWithPassword(validated.data)
  if (error) {
    return { success: false, message: 'Credenciales inválidas' }
  }

  revalidatePath('/', 'layout')
  return { success: true, message: 'Inicio de sesión exitoso' }
}

export async function registerUser(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()

  const validated = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!validated.success) {
    return {
      success: false,
      message: 'Datos inválidos',
      errors: validated.error.flatten().fieldErrors,
    }
  }

  const { error } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
  })

  if (error) {
    return { success: false, message: error.message }
  }

  return { success: true, message: 'Usuario registrado exitosamente' }
}

export async function updateMyPassword(formData: FormData): Promise<ActionResponse> {
  try {
    const validated = changePasswordSchema.safeParse({
      currentPassword: formData.get('currentPassword'),
      newPassword: formData.get('newPassword'),
      confirmPassword: formData.get('confirmPassword'),
    })
    if (!validated.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    const supabase = await createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: (await supabase.auth.getUser()).data.user?.email ?? '',
      password: validated.data.currentPassword,
    })
    if (signInError) {
      return { success: false, message: 'La contraseña actual no es correcta' }
    }

    const { error } = await supabase.auth.updateUser({ password: validated.data.newPassword })
    if (error) throw new Error(error.message)

    return { success: true, message: 'Contraseña actualizada exitosamente' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function logoutUser(): Promise<ActionResponse> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  return { success: true, message: 'Sesión cerrada' }
}

export async function recoverPassword(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()

  const validated = recoverSchema.safeParse({
    email: formData.get('email'),
  })

  if (!validated.success) {
    return { success: false, message: 'Email inválido' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    validated.data.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/update-password`,
    }
  )

  if (error) {
    return { success: false, message: error.message }
  }

  return { success: true, message: 'Revisa tu email para restablecer la contraseña' }
}
