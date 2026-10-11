import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'

export function NotFoundScreen() {
  return (
    <EmptyState
      icon={<Compass className="h-6 w-6" />}
      title="Page not found"
      description="That route doesn't exist in FORGE."
      action={
        <Link
          to="/"
          className="inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Back to Home
        </Link>
      }
    />
  )
}
