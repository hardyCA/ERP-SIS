import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

export function Breadcrumb({ children }: { children: ReactNode }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {children}
    </nav>
  )
}

export function BreadcrumbItem({ children }: { children: ReactNode }) {
  return <span className="flex items-center gap-1">{children}</span>
}

export function BreadcrumbLink({ children, render }: { children: ReactNode; render?: ReactNode }) {
  if (render) {
    return (
      <span className="hover:text-foreground transition-colors">
        {render}
      </span>
    )
  }
  return <span className="text-foreground font-medium">{children}</span>
}

export function BreadcrumbSeparator() {
  return <ChevronRight className="h-3.5 w-3.5" />
}
