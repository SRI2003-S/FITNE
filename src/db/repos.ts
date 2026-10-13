import { db } from './db'
import type {
  BodyMeasurement,
  Exercise,
  Food,
  Goal,
  MealCategory,
  MealEntry,
  NutritionTargetDay,
  PersonalRecord,
  Profile,
  ProgressPhoto,
  Recipe,
  RecoveryEntry,
  UserPreferences,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutTemplate,
  WorkoutSet,
} from '@/types'
import { nowISO, uid } from '@/lib/utils'
import { estimate1RM } from '@/lib/oneRm'
import { todayKey } from '@/lib/date'

function base() {
  const t = nowISO()
  return { createdAt: t, updatedAt: t, dirty: 1 as const }
}

/* ----------------------------- Profile etc. ----------------------------- */

export async function updateProfile(patch: Partial<Profile>) {
  const current = await db.profile.get('profile')
  if (!current) return
  await db.profile.put({ ...current, ...patch, updatedAt: nowISO(), dirty: 1 })
}

export async function updatePreferences(patch: Partial<UserPreferences>) {
  const current = await db.preferences.get('preferences')
  if (!current) return
  await db.preferences.put({ ...current, ...patch, updatedAt: nowISO(), dirty: 1 })
}

export async function updateGoal(patch: Partial<Goal>) {
  const current = await db.goals.get('goal')
  if (!current) return
  await db.goals.put({ ...current, ...patch, updatedAt: nowISO(), dirty: 1 })
}

/* ------------------------------- Weight -------------------------------- */

export async function saveWeightEntry(
  entry: { date: string; weightKg: number; standardized?: boolean; waistCm?: number | null; note?: string },
): Promise<string> {
  const existing = await db.weightEntries.where('date').equals(entry.date).first()
  if (existing) {
    await db.weightEntries.update(existing.id, { ...entry, updatedAt: nowISO(), dirty: 1 })
    return existing.id
  }
  const id = uid()
  await db.weightEntries.add({ id, ...entry, ...base() })
  return id
}

export async function deleteWeightEntry(id: string) {
  await db.weightEntries.delete(id)
}

export async function saveMeasurement(entry: Omit<BodyMeasurement, keyof ReturnType<typeof base> | 'id'>) {
  const existing = await db.bodyMeasurements.where('date').equals(entry.date).first()
  if (existing) {
    await db.bodyMeasurements.update(existing.id, { ...entry, updatedAt: nowISO() })
    return existing.id
  }
  const id = uid()
  await db.bodyMeasurements.add({ id, ...entry, ...base() })
  return id
}

/* ------------------------------ Nutrition ------------------------------ */

export async function addMealEntry(entry: Omit<MealEntry, keyof ReturnType<typeof base>>) {
  await db.mealEntries.add({ ...entry, ...base() })
}

export async function updateMealEntry(id: string, patch: Partial<MealEntry>) {
  await db.mealEntries.update(id, { ...patch, updatedAt: nowISO(), dirty: 1 })
}

export async function deleteMealEntry(id: string) {
  await db.mealEntries.delete(id)
}

export async function copyMealsFromDate(fromDate: string, toDate: string, meal?: MealCategory) {
  const source = await db.mealEntries.where('date').equals(fromDate).toArray()
  const filtered = meal ? source.filter((m) => m.meal === meal) : source
  if (!filtered.length) return 0
  const t = nowISO()
  await db.mealEntries.bulkAdd(
    filtered.map((m) => ({
      ...m,
      id: uid(),
      date: toDate,
      loggedAt: t,
      createdAt: t,
      updatedAt: t,
      dirty: 1 as const,
    })),
  )
  return filtered.length
}

export async function clearMealsForDate(date: string, meal?: MealCategory) {
  const rows = await db.mealEntries.where('date').equals(date).toArray()
  const ids = (meal ? rows.filter((r) => r.meal === meal) : rows).map((r) => r.id)
  await db.mealEntries.bulkDelete(ids)
}

export async function addWater(date: string, ml: number) {
  await db.waterEntries.add({ id: uid(), date, ml, loggedAt: nowISO(), ...base() })
}

export async function setWater(date: string, ml: number) {
  const rows = await db.waterEntries.where('date').equals(date).toArray()
  const total = rows.reduce((a, r) => a + r.ml, 0)
  const diff = ml - total
  if (diff !== 0) await addWater(date, diff)
}

export async function deleteWaterEntry(id: string) {
  await db.waterEntries.delete(id)
}

export async function upsertRecovery(date: string, patch: Partial<RecoveryEntry>) {
  const existing = await db.recoveryEntries.where('date').equals(date).first()
  if (existing) {
    await db.recoveryEntries.update(existing.id, { ...patch, updatedAt: nowISO() })
  } else {
    await db.recoveryEntries.add({ id: uid(), date, ...patch, ...base() })
  }
}

/* ------------------------------- Training ------------------------------ */

export function buildSessionFromTemplate(template: WorkoutTemplate, date = todayKey()): WorkoutSession {
  const exercises: WorkoutSessionExercise[] = template.exercises.map((te) => ({
    id: uid(),
    exerciseId: te.exerciseId,
    name: te.name,
    muscle: 'fullbody',
    targetSets: te.sets,
    repsLow: te.repsLow,
    repsHigh: te.repsHigh,
    restSeconds: te.restSeconds,
    mainLift: te.mainLift ?? null,
    note: te.note,
    sets: Array.from({ length: te.sets }, (_, i) => ({
      id: uid(),
      setNumber: i + 1,
      targetReps: te.repsHigh,
      weightKg: null,
      reps: null,
      completed: false,
    })),
  }))
  return {
    id: uid(),
    date,
    templateId: template.id,
    templateName: template.name,
    startedAt: nowISO(),
    status: 'in_progress',
    exercises,
    ...base(),
  }
}

export async function saveSession(session: WorkoutSession) {
  await db.workoutSessions.put({ ...session, updatedAt: nowISO(), dirty: 1 })
}

export async function finishSession(session: WorkoutSession, note?: string) {
  const finishedAt = nowISO()
  const durationSeconds = Math.round(
    (new Date(finishedAt).getTime() - new Date(session.startedAt).getTime()) / 1000,
  )
  await db.workoutSessions.put({
    ...session,
    status: 'completed',
    finishedAt,
    durationSeconds,
    note: note ?? session.note,
    updatedAt: finishedAt,
    dirty: 1,
  })
  await refreshPersonalRecords(session)
}

export async function discardSession(id: string) {
  await db.workoutSessions.update(id, { status: 'abandoned', updatedAt: nowISO(), dirty: 1 })
}

export async function getInProgressSession(): Promise<WorkoutSession | undefined> {
  return db.workoutSessions.where('status').equals('in_progress').first()
}

/** Recompute PRs for the main lifts touched by a completed session. */
export async function refreshPersonalRecords(session: WorkoutSession) {
  const t = nowISO()
  for (const ex of session.exercises) {
    if (!ex.mainLift) continue

    const completedSets: WorkoutSet[] = ex.sets.filter((s) => s.completed && s.weightKg && s.reps)
    if (!completedSets.length) continue

    const best1rm = completedSets.reduce(
      (best, s) => Math.max(best, estimate1RM(s.weightKg as number, s.reps as number)),
      0,
    )
    const bestSet = completedSets.reduce((best, s) => {
      const score = (s.weightKg as number) * (s.reps as number)
      return score > best.score ? { score, s } : best
    }, { score: 0, s: completedSets[0] }).s

    const key = `pr-${ex.mainLift}`
    const existing = await db.personalRecords.get(key)
    const prevEstimated = existing?.estimated1rm ?? 0

    if (best1rm > prevEstimated) {
      await db.personalRecords.put({
        id: key,
        lift: ex.mainLift,
        type: 'estimated_1rm',
        weightKg: bestSet.weightKg as number,
        reps: bestSet.reps as number,
        estimated1rm: best1rm,
        date: session.date,
        bodyweightKg: null,
        createdAt: existing?.createdAt ?? t,
        updatedAt: t,
      })
    }
  }
}

/* -------------------------- Foods / recipes ---------------------------- */

export async function addCustomFood(food: Omit<Food, keyof ReturnType<typeof base> | 'id' | 'custom'>) {
  const id = uid()
  await db.foods.add({ id, ...food, custom: true, ...base() })
  return id
}

export async function saveRecipe(recipe: Omit<Recipe, keyof ReturnType<typeof base> | 'id'>) {
  const id = uid()
  await db.recipes.add({ id, ...recipe, ...base() })
  return id
}

/* ------------------------------- Photos -------------------------------- */

export async function addProgressPhoto(
  photo: Omit<ProgressPhoto, keyof ReturnType<typeof base> | 'id'>,
) {
  const id = uid()
  await db.progressPhotos.add({ id, ...photo, ...base() })
  return id
}

export async function deleteProgressPhoto(id: string) {
  await db.progressPhotos.delete(id)
}

/* --------------------------- Custom exercise --------------------------- */

export async function addCustomExercise(
  exercise: Omit<Exercise, keyof ReturnType<typeof base> | 'id' | 'custom'>,
) {
  const id = uid()
  await db.exercises.add({ id, ...exercise, custom: true, ...base() })
  return id
}

/* --------------------------- Targets per day --------------------------- */

export async function setTargetForDay(target: NutritionTargetDay) {
  const existing = await db.nutritionTargetDays.where('date').equals(target.date).first()
  if (existing) {
    await db.nutritionTargetDays.update(existing.id, { ...target, updatedAt: nowISO() })
  } else {
    await db.nutritionTargetDays.add({ ...target, ...base() })
  }
}

/* ------------------------------- Habits -------------------------------- */

/** Toggle a habit for a day. Returns the resulting completion state. */
export async function toggleHabit(habitId: string, date: string): Promise<boolean> {
  const existing = await db.habitLogs.where('[habitId+date]').equals([habitId, date]).first()
  if (existing) {
    await db.habitLogs.delete(existing.id)
    return false
  }
  await db.habitLogs.add({ id: uid(), habitId, date, ...base() })
  return true
}

export async function getHabitLogsForDate(date: string) {
  return db.habitLogs.where('date').equals(date).toArray()
}

/* ------------------------- Records & PR helpers ------------------------ */

export async function listPersonalRecords(): Promise<PersonalRecord[]> {
  return db.personalRecords.toArray()
}

export async function logLift(entry: {
  lift: string
  exerciseId?: string | null
  weightKg: number
  reps: number
  date: string
  bodyweightKg?: number | null
}): Promise<string> {
  const id = `manual-${uid()}`
  await db.personalRecords.add({
    id,
    lift: entry.lift,
    exerciseId: entry.exerciseId ?? null,
    type: 'best_set',
    weightKg: entry.weightKg,
    reps: entry.reps,
    estimated1rm: null,
    date: entry.date,
    bodyweightKg: entry.bodyweightKg ?? null,
    ...base(),
  })
  return id
}

/* ------------------------------- Backup -------------------------------- */

export async function resetAllData() {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
}
