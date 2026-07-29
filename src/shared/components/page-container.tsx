import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

interface PageContainerProps {
  children: ReactNode
  className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn('space-y-8 p-4 sm:p-6 lg:p-8', className)}>
      {children}
    </div>
  )
}
