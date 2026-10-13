import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Camera, Lightbulb, Ruler, TrendingUp } from 'lucide-react'
import { PageHeader, SectionHeader } from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Segmented } from '@/components/ui/Switch'
import { Badge } from '@/components/ui/Badge'
import { StatTile } from '@/components/common/StatTile'
import { EmptyState } from '@/components/common/EmptyState'
import { db } from '@/db/db'
import { useGoal, useWeights } from '@/hooks/useAppData'
import { updateGoal, logLift } from '@/db/repos'
import { movingAverage, summarizeWeight, weeklyAverages } from '@/lib/weight'
import { suggestCalorieAdjustment } from '@/lib/adaptive'
import { estimate1RM } from '@/lib/oneRm'
import { addDays, formatDate, todayKey } from '@/lib/date'
import { formatSigned, formatWeight } from '@/lib/format'
import { toast } from '@/store/ui'
import { WeightDialog } from '@/features/weight/WeightDialog'
import type { LiftKey } from '@/types'
import { round } from '@/lib/utils'

type Tab = 'weight' | 'training' | 'nutrition' | 'recovery'
type Range = '7' | '30' | '90' | 'all'

const RANGE_DAYS: Record<Exclude<Range, 'all'>, number> = { '7': 7, '30': 30, '90': 90 }

export function ProgressScreen() {
  const [tab, setTab] = useState<Tab>('weight')
  const [range, setRange] = useState<Range>('30')
  const [weightOpen, setWeightOpen] = useState(false)

  const today = todayKey()
  const units = 'metric'
  const weights = useWeights()
  const goal = useGoal()

  const points = useMemo(() => {
    const all = (weights ?? []).map((w) => ({ date: w.date, weightKg: w.weightKg })).sort((a, b) => (a.date < b.date ? -1 : 1))
    if (range === 'all') return all
    const from = addDays(today, -RANGE_DAYS[range] + 1)
    return all.filter((p) => p.date >= from)
  }, [weights, range, today])

  const chartData = useMemo(() => {
    const ma = movingAverage(points, 7)
    const maMap = new Map(ma.map((m) => [m.date, m.weightKg]))
    return points.map((p) => ({
      date: p.date,
      label: formatDate(p.date, { day: 'numeric', month: 'short' }),
      weight: p.weightKg,
      avg: maMap.get(p.date) ?? null,
    }))
  }, [points])

  const summary = useMemo(() => summarizeWeight(points, today), [points, today])
  const weeklies = useMemo(() => weeklyAverages(points, 1), [points])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Progress"
        subtitle="Trends from your real data — never motivational guesses"
        actions={
          <Link
            to="/progress/photos"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-xs font-semibold text-foreground hover:bg-surface-3"
          >
            <Camera className="h-3.5 w-3.5" /> Photos
          </Link>
        }
      />

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'weight', label: 'Weight' },
          { value: 'training', label: 'Training' },
          { value: 'nutrition', label: 'Nutrition' },
          { value: 'recovery', label: 'Recovery' },
        ]}
      />

      {tab !== 'recovery' && (
        <div className="flex justify-end">
          <Segmented<Range>
            value={range}
            onChange={setRange}
            options={[
              { value: '7', label: '7d' },
              { value: '30', label: '30d' },
              { value: '90', label: '90d' },
              { value: 'all', label: 'All' },
            ]}
          />
        </div>
      )}

      {tab === 'weight' && (
        <div className="space-y-4">
          <Card>
            <CardContent>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <TrendingUp className="h-4 w-4 text-primary" /> Weight trend
                </div>
                <Button size="sm" variant="secondary" onClick={() => setWeightOpen(true)}>
                  Log weight
                </Button>
              </div>

              {points.length < 2 ? (
                <EmptyState
                  icon={<TrendingUp className="h-6 w-6" />}
                  title="Not enough data yet"
                  description="Log morning weights on a few days and your trend line will appear here. One reading is a data point, not a trend."
                />
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} minTickGap={24} />
                      <YAxis
                        domain={['dataMin - 2', 'dataMax + 2']}
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        labelStyle={{ color: 'var(--muted-foreground)' }}
                      />
                      {goal?.goalWeightKg != null && (
                        <ReferenceLine
                          y={goal.goalWeightKg}
                          stroke="var(--success)"
                          strokeDasharray="4 4"
                          label={{ value: 'Goal', fontSize: 10, fill: 'var(--success)', position: 'insideTopRight' }}
                        />
                      )}
                      <Line type="monotone" dataKey="weight" name="Weight" stroke="var(--primary)" strokeWidth={2} dot={points.length < 40} />
                      <Line
                        type="monotone"
                        dataKey="avg"
                        name="7-day avg"
                        stroke="var(--chart-2)"
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="5 3"
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Latest" value={summary.latest ? formatWeight(summary.latest.weightKg, units, 1) : '—'} tone="primary" />
            <StatTile label="7-day avg" value={summary.sevenDayAvg != null ? formatWeight(summary.sevenDayAvg, units, 1) : '—'} />
            <StatTile
              label="Weekly change"
              value={summary.weeklyChangeKg != null ? formatSigned(summary.weeklyChangeKg, 2, 'kg') : '—'}
              tone={summary.weeklyChangeKg != null && summary.weeklyChangeKg < 0 ? 'success' : 'default'}
            />
            <StatTile
              label="Trend / wk"
              value={summary.trendKgPerWeek != null ? formatSigned(summary.trendKgPerWeek, 2, 'kg') : '—'}
            />
          </div>

          <AdaptiveCard weeklies={weeklies} goal={goal} />

          {weeklies.length > 0 && (
            <div>
              <SectionHeader title="Weekly averages" />
              <Card>
                <CardContent className="divide-y divide-border/60 p-0">
                  {[...weeklies].reverse().slice(0, 8).map((w) => (
                    <div key={w.weekStart} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="text-muted-foreground">Week of {formatDate(w.weekStart)}</span>
                      <span className="tnum font-semibold text-foreground">{formatWeight(w.averageKg, units, 2)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {tab === 'training' && <TrainingTab />}
      {tab === 'nutrition' && <NutritionTab range={range} />}
      {tab === 'recovery' && <RecoveryTab />}

      <WeightDialog open={weightOpen} onClose={() => setWeightOpen(false)} defaultDate={today} />
    </div>
  )
}

function AdaptiveCard({
  weeklies,
  goal,
}: {
  weeklies: ReturnType<typeof weeklyAverages>
  goal: ReturnType<typeof useGoal>
}) {
  const suggestion = useMemo(
    () =>
      suggestCalorieAdjustment({
        weeklyAverages: weeklies,
        targetLossPerWeek: goal?.weeklyLossTargetKg ?? 0.5,
        currentCalories: goal?.calorieTarget ?? 2700,
      }),
    [weeklies, goal],
  )

  const tone =
    suggestion.action === 'reduce' ? 'warning' : suggestion.action === 'increase' ? 'primary' : 'neutral'

  return (
    <Card className="border-primary/20">
      <CardContent>
        <div className="mb-2 flex items-center gap-2 text-sm font-bold">
          <Lightbulb className="h-4 w-4 text-primary" /> Adaptive calorie check
          <Badge tone={tone as 'warning' | 'primary' | 'neutral'}>{suggestion.action.replace('_', ' ')}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
        {suggestion.action === 'reduce' || suggestion.action === 'increase' ? (
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              onClick={async () => {
                await updateGoal({
                  calorieTarget: suggestion.proposedCalories,
                  carbTarget: 0,
                })
                // Rebalance carbs to keep macros consistent with calories.
                if (goal) {
                  const fixed = goal.proteinTarget * 4 + goal.fatTarget * 9
                  const carbs = Math.max(0, (suggestion.proposedCalories - fixed) / 4)
                  await updateGoal({ carbTarget: round(carbs, 0) })
                }
                toast.success(`Calorie target set to ${suggestion.proposedCalories} kcal`)
              }}
            >
              Apply {suggestion.proposedCalories} kcal
            </Button>
            <span className="text-xs text-muted-foreground">You can override any time in Settings.</span>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Confidence: {suggestion.confidence} · based on {suggestion.weeksOfData} consistent weeks.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function TrainingTab() {
  const [open, setOpen] = useState(false)
  const [lift, setLift] = useState('squat')
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [date, setDate] = useState(todayKey())
  const data = useLiveQuery(async () => {
    const sessions = await db.workoutSessions
      .where('status')
      .equals('completed')
      .reverse()
      .sortBy('date')
    const lifts: LiftKey[] = ['squat', 'bench', 'deadlift']
    const byLift: Record<string, { date: string; label: string; e1rm: number }[]> = { squat: [], bench: [], deadlift: [] }
    const volume: { label: string; volume: number; sets: number }[] = []

    for (const s of sessions) {
      const sets = s.exercises.reduce((a, e) => a + e.sets.filter((x) => x.completed).length, 0)
      const vol = s.exercises.reduce(
        (a, e) => a + e.sets.reduce((b, x) => b + (x.completed ? (x.weightKg ?? 0) * (x.reps ?? 0) : 0), 0),
        0,
      )
      volume.push({ label: formatDate(s.date, { day: 'numeric', month: 'short' }), volume: Math.round(vol), sets })
      for (const ex of s.exercises) {
        if (!ex.mainLift || !lifts.includes(ex.mainLift)) continue
        const best = ex.sets
          .filter((x) => x.completed && x.weightKg && x.reps)
          .reduce((m, x) => Math.max(m, estimate1RM(x.weightKg as number, x.reps as number)), 0)
        if (best > 0) byLift[ex.mainLift].push({ date: s.date, label: formatDate(s.date), e1rm: best })
      }
    }
    for (const k of lifts) byLift[k].sort((a, b) => (a.date < b.date ? -1 : 1))
    return { byLift, volume: volume.slice(0, 20).reverse() }
  }, [])

  if (!data) return null
  const hasLifts = Object.values(data.byLift).some((a) => a.length > 0)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>Log lift (weight x reps)</Button>
      </div>
      <Card>
        <CardContent>
          <div className="mb-3 text-sm font-bold">Estimated 1RM by session</div>
          {!hasLifts ? (
            <EmptyState
              icon={<TrendingUp className="h-6 w-6" />}
              title="No main-lift data yet"
              description="Log competition squat, bench or deadlift sets and your estimated 1RM trend builds automatically (Epley formula, labelled as an estimate)."
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} width={40} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                  />
                  <Line data={data.byLift.squat} dataKey="e1rm" name="Squat" stroke="var(--chart-1)" strokeWidth={2} dot={false} connectNulls />
                  <Line data={data.byLift.bench} dataKey="e1rm" name="Bench" stroke="var(--chart-2)" strokeWidth={2} dot={false} connectNulls />
                  <Line data={data.byLift.deadlift} dataKey="e1rm" name="Deadlift" stroke="var(--chart-3)" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {data.volume.length > 0 && (
        <Card>
          <CardContent>
            <div className="mb-3 text-sm font-bold">Session volume (kg)</div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.volume} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} width={44} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="volume" name="Volume" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Log a lift"
        description="Record weight lifted for reps to track your personal records."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                const w = Number(weight)
                const r = Number(reps)
                if (!lift.trim() || !w || !r) {
                  toast.error('Enter lift, weight and reps')
                  return
                }
                await logLift({ lift: lift.trim(), weightKg: w, reps: r, date })
                toast.success('Lift logged')
                setWeight('')
                setReps('')
                setOpen(false)
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Lift / exercise</label>
            <select
              value={lift}
              onChange={(e) => setLift(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-surface-2 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="squat">Squat</option>
              <option value="bench">Bench</option>
              <option value="deadlift">Deadlift</option>
              <option value="other">Other (free text below)</option>
            </select>
            {lift === 'other' && (
              <input
                value=""
                onChange={(e) => setLift(e.target.value || 'other')}
                placeholder="Exercise name"
                className="mt-2 h-11 w-full rounded-xl border border-input bg-surface-2 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Weight (kg)</label>
              <input
                type="number"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-surface-2 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Reps</label>
              <input
                type="number"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-surface-2 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-surface-2 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}

function NutritionTab({ range }: { range: Range }) {
  const data = useLiveQuery(async () => {
    const all = await db.mealEntries.toArray()
    const byDay = new Map<string, { cal: number; pro: number; carb: number; fat: number }>()
    for (const m of all) {
      const d = byDay.get(m.date) ?? { cal: 0, pro: 0, carb: 0, fat: 0 }
      d.cal += m.calories
      d.pro += m.protein
      d.carb += m.carbs
      d.fat += m.fat
      byDay.set(m.date, d)
    }
    return [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, v]) => ({
        date,
        label: formatDate(date, { day: 'numeric', month: 'short' }),
        calories: Math.round(v.cal),
        protein: Math.round(v.pro),
      }))
  }, [])

  const filtered = useMemo(() => {
    if (!data) return []
    if (range === 'all') return data
    const from = addDays(todayKey(), -RANGE_DAYS[range] + 1)
    return data.filter((d) => d.date >= from)
  }, [data, range])

  const avg = filtered.length
    ? {
        cal: Math.round(filtered.reduce((a, d) => a + d.calories, 0) / filtered.length),
        pro: Math.round(filtered.reduce((a, d) => a + d.protein, 0) / filtered.length),
      }
    : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Days logged" value={filtered.length} />
        <StatTile label="Avg calories" value={avg ? avg.cal : '—'} tone="primary" />
        <StatTile label="Avg protein" value={avg ? `${avg.pro}g` : '—'} tone="success" />
      </div>
      <Card>
        <CardContent>
          <div className="mb-3 text-sm font-bold">Daily calories & protein</div>
          {filtered.length === 0 ? (
            <EmptyState title="No nutrition data in range" description="Log meals in the Nutrition tab to see intake trends." />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filtered} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} minTickGap={20} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} width={40} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="calories" name="Calories" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="protein" name="Protein (g)" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RecoveryTab() {
  const data = useLiveQuery(async () => {
    const rows = await db.recoveryEntries.orderBy('date').reverse().limit(60).toArray()
    return rows.reverse().map((r) => ({
      label: formatDate(r.date, { day: 'numeric', month: 'short' }),
      sleep: r.sleepHours ?? null,
      energy: r.energy ?? null,
      soreness: r.soreness ?? null,
      steps: r.steps ?? null,
    }))
  }, [])

  const measurements = useLiveQuery(() => db.bodyMeasurements.orderBy('date').reverse().limit(10).toArray(), [])

  const hasData = (data ?? []).some((d) => d.sleep != null || d.energy != null)

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <div className="mb-3 text-sm font-bold">Sleep, energy & soreness</div>
          {!hasData ? (
            <EmptyState
              icon={<Ruler className="h-6 w-6" />}
              title="No recovery data yet"
              description="Log sleep, steps, energy and soreness from the Home checklist area (or Settings) to spot under-recovery patterns."
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} minTickGap={20} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} width={40} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                  />
                  <Line dataKey="sleep" name="Sleep (h)" stroke="var(--chart-4)" strokeWidth={2} dot={false} connectNulls />
                  <Line dataKey="energy" name="Energy (1-5)" stroke="var(--chart-3)" strokeWidth={2} dot={false} connectNulls />
                  <Line dataKey="soreness" name="Soreness (1-5)" stroke="var(--chart-1)" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {(measurements?.length ?? 0) > 0 && (
        <Card>
          <CardContent>
            <div className="mb-3 text-sm font-bold">Body measurements</div>
            <div className="divide-y divide-border/60">
              {measurements!.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-muted-foreground">{formatDate(m.date)}</span>
                  <span className="tnum text-foreground">
                    {m.waistCm ? `Waist ${m.waistCm} cm` : ''}
                    {m.chestCm ? ` · Chest ${m.chestCm} cm` : ''}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
