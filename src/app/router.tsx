import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppShell } from '@/components/layout/AppShell'
import { Skeleton } from '@/components/ui/Skeleton'
import { db, META_KEYS } from '@/db/db'
import { HomeScreen } from '@/features/home/HomeScreen'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { useAuth } from '@/hooks/useAuth'
import { TrainScreen } from '@/features/train/TrainScreen'
import { NutritionScreen } from '@/features/nutrition/NutritionScreen'
import { CoachScreen } from '@/features/coach/CoachScreen'
import { SettingsScreen } from '@/features/settings/SettingsScreen'
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen'
import { NotFoundScreen } from '@/features/misc/NotFoundScreen'

const ProgressScreen = lazy(() =>
  import('@/features/progress/ProgressScreen').then((m) => ({ default: m.ProgressScreen })),
)
const WorkoutModeScreen = lazy(() =>
  import('@/features/train/WorkoutModeScreen').then((m) => ({ default: m.WorkoutModeScreen })),
)
const PhotosScreen = lazy(() =>
  import('@/features/progress/PhotosScreen').then((m) => ({ default: m.PhotosScreen })),
)

function RouteFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

function AuthGate({ children }: { children: ReactNode }) {
  const { configured, loading, user } = useAuth()
  const location = useLocation()
  if (!configured) return <>{children}</>
  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Skeleton className="h-8 w-40" />
      </div>
    )
  }
  if (!user && location.pathname !== '/auth') {
    return <Navigate to="/auth" replace />
  }
  return <>{children}</>
}

function OnboardingGate({ children }: { children: ReactNode }) {
  const location = useLocation()
  const complete = useLiveQuery(async () => {
    const row = await db.meta.get(META_KEYS.onboardingComplete)
    return row?.value === true
  }, [])

  if (complete === undefined) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Skeleton className="h-8 w-40" />
      </div>
    )
  }

  if (!complete && location.pathname !== '/onboarding' && location.pathname !== '/auth') {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <AuthGate>
        <OnboardingGate>
          <Routes>
            <Route path="/auth" element={<AuthScreen />} />
            {/* Full-screen workout mode lives outside the app shell */}
            <Route path="/workout/:id" element={<WorkoutModeScreen />} />

          <Route element={<AppShell />}>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/train" element={<TrainScreen />} />
            <Route path="/nutrition" element={<NutritionScreen />} />
            <Route path="/progress" element={<ProgressScreen />} />
            <Route path="/progress/photos" element={<PhotosScreen />} />
            <Route path="/coach" element={<CoachScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/onboarding" element={<OnboardingScreen />} />
            <Route path="*" element={<NotFoundScreen />} />
          </Route>
        </Routes>
      </OnboardingGate>
      </AuthGate>
    </Suspense>
  )
}
