import { AuthProvider } from '@/shared/lib/auth-context'
import { Package, BarChart3, Shield, Zap } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="relative flex min-h-screen w-full overflow-hidden bg-background">
        {/* Background Effects */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
        </div>

        {/* Left Panel - Branding */}
        <div className="relative z-10 hidden w-1/2 flex-col justify-between bg-gradient-to-br from-primary/90 via-primary to-primary/80 p-12 text-primary-foreground lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">SIIM ERP</span>
          </div>

          <div className="space-y-8">
            <h1 className="text-4xl font-bold leading-tight">
              Gestiona tu negocio<br />con inteligencia
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-md">
              Sistema integral de inventario, ventas, compras y reportes diseñado para impulsar el crecimiento de tu empresa.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-center gap-3 rounded-xl bg-white/10 p-4 backdrop-blur-sm">
                <BarChart3 className="h-5 w-5 text-white/90" />
                <span className="text-sm font-medium">Reportes en tiempo real</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/10 p-4 backdrop-blur-sm">
                <Shield className="h-5 w-5 text-white/90" />
                <span className="text-sm font-medium">Seguridad avanzada</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/10 p-4 backdrop-blur-sm">
                <Zap className="h-5 w-5 text-white/90" />
                <span className="text-sm font-medium">Rápido y eficiente</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/10 p-4 backdrop-blur-sm">
                <Package className="h-5 w-5 text-white/90" />
                <span className="text-sm font-medium">Control total</span>
              </div>
            </div>
          </div>

          <div className="text-sm text-primary-foreground/60">
            © 2026 SIIM ERP. Todos los derechos reservados.
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="relative z-10 flex w-full flex-col items-center justify-center p-4 lg:w-1/2">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">SIIM ERP</span>
          </div>
          {children}
        </div>
      </div>
    </AuthProvider>
  )
}
