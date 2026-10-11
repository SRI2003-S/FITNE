import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Flame, Scale, Trophy, Utensils } from 'lucide-react'
import { db } from '@/db/db'
import {
  useGoal,
  useHabitLogs,
  useHabits,
  useAllHabitLogs,
  usePersonalRecords,
  usePreferences,
  useProfile,
  useTodayBundle,
  useTemplateForDate,
  useTrainingMaxes,
  useWeights,
} from '@/hooks/useAppData'
import { addWater, toggleHabit } from '@/db/repos'
import { buildSessionFromTemplate, getInProgressSession, saveSession } from '@/db/repos'
import { todayKey, formatDateLong, WEEKDAY_NAMES, weekdayOf } from '@/lib/date'
import { summarizeWeight } from '@/lib/weight'
import { currentStreak } from '@/lib/streaks'
import { mealsToMacros } from '@/features/nutrition/useNutrition'
import { WeightDialog } from '@/features/weight/WeightDialog'
import { toast } from '@/store/ui'
import { useWeeklyStats } from './useWeeklyStats'
import { WeeklyReportDialog } from './WeeklyReportDialog'
import {
  ChecklistWidget,
  DailyRing,
  Greeting,
  HabitsWidget,
  HydrationWidget,
  PRWidget,
  QuickAddBar,
  StreaksWidget,
  WeightWidget,
  WorkoutWidget,
} from './HomeWidgets'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'

export function HomeScreen() {
  const navigate = useNavigate()
  const today = todayKey()
  const [weightOpen, setWeightOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const profile = useProfile()
  const prefs = usePreferences()
  const goal = useGoal()
  const weights = useWeights()
  const todayBundle = useTodayBundle(today)
  const template = useTemplateForDate(today)
  const records = usePersonalRecords()
  const trainingMaxes = useTrainingMaxes()
  const weekly = useWeeklyStats(today, profile?.trainingDaysPerWeek ?? 5, prefs?.weekStartsOn ?? 1)

  const habits = useHabits()
  const habitLogsToday = useHabitLogs(today)
  const allHabitLogs = useAllHabitLogs()

  const consumed = useMemo(() => mealsToMacros(todayBundle?.meals ?? []), [todayBundle?.meals])
  const target = useMemo(
    () => ({
      calories: goal?.calorieTarget ?? 2700,
      protein: goal?.proteinTarget ?? 180,
      carbs: goal?.carbTarget ?? 326,
      fat: goal?.fatTarget ?? 75,
    }),
    [goal],
  )

  const weightSummary = useMemo(
    () => summarizeWeight((weights ?? []).map((w) => ({ date: w.date, weightKg: w.weightKg })), today),
    [weights, today],
  )

  const allSessions = useLiveQuery(() => db.workoutSessions.toArray(), [])
  const allMeals = useLiveQuery(() => db.mealEntries.toArray(), [])

  const trainingStreak = useMemo(
    () => currentStreak((allSessions ?? []).filter((s) => s.status === 'completed').map((s) => s.date), today),
    [allSessions, today],
  )
  const weighInStreak = useMemo(() => currentStreak((weights ?? []).map((w) => w.date), today), [weights, today])
  const mealStreak = useMemo(() => currentStreak((allMeals ?? []).map((m) => m.date), today), [allMeals, today])

  const waterMl = (todayBundle?.water ?? []).reduce((a, w) => a + w.ml, 0)
  const workoutDone = !!todayBundle?.session
  const weekday = weekdayOf(today)
  const isTrainingDay = !!template && !template.isRestDay
  const ready = profile && prefs && goal && todayBundle && weights

  async function handleStartWorkout() {
    const existing = await getInProgressSession()
    if (existing) {
      navigate(`/workout/${existing.id}`)
      return
    }
    if (!template) {
      toast.info('No template for today')
      return
    }
    const session = buildSessionFromTemplate(template, today)
    await saveSession(session)
    navigate(`/workout/${session.id}`)
  }

  async function handleWater(ml: number) {
    await addWater(today, ml)
    toast.success(ml > 0 ? `+${ml} ml logged` : `${Math.abs(ml)} ml removed`)
  }

  async function handleHabitToggle(habitId: string) {
    const nowDone = await toggleHabit(habitId, today)
    const habit = (habits ?? []).find((h) => h.id === habitId)
    if (nowDone) toast.success(`${habit?.label ?? 'Habit'} done`)
  }

  if (!ready) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    )
  }

  const hidden = new Set(prefs!.hiddenWidgets ?? [])
  const FALLBACK_ORDER = [
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
  const savedOrder = prefs!.homeWidgets?.length ? prefs!.homeWidgets : FALLBACK_ORDER
  const order = [...savedOrder, ...FALLBACK_ORDER.filter((k) => !savedOrder.includes(k))]

  const enabledHabits = (habits ?? []).filter((h) => h.enabled)
  const doneHabitIds = new Set((habitLogsToday ?? []).map((l) => l.habitId))
  const habitStreaks: Record<string, number> = {}
  for (const h of enabledHabits) {
    const dates = (allHabitLogs ?? []).filter((l) => l.habitId === h.id).map((l) => l.date)
    habitStreaks[h.id] = currentStreak(dates, today)
  }

  const checklist = [
    { label: 'Log morning weight', done: !!todayBundle!.weight, to: undefined },
    { label: isTrainingDay ? 'Complete today’s workout' : 'Log recovery / rest', done: workoutDone, to: '/train' },
    { label: 'Log meals', done: (todayBundle!.meals?.length ?? 0) > 0, to: '/nutrition' },
    { label: `Hit ${target.protein} g protein`, done: consumed.protein >= target.protein * 0.95, to: '/nutrition' },
    { label: 'Hit water target', done: waterMl >= (prefs!.waterTargetMl ?? 3000), to: undefined },
  ]

  const widgets: Record<string, React.ReactNode> = {
    greeting: (
      <Greeting
        key="greeting"
        name={profile!.name}
        dateLabel={formatDateLong(today)}
        weekdayLabel={WEEKDAY_NAMES[weekday]}
        isTrainingDay={isTrainingDay}
      />
    ),
    quickAdd: (
      <QuickAddBar
        key="quickAdd"
        onWeight={() => setWeightOpen(true)}
        onMeal={() => navigate('/nutrition')}
        onWorkout={handleStartWorkout}
        onPhoto={() => navigate('/progress/photos')}
      />
    ),
    ring: <DailyRing key="ring" consumed={consumed} target={target} />,
    weight: (
      <WeightWidget
        key="weight"
        latestKg={weightSummary.latest?.weightKg ?? null}
        sevenDayAvg={weightSummary.sevenDayAvg}
        weeklyChangeKg={weightSummary.weeklyChangeKg}
        totalChangeKg={weightSummary.totalChangeKg}
        units={prefs!.units}
        onLog={() => setWeightOpen(true)}
      />
    ),
    todayWorkout: (
      <WorkoutWidget
        key="todayWorkout"
        template={template}
        completed={workoutDone}
        completedAt={todayBundle!.session?.finishedAt ?? null}
        onStart={handleStartWorkout}
      />
    ),
    hydration: (
      <HydrationWidget key="hydration" ml={waterMl} target={prefs!.waterTargetMl ?? 3000} onAdd={handleWater} />
    ),
    habits: (
      <HabitsWidget
        key="habits"
        habits={enabledHabits}
        doneIds={doneHabitIds}
        streaks={habitStreaks}
        onToggle={handleHabitToggle}
      />
    ),
    streaks: (
      <StreaksWidget
        key="streaks"
        streaks={[
          { label: 'Training', value: trainingStreak, icon: <Flame className="h-4 w-4" /> },
          { label: 'Weigh-ins', value: weighInStreak, icon: <Scale className="h-4 w-4" /> },
          { label: 'Meals', value: mealStreak, icon: <Utensils className="h-4 w-4" /> },
        ]}
      />
    ),
    prs: <PRWidget key="prs" records={records ?? []} trainingMaxes={trainingMaxes ?? []} units={prefs!.units} />,
    checklist: <ChecklistWidget key="checklist" items={checklist} />,
  }

  return (
    <div className="space-y-4">
      {order.filter((k) => !hidden.has(k) && widgets[k]).map((k) => widgets[k])}

      {weekly && weekly.sessionsCompleted > 0 && (
        <WeeklySummary
          sessionsCompleted={weekly.sessionsCompleted}
          planned={profile!.trainingDaysPerWeek}
          avgCalories={weekly.avgCalories}
          avgProtein={weekly.avgProtein}
          weightChange={weekly.weightChangeKg}
          onOpen={() => setReportOpen(true)}
        />
      )}

      <WeightDialog open={weightOpen} onClose={() => setWeightOpen(false)} defaultDate={today} />
      <WeeklyReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        calorieTarget={target.calories}
        proteinTarget={target.protein}
        sessionsPlanned={profile!.trainingDaysPerWeek}
        targetLossPerWeek={goal?.weeklyLossTargetKg ?? 0.5}
        weekStartsOn={prefs!.weekStartsOn ?? 1}
      />
    </div>
  )
}

function WeeklySummary({
  sessionsCompleted,
  planned,
  avgCalories,
  avgProtein,
  weightChange,
  onOpen,
}: {
  sessionsCompleted: number
  planned: number
  avgCalories: number | null
  avgProtein: number | null
  weightChange: number | null
  onOpen: () => void
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Trophy className="h-4 w-4 text-primary" /> This week
        </div>
        <Button size="sm" variant="ghost" onClick={onOpen}>
          Summary
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <div className="tnum text-lg font-bold">
            {sessionsCompleted}/{planned}
          </div>
          <div className="text-xs text-muted-foreground">sessions</div>
        </div>
        <div>
          <div className="tnum text-lg font-bold">{avgCalories == null ? '—' : Math.round(avgCalories)}</div>
          <div className="text-xs text-muted-foreground">avg kcal</div>
        </div>
        <div>
          <div className="tnum text-lg font-bold">{avgProtein == null ? '—' : `${Math.round(avgProtein)}g`}</div>
          <div className="text-xs text-muted-foreground">avg protein</div>
        </div>
        <div>
          <div className="tnum text-lg font-bold">
            {weightChange == null ? '—' : `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(2)}`}
          </div>
          <div className="text-xs text-muted-foreground">kg trend</div>
        </div>
      </div>
    </div>
  )
}
