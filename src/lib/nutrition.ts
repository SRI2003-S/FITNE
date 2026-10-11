/**
 * Pure nutrition maths. No React, no DB — fully unit testable.
 *
 * A calorie is defined from macros using the Atwater factors:
 *   protein 4 kcal/g, carbohydrate 4 kcal/g, fat 9 kcal/g.
 * The default FORGE targets (180 P / 326 C / 75 F) resolve to ~2,699 kcal,
 * which is kept mathematically consistent with the 2,700 kcal goal.
 */

export interface Macros {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export const KCAL_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
} as const

export function macroCalories(m: Pick<Macros, 'protein' | 'carbs' | 'fat'>): number {
  return m.protein * KCAL_PER_GRAM.protein + m.carbs * KCAL_PER_GRAM.carbs + m.fat * KCAL_PER_GRAM.fat
}

export const EMPTY_MACROS: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 }

export interface ReferenceFood {
  /** nutrition values describe this many grams of the food */
  perGrams: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

/** Scale a food's reference nutrition to an arbitrary gram amount. */
export function nutritionForGrams(food: ReferenceFood, grams: number): Macros {
  const factor = food.perGrams > 0 ? grams / food.perGrams : 0
  return {
    calories: food.calories * factor,
    protein: food.protein * factor,
    carbs: food.carbs * factor,
    fat: food.fat * factor,
  }
}

export function sumMacros(items: Macros[]): Macros {
  return items.reduce<Macros>(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein: acc.protein + (m.protein || 0),
      carbs: acc.carbs + (m.carbs || 0),
      fat: acc.fat + (m.fat || 0),
    }),
    { ...EMPTY_MACROS },
  )
}

export function remainingMacros(target: Macros, consumed: Macros): Macros {
  return {
    calories: target.calories - consumed.calories,
    protein: target.protein - consumed.protein,
    carbs: target.carbs - consumed.carbs,
    fat: target.fat - consumed.fat,
  }
}

export interface MacroSplit {
  protein: number
  carbs: number
  fat: number
}

/** Percentage of total calories contributed by each macro. */
export function macroSplit(m: Pick<Macros, 'protein' | 'carbs' | 'fat'>): MacroSplit {
  const total = macroCalories(m)
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 }
  return {
    protein: (m.protein * KCAL_PER_GRAM.protein * 100) / total,
    carbs: (m.carbs * KCAL_PER_GRAM.carbs * 100) / total,
    fat: (m.fat * KCAL_PER_GRAM.fat * 100) / total,
  }
}

/**
 * Reconcile a macro target set so that macros sum to the calorie target.
 * Keeps protein/fat fixed (they are the priority when cutting) and adjusts
 * carbohydrate to absorb the difference. Returns a transparent breakdown.
 */
export function reconcileTargets(
  calories: number,
  protein: number,
  fat: number,
): { calories: number; protein: number; carbs: number; fat: number; delta: number } {
  const fixed = macroCalories({ protein, carbs: 0, fat })
  const carbCalories = Math.max(0, calories - fixed)
  const carbs = carbCalories / KCAL_PER_GRAM.carbs
  const achieved = macroCalories({ protein, carbs, fat })
  return { calories, protein, carbs, fat, delta: achieved - calories }
}

/** Protein target heuristic used only as a *suggestion*, not a prescription. */
export function suggestedProtein(weightKg: number, goal: 'cut' | 'maintain' | 'gain'): number {
  const factor = goal === 'cut' ? 2.0 : goal === 'gain' ? 1.8 : 1.6
  return Math.round(weightKg * factor)
}
