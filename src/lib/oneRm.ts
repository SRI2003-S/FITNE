/**
 * One-rep-max estimation and load prescription helpers.
 *
 * Estimates are *estimates*. The UI must always label them as such and never
 * present them as a tested single. Epley is the documented default:
 *   1RM = weight × (1 + reps / 30)
 */
import { round } from './utils'

export const STANDARD_PLATES_KG = 2.5

export function epley1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0) return 0
  if (reps <= 1) return weightKg
  return weightKg * (1 + reps / 30)
}

export function brzycki1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0) return 0
  if (reps <= 1) return weightKg
  if (reps >= 37) return 0
  return (weightKg * 36) / (37 - reps)
}

/**
 * Estimate a 1RM from a working set. Epley is used for ≤10 rep sets, where it
 * is most reliable; Brzycki is a reasonable cross-check above that.
 */
export function estimate1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0
  const value = reps <= 10 ? epley1RM(weightKg, reps) : brzycki1RM(weightKg, reps)
  return round(value, 1)
}

export function trainingMaxFrom1RM(oneRmKg: number, factor = 0.9): number {
  return round(oneRmKg * factor, 1)
}

export function loadForPercent(trainingMaxKg: number, percent: number): number {
  return round((trainingMaxKg * percent) / 100, 1)
}

/** Relative strength = lift / bodyweight. */
export function relativeStrength(liftKg: number, bodyweightKg: number): number | null {
  if (!bodyweightKg) return null
  return round(liftKg / bodyweightKg, 2)
}

/** Estimated reps achievable at a given percentage of 1RM (Epley inversion). */
export function repsAtPercent(percent: number): number {
  if (percent <= 0) return 0
  return Math.max(1, Math.round(30 * (100 / percent - 1)))
}

export interface LiftTotal {
  squat: number | null
  bench: number | null
  deadlift: number | null
  total: number | null
  bodyweightKg?: number | null
}

export function powerliftingTotal(lifts: Omit<LiftTotal, 'total'>): LiftTotal {
  const values = [lifts.squat, lifts.bench, lifts.deadlift]
  const total = values.every((v) => v != null) ? (values as number[]).reduce((a, b) => a + b, 0) : null
  return { ...lifts, total }
}
