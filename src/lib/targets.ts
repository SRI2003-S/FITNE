export function recommendedTargets(input: {
  age: number
  heightCm: number
  weightKg: number
  goalWeightKg: number
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'high'
}) {
  const { age, heightCm, weightKg, goalWeightKg } = input
  // Mifflin-St Jeor (male-leaning default; close enough for a starter target)
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  const factors = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 } as const
  const tdee = bmr * (factors[input.activityLevel ?? 'moderate'])
  const weeksToGoal = Math.max(4, Math.abs(weightKg - goalWeightKg) / 0.5)
  const dailyDeficit = weightKg > goalWeightKg ? 500 : weightKg < goalWeightKg ? -250 : 0
  const calories = Math.round(tdee + (weightKg > goalWeightKg ? -dailyDeficit : weightKg < goalWeightKg ? 250 : 0))
  const protein = Math.round(weightKg * 2.0)
  const fat = Math.round(weightKg * 0.9)
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4))
  const waterMl = Math.round(weightKg * 35)
  return { calories, protein, fat, carbs, waterMl, weeksToGoal: Math.round(weeksToGoal) }
}
