import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { db } from '@/db/db'
import { adherenceScore } from '@/lib/adaptive'
import { explainWeightChange, summarizeWeek } from '@/lib/insights'
import { addDays, startOfWeek, todayKey } from '@/lib/date'
import { round } from '@/lib/utils'
import { useWeeklyStats } from './useWeeklyStats'

export function WeeklyReportDialog({
  open,
  onClose,
  calorieTarget,
  proteinTarget,
  sessionsPlanned,
  targetLossPerWeek,
  weekStartsOn = 1,
}: {
  open: boolean
  onClose: () => void
  calorieTarget: number
  proteinTarget: number
  sessionsPlanned: number
  targetLossPerWeek: number
  weekStartsOn?: 0 | 1
}) {
  const today = todayKey()
  const weekStart = startOfWeek(today, weekStartsOn)
  const stats = useWeeklyStats(today, sessionsPlanned, weekStartsOn)

  const weighInDays = useLiveQuery(async () => {
    const rows = await db.weightEntries.where('date').between(weekStart, today, true, true).toArray()
    return new Set(rows.map((w) => w.date)).size
  }, [weekStart, today])

  const daysInWeek = Math.max(1, Math.round((Date.parse(today) - Date.parse(addDays(weekStart, -1))) / 86_400_000))

  const adherence = adherenceScore({
    sessionsCompleted: stats?.sessionsCompleted ?? 0,
    sessionsPlanned,
    daysWeighIn: weighInDays ?? 0,
    daysLoggedMeals: stats?.loggedDays ?? 0,
    daysInWeek,
  })

  const lines = summarizeWeek({
    avgCalories: stats?.avgCalories ?? null,
    avgProtein: stats?.avgProtein ?? null,
    sessionsCompleted: stats?.sessionsCompleted ?? 0,
    sessionsPlanned,
    weightChangeKg: stats?.weightChangeKg ?? null,
    calorieTarget,
    proteinTarget,
    daysLogged: stats?.loggedDays ?? 0,
  })

  const weightNote = explainWeightChange(stats?.weightChangeKg ?? null, targetLossPerWeek)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="This week in review"
      description={`Week of ${weekStart}`}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface-2 p-4">
          <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-4 border-primary/30">
            <span className="tnum text-2xl font-black text-foreground">{adherence}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">score</span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground">Adherence</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Weighted from training (45%), meal logging (35%) and weigh-ins (20%). It measures consistency, not
              results.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Sessions" value={`${stats?.sessionsCompleted ?? 0}/${sessionsPlanned}`} />
          <MiniStat label="Avg kcal" value={stats?.avgCalories == null ? '—' : `${Math.round(stats.avgCalories)}`} />
          <MiniStat label="Avg protein" value={stats?.avgProtein == null ? '—' : `${Math.round(stats.avgProtein)} g`} />
          <MiniStat
            label="Weight trend"
            value={stats?.weightChangeKg == null ? '—' : `${stats.weightChangeKg > 0 ? '+' : ''}${round(stats.weightChangeKg, 2)} kg`}
          />
        </div>

        <ul className="space-y-2">
          {lines.map((l, i) => (
            <li key={i} className="flex gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{l}</span>
            </li>
          ))}
        </ul>

        <div className="rounded-xl border border-border bg-surface-2 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Weight checkpoint
          </div>
          <p className="text-sm text-foreground">{weightNote}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={adherence >= 80 ? 'success' : adherence >= 50 ? 'warning' : 'danger'}>
            <CheckCircle2 className="h-3 w-3" />
            {adherence >= 80 ? 'Strong week' : adherence >= 50 ? 'Mixed week' : 'Rebuild the habit'}
          </Badge>
          <span className="text-xs text-muted-foreground">Rule-based summary from your logged data.</span>
        </div>
      </div>
    </Dialog>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3 text-center">
      <div className="tnum text-lg font-black text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  )
}
