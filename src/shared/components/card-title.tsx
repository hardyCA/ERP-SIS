import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

interface CardTitleProps {
  children: ReactNode
  className?: string
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn('text-lg font-semibold tracking-tight', className)}>
      {children}
    </h3>
  )
}
