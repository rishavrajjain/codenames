import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  color?: 'red' | 'blue' | 'neutral' | 'default'
  className?: string
}

const colors = {
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  neutral: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  default: 'bg-white/10 text-white/70 border-white/10',
}

export function Badge({ children, color = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color]} ${className}`}>
      {children}
    </span>
  )
}
