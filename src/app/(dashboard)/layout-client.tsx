'use client'

import { useState } from 'react'
import { Sidebar } from '@/shared/components/sidebar'
import { Button } from '@/shared/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/shared/components/ui/sheet'
import { Menu, Sparkles, Building2 } from 'lucide-react'
import { useBranch } from '@/shared/contexts/branch-context'

export function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { branchName } = useBranch()

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar md:block z-30">
        <Sidebar />
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="flex h-14 items-center justify-between border-b border-border/80 bg-background/80 px-4 backdrop-blur-md md:hidden z-40 shrink-0">
          <div className="flex items-center gap-3">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger render={<Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" />}>
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 border-r">
                <Sidebar onClose={() => setSidebarOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-bold text-sm">SIIM ERP</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/40">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium max-w-[120px] truncate">{branchName || 'Todas'}</span>
          </div>
        </header>

        {/* Main content scroll area */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

