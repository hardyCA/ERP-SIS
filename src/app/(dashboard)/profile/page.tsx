'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateMyPassword } from '@/modules/auth/actions'
import { changePasswordSchema, type ChangePasswordInput } from '@/modules/auth/types'
import { PageHeader } from '@/shared/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { User, Lock } from 'lucide-react'

export default function ProfilePage() {
  const [success, setSuccess] = useState<string | null>(null)

  const form = useForm<ChangePasswordInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(changePasswordSchema) as any,
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmit = async (data: ChangePasswordInput) => {
    setSuccess(null)
    const fd = new FormData()
    fd.set('currentPassword', data.currentPassword)
    fd.set('newPassword', data.newPassword)
    fd.set('confirmPassword', data.confirmPassword)
    const result = await updateMyPassword(fd)
    if (result.success) {
      setSuccess('Contraseña actualizada exitosamente')
      form.reset()
    } else {
      const msg = result.errors
        ? Object.values(result.errors).flat().join(', ')
        : result.message
      form.setError('root', { message: msg })
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader title="Mi Perfil" description="Administra tu cuenta y contraseña" />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Cambiar Contraseña</CardTitle>
              <p className="text-sm text-muted-foreground">Actualiza tu contraseña de acceso al sistema</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña actual</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Ingresa tu contraseña actual" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar nueva contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Repite la nueva contraseña" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors.root && (
                <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
              )}
              {success && (
                <div className="flex items-center gap-2 rounded-lg border border-success/50 bg-success/5 p-3 text-sm text-success">
                  <Lock className="h-4 w-4" />
                  {success}
                </div>
              )}
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Guardando...' : 'Actualizar Contraseña'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
