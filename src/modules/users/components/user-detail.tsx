'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { updateUserName, deleteUserAction, adminResetPassword } from '../actions'
import { Pencil, Trash2, KeyRound } from 'lucide-react'
import type { UserWithAssignments } from '../types'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'

const nameSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
})
type NameInput = z.infer<typeof nameSchema>

interface UserDetailProps {
  user: UserWithAssignments
}

export function UserDetail({ user }: UserDetailProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<NameInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(nameSchema) as any,
    defaultValues: { name: user.name === user.email ? '' : user.name },
  })

  const onSubmitName = async (data: NameInput) => {
    setError(null)
    const fd = new FormData()
    fd.set('name', data.name)
    const result = await updateUserName(user.id, fd)
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['users', user.id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditing(false)
    } else {
      setError(result.message)
    }
  }

  const handleDelete = async () => {
    setShowDeleteConfirm(false)
    setError(null)
    const result = await deleteUserAction(user.id)
    if (result.success) {
      toast.success('Usuario eliminado')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      router.push('/users')
      router.refresh()
    } else {
      setError(result.message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{user.name}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(!editing)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Eliminar
            </Button>
          </div>
        </div>
      </CardHeader>
      {editing && (
        <CardContent>
          <form onSubmit={handleSubmit(onSubmitName)} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Nombre</label>
              <Input {...register('name')} placeholder="Nombre completo" />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </form>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      )}
      <CardContent className="border-t pt-4">
        <ResetPasswordDialog userId={user.id} />
      </CardContent>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title="Eliminar usuario"
        description={`¿Estás seguro de eliminar a ${user.name}? Esta acción no se puede deshacer.`}
      />
    </Card>
  )
}

function ResetPasswordDialog({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleReset = async () => {
    setError(null)
    setSuccess(false)

    if (password.length < 6) { setError('Mínimo 6 caracteres'); return }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return }

    setSubmitting(true)
    const fd = new FormData()
    fd.set('userId', userId)
    fd.set('password', password)
    fd.set('confirmPassword', confirmPassword)
    const result = await adminResetPassword(fd)
    setSubmitting(false)

    if (result.success) {
      toast.success('Contraseña restablecida exitosamente')
      setSuccess(true)
      setPassword('')
      setConfirmPassword('')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    } else {
      setError(result.message)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <KeyRound className="h-4 w-4 mr-1" />
        Restablecer Contraseña
      </Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setError(null); setSuccess(false) } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restablecer Contraseña</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {success ? (
            <div className="text-sm text-green-600 font-medium">Contraseña restablecida exitosamente</div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nueva contraseña</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirmar contraseña</label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repite la contraseña" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={handleReset} disabled={submitting} className="w-full">
                {submitting ? 'Guardando...' : 'Restablecer'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
