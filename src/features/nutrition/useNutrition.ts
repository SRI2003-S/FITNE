import { useMemo } from 'react'
import { useGoal } from '@/hooks/useAppData'
import { sumMacros, type Macros } from '@/lib/nutrition'
import type { MealEntry } from '@/types'

export const MEAL_ORDER = [
  'breakfast',
  'morning_snack',
  'lunch',
  'pre_workout',
  'post_workout',
  'dinner',
  'evening_snack',
] as const

export const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  morning_snack: 'Morning snack',
  lunch: 'Lunch',
  pre_workout: 'Pre-workout',
  post_workout: 'Post-workout',
  dinner: 'Dinner',
  evening_snack: 'Evening snack',
}

export interface DayTarget extends Macros {}

export function mealsToMacros(meals: MealEntry[]): Macros {
  return sumMacros(
    meals.map((m) => ({ calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat })),
  )
}

export function useDayTarget(override?: Macros | null): DayTarget {
  const goal = useGoal()
  return useMemo<DayTarget>(() => {
    if (override) return override
    return {
      calories: goal?.calorieTarget ?? 2700,
      protein: goal?.proteinTarget ?? 180,
      carbs: goal?.carbTarget ?? 326,
      fat: goal?.fatTarget ?? 75,
    }
  }, [goal, override])
}
