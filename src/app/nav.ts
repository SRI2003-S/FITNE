import { Dumbbell, Home, Settings, Sparkles, TrendingUp, UtensilsCrossed, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/train', label: 'Train', icon: Dumbbell },
  { to: '/nutrition', label: 'Nutrition', icon: UtensilsCrossed },
  { to: '/progress', label: 'Progress', icon: TrendingUp },
  { to: '/coach', label: 'Coach', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: Settings },
]
