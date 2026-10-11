import { Moon, Sun, WifiOff } from 'lucide-react'
import { useOnline } from '@/hooks/useOnline'
import { useUIStore, resolvedTheme } from '@/store/ui'
import { BrandMark } from './Sidebar'
import { cn } from '@/lib/utils'

export function TopBar() {
  const online = useOnline()
  const { theme, toggleTheme } = useUIStore()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md lg:h-16 lg:px-8">
      <div className="flex items-center gap-2.5 lg:hidden">
        <BrandMark className="h-8 w-8 rounded-lg" />
        <span className="text-base font-black tracking-tight">FORGE</span>
      </div>

      <div className="hidden lg:block">
        <OnlinePill online={online} />
      </div>

      <div className="flex items-center gap-2">
        <div className="lg:hidden">
          <OnlinePill online={online} />
        </div>
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          {resolvedTheme(theme) === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  )
}

function OnlinePill({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
        online
          ? 'border-success/30 bg-success/10 text-success'
          : 'border-warning/40 bg-warning/10 text-warning',
      )}
    >
      {online ? (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Local-first · Online
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          Offline — saving locally
        </>
      )}
    </span>
  )
}
