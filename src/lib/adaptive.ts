/**
 * Transparent, rule-based adaptive-calorie engine.
 *
 * Deliberately conservative: it compares WEEKLY AVERAGES (never single days),
 * requires a minimum amount of consistent data, makes small changes only, and
 * always explains itself. It suggests — it never silently changes targets.
 */
import type { WeeklyAverage } from './weight'
import { round } from './utils'

export interface AdaptiveInput {
  weeklyAverages: WeeklyAverage[]
  targetLossPerWeek: number
  currentCalories: number
  /** true when the user reports falling performance / recovery */
  performanceDeclining?: boolean
  /** true when sleep is poor or training fatigue is high */
  recoveryFlag?: boolean
  /** minimum weigh-ins per week to trust an average */
  minEntriesPerWeek?: number
}

export type AdjustmentAction =
  | 'reduce'
  | 'increase'
  | 'hold'
  | 'improve_tracking'
  | 'need_data'

export interface AdjustmentSuggestion {
  action: AdjustmentAction
  deltaKcal: number
  reason: string
  weeksOfData: number
  confidence: 'low' | 'medium' | 'high'
  proposedCalories: number
}

export function suggestCalorieAdjustment(input: AdaptiveInput): AdjustmentSuggestion {
  const { weeklyAverages, targetLossPerWeek, currentCalories, performanceDeclining, recoveryFlag } = input
  const minEntries = input.minEntriesPerWeek ?? 4

  const reliable = weeklyAverages.filter((w) => w.entries >= minEntries)

  if (reliable.length < 3) {
    return {
      action: 'need_data',
      deltaKcal: 0,
      reason: `Only ${reliable.length} consistent week${reliable.length === 1 ? '' : 's'} of weigh-ins so far. Log at least 4 mornings per week for 3 weeks before adjusting calories.`,
      weeksOfData: reliable.length,
      confidence: 'low',
      proposedCalories: currentCalories,
    }
  }

  const recent = reliable.slice(-3)
  const first = recent[0].averageKg
  const last = recent[recent.length - 1].averageKg
  const spanWeeks = recent.length - 1
  const changePerWeek = spanWeeks > 0 ? (last - first) / spanWeeks : 0
  const lossPerWeek = -changePerWeek // positive means losing
  const confidence: AdjustmentSuggestion['confidence'] = reliable.length >= 4 ? 'high' : 'medium'

  const tooSlow = lossPerWeek < targetLossPerWeek - 0.15
  const tooFast = lossPerWeek > targetLossPerWeek + 0.25

  // Never blame calories alone when performance/recovery is flagging.
  if (performanceDeclining || recoveryFlag) {
    if (tooFast) {
      const delta = recoveryFlag ? 225 : 175
      return {
        action: 'increase',
        deltaKcal: delta,
        reason: `Losing ~${round(lossPerWeek, 2)} kg/week is faster than your ${targetLossPerWeek} target and recovery/performance is flagging. Review sleep and fatigue first; a +${delta} kcal/day addition is a reasonable starting point.`,
        weeksOfData: reliable.length,
        confidence,
        proposedCalories: Math.round(currentCalories + delta),
      }
    }
    return {
      action: 'hold',
      deltaKcal: 0,
      reason: 'Performance or recovery is flagging. Review sleep, training fatigue and adherence before changing calories.',
      weeksOfData: reliable.length,
      confidence,
      proposedCalories: currentCalories,
    }
  }

  if (tooSlow) {
    const delta = 175
    return {
      action: 'reduce',
      deltaKcal: -delta,
      reason: `Weekly average moved ${round(changePerWeek, 2)} kg/week over the last ${recent.length} weeks — under your ${targetLossPerWeek} kg target. Verify you are logging accurately, then consider −${delta} kcal/day.`,
      weeksOfData: reliable.length,
      confidence,
      proposedCalories: Math.round(currentCalories - delta),
    }
  }

  if (tooFast) {
    const delta = 200
    return {
      action: 'increase',
      deltaKcal: delta,
      reason: `Weekly average is dropping ~${round(lossPerWeek, 2)} kg/week — faster than the ${targetLossPerWeek} kg target. Adding +${delta} kcal/day can protect muscle and performance.`,
      weeksOfData: reliable.length,
      confidence,
      proposedCalories: Math.round(currentCalories + delta),
    }
  }

  return {
    action: 'hold',
    deltaKcal: 0,
    reason: `Trend of ${round(lossPerWeek, 2)} kg/week is inside your ${targetLossPerWeek} kg target. No change needed.`,
    weeksOfData: reliable.length,
    confidence,
    proposedCalories: currentCalories,
  }
}

export interface AdherenceInput {
  sessionsCompleted: number
  sessionsPlanned: number
  daysWeighIn: number
  daysLoggedMeals: number
  daysInWeek: number
}

/** Simple, rule-based adherence score (0–100) with transparent weighting. */
export function adherenceScore(input: AdherenceInput): number {
  const training = input.sessionsPlanned > 0 ? input.sessionsCompleted / input.sessionsPlanned : 0
  const weighIn = input.daysInWeek > 0 ? input.daysWeighIn / input.daysInWeek : 0
  const meals = input.daysInWeek > 0 ? input.daysLoggedMeals / input.daysInWeek : 0
  const score = training * 45 + meals * 35 + weighIn * 20
  return Math.round(Math.min(100, Math.max(0, score)))
}
