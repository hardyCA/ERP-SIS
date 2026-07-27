'use client'

import { useQuery } from '@tanstack/react-query'
import { getDashboardStats, getWeeklySalesChart } from '@/modules/reports/actions'
import { useBranch } from '@/shared/contexts/branch-context'
import { PageHeader } from '@/shared/components/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Package, TrendingUp, CreditCard, Banknote, AlertTriangle, ArrowUpRight, BarChart2, Activity } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { branchId } = useBranch()

  const { data: result, isLoading } = useQuery({
    queryKey: ['dashboard-stats', branchId],
    queryFn: () => getDashboardStats(branchId || undefined),
    staleTime: 30000,
  })

  const { data: chartResult, isLoading: isChartLoading } = useQuery({
    queryKey: ['weekly-sales-chart', branchId],
    queryFn: () => getWeeklySalesChart(branchId || undefined),
    staleTime: 30000,
  })

  const stats = result?.success ? result.data : null
  const chartData = chartResult?.success ? (chartResult.data ?? []) : []

  const maxAmount = Math.max(...chartData.map(d => d.amount), 100)

  const cards = [
    {
      title: 'Productos en Catálogo',
      value: stats?.totalProducts ?? 0,
      description: 'Inventario activo registrado',
      icon: Package,
      formatter: (v: number) => v.toLocaleString('es-BO'),
      href: '/brands',
      accent: 'from-blue-500/10 to-indigo-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20',
      iconBg: 'bg-blue-500/10 text-blue-600 dark:bg-blue-400/20 dark:text-blue-400',
    },
    {
      title: 'Ventas de Hoy',
      value: stats?.salesTodayAmount ?? 0,
      description: `${stats?.salesToday ?? 0} transacciones procesadas hoy`,
      icon: TrendingUp,
      formatter: (v: number) => `Bs ${v.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      href: '/sales',
      accent: 'from-emerald-500/10 to-teal-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-400',
    },
    {
      title: 'Créditos Activos',
      value: stats?.activeCredits ?? 0,
      description: `${stats?.activeCreditsAmount ? `Monto total: Bs ${stats.activeCreditsAmount.toLocaleString('es-BO', { minimumFractionDigits: 2 })}` : 'Sin cobros pendientes'}`,
      icon: CreditCard,
      formatter: (v: number) => `${v} pendientes`,
      href: '/credits',
      accent: 'from-amber-500/10 to-orange-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400',
    },
    {
      title: 'Saldo en Caja',
      value: stats?.cashBalance ?? 0,
      description: 'Efectivo disponible en caja chica',
      icon: Banknote,
      formatter: (v: number) => `Bs ${v.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      href: '/cash-register',
      accent: 'from-violet-500/10 to-purple-500/5 text-violet-600 dark:text-violet-400 border-violet-500/20',
      iconBg: 'bg-violet-500/10 text-violet-600 dark:bg-violet-400/20 dark:text-violet-400',
    },
  ]

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Top Banner Header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between border-b border-border/60 pb-6">
        <div>
          <PageHeader
            title="Panel de Control"
            description="Visión general e indicadores clave en tiempo real"
          />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.title} href={card.href} className="group outline-none">
              <Card className="premium-card relative overflow-hidden border border-border/60 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-40 transition-opacity group-hover:opacity-70`} />
                <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5">
                  <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${card.iconBg}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0">
                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-7 w-28 rounded-lg" />
                      <Skeleton className="h-4 w-36 rounded-md" />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                          {card.formatter(card.value)}
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground/90 line-clamp-1">
                        {card.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Gráficos de Ventas Semanales & Actividad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras SaaS (2 columnas en escritorio) */}
        <Card className="lg:col-span-2 border border-border/70 bg-card/90 backdrop-blur-sm rounded-2xl shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-primary" />
                Ventas de los Últimos 7 Días
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Monto diario facturado en Bolivianos (Bs)
              </CardDescription>
            </div>
            <Link href="/reports" className="text-xs text-primary hover:underline font-medium">
              Ver reporte detallado
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            {isChartLoading ? (
              <div className="h-56 flex items-end justify-between gap-3 pt-8">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="flex-1 rounded-t-xl" style={{ height: `${20 + (i * 12) % 70}%` }} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-56 flex items-end justify-between gap-3 pt-6 px-1">
                  {chartData.map((d) => {
                    const heightPercent = Math.max((d.amount / maxAmount) * 100, 6)
                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group relative">
                        {/* Tooltip flotante al hover */}
                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 bg-popover text-popover-foreground text-[10px] font-mono font-bold px-2 py-1 rounded-md shadow-md border whitespace-nowrap">
                          Bs {d.amount.toFixed(2)} ({d.count} vta{d.count !== 1 ? 's' : ''})
                        </div>

                        {/* Barra del Gráfico */}
                        <div className="w-full bg-muted/40 rounded-t-xl overflow-hidden h-full flex items-end p-0.5">
                          <div
                            className="w-full bg-gradient-to-t from-primary/80 to-primary rounded-t-lg transition-all duration-500 group-hover:brightness-110"
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>

                        {/* Día de la Semana */}
                        <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                          {d.day}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumen de Estado de Negocio */}
        <Card className="border border-border/70 bg-card/90 backdrop-blur-sm rounded-2xl shadow-xs flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              Estado del Sistema
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Resumen operativo actual
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40">
              <span className="text-xs text-muted-foreground">Sucursales Activas</span>
              <span className="text-sm font-bold font-mono text-foreground">ERP Activo</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40">
              <span className="text-xs text-muted-foreground">Moneda Principal</span>
              <span className="text-sm font-bold font-mono text-primary">BOB (Bs)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40">
              <span className="text-xs text-muted-foreground">Filtro de Sucursal</span>
              <span className="text-xs font-semibold text-foreground">Global / Dinámico</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Alert Banner */}
      {!isLoading && (stats?.lowStockCount ?? 0) > 0 && (
        <Card className="border-destructive/30 bg-destructive/5 dark:bg-destructive/10 backdrop-blur-md transition-all">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-semibold text-foreground">Alerta de Existencias Bajas</h4>
                <p className="text-xs text-muted-foreground">
                  Se detectaron <span className="font-bold text-destructive">{stats?.lowStockCount} producto(s)</span> con stock crítico (&le; 5 unidades).
                </p>
              </div>
            </div>
            <Link
              href="/inventory"
              className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground shadow-sm transition-transform hover:scale-105 active:scale-95 shrink-0"
            >
              <span>Revisar Inventario</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


