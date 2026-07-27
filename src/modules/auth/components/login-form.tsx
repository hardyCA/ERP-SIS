'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useActionState } from 'react'
import { loginSchema, type LoginInput } from '../types'
import { loginUser } from '../actions'

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(loginSchema) as any,
    defaultValues: { email: '', password: '' },
  })

  const [state, formAction, isPending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const result = await loginUser(formData)
      if (result.success) {
        router.push('/')
        router.refresh()
      }
      return result
    },
    null
  )

  return (
    <Card className="w-full max-w-[420px] border-0 bg-transparent shadow-none">
      <CardHeader className="space-y-2 pb-6 text-center">
        <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
          Bienvenido de nuevo
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Ingresa tus credenciales para acceder al sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Form {...form}>
          <form action={formAction} className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Correo electrónico
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="correo@ejemplo.com"
                        className="h-11 rounded-xl border-border/60 bg-background/50 pl-10 shadow-sm backdrop-blur-sm transition-all focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/20"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Contraseña
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="h-11 rounded-xl border-border/60 bg-background/50 pl-10 pr-10 shadow-sm backdrop-blur-sm transition-all focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/20"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end">
              <a
                href="/recover"
                className="text-sm font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {state && !state.success && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {state.message}
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-sm font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:brightness-105 active:scale-[0.98]"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  Iniciar Sesión
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </Form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground">
              o
            </span>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{' '}
          <a
            href="/register"
            className="font-semibold text-primary transition-colors hover:text-primary/80 hover:underline"
          >
            Crea una cuenta gratis
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
