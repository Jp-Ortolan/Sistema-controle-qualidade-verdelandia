import type { HTMLAttributes } from 'react'

export default function Card({ className = '', style, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface p-4 ${className}`}
      style={{ boxShadow: 'var(--shadow-card)', ...style }}
      {...rest}
    />
  )
}
