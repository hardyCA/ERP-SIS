import { z } from 'zod'

export const userRoleEnum = z.enum(['admin', 'manager', 'seller'])
export type UserRole = z.infer<typeof userRoleEnum>

export const createUserSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(72),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})
export type CreateUserInput = z.infer<typeof createUserSchema>

export const assignBranchSchema = z.object({
  userId: z.string().uuid(),
  branchId: z.string().uuid(),
  role: userRoleEnum,
})
export type AssignBranchInput = z.infer<typeof assignBranchSchema>

export const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  branchId: z.string().uuid(),
  role: userRoleEnum,
})
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>

export const resetPasswordSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(72),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export interface BranchAssignment {
  id: string
  branchId: string
  branchName: string
  role: UserRole
}

export interface UserWithAssignments {
  id: string
  name: string
  email: string
  createdAt: string
  lastSignInAt: string | null
  assignments: BranchAssignment[]
}

export type ActionResponse<T = void> = {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string[]>
}
