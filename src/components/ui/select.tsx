import type { ComponentProps } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return <span className="relative block"><select className={cn('h-10 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-9 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50', className)} {...props}>{children}</select><ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" /></span>
}
