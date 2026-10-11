import { describe, expect, it } from 'vitest'
import { macroCalories, macroSplit, nutritionForGrams, reconcileTargets, sumMacros } from './nutrition'

describe('nutrition maths', () => {
  it('computes calories from macros with Atwater factors', () => {
    expect(macroCalories({ protein: 180, carbs: 326, fat: 75 })).toBe(2699)
  })

  it('keeps the default FORGE targets consistent with 2700 kcal', () => {
    const target = reconcileTargets(2700, 180, 75)
    // 180*4 + 675 = 1395; remaining 1305 / 4 = 326.25 g carbs
    expect(Math.round(target.carbs)).toBe(326)
    expect(Math.abs(target.delta)).toBeLessThan(1)
  })

  it('scales a reference food to an arbitrary gram amount', () => {
    const m = nutritionForGrams({ perGrams: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6 }, 200)
    expect(m.calories).toBeCloseTo(330)
    expect(m.protein).toBeCloseTo(62)
  })

  it('sums macros across entries', () => {
    const total = sumMacros([
      { calories: 100, protein: 10, carbs: 5, fat: 2 },
      { calories: 50, protein: 5, carbs: 3, fat: 1 },
    ])
    expect(total).toEqual({ calories: 150, protein: 15, carbs: 8, fat: 3 })
  })

  it('computes a macro split that totals ~100%', () => {
    const split = macroSplit({ protein: 180, carbs: 326, fat: 75 })
    const total = split.protein + split.carbs + split.fat
    expect(total).toBeCloseTo(100, 1)
  })
})
