import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronRight, Dumbbell, History, Play } from 'lucide-react'
import { PageHeader, SectionHeader } from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { useSessions, useTemplates } from '@/hooks/useAppData'
import { buildSessionFromTemplate, getInProgressSession, saveSession } from '@/db/repos'
import { formatDate, humanizeSeconds, todayKey, WEEKDAY_SHORT, weekdayOf } from '@/lib/date'
import { toast } from '@/store/ui'
import { cn } from '@/lib/utils'
import type { WorkoutTemplate } from '@/types'

export function TrainScreen() {
  const navigate = useNavigate()
  const templates = useTemplates()
  const sessions = useSessions(20)
  const today = todayKey()
  const [selected, setSelected] = useState(() => weekdayOf(today))

  const byWeekday = useMemo(() => {
    const map = new Map<number, WorkoutTemplate>()
    for (const t of templates ?? []) map.set(t.weekday, t)
    return map
  }, [templates])

  const current = byWeekday.get(selected)

  async function start(template: WorkoutTemplate) {
    const existing = await getInProgressSession()
    if (existing) {
      navigate(`/workout/${existing.id}`)
      return
    }
    const session = buildSessionFromTemplate(template, today)
    await saveSession(session)
    toast.info('Workout started. Autosaving locally.')
    navigate(`/workout/${session.id}`)
  }

  const dayOrder = [1, 2, 3, 4, 5, 6, 0]

  return (
    <div className="space-y-5">
      <PageHeader title="Train" subtitle="Your five-day powerlifting & hypertrophy split" />

      <Card>
        <CardContent>
          <div className="mb-4 flex items-center gap-2 text-sm font-bold">
            <CalendarDays className="h-4 w-4 text-primary" /> Weekly plan
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {dayOrder.map((wd) => {
              const t = byWeekday.get(wd)
              const isToday = wd === weekdayOf(today)
              const isRest = t?.isRestDay
              return (
                <button
                  key={wd}
                  onClick={() => setSelected(wd)}
                  className={cn(
                    'flex min-w-[64px] flex-col items-center gap-1 rounded-xl border px-3 py-2.5 transition-colors',
                    selected === wd
                      ? 'border-primary bg-primary/12 text-primary'
                      : 'border-border bg-surface-2 text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className="text-xs font-bold">{WEEKDAY_SHORT[wd]}</span>
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      isRest ? 'bg-muted-foreground/40' : 'bg-primary',
                    )}
                  />
                  {isToday && <span className="text-[9px] font-bold uppercase tracking-wide">Today</span>}
                </button>
              )
            })}
          </div>

          {current && (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">{current.name}</h3>
                {current.isRestDay ? <Badge tone="neutral">Rest</Badge> : <Badge tone="primary">{current.exercises.length} exercises</Badge>}
              </div>
              {current.description && <p className="mt-1 text-sm text-muted-foreground">{current.description}</p>}

              <ul className="mt-3 divide-y divide-border/60 rounded-xl border border-border">
                {current.exercises.map((ex, i) => (
                  <li key={`${ex.exerciseId}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {ex.name}
                        {ex.optional && <span className="ml-2 text-[10px] font-medium uppercase text-muted-foreground">optional</span>}
                      </div>
                      {ex.note && <div className="truncate text-xs text-muted-foreground">{ex.note}</div>}
                    </div>
                    <span className="tnum shrink-0 text-sm text-muted-foreground">
                      {ex.sets} × {ex.repsLow}
                      {ex.repsHigh !== ex.repsLow ? `–${ex.repsHigh}` : ''}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4">
                <Button onClick={() => start(current)} leftIcon={<Play className="h-4 w-4" />}>
                  {current.isRestDay ? 'Log recovery session' : 'Start this workout'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <SectionHeader title="Recent sessions" />
        {!sessions || sessions.length === 0 ? (
          <EmptyState
            icon={<History className="h-6 w-6" />}
            title="No sessions logged yet"
            description="Start a workout above. Sets autosave to this device so a refresh never loses your work."
          />
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const completedSets = s.exercises.reduce((a, e) => a + e.sets.filter((x) => x.completed).length, 0)
              const volume = s.exercises.reduce(
                (a, e) => a + e.sets.reduce((b, set) => b + (set.completed ? (set.weightKg ?? 0) * (set.reps ?? 0) : 0), 0),
                0,
              )
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(`/workout/${s.id}`)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left transition-colors hover:bg-surface-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-primary">
                      <Dumbbell className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-sm font-bold text-foreground">{s.templateName}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(s.date)} · {completedSets} sets · {Math.round(volume).toLocaleString()} kg
                        {s.durationSeconds ? ` · ${humanizeSeconds(s.durationSeconds)}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={s.status === 'completed' ? 'success' : 'warning'}>{s.status.replace('_', ' ')}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
