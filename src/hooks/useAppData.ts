import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { todayKey, weekdayOf } from '@/lib/date'

export function useProfile() {
  return useLiveQuery(() => db.profile.get('profile'), [])
}

export function usePreferences() {
  return useLiveQuery(() => db.preferences.get('preferences'), [])
}

export function useGoal() {
  return useLiveQuery(() => db.goals.get('goal'), [])
}

export function useWeights() {
  return useLiveQuery(() => db.weightEntries.orderBy('date').toArray(), [])
}

export function useWeightForDate(date: string) {
  return useLiveQuery(() => db.weightEntries.where('date').equals(date).first(), [date])
}

export function useMeals(date: string) {
  return useLiveQuery(() => db.mealEntries.where('date').equals(date).toArray(), [date])
}

export function useWater(date: string) {
  return useLiveQuery(() => db.waterEntries.where('date').equals(date).toArray(), [date])
}

export function useRecovery(date: string) {
  return useLiveQuery(() => db.recoveryEntries.where('date').equals(date).first(), [date])
}

export function useFoods() {
  return useLiveQuery(() => db.foods.toArray(), [])
}

export function useRecipes() {
  return useLiveQuery(() => db.recipes.toArray(), [])
}

export function useExercises() {
  return useLiveQuery(() => db.exercises.toArray(), [])
}

export function useTemplates() {
  return useLiveQuery(() => db.workoutTemplates.orderBy('weekday').toArray(), [])
}

export function useTemplateForDate(date: string) {
  const weekday = weekdayOf(date)
  return useLiveQuery(() => db.workoutTemplates.where('weekday').equals(weekday).first(), [weekday])
}

export function useSessions(limit = 100) {
  return useLiveQuery(
    () => db.workoutSessions.orderBy('date').reverse().limit(limit).toArray(),
    [limit],
  )
}

export function useInProgressSession() {
  return useLiveQuery(
    () => db.workoutSessions.where('status').equals('in_progress').first(),
    [],
  )
}

export function useSessionForDate(date: string) {
  return useLiveQuery(
    () =>
      db.workoutSessions
        .where('date')
        .equals(date)
        .filter((s) => s.status === 'completed')
        .first(),
    [date],
  )
}

export function useTrainingMaxes() {
  return useLiveQuery(() => db.trainingMaxes.toArray(), [])
}

export function usePersonalRecords() {
  return useLiveQuery(() => db.personalRecords.toArray(), [])
}

export function usePhotos(limit = 200) {
  return useLiveQuery(
    () => db.progressPhotos.orderBy('date').reverse().limit(limit).toArray(),
    [limit],
  )
}

export function useMeasurements() {
  return useLiveQuery(() => db.bodyMeasurements.orderBy('date').toArray(), [])
}

export function useHabits() {
  return useLiveQuery(() => db.habits.toArray(), [])
}

export function useHabitLogs(date: string) {
  return useLiveQuery(() => db.habitLogs.where('date').equals(date).toArray(), [date])
}

export function useAllHabitLogs() {
  return useLiveQuery(() => db.habitLogs.toArray(), [])
}

export function useReminders() {
  return useLiveQuery(() => db.reminders.toArray(), [])
}

export function useWeeklyReports() {
  return useLiveQuery(() => db.weeklyReports.orderBy('weekStart').reverse().toArray(), [])
}

export function useCustomFoods() {
  return useLiveQuery(() => db.foods.filter((f) => f.custom === true).toArray(), [])
}

export function useTargetDays() {
  return useLiveQuery(() => db.nutritionTargetDays.toArray(), [])
}

/** Convenience: everything the Home dashboard needs in one live query. */
export function useTodayBundle(date = todayKey()) {
  return useLiveQuery(async () => {
    const [meals, water, weight, recovery, session] = await Promise.all([
      db.mealEntries.where('date').equals(date).toArray(),
      db.waterEntries.where('date').equals(date).toArray(),
      db.weightEntries.where('date').equals(date).first(),
      db.recoveryEntries.where('date').equals(date).first(),
      db.workoutSessions
        .where('date')
        .equals(date)
        .filter((s) => s.status === 'completed')
        .first(),
    ])
    return { meals, water, weight, recovery, session }
  }, [date])
}
