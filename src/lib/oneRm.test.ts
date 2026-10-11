import { describe, expect, it } from 'vitest'
import { epley1RM, estimate1RM, loadForPercent, powerliftingTotal, relativeStrength, trainingMaxFrom1RM } from './oneRm'

describe('one-rep-max estimation', () => {
  it('implements Epley: weight x (1 + reps/30)', () => {
    expect(epley1RM(100, 5)).toBeCloseTo(116.666, 2)
  })

  it('returns the weight itself for a single', () => {
    expect(epley1RM(140, 1)).toBe(140)
  })

  it('estimates 1RM and rounds to one decimal', () => {
    expect(estimate1RM(100, 3)).toBeCloseTo(110, 1)
  })

  it('derives a training max at 90%', () => {
    expect(trainingMaxFrom1RM(100, 0.9)).toBe(90)
  })

  it('prescribes load from a percentage of training max', () => {
    expect(loadForPercent(120, 75)).toBe(90)
  })

  it('computes relative strength against bodyweight', () => {
    expect(relativeStrength(200, 100)).toBe(2)
    expect(relativeStrength(200, 0)).toBeNull()
  })

  it('only totals when all three lifts are present', () => {
    expect(powerliftingTotal({ squat: 200, bench: 140, deadlift: 240 }).total).toBe(580)
    expect(powerliftingTotal({ squat: 200, bench: null, deadlift: 240 }).total).toBeNull()
  })
})
