'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/shared/lib/utils'
import { logoutUser } from '@/modules/auth/actions'
import { useBranch } from '@/shared/contexts/branch-context'

import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { Separator } from '@/shared/components/ui/separator'
import {
  LayoutDashboard,
  FolderTree,
  Store,
  Warehouse,
  ShoppingCart,
  Receipt,
  CreditCard,
  ArrowLeftRight,
  Banknote,
  Users,
  BarChart3,
  LogOut,
  Building2,
  User,
  Sparkles,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'

const navGroups = [
  {
    title: 'Visión General',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Inventario & Catálogo',
    items: [
      { name: 'Catálogo', href: '/brands', icon: FolderTree },
      { name: 'Inventario', href: '/inventory', icon: Warehouse },
      { name: 'Traspasos', href: '/transfers', icon: ArrowLeftRight },
    ]
  },
  {
    title: 'Ventas & Operaciones',
    items: [
      { name: 'Ventas (POS)', href: '/sales', icon: Receipt },
      { name: 'Compras', href: '/purchases', icon: ShoppingCart },
      { name: 'Créditos', href: '/credits', icon: CreditCard },
      { name: 'Caja Chica', href: '/cash-register', icon: Banknote },
    ]
  },
  {
    title: 'Gestión & Reportes',
    items: [
      { name: 'Sucursales', href: '/branches', icon: Store },
      { name: 'Usuarios', href: '/users', icon: Users },
      { name: 'Reportes ERP', href: '/reports', icon: BarChart3 },
    ]
  },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { branchId, branchName, setBranch, branches } = useBranch()

  const handleLogout = async () => {
    await logoutUser()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border/60">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-sidebar-border/60">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-sidebar-foreground">SIIM ERP</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Enterprise</span>
          </div>
        </Link>
      </div>

      {/* Branch Switcher */}
      <div className="px-4 py-3 bg-muted/30 border-b border-sidebar-border/40">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary shrink-0" />
          <Select value={branchId} onValueChange={(v) => setBranch(v ?? '')}>
            <SelectTrigger className="h-9 text-xs bg-background/80 border-sidebar-border/60 shadow-xs focus:ring-1 focus:ring-primary">
              <SelectValue placeholder="Seleccionar sucursal">{branchName || (branchId ? 'Cargando...' : 'Todas las sucursales')}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las sucursales</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Navigation Groups */}
      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-5">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <h4 className="px-3 text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
                {group.title}
              </h4>
              <nav className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 group relative',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0 transition-transform group-hover:scale-110', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator className="opacity-50" />

      {/* Profile & Logout Section */}
      <div className="p-3 space-y-1">
        <Link
          href="/profile"
          onClick={onClose}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
            pathname === '/profile' && 'bg-sidebar-accent font-semibold text-sidebar-foreground'
          )}
        >
          <User className="h-4 w-4 text-muted-foreground" />
          <span>Mi Perfil</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  )
}

