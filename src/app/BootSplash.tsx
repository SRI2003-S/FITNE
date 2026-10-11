import { Flame } from 'lucide-react'

export function BootSplash() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground animate-pulse-ring">
        <Flame className="h-8 w-8" />
      </div>
      <div className="text-center">
        <div className="text-xl font-black tracking-tight text-foreground">FORGE</div>
        <div className="text-xs text-muted-foreground">Preparing your local data…</div>
      </div>
    </div>
  )
}
