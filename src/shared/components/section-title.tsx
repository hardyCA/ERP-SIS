import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

interface SectionTitleProps {
  children: ReactNode
  description?: string
  action?: ReactNode
  className?: string
}

export function SectionTitle({ children, description, action, className }: SectionTitleProps) {
  return (
    <div className={cn('flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{children}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-2 sm:mt-0">{action}</div>}
    </div>
  )
}
