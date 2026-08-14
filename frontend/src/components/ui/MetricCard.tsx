import type { ElementType, ReactNode } from 'react'
import Card from './Card'
import type { Tone } from './Badge'

const ICON_TONE_CLS: Record<Tone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger:  'text-danger',
  info:    'text-info',
  primary: 'text-primary',
  accent:  'text-accent',
  neutral: 'text-muted-foreground',
}

interface Props {
  icon: ElementType
  label: string
  value: ReactNode
  tone?: Tone
}

export default function MetricCard({ icon: Icon, label, value, tone = 'neutral' }: Props) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon size={16} className={ICON_TONE_CLS[tone]} />
      </div>
      <p className="mt-2 font-mono text-3xl font-bold text-foreground">{value}</p>
    </Card>
  )
}
