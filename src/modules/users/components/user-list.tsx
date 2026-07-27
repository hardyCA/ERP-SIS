'use client'

import Link from 'next/link'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useUsers } from '../queries'
import { UserCog } from 'lucide-react'
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

export function UserList() {
  const { data: users, isLoading, error } = useUsers()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 p-4 text-sm text-destructive">
        {error.message}
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Sucursales asignadas</TableHead>
            <TableHead>Último acceso</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No hay usuarios registrados
              </TableCell>
            </TableRow>
          )}
          {users?.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell className="text-muted-foreground">{user.email}</TableCell>
              <TableCell>
                {user.assignments.length === 0 ? (
                  <span className="text-muted-foreground text-sm">Sin asignación</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {user.assignments.map((a) => (
                      <Badge
                        key={a.id}
                        variant="secondary"
                        className={roleBadge[a.role]}
                      >
                        {a.branchName} · {roleLabels[a.role]}
                      </Badge>
                    ))}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {user.lastSignInAt
                  ? new Date(user.lastSignInAt).toLocaleDateString('es-MX')
                  : 'Nunca'}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  nativeButton={false}
                  render={<Link href={`/users/${user.id}`} />}
                >
                  <UserCog className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
