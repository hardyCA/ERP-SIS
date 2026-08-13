'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Sidebar } from '@/shared/components/sidebar'
import { Button } from '@/shared/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/shared/components/ui/sheet'
import { Menu, Building2, LogOut } from 'lucide-react'
import { BranchProvider, useBranch } from '@/shared/contexts/branch-context'
import { logoutUser } from '@/modules/auth/actions'

interface DashboardLayoutClientProps {
  children: React.ReactNode
  serverBranches: { id: string; name: string }[]
}

export function DashboardLayoutClient({ children, serverBranches }: DashboardLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    await logoutUser()
    router.push('/login')
    router.refresh()
  }

  if (serverBranches.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center max-w-sm mx-auto p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-6">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold tracking-tight mb-2">Sin sucursal asignada</h1>
          <p className="text-sm text-muted-foreground mb-6">
            No tienes ninguna sucursal asignada. Contacta al administrador del sistema para que te asigne una.
          </p>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Cerrar Sesión
          </Button>
        </div>
      </div>
    )
  }

  return (
    <BranchProvider serverBranches={serverBranches}>
      <InnerLayout children={children} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
    </BranchProvider>
  )
}

function InnerLayout({ children, sidebarOpen, setSidebarOpen }: { children: React.ReactNode; sidebarOpen: boolean; setSidebarOpen: (v: boolean) => void }) {
  const { branchName } = useBranch()

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-70 shrink-0 border-r border-border bg-sidebar md:block z-30 h-full">
        <Sidebar />
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="flex h-16 items-center justify-between border-b border-border/80 bg-background/80 px-4 backdrop-blur-md md:hidden z-40 shrink-0">
          <div className="flex items-center gap-3">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger render={<Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" />}>
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-70 p-0 border-r">
                <Sidebar onClose={() => setSidebarOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white shadow-xs ring-1 ring-border">
                <Image src="/LOGO GACIA.png" alt="GACIA" width={32} height={32} className="h-full w-full object-cover" />
              </div>
              <span className="font-bold text-sm">GACIA</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/40">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium max-w-[120px] truncate">{branchName || 'Todas'}</span>
          </div>
        </header>

        {/* Main content scroll area */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-(--breakpoint-2xl)">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
