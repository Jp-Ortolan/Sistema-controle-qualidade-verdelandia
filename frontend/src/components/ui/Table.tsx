import type { ReactNode, TdHTMLAttributes } from 'react'

export function Table({ children, minWidth = 'min-w-[560px]' }: { children: ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border shadow-lg">
      <table className={`w-full ${minWidth}`}>{children}</table>
    </div>
  )
}

export function Thead({ headers }: { headers: ReactNode[] }) {
  return (
    <thead>
      <tr>
        {headers.map((h, i) => (
          <th key={i} className="bg-primary px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-primary-foreground">
            {h}
          </th>
        ))}
      </tr>
    </thead>
  )
}

export function Tr({ children }: { children: ReactNode }) {
  return <tr className="even:bg-muted/40 transition hover:bg-muted/70">{children}</tr>
}

interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right'
}

const ALIGN_CLS = { left: 'text-left', center: 'text-center', right: 'text-right' }

export function Td({ children, className = '', align = 'center', ...rest }: TdProps) {
  return (
    <td className={`border-t border-border px-4 py-2.5 text-sm text-foreground ${ALIGN_CLS[align]} ${className}`} {...rest}>
      {children}
    </td>
  )
}
