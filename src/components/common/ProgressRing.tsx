import { cn } from '@/lib/utils'

/**
 * SVG progress ring. Used for the daily calorie + protein completion hero.
 * Supports a second, thinner inner track for protein.
 */
export function ProgressRing({
  value,
  max,
  size = 176,
  stroke = 12,
  className,
  trackClassName,
  colorVar = 'var(--primary)',
  children,
}: {
  value: number
  max: number
  size?: number
  stroke?: number
  className?: string
  trackClassName?: string
  colorVar?: string
  children?: React.ReactNode
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const ratio = max > 0 ? Math.min(1.2, Math.max(0, value / max)) : 0
  const offset = circumference * (1 - Math.min(1, ratio))

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={cn('stroke-surface-3', trackClassName)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={colorVar}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
