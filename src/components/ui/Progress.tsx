import { cn } from '@/lib/utils'
import { pct } from '@/lib/utils'

export function Progress({
  value,
  max = 100,
  className,
  barClassName,
}: {
  value: number
  max?: number
  className?: string
  barClassName?: string
}) {
  const width = Math.max(0, Math.min(100, pct(value, max)))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-3', className)}
    >
      <div
        className={cn('h-full rounded-full bg-primary transition-[width] duration-500 ease-out', barClassName)}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
