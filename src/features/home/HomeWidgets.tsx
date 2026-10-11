import { Link } from 'react-router-dom'
import {
  Activity,
  Camera,
  CheckCircle2,
  Circle,
  Droplets,
  Dumbbell,
  Flame,
  Minus,
  Plus,
  Scale,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { AnimatedNumber } from '@/components/common/AnimatedNumber'
import { ProgressRing } from '@/components/common/ProgressRing'
import { StatTile } from '@/components/common/StatTile'
import { formatSigned, formatWeight } from '@/lib/format'
import { cn, pct } from '@/lib/utils'
import type { Macros } from '@/lib/nutrition'
import type { Habit, PersonalRecord, TrainingMax, Units, WorkoutTemplate } from '@/types'

/* ------------------------------- Greeting ------------------------------ */

export function Greeting({
  name,
  dateLabel,
  weekdayLabel,
  isTrainingDay,
}: {
  name: string
  dateLabel: string
  weekdayLabel: string
  isTrainingDay: boolean
}) {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return (
    <div className="mb-4">
      <p className="text-sm text-muted-foreground">{dateLabel}</p>
      <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
        {part}
        {name ? `, ${name}` : ''}
      </h1>
      <div className="mt-2">
        <Badge tone={isTrainingDay ? 'primary' : 'neutral'}>
          {isTrainingDay ? <Dumbbell className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
          {weekdayLabel}
          {isTrainingDay ? ' · training day' : ' · rest'}
        </Badge>
      </div>
    </div>
  )
}

/* ------------------------------ Daily ring ----------------------------- */

export function DailyRing({ consumed, target }: { consumed: Macros; target: Macros }) {
  const remaining = Math.max(0, target.calories - consumed.calories)
  const over = consumed.calories > target.calories
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col items-center gap-4 py-6 sm:flex-row sm:items-center sm:gap-6">
        <ProgressRing value={consumed.calories} max={target.calories} size={168} stroke={13}>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {over ? 'Over by' : 'Remaining'}
          </span>
          <AnimatedNumber
            value={over ? consumed.calories - target.calories : remaining}
            className={`tnum text-3xl font-black ${over ? 'text-danger' : 'text-foreground'}`}
          />
          <span className="text-xs text-muted-foreground">kcal</span>
        </ProgressRing>

        <div className="w-full flex-1">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-bold text-foreground">Today’s fuel</div>
            <Link to="/nutrition" className="text-xs font-semibold text-primary hover:underline">
              Log food
            </Link>
          </div>
          <div className="space-y-3">
            <MacroBar label="Protein" value={consumed.protein} target={target.protein} color="var(--color-chart-3)" />
            <MacroBar label="Carbs" value={consumed.carbs} target={target.carbs} color="var(--color-chart-2)" />
            <MacroBar label="Fat" value={consumed.fat} target={target.fat} color="var(--color-chart-5)" />
          </div>
          <div className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span>
              <span className="tnum font-semibold text-foreground">{Math.round(consumed.calories)}</span> / {target.calories} kcal
            </span>
            <span>
              <span className="tnum font-semibold text-foreground">{Math.round(consumed.protein)}</span> / {target.protein} g protein
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="tnum text-foreground">
          {Math.round(value)} / {Math.round(target)} g
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.min(100, pct(value, target))}%`, background: color }}
        />
      </div>
    </div>
  )
}

/* -------------------------------- Weight ------------------------------- */

export function WeightWidget({
  latestKg,
  sevenDayAvg,
  weeklyChangeKg,
  totalChangeKg,
  units,
  onLog,
}: {
  latestKg: number | null
  sevenDayAvg: number | null
  weeklyChangeKg: number | null
  totalChangeKg: number | null
  units: Units
  onLog: () => void
}) {
  const down = (weeklyChangeKg ?? 0) < 0
  return (
    <Card>
      <CardContent>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Scale className="h-4 w-4 text-primary" /> Weight
          </div>
          <Button size="sm" variant="secondary" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={onLog}>
            Log
          </Button>
        </div>
        {latestKg == null ? (
          <p className="text-sm text-muted-foreground">
            No weigh-in yet. Log your first morning weight to start the trend.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Latest" value={<AnimatedNumber value={units === 'imperial' ? latestKg * 2.2046 : latestKg} decimals={1} />} hint={units === 'imperial' ? 'lb' : 'kg'} tone="primary" />
            <StatTile label="7-day avg" value={sevenDayAvg == null ? '—' : <AnimatedNumber value={units === 'imperial' ? sevenDayAvg * 2.2046 : sevenDayAvg} decimals={1} />} hint={units === 'imperial' ? 'lb' : 'kg'} />
            <StatTile
              label="Weekly"
              value={weeklyChangeKg == null ? '—' : formatSigned(units === 'imperial' ? weeklyChangeKg * 2.2046 : weeklyChangeKg, 2, '')}
              hint={down ? 'trending down' : weeklyChangeKg == null ? 'need data' : 'trending up'}
              icon={weeklyChangeKg == null ? undefined : down ? <TrendingDown className="h-4 w-4 text-success" /> : <TrendingUp className="h-4 w-4 text-warning" />}
            />
          </div>
        )}
        {totalChangeKg != null && (
          <p className="mt-3 text-xs text-muted-foreground">
            Total since starting:{' '}
            <span className="font-semibold text-foreground">{formatSigned(totalChangeKg, 1, units === 'imperial' ? 'lb' : 'kg')}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/* -------------------------------- Workout ------------------------------ */

export function WorkoutWidget({
  template,
  completed,
  completedAt,
  onStart,
}: {
  template: WorkoutTemplate | undefined
  completed: boolean
  completedAt?: string | null
  onStart: () => void
}) {
  if (!template) return null
  const isRest = template.isRestDay
  return (
    <Card>
      <CardContent>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Dumbbell className="h-4 w-4 text-primary" /> Today’s session
          </div>
          {completed ? (
            <Badge tone="success">
              <CheckCircle2 className="h-3 w-3" /> Done
            </Badge>
          ) : (
            <Badge tone={isRest ? 'neutral' : 'primary'}>{isRest ? 'Rest day' : `${template.exercises.length} exercises`}</Badge>
          )}
        </div>
        <p className="text-base font-bold text-foreground">{template.name}</p>
        {template.description && <p className="mt-0.5 text-xs text-muted-foreground">{template.description}</p>}
        <div className="mt-3 flex gap-2">
          {!completed ? (
            <Button onClick={onStart} leftIcon={<Dumbbell className="h-4 w-4" />}>
              {isRest ? 'Log recovery' : 'Start workout'}
            </Button>
          ) : (
            <Button variant="secondary" onClick={onStart}>
              View / log again
            </Button>
          )}
          {completedAt && <span className="self-center text-xs text-muted-foreground">Completed today</span>}
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------- Hydration ----------------------------- */

export function HydrationWidget({
  ml,
  target,
  onAdd,
}: {
  ml: number
  target: number
  onAdd: (ml: number) => void
}) {
  return (
    <Card>
      <CardContent>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Droplets className="h-4 w-4 text-chart-2" /> Water
          </div>
          <span className="tnum text-xs text-muted-foreground">
            {(ml / 1000).toFixed(2)} / {(target / 1000).toFixed(1)} L
          </span>
        </div>
        <Progress value={ml} max={target} barClassName="bg-chart-2" />
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => onAdd(250)}>
            +250 ml
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onAdd(500)}>
            +500 ml
          </Button>
          <Button size="sm" variant="ghost" leftIcon={<Minus className="h-3.5 w-3.5" />} onClick={() => onAdd(-250)}>
            250
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------------- Streaks ------------------------------ */

export function StreaksWidget({
  streaks,
}: {
  streaks: { label: string; value: number; icon: React.ReactNode }[]
}) {
  return (
    <Card>
      <CardContent>
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Activity className="h-4 w-4 text-primary" /> Consistency
        </div>
        <div className="grid grid-cols-3 gap-3">
          {streaks.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-surface-2 p-3 text-center">
              <div className="mb-1 flex justify-center text-primary">{s.icon}</div>
              <div className="tnum text-xl font-black text-foreground">{s.value}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------- PRs / TMs ----------------------------- */

export function PRWidget({
  records,
  trainingMaxes,
  units,
}: {
  records: PersonalRecord[]
  trainingMaxes: TrainingMax[]
  units: Units
}) {
  const lifts = ['squat', 'bench', 'deadlift'] as const
  const rows = lifts.map((lift) => {
    const pr = records.find((r) => r.lift === lift)
    const tm = trainingMaxes.find((t) => t.lift === lift)
    const value = pr?.estimated1rm ?? tm?.oneRmKg ?? null
    return { lift, value, verified: tm?.oneRmVerified ?? false, tm: tm?.trainingMaxKg ?? null }
  })

  const hasAny = rows.some((r) => r.value != null)

  return (
    <Card>
      <CardContent>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Trophy className="h-4 w-4 text-primary" /> Powerlifting
          </div>
          <Link to="/progress" className="text-xs font-semibold text-primary hover:underline">
            Details
          </Link>
        </div>
        {!hasAny ? (
          <p className="text-sm text-muted-foreground">
            No lift records yet. Enter a true 1RM in Settings or log a heavy set and FORGE will estimate it.
          </p>
        ) : (
          <div className="space-y-1.5">
            {rows.map((r) => (
              <div key={r.lift} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
                <span className="text-sm font-semibold capitalize text-foreground">{r.lift}</span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="tnum font-bold text-foreground">
                    {r.value == null ? '—' : formatWeight(r.value, units, 0)}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {r.verified ? 'tested' : 'est. 1RM'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------- Checklist ----------------------------- */

export function ChecklistWidget({ items }: { items: { label: string; done: boolean; to?: string }[] }) {
  const doneCount = items.filter((i) => i.done).length
  return (
    <Card>
      <CardContent>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-bold">Daily checklist</div>
          <span className="tnum text-xs text-muted-foreground">
            {doneCount}/{items.length}
          </span>
        </div>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.label}>
              <Link to={item.to ?? '#'} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-surface-2">
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground/50" />
                )}
                <span className={item.done ? 'text-sm text-muted-foreground line-through' : 'text-sm text-foreground'}>
                  {item.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

/* ------------------------------ Quick add ------------------------------ */
export function QuickAddBar({
  onWeight,
  onMeal,
  onWorkout,
  onPhoto,
}: {
  onWeight: () => void
  onMeal: () => void
  onWorkout: () => void
  onPhoto: () => void
}) {
  const actions = [
    { label: 'Weight', icon: <Scale className="h-5 w-5" />, onClick: onWeight },
    { label: 'Meal', icon: <Plus className="h-5 w-5" />, onClick: onMeal },
    { label: 'Workout', icon: <Dumbbell className="h-5 w-5" />, onClick: onWorkout },
    { label: 'Photo', icon: <Camera className="h-5 w-5" />, onClick: onPhoto },
  ]
  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={a.onClick}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface py-3 text-primary transition-colors active:scale-[0.97] hover:bg-surface-2"
        >
          {a.icon}
          <span className="text-[11px] font-semibold text-foreground">{a.label}</span>
        </button>
      ))}
    </div>
  )
}

/* -------------------------------- Habits ------------------------------- */

export function HabitsWidget({
  habits,
  doneIds,
  streaks,
  onToggle,
}: {
  habits: Habit[]
  doneIds: Set<string>
  streaks: Record<string, number>
  onToggle: (habitId: string) => void
}) {
  if (habits.length === 0) return null
  const doneCount = habits.filter((h) => doneIds.has(h.id)).length
  return (
    <Card>
      <CardContent>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Flame className="h-4 w-4 text-primary" /> Daily habits
          </div>
          <span className="tnum text-xs text-muted-foreground">
            {doneCount}/{habits.length}
          </span>
        </div>
        <ul className="space-y-1">
          {habits.map((h) => {
            const done = doneIds.has(h.id)
            const streak = streaks[h.id] ?? 0
            return (
              <li key={h.id}>
                <button
                  onClick={() => onToggle(h.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2"
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-muted-foreground/50" />
                  )}
                  <span className={cn('flex-1 text-sm', done ? 'text-muted-foreground line-through' : 'text-foreground')}>
                    {h.label}
                  </span>
                  {streak > 0 && (
                    <span className="tnum flex items-center gap-0.5 text-xs font-semibold text-primary">
                      <Flame className="h-3 w-3" />
                      {streak}
                    </span>
                  )}
                  {h.targetPerWeek > 0 && h.targetPerWeek < 7 && !done && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {h.targetPerWeek}×/wk
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
