/**
 * FORGE domain model.
 *
 * All records are local-first (IndexedDB via Dexie). `userId` is optional and
 * only populated once cloud sync (Supabase) is enabled in a later phase.
 * `updatedAt` + `dirty` support conflict-safe synchronisation later on.
 */

export type ISODate = string // yyyy-mm-dd (local)
export type ISODateTime = string // full ISO timestamp

export type Units = 'metric' | 'imperial'
export type ThemePreference = 'dark' | 'light' | 'system'

export interface BaseRecord {
  id: string
  userId?: string | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
  /** true when the record has local changes not yet pushed to the cloud */
  dirty?: number
  deleted?: number
}

/* ------------------------------------------------------------------ */
/* Profile & preferences                                               */
/* ------------------------------------------------------------------ */

export interface Profile extends BaseRecord {
  name: string
  age: number | null
  heightCm: number | null
  sex: 'male' | 'female' | 'other' | 'unspecified'
  experience: 'beginner' | 'intermediate' | 'advanced'
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'high'
  trainingDaysPerWeek: number
  trainingTimeOfDay: 'morning' | 'afternoon' | 'evening'
  dietStyle: string
}

export interface UserPreferences extends BaseRecord {
  units: Units
  currency: string
  theme: ThemePreference
  reducedMotion: boolean
  weightUnit: 'kg' | 'lb'
  distanceUnit: 'km' | 'mi'
  aiEnabled: boolean
  localOnly: boolean
  /** ordered widget keys shown on Home */
  homeWidgets: string[]
  hiddenWidgets: string[]
  weekStartsOn: 0 | 1
  waterTargetMl: number
  stepTarget: number
  sleepTargetHours: number
}

export interface Goal extends BaseRecord {
  startWeightKg: number | null
  currentWeightKg: number | null
  goalWeightKg: number | null
  weeklyLossTargetKg: number
  calorieTarget: number
  proteinTarget: number
  carbTarget: number
  fatTarget: number
}

/* ------------------------------------------------------------------ */
/* Body metrics                                                        */
/* ------------------------------------------------------------------ */

export interface WeightEntry extends BaseRecord {
  date: ISODate
  time?: string
  weightKg: number
  /** true when measured fasted, post-void, before eating */
  standardized?: boolean
  waistCm?: number | null
  note?: string
}

export interface BodyMeasurement extends BaseRecord {
  date: ISODate
  waistCm?: number | null
  chestCm?: number | null
  armCm?: number | null
  thighCm?: number | null
  hipCm?: number | null
  neckCm?: number | null
  note?: string
}

export type PhotoView = 'front' | 'side' | 'back'

export interface ProgressPhoto extends BaseRecord {
  date: ISODate
  view: PhotoView
  weightKg?: number | null
  note?: string
  tags: string[]
  /** stored as Blob for local-only mode; a storage path when cloud is enabled */
  blob?: Blob
  storagePath?: string | null
  thumbBlob?: Blob
  width?: number
  height?: number
}

/* ------------------------------------------------------------------ */
/* Training                                                            */
/* ------------------------------------------------------------------ */

export type MuscleGroup =
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'fullbody'

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'ez-bar'
  | 'other'

export interface Exercise extends BaseRecord {
  name: string
  aliases: string[]
  muscle: MuscleGroup
  secondaryMuscles: MuscleGroup[]
  equipment: Equipment
  instructions: string
  /** true for user-created exercises */
  custom?: boolean
  videoUrl?: string | null
  isCompound?: boolean
}

export interface WorkoutTemplateExercise {
  exerciseId: string
  name: string
  sets: number
  repsLow: number
  repsHigh: number
  restSeconds: number
  note?: string
  optional?: boolean
  /** main lift tracked for PR / percentage progression */
  mainLift?: 'squat' | 'bench' | 'deadlift' | null
  percentOfTrainingMax?: number | null
}

export interface WorkoutTemplate extends BaseRecord {
  name: string
  weekday: number // 0 = Sunday ... 6 = Saturday
  isRestDay?: boolean
  description?: string
  exercises: WorkoutTemplateExercise[]
  active: number
}

export interface WorkoutSet {
  id: string
  setNumber: number
  targetReps?: number
  weightKg: number | null
  reps: number | null
  rpe?: number | null
  rir?: number | null
  completed: boolean
  isWarmup?: boolean
  note?: string
  completedAt?: ISODateTime | null
}

export interface WorkoutSessionExercise {
  id: string
  exerciseId: string
  name: string
  muscle: MuscleGroup
  targetSets: number
  repsLow: number
  repsHigh: number
  restSeconds: number
  mainLift?: 'squat' | 'bench' | 'deadlift' | null
  sets: WorkoutSet[]
  note?: string
  skipped?: boolean
}

export interface WorkoutSession extends BaseRecord {
  date: ISODate
  templateId?: string | null
  templateName: string
  startedAt: ISODateTime
  finishedAt?: ISODateTime | null
  durationSeconds?: number | null
  status: 'in_progress' | 'completed' | 'abandoned'
  exercises: WorkoutSessionExercise[]
  note?: string
  /** honestly track whether this came from the sample template */
  sample?: boolean
}

export type LiftKey = 'squat' | 'bench' | 'deadlift'

export interface PersonalRecord extends BaseRecord {
  lift: LiftKey | string
  exerciseId?: string | null
  type: '1rm' | 'estimated_1rm' | 'best_set' | 'volume'
  weightKg: number
  reps: number
  estimated1rm?: number | null
  date: ISODate
  bodyweightKg?: number | null
}

export interface TrainingMax extends BaseRecord {
  lift: LiftKey
  oneRmKg: number | null
  /** 1RM provenance */
  oneRmVerified: boolean
  trainingMaxKg: number | null
  updatedOn: ISODate
}

/* ------------------------------------------------------------------ */
/* Nutrition                                                           */
/* ------------------------------------------------------------------ */

export interface Food extends BaseRecord {
  name: string
  aliases: string[]
  category: string
  /** nutrition per `perGrams` reference amount */
  perGrams: number
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  state: 'raw' | 'cooked' | 'as_sold'
  commonPortions: { label: string; grams: number }[]
  source: string
  custom?: boolean
}

export interface RecipeIngredient {
  foodId: string
  grams: number
}

export interface Recipe extends BaseRecord {
  name: string
  servings: number
  ingredients: RecipeIngredient[]
  /** cooked yield in grams, when known */
  yieldGrams?: number | null
  note?: string
  // computed per-serving nutrition is derived, never stored twice
}

export interface MealEntry extends BaseRecord {
  date: ISODate
  meal: MealCategory
  /** either a food portion or a recipe portion */
  kind: 'food' | 'recipe' | 'quick'
  foodId?: string | null
  recipeId?: string | null
  /** grams for foods, servings for recipes */
  grams?: number | null
  servings?: number | null
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  loggedAt: ISODateTime
}

export type MealCategory =
  | 'breakfast'
  | 'morning_snack'
  | 'lunch'
  | 'pre_workout'
  | 'post_workout'
  | 'dinner'
  | 'evening_snack'

export interface NutritionTargetDay extends BaseRecord {
  date: ISODate
  calories: number
  protein: number
  carbs: number
  fat: number
}

/* ------------------------------------------------------------------ */
/* Recovery & habits                                                   */
/* ------------------------------------------------------------------ */

export interface WaterEntry extends BaseRecord {
  date: ISODate
  ml: number
  loggedAt: ISODateTime
}

export interface RecoveryEntry extends BaseRecord {
  date: ISODate
  sleepHours?: number | null
  steps?: number | null
  restingHr?: number | null
  energy?: number | null // 1-5
  soreness?: number | null // 1-5
  stress?: number | null // 1-5
  hunger?: number | null // 1-5
  mood?: number | null // 1-5
  note?: string
}

export interface Habit extends BaseRecord {
  key: string
  label: string
  enabled: boolean
  targetPerWeek: number
}

/** A habit completed on a given day. Presence of a row means "done". */
export interface HabitLog extends BaseRecord {
  habitId: string
  date: ISODate
  note?: string
}

export interface Reminder extends BaseRecord {
  key: string
  label: string
  time: string // HH:mm
  enabled: boolean
  days: number[]
}

export interface WeeklyReport extends BaseRecord {
  weekStart: ISODate
  weekEnd: ISODate
  startAvgWeightKg: number | null
  endAvgWeightKg: number | null
  changeKg: number | null
  avgCalories: number | null
  avgProtein: number | null
  sessionsCompleted: number
  sessionsPlanned: number
  prs: string[]
  adherenceScore: number | null
  focus: string
  calorieSuggestion: number | null
  suggestionReason?: string
  aiSummary?: string | null
}

export interface AiUsageLog extends BaseRecord {
  date: ISODate
  feature: string
  model: string
  inputTokens?: number
  outputTokens?: number
  ok: boolean
  errorMessage?: string
}
