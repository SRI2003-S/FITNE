import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { useToastStore } from '@/store/ui'
import { cn } from '@/lib/utils'

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const TONE = {
  success: 'border-success/40 text-success',
  error: 'border-danger/40 text-danger',
  info: 'border-border text-foreground',
}

export function Toaster() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind]
        return (
          <button
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm animate-rise items-center gap-2.5 rounded-xl border bg-surface px-4 py-3 text-left text-sm font-medium shadow-soft',
              TONE[t.kind],
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-foreground">{t.message}</span>
          </button>
        )
      })}
    </div>
  )
}
