'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { assignBranchSchema, userRoleEnum, type AssignBranchInput } from '../types'
import { assignUserBranch, updateUserBranchRole, removeUserBranch } from '../actions'
import { useUser, useAvailableBranches } from '../queries'
import { useQueryClient } from '@tanstack/react-query'
import { FormProvider as Form } from 'react-hook-form'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Trash2, Plus } from 'lucide-react'
import type { UserRole } from '../types'

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  seller: 'Vendedor',
}

const roleBadge: Record<UserRole, string> = {
  admin: 'bg-destructive/10 text-destructive',
  manager: 'bg-info/10 text-info',
  seller: 'bg-success/10 text-success',
}

interface UserPermissionsProps {
  userId: string
}

export function UserPermissions({ userId }: UserPermissionsProps) {
  const { data: user, isLoading: loadingUser } = useUser(userId)
  const { data: branches, isLoading: loadingBranches } = useAvailableBranches()
  const queryClient = useQueryClient()
  const [assignState, setAssignState] = useState<{ success: boolean; message: string } | null>(null)
  const [isPending, setIsPending] = useState(false)

  const form = useForm<AssignBranchInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(assignBranchSchema) as any,
    defaultValues: { userId, branchId: '', role: 'seller' },
  })

  const onSubmit = async (data: AssignBranchInput) => {
    setIsPending(true)
    setAssignState(null)
    const fd = new FormData()
    fd.set('userId', data.userId)
    fd.set('branchId', data.branchId)
    fd.set('role', data.role)
    const result = await assignUserBranch(fd)
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['users', userId] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      form.reset({ userId, branchId: '', role: 'seller' })
      setAssignState({ success: true, message: '' })
    } else {
      setAssignState(result)
    }
    setIsPending(false)
  }

  const handleRemove = async (branchId: string) => {
    const fd = new FormData()
    fd.set('userId', userId)
    fd.set('branchId', branchId)
    const result = await removeUserBranch(fd)
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['users', userId] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  }

  const handleRoleChange = async (branchId: string, role: string) => {
    const fd = new FormData()
    fd.set('userId', userId)
    fd.set('branchId', branchId)
    fd.set('role', role)
    const result = await updateUserBranchRole(fd)
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['users', userId] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  }

  const assignedBranchIds = new Set(user?.assignments.map(a => a.branchId) ?? [])
  const availableBranches = branches?.filter(b => !assignedBranchIds.has(b.id)) ?? []

  if (loadingUser || loadingBranches) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sucursales asignadas</CardTitle>
        </CardHeader>
        <CardContent>
          {user?.assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este usuario no tiene acceso a ninguna sucursal
            </p>
          ) : (
            <div className="space-y-3">
              {user?.assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={roleBadge[a.role]}>
                      {roleLabels[a.role]}
                    </Badge>
                    <span className="font-medium">{a.branchName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={a.role}
                      onChange={(e) => handleRoleChange(a.branchId, e.target.value)}
                      className="h-8 rounded-md border px-2 text-sm bg-background"
                    >
                      {userRoleEnum.options.map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role as UserRole]}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(a.branchId)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {availableBranches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Asignar nueva sucursal</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Sucursal</label>
                  <select
                    {...form.register('branchId')}
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    <option value="">Seleccionar sucursal</option>
                    {availableBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.branchId && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.branchId.message}
                    </p>
                  )}
                </div>
                <div className="w-36">
                  <label className="text-sm font-medium mb-1 block">Rol</label>
                  <select
                    {...form.register('role')}
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    {userRoleEnum.options.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role as UserRole]}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.role && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.role.message}
                    </p>
                  )}
                </div>
                <Button type="submit" disabled={isPending}>
                  <Plus className="h-4 w-4 mr-1" />
                  Asignar
                </Button>
              </form>
            </Form>
            {assignState && !assignState.success && (
              <p className="mt-2 text-sm text-destructive">{assignState.message}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
