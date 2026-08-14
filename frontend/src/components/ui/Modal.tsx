import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
}

export default function Modal({ open, onClose, title, description, children, footer, maxWidth = 'max-w-md' }: Props) {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm"
    >
      <div className={`flex max-h-[92vh] w-full ${maxWidth} flex-col rounded-2xl border border-border bg-surface-elevated shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-border px-3 py-3 min-[480px]:px-6 min-[480px]:py-4">
          <div>
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-muted-foreground transition hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 min-[480px]:px-6 min-[480px]:py-5">
          {children}
        </div>

        {footer && (
          <div className="flex flex-col-reverse gap-3 border-t border-border px-3 py-3 min-[380px]:flex-row min-[480px]:px-6 min-[480px]:py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
