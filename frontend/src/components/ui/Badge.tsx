import type { ReactNode } from 'react'

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'accent' | 'neutral'

const TONE_CLS: Record<Tone, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger:  'bg-danger/10 text-danger',
  info:    'bg-info/10 text-info',
  primary: 'bg-primary/10 text-primary',
  accent:  'bg-accent/10 text-accent',
  neutral: 'bg-muted text-muted-foreground',
}

interface Props {
  tone?: Tone
  children: ReactNode
  className?: string
}

export default function Badge({ tone = 'neutral', children, className = '' }: Props) {
  return (
    <span className={`inline-block rounded-sm px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONE_CLS[tone]} ${className}`}>
      {children}
    </span>
  )
}
