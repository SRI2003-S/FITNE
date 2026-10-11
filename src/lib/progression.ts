/**
 * Eight-week main-lift progression scheme.
 *
 * Percentages are GUIDELINES expressed as a range, never mandatory loads.
 * Training maxes start at ~90% of a *verified* recent 1RM and are always
 * editable. RIR 1–3 is a sensible default; automatic weekly max testing is
 * explicitly discouraged.
 */
import { round, roundTo } from './utils'
import { STANDARD_PLATES_KG } from './oneRm'

export interface WeekScheme {
  week: number
  label: string
  /** main lift working-set % of training max */
  mainLowPct: number
  mainHighPct: number
  /** multiplier applied to accessory volume */
  accessoryFactor: number
  deload: boolean
  cue: string
}

export const EIGHT_WEEK_SCHEME: WeekScheme[] = [
  { week: 1, label: 'Foundation', mainLowPct: 72, mainHighPct: 77, accessoryFactor: 1, deload: false, cue: 'Leave 2–3 reps in reserve. Groove technique.' },
  { week: 2, label: 'Build', mainLowPct: 75, mainHighPct: 80, accessoryFactor: 1, deload: false, cue: 'Same sets, slightly heavier. Stay crisp.' },
  { week: 3, label: 'Build+', mainLowPct: 78, mainHighPct: 82, accessoryFactor: 1, deload: false, cue: 'RIR 2 on top sets.' },
  { week: 4, label: 'Peak', mainLowPct: 80, mainHighPct: 83, accessoryFactor: 0.9, deload: false, cue: 'Heaviest of the block. Stop 1–2 reps short.' },
  { week: 5, label: 'Deload', mainLowPct: 65, mainHighPct: 72, accessoryFactor: 0.6, deload: true, cue: 'Cut main load ~5–10% and accessory sets 30–50%.' },
  { week: 6, label: 'Rebuild', mainLowPct: 77, mainHighPct: 82, accessoryFactor: 1, deload: false, cue: 'Fresh start. Re-groove speed off the chest/floor.' },
  { week: 7, label: 'Build', mainLowPct: 80, mainHighPct: 85, accessoryFactor: 1, deload: false, cue: 'RIR 1–2. Watch bar speed.' },
  { week: 8, label: 'Peak', mainLowPct: 82, mainHighPct: 87, accessoryFactor: 0.85, deload: false, cue: 'Only if readiness and technique support it.' },
]

export function schemeForWeek(week: number): WeekScheme {
  const idx = ((week - 1) % EIGHT_WEEK_SCHEME.length + EIGHT_WEEK_SCHEME.length) % EIGHT_WEEK_SCHEME.length
  return EIGHT_WEEK_SCHEME[idx]
}

export function setLoadsForWeek(trainingMaxKg: number, scheme: WeekScheme): { low: number; high: number } {
  return {
    low: roundTo((trainingMaxKg * scheme.mainLowPct) / 100, STANDARD_PLATES_KG),
    high: roundTo((trainingMaxKg * scheme.mainHighPct) / 100, STANDARD_PLATES_KG),
  }
}

export interface ProgressionInput {
  lastWeightKg: number | null
  lastReps: number | null
  lastRir?: number | null
  targetLow: number
  targetHigh: number
  targetRir?: number
  incrementKg?: number
  isUpperBody?: boolean
}

export interface ProgressionSuggestion {
  action: 'increase_load' | 'add_reps' | 'hold' | 'reduce' | 'insufficient_data'
  loadKg: number | null
  reps: number
  reason: string
}

/**
 * Transparent double-progression helper. Every suggestion is shown with a
 * reason and remains editable before the session starts.
 */
export function suggestProgression(input: ProgressionInput): ProgressionSuggestion {
  const {
    lastWeightKg,
    lastReps,
    lastRir,
    targetLow,
    targetHigh,
    targetRir = 2,
    incrementKg,
    isUpperBody = false,
  } = input

  if (lastWeightKg == null || lastReps == null) {
    return {
      action: 'insufficient_data',
      loadKg: null,
      reps: targetLow,
      reason: 'No previous set logged for this exercise. Enter a comfortable starting load.',
    }
  }

  const inc = incrementKg ?? (isUpperBody ? 1.25 : 2.5)
  const rirSlack = lastRir != null ? lastRir - targetRir : 0

  if (lastReps >= targetHigh && rirSlack >= 0) {
    const load = roundTo(lastWeightKg + inc, inc < STANDARD_PLATES_KG ? inc : STANDARD_PLATES_KG)
    return {
      action: 'increase_load',
      loadKg: round(load, 2),
      reps: targetLow,
      reason: `Hit ${lastReps} reps at RIR ${lastRir ?? '—'}. Add ${inc} kg and reset to ${targetLow} reps.`,
    }
  }

  if (lastReps >= targetLow && lastReps < targetHigh) {
    return {
      action: 'add_reps',
      loadKg: round(lastWeightKg, 2),
      reps: Math.min(targetHigh, lastReps + 1),
      reason: `Reps ${lastReps}/${targetHigh} at this load. Keep the weight and add a rep.`,
    }
  }

  if (lastReps < targetLow) {
    return {
      action: 'reduce',
      loadKg: round(Math.max(0, lastWeightKg - inc), 2),
      reps: targetLow,
      reason: `Only ${lastReps} reps (below the ${targetLow} target). Reduce load to stay in range.`,
    }
  }

  return {
    action: 'hold',
    loadKg: round(lastWeightKg, 2),
    reps: Math.max(targetLow, lastReps),
    reason: 'Within target range. Repeat this load before progressing.',
  }
}
