import { useEffect } from 'react'
import { X } from 'lucide-react'

export type ToastType = 'ok' | 'err' | 'info' | 'warn'

export interface ToastState { msg: string; type: ToastType }

const DURATION: Record<ToastType, number> = { ok: 3000, info: 3000, warn: 4000, err: 5000 }

const STYLE: Record<ToastType, string> = {
  ok:   'bg-emerald-600',
  err:  'bg-red-600',
  info: 'bg-blue-600',
  warn: 'bg-amber-500',
}

interface Props { msg: string; type: ToastType; onClose: () => void }

export default function Toast({ msg, type, onClose }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, DURATION[type])
    return () => clearTimeout(t)
  }, [onClose, type])

  return (
    <div className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${STYLE[type]}`}>
      {msg}
      <button onClick={onClose}><X size={14} /></button>
    </div>
  )
}
