import { NavLink } from 'react-router-dom'
import { Flame } from 'lucide-react'
import { NAV_ITEMS } from '@/app/nav'
import { cn } from '@/lib/utils'

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-surface/60 lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <BrandMark />
        <div className="leading-none">
          <div className="text-lg font-black tracking-tight text-foreground">FORGE</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Fitness OS
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('h-5 w-5', isActive ? 'text-primary' : '')} />
                {item.label}
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
          <Flame className="h-5 w-5 text-primary" />
          <div className="text-xs">
            <div className="font-semibold text-foreground">Local-first</div>
            <div className="text-muted-foreground">Data stays on this device</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_24px_-12px_var(--primary)]',
        className,
      )}
    >
      <Flame className="h-5 w-5" />
    </span>
  )
}
