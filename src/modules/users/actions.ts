'use server'

import { revalidatePath } from 'next/cache'
import { createUserSchema, assignBranchSchema, updateRoleSchema, resetPasswordSchema } from './types'
import {
  getUsersWithAssignments,
  getUserWithAssignments,
  createUserAndAssign,
  assignBranch,
  changeUserRole,
  removeBranch,
  resetPassword,
  updateUser,
  deleteUser,
} from './service'
import { z } from 'zod'
import { listBranchesForAdmin } from './repository'
import type { ActionResponse, UserWithAssignments } from './types'

export async function getUsers(): Promise<ActionResponse<UserWithAssignments[]>> {
  try {
    const users = await getUsersWithAssignments()
    return { success: true, message: '', data: users }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function getUser(userId: string): Promise<ActionResponse<UserWithAssignments | null>> {
  try {
    const user = await getUserWithAssignments(userId)
    return { success: true, message: '', data: user }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function getAvailableBranches() {
  try {
    const branches = await listBranchesForAdmin()
    return { success: true, message: '', data: branches }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function createUser(formData: FormData): Promise<ActionResponse> {
  try {
    const validated = createUserSchema.safeParse({
      name: formData.get('name'),
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

    await createUserAndAssign(validated.data.email, validated.data.password, validated.data.name)
    revalidatePath('/users')
    return { success: true, message: 'Usuario creado exitosamente' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function assignUserBranch(formData: FormData): Promise<ActionResponse> {
  try {
    const validated = assignBranchSchema.safeParse({
      userId: formData.get('userId'),
      branchId: formData.get('branchId'),
      role: formData.get('role'),
    })
    if (!validated.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    await assignBranch(validated.data.userId, validated.data.branchId, validated.data.role)
    revalidatePath('/users')
    return { success: true, message: 'Acceso asignado correctamente' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function updateUserBranchRole(formData: FormData): Promise<ActionResponse> {
  try {
    const validated = updateRoleSchema.safeParse({
      userId: formData.get('userId'),
      branchId: formData.get('branchId'),
      role: formData.get('role'),
    })
    if (!validated.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    await changeUserRole(validated.data.userId, validated.data.branchId, validated.data.role)
    revalidatePath('/users')
    return { success: true, message: 'Rol actualizado correctamente' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function removeUserBranch(formData: FormData): Promise<ActionResponse> {
  try {
    const userId = formData.get('userId') as string
    const branchId = formData.get('branchId') as string
    if (!userId || !branchId) {
      return { success: false, message: 'Datos inválidos' }
    }

    await removeBranch(userId, branchId)
    revalidatePath('/users')
    return { success: true, message: 'Acceso removido correctamente' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function updateUserName(userId: string, formData: FormData): Promise<ActionResponse> {
  try {
    const name = z.string().min(1, 'El nombre es requerido').parse(formData.get('name'))
    await updateUser(userId, name)
    revalidatePath(`/users/${userId}`)
    revalidatePath('/users')
    return { success: true, message: 'Nombre actualizado correctamente' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function adminResetPassword(formData: FormData): Promise<ActionResponse> {
  try {
    const validated = resetPasswordSchema.safeParse({
      userId: formData.get('userId'),
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

    await resetPassword(validated.data.userId, validated.data.password)
    return { success: true, message: 'Contraseña restablecida exitosamente' }
  } catch (e) {
    return { success: false, message: (e instanceof Error ? e.message : 'Error desconocido') }
  }
}

export async function deleteUserAction(userId: string): Promise<ActionResponse> {
  try {
    await deleteUser(userId)
    revalidatePath('/users')
    return { success: true, message: 'Usuario eliminado correctamente' }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}
