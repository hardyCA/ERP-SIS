'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/shared/lib/utils'
import { logoutUser } from '@/modules/auth/actions'
import { useBranch } from '@/shared/contexts/branch-context'
import { getActiveMenuItems } from '@/modules/menu/actions'

import { Separator } from '@/shared/components/ui/separator'
import {
  LayoutDashboard, FolderTree, Store, Warehouse, ShoppingCart, Receipt,
  CreditCard, ArrowLeftRight, Banknote, Users, BarChart3, LogOut,
  Building2, User, Sparkles, Truck, Package, Folder, Settings,
  Activity, TrendingUp, DollarSign, FileText, Printer, Download, Upload,
  RefreshCw, Plus, Minus, X, Check, Search, Menu as MenuIcon,
  MoreHorizontal, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Circle, Home, Info, AlertTriangle, Shield, Ruler, type LucideIcon,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, FolderTree, Store, Warehouse, ShoppingCart, Receipt,
  CreditCard, ArrowLeftRight, Banknote, Users, BarChart3,
  Truck, Package, Folder, Settings, User, Building2, Sparkles,
  Activity, TrendingUp, DollarSign, FileText, Printer, Download, Upload,
  RefreshCw, Plus, Minus, X, Check, Search, Menu: MenuIcon,
  MoreHorizontal, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Circle, Home, Info, AlertTriangle, Shield, Ruler,
}

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { branchId, branchName, setBranch, branches } = useBranch()

  const { data: menuItems = [] } = useQuery({
    queryKey: ['active-menu', branchId],
    queryFn: () => getActiveMenuItems(branchId),
    staleTime: 60_000,
  })

  const groups = menuItems.reduce<Record<string, typeof menuItems>>((acc, item) => {
    if (!acc[item.group_title]) acc[item.group_title] = []
    acc[item.group_title].push(item)
    return acc
  }, {})

  const handleLogout = async () => {
    await logoutUser()
    router.push('/login')
    router.refresh()
  }

  const isSettings = pathname.startsWith('/settings')

  return (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border/60">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-sidebar-border/60">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white shadow-md shadow-primary/20 ring-1 ring-border transition-transform group-hover:scale-105">
            <Image src="/LOGO GACIA.png" alt="GACIA" width={40} height={40} className="h-full w-full object-cover" />
          </div>
          <span className="font-bold text-base tracking-tight text-sidebar-foreground leading-tight">GACIA</span>
        </Link>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Branch Switcher */}
        <div className="px-4 py-4 bg-muted/30 border-b border-sidebar-border/40">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-5 w-5 text-primary shrink-0" />
            {branches.length <= 1 ? (
              <span className="h-9 flex items-center text-sm font-medium text-foreground px-3">
                {branches[0]?.name || (branchId ? 'Cargando...' : 'Sin sucursal')}
              </span>
            ) : (
              <Select value={branchId} onValueChange={(v) => setBranch(v ?? '')}>
                <SelectTrigger className="h-9 text-xs bg-background/80 border-sidebar-border/60 shadow-xs focus:ring-1 focus:ring-primary w-full">
                  <SelectValue placeholder="Seleccionar sucursal">{branchName || (branchId ? 'Cargando...' : 'Seleccionar')}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="px-3 py-4">
          <div className="space-y-6">
            {Object.entries(groups).map(([groupTitle, items]) => (
              <div key={groupTitle} className="space-y-1">
                <h4 className="px-3 text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                  {groupTitle}
                </h4>
                <nav className="space-y-0.5">
                  {items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                    const Icon = iconMap[item.icon] || Circle

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold'
                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <Icon className={cn('h-5 w-5 shrink-0 transition-transform group-hover:scale-110', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    )
                  })}
                </nav>
              </div>
            ))}
          </div>
        </div>

        <Separator className="opacity-50 mx-3" />

        {/* Profile & Settings Section */}
        <div className="p-3 space-y-1">
          <Link
            href="/settings/menu"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
              isSettings
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <Settings className={cn('h-5 w-5 shrink-0', isSettings ? 'text-primary-foreground' : 'text-muted-foreground')} />
            <span>Configuración</span>
          </Link>
          <Link
            href="/profile"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
              pathname === '/profile' && 'bg-sidebar-accent font-semibold text-sidebar-foreground'
            )}
          >
            <User className="h-5 w-5 text-muted-foreground" />
            <span>Mi Perfil</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  )
}
