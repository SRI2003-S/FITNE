import { describe, expect, it } from 'vitest'
import { EIGHT_WEEK_SCHEME, schemeForWeek, setLoadsForWeek, suggestProgression } from './progression'
import { adherenceScore, suggestCalorieAdjustment } from './adaptive'

describe('progression scheme', () => {
  it('has eight weeks with a deload in week 5', () => {
    expect(EIGHT_WEEK_SCHEME).toHaveLength(8)
    expect(EIGHT_WEEK_SCHEME[4].deload).toBe(true)
  })

  it('wraps weeks cyclically', () => {
    expect(schemeForWeek(9).week).toBe(1)
  })

  it('prescribes main loads around the training max', () => {
    const loads = setLoadsForWeek(100, schemeForWeek(1))
    expect(loads.low).toBeLessThanOrEqual(80)
    expect(loads.high).toBeGreaterThanOrEqual(loads.low)
  })

  it('adds load when the top of the rep range is hit at target RIR', () => {
    const s = suggestProgression({ lastWeightKg: 100, lastReps: 8, lastRir: 2, targetLow: 6, targetHigh: 8 })
    expect(s.action).toBe('increase_load')
    expect(s.loadKg).toBeGreaterThan(100)
  })

  it('reduces load when below the rep range', () => {
    const s = suggestProgression({ lastWeightKg: 100, lastReps: 3, lastRir: 0, targetLow: 6, targetHigh: 8 })
    expect(s.action).toBe('reduce')
  })

  it('reports insufficient data without a previous set', () => {
    const s = suggestProgression({ lastWeightKg: null, lastReps: null, targetLow: 6, targetHigh: 8 })
    expect(s.action).toBe('insufficient_data')
  })
})

describe('adaptive calorie engine', () => {
  const weeklies = (values: number[]) =>
    values.map((averageKg, i) => ({ weekStart: `2026-01-0${i + 1}`, averageKg, entries: 7 }))

  it('asks for more data when there are fewer than three consistent weeks', () => {
    const s = suggestCalorieAdjustment({
      weeklyAverages: weeklies([90, 89.9]),
      targetLossPerWeek: 0.5,
      currentCalories: 2700,
    })
    expect(s.action).toBe('need_data')
  })

  it('suggests a small reduction when loss is too slow', () => {
    const s = suggestCalorieAdjustment({
      weeklyAverages: weeklies([90, 89.95, 89.9]),
      targetLossPerWeek: 0.5,
      currentCalories: 2700,
    })
    expect(s.action).toBe('reduce')
    expect(s.deltaKcal).toBeLessThan(0)
    expect(Math.abs(s.deltaKcal)).toBeLessThanOrEqual(200)
  })

  it('suggests an increase when loss is too fast', () => {
    const s = suggestCalorieAdjustment({
      weeklyAverages: weeklies([90, 88.5, 87]),
      targetLossPerWeek: 0.5,
      currentCalories: 2700,
    })
    expect(s.action).toBe('increase')
  })

  it('computes a bounded adherence score', () => {
    const score = adherenceScore({
      sessionsCompleted: 5,
      sessionsPlanned: 5,
      daysWeighIn: 7,
      daysLoggedMeals: 5,
      daysInWeek: 7,
    })
    expect(score).toBeGreaterThan(80)
    expect(score).toBeLessThanOrEqual(100)
  })
})
