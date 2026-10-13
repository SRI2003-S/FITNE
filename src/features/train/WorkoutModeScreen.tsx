import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Flag,
  Minus,
  Pause,
  Play,
  Plus,
  SkipForward,
  Timer,
  Trash2,
} from 'lucide-react'
import { db } from '@/db/db'
import { discardSession, finishSession, saveSession } from '@/db/repos'
import { useExercises } from '@/hooks/useAppData'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Textarea } from '@/components/ui/Field'
import { humanizeSeconds } from '@/lib/date'
import { cn } from '@/lib/utils'
import { toast } from '@/store/ui'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { ExercisePickerDialog } from './ExercisePickerDialog'
import type { Exercise, WorkoutSession, WorkoutSessionExercise, WorkoutSet } from '@/types'

export function WorkoutModeScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const exercises = useExercises()

  const dbSession = useLiveQuery(() => (id ? db.workoutSessions.get(id) : undefined), [id])
  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [initialised, setInitialised] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [photoPromptOpen, setPhotoPromptOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [note, setNote] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [elapsed, setElapsed] = useState(0)

  const [rest, setRest] = useState<{ total: number; remaining: number; paused: boolean } | null>(null)
  const persistRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Previous performance lookup (last completed session before this one, per exercise name)
  const previous = useLiveQuery(async () => {
    if (!session) return {}
    const sessions = await db.workoutSessions
      .where('status')
      .equals('completed')
      .reverse()
      .sortBy('startedAt')
    const map: Record<string, string> = {}
    for (const s of sessions) {
      if (s.id === session.id) continue
      for (const ex of s.exercises) {
        const done = ex.sets.filter((x) => x.completed && x.weightKg && x.reps)
        if (!done.length) continue
        const best = done.reduce((a, b) => ((a.weightKg ?? 0) >= (b.weightKg ?? 0) ? a : b))
        if (!map[ex.name]) map[ex.name] = `${best.weightKg} kg × ${best.reps}`
      }
    }
    return map
  }, [session?.id, dbSession?.status])

  useEffect(() => {
    if (dbSession && !initialised) {
      setSession(dbSession)
      setNote(dbSession.note ?? '')
      setInitialised(true)
    }
  }, [dbSession, initialised])

  // Elapsed timer
  useEffect(() => {
    if (!session) return
    const tick = () => setElapsed(Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [session])

  // Rest timer
  useEffect(() => {
    if (!rest || rest.paused || rest.remaining <= 0) return
    const t = setInterval(() => {
      setRest((r) => {
        if (!r || r.paused) return r
        const next = r.remaining - 1
        if (next <= 0) {
          if (!reduced && 'vibrate' in navigator) navigator.vibrate?.(200)
          return null
        }
        return { ...r, remaining: next }
      })
    }, 1000)
    return () => clearInterval(t)
  }, [rest, reduced])

  // Debounced persistence
  const persist = useCallback((next: WorkoutSession) => {
    if (persistRef.current) clearTimeout(persistRef.current)
    persistRef.current = setTimeout(() => {
      void saveSession(next)
    }, 400)
  }, [])

  const update = useCallback(
    (updater: (draft: WorkoutSession) => WorkoutSession) => {
      setSession((prev) => {
        if (!prev) return prev
        const next = updater(prev)
        persist(next)
        return next
      })
    },
    [persist],
  )

  // Unsaved-change protection
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (session && session.status === 'in_progress') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [session])

  const volume = useMemo(() => {
    if (!session) return 0
    return session.exercises.reduce(
      (a, e) => a + e.sets.reduce((b, s) => b + (s.completed ? (s.weightKg ?? 0) * (s.reps ?? 0) : 0), 0),
      0,
    )
  }, [session])

  const completedSets = useMemo(
    () => session?.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0) ?? 0,
    [session],
  )

  if (!session) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading session…
      </div>
    )
  }

  function patchSet(exId: string, setId: string, patch: Partial<WorkoutSet>) {
    update((s) => ({
      ...s,
      exercises: s.exercises.map((e) =>
        e.id === exId ? { ...e, sets: e.sets.map((x) => (x.id === setId ? { ...x, ...patch } : x)) } : e,
      ),
    }))
  }

  function toggleComplete(ex: WorkoutSessionExercise, set: WorkoutSet) {
    const willComplete = !set.completed
    patchSet(ex.id, set.id, { completed: willComplete, completedAt: willComplete ? new Date().toISOString() : null })
    if (willComplete) {
      setRest({ total: ex.restSeconds, remaining: ex.restSeconds, paused: false })
    }
  }

  function addSet(exId: string) {
    update((s) => ({
      ...s,
      exercises: s.exercises.map((e) =>
        e.id === exId
          ? {
              ...e,
              sets: [
                ...e.sets,
                {
                  id: crypto.randomUUID(),
                  setNumber: e.sets.length + 1,
                  targetReps: e.repsHigh,
                  weightKg: e.sets[e.sets.length - 1]?.weightKg ?? null,
                  reps: null,
                  completed: false,
                },
              ],
            }
          : e,
      ),
    }))
  }

  function removeSet(exId: string, setId: string) {
    update((s) => ({
      ...s,
      exercises: s.exercises.map((e) =>
        e.id === exId
          ? { ...e, sets: e.sets.filter((x) => x.id !== setId).map((x, i) => ({ ...x, setNumber: i + 1 })) }
          : e,
      ),
    }))
  }

  function skipExercise(exId: string) {
    update((s) => ({
      ...s,
      exercises: s.exercises.map((e) => (e.id === exId ? { ...e, skipped: !e.skipped } : e)),
    }))
  }

  function addExercise(exercise: Exercise, config: { sets: number; repsLow: number; repsHigh: number; restSeconds: number }) {
    const newExercise: WorkoutSessionExercise = {
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      name: exercise.name,
      muscle: exercise.muscle,
      targetSets: config.sets,
      repsLow: config.repsLow,
      repsHigh: config.repsHigh,
      restSeconds: config.restSeconds,
      mainLift: null,
      sets: Array.from({ length: config.sets }, (_, i) => ({
        id: crypto.randomUUID(),
        setNumber: i + 1,
        targetReps: config.repsHigh,
        weightKg: null,
        reps: null,
        completed: false,
      })),
    }
    update((s) => ({ ...s, exercises: [...s.exercises, newExercise] }))
    setCollapsed((c) => ({ ...c, [newExercise.id]: false }))
  }

  async function handleFinish() {
    if (persistRef.current) clearTimeout(persistRef.current)
    await finishSession(session!, note)
    toast.success('Workout saved. Well done.')
    setFinishOpen(false)
    setPhotoPromptOpen(true)
  }

  async function handleDiscard() {
    if (persistRef.current) clearTimeout(persistRef.current)
    await discardSession(session!.id)
    toast.info('Session discarded')
    navigate('/train')
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/train')}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-foreground">{session.templateName}</div>
            <div className="tnum text-xs text-muted-foreground">
              {humanizeSeconds(elapsed)} · {completedSets} sets · {Math.round(volume).toLocaleString()} kg
            </div>
          </div>
          <Button size="sm" onClick={() => setFinishOpen(true)} leftIcon={<Flag className="h-4 w-4" />}>
            Finish
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-3 px-4 py-4 pb-40">
        {session.exercises.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">This is a rest day with no exercises.</p>
        )}

        {session.exercises.map((ex) => {
          const isCollapsed = collapsed[ex.id]
          return (
            <div
              key={ex.id}
              className={cn(
                'overflow-hidden rounded-2xl border border-border bg-surface',
                ex.skipped && 'opacity-50',
              )}
            >
              <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [ex.id]: !c[ex.id] }))}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-foreground">{ex.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Target {ex.targetSets} × {ex.repsLow}
                      {ex.repsHigh !== ex.repsLow ? `–${ex.repsHigh}` : ''} · rest {ex.restSeconds}s
                      {previous?.[ex.name] && <span className="ml-2 text-primary">Last: {previous[ex.name]}</span>}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [ex.id]: !c[ex.id] }))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-2"
                  aria-label="Toggle exercise"
                >
                  {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              </div>

              {!isCollapsed && (
                <div className="p-2">
                  <div className="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_40px_40px] items-center gap-1.5 px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    <span>Set</span>
                    <span>kg</span>
                    <span>Reps</span>
                    <span className="text-center">RPE</span>
                    <span />
                  </div>

                  {ex.sets.map((set) => (
                    <div
                      key={set.id}
                      className={cn(
                        'grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_40px_40px] items-center gap-1.5 rounded-xl px-2 py-1.5',
                        set.completed && 'bg-success/10',
                      )}
                    >
                      <span className="tnum text-sm font-bold text-muted-foreground">{set.setNumber}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={set.weightKg ?? ''}
                        placeholder="—"
                        onChange={(e) =>
                          patchSet(ex.id, set.id, { weightKg: e.target.value === '' ? null : Number(e.target.value) })
                        }
                        className="tnum h-11 rounded-lg border border-input bg-surface-2 px-2 text-center text-base font-semibold text-foreground focus:border-primary focus:outline-none"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        value={set.reps ?? ''}
                        placeholder={`${ex.repsLow}-${ex.repsHigh}`}
                        onChange={(e) =>
                          patchSet(ex.id, set.id, { reps: e.target.value === '' ? null : Number(e.target.value) })
                        }
                        className="tnum h-11 rounded-lg border border-input bg-surface-2 px-2 text-center text-base font-semibold text-foreground focus:border-primary focus:outline-none"
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        value={set.rpe ?? ''}
                        placeholder="—"
                        onChange={(e) =>
                          patchSet(ex.id, set.id, { rpe: e.target.value === '' ? null : Number(e.target.value) })
                        }
                        className="tnum h-11 rounded-lg border border-input bg-surface-2 px-1 text-center text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
                      />
                      <button
                        onClick={() => toggleComplete(ex, set)}
                        aria-label={`Complete set ${set.setNumber}`}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg border font-bold transition-colors',
                          set.completed
                            ? 'border-success bg-success text-primary-foreground'
                            : 'border-border bg-surface-2 text-muted-foreground hover:border-primary hover:text-primary',
                        )}
                      >
                        <Check className="h-5 w-5" />
                      </button>
                    </div>
                  ))}

                  <div className="mt-1 flex items-center gap-2 px-1">
                    <Button size="sm" variant="ghost" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => addSet(ex.id)}>
                      Set
                    </Button>
                    {ex.sets.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<Minus className="h-3.5 w-3.5" />}
                        onClick={() => removeSet(ex.id, ex.sets[ex.sets.length - 1].id)}
                      >
                        Set
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => skipExercise(ex.id)}>
                      {ex.skipped ? 'Unskip' : 'Skip'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="secondary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setPickerOpen(true)}
          >
            Add exercise
          </Button>
          <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setDiscardOpen(true)}>
            Discard session
          </Button>
        </div>
      </div>

      {/* Rest timer bar */}
      {rest && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-primary/30 bg-surface/95 backdrop-blur-md safe-bottom">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Timer className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wide">Rest</span>
                <span className="tnum text-sm font-bold text-foreground">{humanizeSeconds(rest.remaining)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
                  style={{ width: `${(rest.remaining / rest.total) * 100}%` }}
                />
              </div>
            </div>
            <Button
              size="icon-sm"
              variant="secondary"
              onClick={() => setRest((r) => (r ? { ...r, paused: !r.paused } : r))}
              aria-label="Pause rest"
            >
              {rest.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<SkipForward className="h-4 w-4" />}
              onClick={() => setRest(null)}
            >
              Skip
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        title="Finish workout?"
        description="Your sets are already saved on this device."
        footer={
          <>
            <Button variant="ghost" onClick={() => setFinishOpen(false)}>
              Keep going
            </Button>
            <Button onClick={handleFinish}>Finish & save</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-surface-2 p-3">
              <div className="tnum text-xl font-black text-foreground">{humanizeSeconds(elapsed)}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Duration</div>
            </div>
            <div className="rounded-xl bg-surface-2 p-3">
              <div className="tnum text-xl font-black text-foreground">{completedSets}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Sets done</div>
            </div>
            <div className="rounded-xl bg-surface-2 p-3">
              <div className="tnum text-xl font-black text-foreground">{Math.round(volume).toLocaleString()}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">kg volume</div>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Session notes</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="How did it feel? Any niggles?" />
          </div>
        </div>
      </Dialog>

      <Dialog
        open={photoPromptOpen}
        onClose={() => {
          setPhotoPromptOpen(false)
          navigate('/train')
        }}
        title="Log a progress photo?"
        description="Capture how you look after this workout for your physique timeline."
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              setPhotoPromptOpen(false)
              navigate('/train')
            }}>
              Skip
            </Button>
            <Button onClick={() => {
              setPhotoPromptOpen(false)
              navigate('/progress/photos')
            }}>
              Add photo
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Photos stay private on this device by default, and sync to Supabase when you're signed in.
        </p>
      </Dialog>

      <ExercisePickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        exercises={exercises ?? []}
        onAdd={addExercise}
      />

      <Dialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="Discard this session?"
        description="This marks the session as abandoned and keeps it in history."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDiscardOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDiscard}>
              Discard
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Logged sets for this session will not count toward your progress.</p>
      </Dialog>
    </div>
  )
}
