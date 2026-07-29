import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

interface BodyTextProps {
  children: ReactNode
  className?: string
  as?: 'p' | 'span'
  muted?: boolean
}

export function BodyText({ children, className, as: Tag = 'p', muted }: BodyTextProps) {
  return (
    <Tag className={cn('text-base', muted && 'text-muted-foreground', className)}>
      {children}
    </Tag>
  )
}
