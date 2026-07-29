'use client'

import Link from 'next/link'
import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { TrendingUp, Warehouse, Banknote, CreditCard, ChartNoAxesColumnIncreasing, ShoppingCart } from 'lucide-react'
import { useShowCost } from '@/shared/lib/use-role'

const allReports = [
  { name: 'Ventas', href: '/reports/sales', icon: TrendingUp, description: 'Historial de ventas por período' },
  { name: 'Utilidades', href: '/reports/profits', icon: ChartNoAxesColumnIncreasing, description: 'Ingresos, costos y margen de ganancia', adminOnly: true },
  { name: 'Inventario', href: '/reports/inventory', icon: Warehouse, description: 'Stock actual y valorización' },
  { name: 'Caja', href: '/reports/cash', icon: Banknote, description: 'Movimientos y saldo de caja' },
  { name: 'Créditos', href: '/reports/credits', icon: CreditCard, description: 'Créditos activos y pagados' },
  { name: 'Compras', href: '/reports/purchases', icon: ShoppingCart, description: 'Proformas, aprobaciones y gastos' },
]

export default function ReportsPage() {
  const showCost = useShowCost()
  const reportTypes = allReports.filter(r => !r.adminOnly || showCost)

  return (
    <PageContainer>
      <PageHeader title="Reportes" description="Visualiza y analiza la información del negocio" />

      <div className="grid gap-4 md:grid-cols-2">
        {reportTypes.map((report) => {
          const Icon = report.icon
          return (
            <Link key={report.href} href={report.href}>
              <Card className="transition-colors hover:bg-accent cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-4">
                  <Icon className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{report.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>
    </PageContainer>
  )
}
