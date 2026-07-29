import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  icon?: ReactNode
  trend?: {
    value: string
    positive: boolean
  }
  className?: string
  children?: ReactNode
}

export function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
  children,
}: MetricCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-2 mt-1.5">
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            {trend && (
              <span className={cn(
                'text-xs font-medium',
                trend.positive ? 'text-success' : 'text-destructive'
              )}>
                {trend.value}
              </span>
            )}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  )
}
