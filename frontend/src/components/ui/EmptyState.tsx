import type { ElementType, ReactNode } from 'react'
import { Inbox } from 'lucide-react'

interface Props {
  icon?: ElementType
  message: ReactNode
  action?: ReactNode
}

export default function EmptyState({ icon: Icon = Inbox, message, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <Icon size={28} className="text-muted-foreground/60" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  )
}
