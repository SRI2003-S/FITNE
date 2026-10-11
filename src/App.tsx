import { useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Toaster } from '@/components/ui/Toaster'
import { seedIfNeeded } from '@/db/seed'
import { useUIStore } from '@/store/ui'
import { AppRoutes } from './app/router'
import { BootSplash } from './app/BootSplash'

export function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const theme = useUIStore((s) => s.theme)

  useEffect(() => {
    let cancelled = false
    seedIfNeeded()
      .then(() => !cancelled && setReady(true))
      .catch((e: unknown) => {
        console.error(e)
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to initialise local database')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark'
      : theme
  }, [theme])

  if (error) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-lg font-bold text-danger">Could not start FORGE</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">{error}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            This app needs IndexedDB. Try a normal (non-private) browser window.
          </p>
        </div>
      </div>
    )
  }

  if (!ready) return <BootSplash />

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
