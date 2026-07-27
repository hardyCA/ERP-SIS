'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useActionState } from 'react'
import { branchSchema, type BranchInput } from '../types'
import { createBranch, updateBranch, getBranchById } from '../actions'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Textarea } from '@/shared/components/ui/textarea'

interface BranchFormProps {
  branchId?: string
}

export function BranchForm({ branchId }: BranchFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEditing = !!branchId

  const { data: branch } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: async () => {
      if (!branchId) return null
      const result = await getBranchById(branchId)
      return result.success ? result.data : null
    },
    enabled: isEditing,
  })

  const form = useForm<BranchInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(branchSchema) as any,
    defaultValues: {
      name: branch?.name ?? '',
      address: branch?.address ?? '',
      phone: branch?.phone ?? '',
    },
    values: branch ? { name: branch.name, address: branch.address ?? '', phone: branch.phone ?? '' } : undefined,
  })

  const [state, formAction, isPending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const result = isEditing
        ? await updateBranch(branchId, formData)
        : await createBranch(formData)
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['branches'] })
        router.push('/branches')
        router.refresh()
      }
      return result
    },
    null
  )

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Sucursal' : 'Nueva Sucursal'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form action={formAction} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Sucursal Centro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Av. Principal #123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="+52 55 1234 5678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {state && !state.success && (
              <p className="text-sm text-destructive">{state.message}</p>
            )}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Sucursal'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
