/**
 * Deterministic, rule-based insights.
 *
 * These are the non-AI fallback for the Coach. They only ever use data the
 * user has actually logged, and they never invent history or medical claims.
 */
import type { Food } from '@/types'
import { nutritionForGrams } from './nutrition'
import { round } from './utils'

export interface WeekFacts {
  avgCalories: number | null
  avgProtein: number | null
  sessionsCompleted: number
  sessionsPlanned: number
  weightChangeKg: number | null
  calorieTarget: number
  proteinTarget: number
  daysLogged: number
}

export function summarizeWeek(f: WeekFacts): string[] {
  const out: string[] = []

  if (f.daysLogged === 0) {
    out.push('No meals were logged this week, so nutrition trends cannot be assessed yet.')
  } else {
    const calLine =
      f.avgCalories == null
        ? 'Calorie average unavailable.'
        : `Average intake was ${Math.round(f.avgCalories)} kcal/day against a ${f.calorieTarget} kcal target (${
            f.avgCalories > f.calorieTarget ? 'above' : 'below'
          } target).`
    out.push(calLine)
    if (f.avgProtein != null) {
      const ratio = f.avgProtein / f.proteinTarget
      out.push(
        `Average protein was ${Math.round(f.avgProtein)} g/day (${Math.round(ratio * 100)}% of your ${f.proteinTarget} g target)${
          ratio < 0.9 ? ' — protein is the priority to protect muscle in a deficit.' : '.'
        }`,
      )
    }
  }

  out.push(
    `Training: ${f.sessionsCompleted} of ${f.sessionsPlanned} planned sessions completed (${
      f.sessionsPlanned ? Math.round((f.sessionsCompleted / f.sessionsPlanned) * 100) : 0
    }%).`,
  )

  if (f.weightChangeKg == null) {
    out.push('Weight trend needs at least two weeks of consistent morning weigh-ins to be meaningful.')
  } else {
    const dir = f.weightChangeKg < 0 ? 'down' : f.weightChangeKg > 0 ? 'up' : 'flat'
    out.push(`Weekly average weight moved ${f.weightChangeKg > 0 ? '+' : ''}${round(f.weightChangeKg, 2)} kg (${dir}) versus the previous week.`)
    out.push('Reminder: day-to-day scale changes are usually water. Judge by the weekly average only.')
  }

  return out
}

export interface MealIdea {
  label: string
  grams: number
  calories: number
  protein: number
}

/**
 * Suggest foods that close a protein gap without blowing the calorie budget.
 * Respects an avoid-list (e.g. whey) and prefers Indian staples.
 */
export function mealIdeas(
  remaining: { calories: number; protein: number },
  foods: Food[],
  opts: { avoid?: string[]; limit?: number } = {},
): MealIdea[] {
  const avoid = (opts.avoid ?? ['whey']).map((a) => a.toLowerCase())
  const candidates = foods.filter(
    (f) =>
      !f.custom &&
      f.protein >= 6 &&
      !avoid.some((a) => f.name.toLowerCase().includes(a) || f.aliases.some((al) => al.toLowerCase().includes(a))),
  )

  const targetProtein = Math.max(0, remaining.protein)
  const calorieBudget = Math.max(0, remaining.calories)

  const scored = candidates
    .map((f) => {
      const grams = 150
      const m = nutritionForGrams(f, grams)
      const proteinDensity = f.protein / Math.max(1, f.calories)
      return { f, grams, m, proteinDensity }
    })
    .filter((c) => c.m.calories <= calorieBudget + 1)
    .sort((a, b) => b.proteinDensity - a.proteinDensity)

  const picked: MealIdea[] = []
  let proteinLeft = targetProtein
  for (const c of scored) {
    if (proteinLeft <= 0 || picked.length >= (opts.limit ?? 4)) break
    const grams = Math.min(250, c.grams)
    const m = nutritionForGrams(c.f, grams)
    if (m.calories > calorieBudget) continue
    picked.push({ label: c.f.name, grams, calories: round(m.calories, 0), protein: round(m.protein, 0) })
    proteinLeft -= m.protein
  }
  return picked
}

export function explainWeightChange(weeklyChangeKg: number | null, target: number): string {
  if (weeklyChangeKg == null) return 'Not enough weigh-ins yet to explain a trend.'
  if (Math.abs(weeklyChangeKg) < 0.05) return 'Weight is essentially stable this week.'
  if (weeklyChangeKg < 0) {
    const rate = -weeklyChangeKg
    if (rate > target + 0.4) return `Losing ~${round(rate, 2)} kg/week is faster than your ${target} kg target — check recovery and muscle retention.`
    return `Losing ~${round(rate, 2)} kg/week, inside a healthy range for your ${target} kg target.`
  }
  return `Gaining ~${round(weeklyChangeKg, 2)} kg/week. If fat loss is the goal, review intake accuracy and weekend patterns.`
}
