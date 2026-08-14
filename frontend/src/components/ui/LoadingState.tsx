import { Loader2 } from 'lucide-react'

export default function LoadingState({ size = 28, className = 'py-16' }: { size?: number; className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <Loader2 size={size} className="animate-spin text-primary" />
    </div>
  )
}
