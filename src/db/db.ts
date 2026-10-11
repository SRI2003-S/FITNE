import Dexie, { type EntityTable } from 'dexie'
import type {
  AiUsageLog,
  BodyMeasurement,
  Exercise,
  Food,
  Goal,
  Habit,
  HabitLog,
  MealEntry,
  NutritionTargetDay,
  PersonalRecord,
  Profile,
  ProgressPhoto,
  Recipe,
  RecoveryEntry,
  Reminder,
  TrainingMax,
  UserPreferences,
  WaterEntry,
  WeeklyReport,
  WeightEntry,
  WorkoutSession,
  WorkoutTemplate,
} from '@/types'

/**
 * FORGE local-first database (IndexedDB via Dexie).
 *
 * The schema is normalised and mirrors the future Supabase tables so that a
 * sync layer can be added later without reshaping local data. `dirty` indexes
 * support pushing only changed records.
 */
export class ForgeDatabase extends Dexie {
  profile!: EntityTable<Profile, 'id'>
  preferences!: EntityTable<UserPreferences, 'id'>
  goals!: EntityTable<Goal, 'id'>
  weightEntries!: EntityTable<WeightEntry, 'id'>
  bodyMeasurements!: EntityTable<BodyMeasurement, 'id'>
  progressPhotos!: EntityTable<ProgressPhoto, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  workoutTemplates!: EntityTable<WorkoutTemplate, 'id'>
  workoutSessions!: EntityTable<WorkoutSession, 'id'>
  personalRecords!: EntityTable<PersonalRecord, 'id'>
  trainingMaxes!: EntityTable<TrainingMax, 'id'>
  foods!: EntityTable<Food, 'id'>
  recipes!: EntityTable<Recipe, 'id'>
  mealEntries!: EntityTable<MealEntry, 'id'>
  nutritionTargetDays!: EntityTable<NutritionTargetDay, 'id'>
  waterEntries!: EntityTable<WaterEntry, 'id'>
  recoveryEntries!: EntityTable<RecoveryEntry, 'id'>
  habits!: EntityTable<Habit, 'id'>
  habitLogs!: EntityTable<HabitLog, 'id'>
  reminders!: EntityTable<Reminder, 'id'>
  weeklyReports!: EntityTable<WeeklyReport, 'id'>
  aiUsageLogs!: EntityTable<AiUsageLog, 'id'>
  meta!: EntityTable<{ key: string; value: unknown }, 'key'>

  constructor() {
    super('forge')

    this.version(1).stores({
      profile: 'id',
      preferences: 'id',
      goals: 'id, updatedAt',
      weightEntries: 'id, date, updatedAt, dirty',
      bodyMeasurements: 'id, date',
      progressPhotos: 'id, date, view',
      exercises: 'id, name, muscle, equipment, custom',
      workoutTemplates: 'id, weekday, active',
      workoutSessions: 'id, date, status, updatedAt, dirty',
      personalRecords: 'id, lift, date, exerciseId',
      trainingMaxes: 'id, lift',
      foods: 'id, name, category, custom, *aliases',
      recipes: 'id, name',
      mealEntries: 'id, date, meal, [date+meal]',
      nutritionTargetDays: 'id, date',
      waterEntries: 'id, date',
      recoveryEntries: 'id, date',
      habits: 'id, key',
      reminders: 'id, key',
      weeklyReports: 'id, weekStart',
      aiUsageLogs: 'id, date',
      meta: 'key',
    })

    this.version(2).stores({
      habitLogs: 'id, habitId, date, [habitId+date]',
    })
  }
}

export const db = new ForgeDatabase()

export const META_KEYS = {
  seeded: 'seeded.v1',
  onboardingComplete: 'onboarding.complete',
  schemaVersion: 'schema.version',
} as const
