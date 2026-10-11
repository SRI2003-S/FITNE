import { db, META_KEYS } from './db'
import { buildExerciseLibrary } from '@/data/exercises'
import { buildSplitTemplates } from '@/data/split'
import { buildFoodLibrary } from '@/data/foods'
import { nowISO, uid } from '@/lib/utils'
import type {
  Goal,
  Habit,
  Profile,
  Reminder,
  TrainingMax,
  UserPreferences,
} from '@/types'

export const DEFAULT_HOME_WIDGETS = [
  'greeting',
  'ring',
  'weight',
  'macros',
  'todayWorkout',
  'hydration',
  'habits',
  'streaks',
  'prs',
  'checklist',
  'quickAdd',
]

export function defaultProfile(): Profile {
  const now = nowISO()
  return {
    id: 'profile',
    name: '',
    age: 22,
    heightCm: 188,
    sex: 'male',
    experience: 'intermediate',
    activityLevel: 'moderate',
    trainingDaysPerWeek: 5,
    trainingTimeOfDay: 'evening',
    dietStyle: 'Indian non-vegetarian',
    createdAt: now,
    updatedAt: now,
  }
}

export function defaultPreferences(): UserPreferences {
  const now = nowISO()
  return {
    id: 'preferences',
    units: 'metric',
    currency: 'INR',
    theme: 'dark',
    reducedMotion: false,
    weightUnit: 'kg',
    distanceUnit: 'km',
    aiEnabled: false,
    localOnly: true,
    homeWidgets: [...DEFAULT_HOME_WIDGETS],
    hiddenWidgets: [],
    weekStartsOn: 1,
    waterTargetMl: 3000,
    stepTarget: 8000,
    sleepTargetHours: 8,
    createdAt: now,
    updatedAt: now,
  }
}

export function defaultGoal(): Goal {
  const now = nowISO()
  return {
    id: 'goal',
    startWeightKg: 111,
    currentWeightKg: 111,
    goalWeightKg: null,
    weeklyLossTargetKg: 0.5,
    calorieTarget: 2700,
    proteinTarget: 180,
    carbTarget: 326,
    fatTarget: 75,
    createdAt: now,
    updatedAt: now,
  }
}

function defaultTrainingMaxes(): TrainingMax[] {
  const now = nowISO()
  return (['squat', 'bench', 'deadlift'] as const).map((lift) => ({
    id: `tm-${lift}`,
    lift,
    oneRmKg: null,
    oneRmVerified: false,
    trainingMaxKg: null,
    updatedOn: now.slice(0, 10),
    createdAt: now,
    updatedAt: now,
  }))
}

function defaultHabits(): Habit[] {
  const now = nowISO()
  const defs: { key: string; label: string; targetPerWeek: number }[] = [
    { key: 'weigh_in', label: 'Morning weigh-in', targetPerWeek: 7 },
    { key: 'train', label: 'Training session', targetPerWeek: 5 },
    { key: 'log_meals', label: 'Log meals', targetPerWeek: 7 },
    { key: 'protein', label: 'Hit protein target', targetPerWeek: 6 },
    { key: 'water', label: 'Hit water target', targetPerWeek: 6 },
    { key: 'sleep', label: 'Sleep 7h+', targetPerWeek: 6 },
  ]
  return defs.map((d) => ({
    id: uid(),
    ...d,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  }))
}

function defaultReminders(): Reminder[] {
  const now = nowISO()
  const defs: { key: string; label: string; time: string; days: number[] }[] = [
    { key: 'weigh_in', label: 'Morning weigh-in', time: '07:00', days: [1, 2, 3, 4, 5, 6, 0] },
    { key: 'meals', label: 'Log meals', time: '13:00', days: [1, 2, 3, 4, 5, 6, 0] },
    { key: 'pre_workout', label: 'Pre-workout prep', time: '17:30', days: [1, 2, 4, 5, 6] },
    { key: 'workout', label: 'Workout time', time: '18:30', days: [1, 2, 4, 5, 6] },
    { key: 'water', label: 'Water check', time: '16:00', days: [1, 2, 3, 4, 5, 6, 0] },
    { key: 'evening', label: 'Evening check-in', time: '21:30', days: [1, 2, 3, 4, 5, 6, 0] },
    { key: 'weekly_review', label: 'Weekly review', time: '18:00', days: [0] },
  ]
  return defs.map((d) => ({
    id: uid(),
    ...d,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  }))
}

/** Populate reference + default data exactly once. Safe to call on every boot. */
export async function seedIfNeeded(): Promise<void> {
  const done = await db.meta.get(META_KEYS.seeded)
  if (done) return

  await db.transaction('rw', db.tables, async () => {
    if ((await db.profile.count()) === 0) await db.profile.put(defaultProfile())
    if ((await db.preferences.count()) === 0) await db.preferences.put(defaultPreferences())
    if ((await db.goals.count()) === 0) await db.goals.put(defaultGoal())
    if ((await db.exercises.count()) === 0) await db.exercises.bulkPut(buildExerciseLibrary())
    if ((await db.foods.count()) === 0) await db.foods.bulkPut(buildFoodLibrary())
    if ((await db.workoutTemplates.count()) === 0) await db.workoutTemplates.bulkPut(buildSplitTemplates())
    if ((await db.trainingMaxes.count()) === 0) await db.trainingMaxes.bulkPut(defaultTrainingMaxes())
    if ((await db.habits.count()) === 0) await db.habits.bulkPut(defaultHabits())
    if ((await db.reminders.count()) === 0) await db.reminders.bulkPut(defaultReminders())
    await db.meta.put({ key: META_KEYS.seeded, value: nowISO() })
  })
}
