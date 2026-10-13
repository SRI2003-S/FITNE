import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Database,
  Download,
  Eye,
  EyeOff,
  Lock,
  RotateCcw,
  Save,
  Sparkles,
  Upload,
  User,
} from 'lucide-react'
import { PageHeader, SectionHeader } from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { Switch, Segmented } from '@/components/ui/Switch'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { db, META_KEYS } from '@/db/db'
import { resetAllData, updateGoal, updatePreferences, updateProfile } from '@/db/repos'
import {
  useGoal,
  usePreferences,
  useProfile,
  useReminders,
  useTrainingMaxes,
} from '@/hooks/useAppData'
import { exportAll, downloadJSON, exportTableCSV, downloadText, importBundle, BACKUP_TABLES } from '@/lib/backup'
import { reconcileTargets } from '@/lib/nutrition'
import { nowISO, round } from '@/lib/utils'
import { toast } from '@/store/ui'
import { useUIStore, type Theme } from '@/store/ui'
import { useAuth } from '@/hooks/useAuth'
import { syncAll } from '@/lib/sync'
import type { Reminder, TrainingMax } from '@/types'
import { cn } from '@/lib/utils'

const WIDGET_LABELS: Record<string, string> = {
  greeting: 'Greeting header',
  ring: 'Calorie & macro ring',
  weight: 'Weight trend',
  macros: 'Macro breakdown',
  todayWorkout: 'Today’s workout',
  hydration: 'Water tracker',
  habits: 'Daily habits',
  streaks: 'Streaks',
  prs: 'Powerlifting PRs',
  checklist: 'Daily checklist',
  quickAdd: 'Quick-add buttons',
}

export function SettingsScreen() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Tune every target, plan and preference" />
      <ProfileSection />
      <TargetsSection />
      <TrainingMaxSection />
      <PreferencesSection />
      <WidgetsSection />
      <RemindersSection />
      <DataSection />
      <PrivacySection />
    </div>
  )
}

/* ------------------------------- Profile ------------------------------- */

const profileSchema = z.object({
  name: z.string().trim().max(40),
  age: z.coerce.number().int().min(13).max(90),
  heightCm: z.coerce.number().min(120).max(230),
  experience: z.enum(['beginner', 'intermediate', 'advanced']),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'high']),
  trainingDaysPerWeek: z.coerce.number().int().min(1).max(7),
  trainingTimeOfDay: z.enum(['morning', 'afternoon', 'evening']),
  dietStyle: z.string().max(60),
})
type ProfileValues = z.infer<typeof profileSchema>

function ProfileSection() {
  const profile = useProfile()
  const { register, handleSubmit, reset, formState } = useForm<z.input<typeof profileSchema>, any, ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      age: 22,
      heightCm: 188,
      experience: 'intermediate',
      activityLevel: 'moderate',
      trainingDaysPerWeek: 5,
      trainingTimeOfDay: 'evening',
      dietStyle: 'Indian non-vegetarian',
    },
  })

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name,
        age: profile.age ?? 22,
        heightCm: profile.heightCm ?? 188,
        experience: profile.experience,
        activityLevel: profile.activityLevel,
        trainingDaysPerWeek: profile.trainingDaysPerWeek,
        trainingTimeOfDay: profile.trainingTimeOfDay,
        dietStyle: profile.dietStyle,
      })
    }
  }, [profile, reset])

  return (
    <section>
      <SectionHeader title="Profile" />
      <Card>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={handleSubmit(async (data) => {
              await updateProfile(data)
              toast.success('Profile updated')
            })}
          >
            <div className="flex items-center gap-2 text-sm font-bold">
              <User className="h-4 w-4 text-primary" /> Basics
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Display name" className="col-span-2">
                <Input {...register('name')} placeholder="Your name" />
              </Field>
              <Field label="Age">
                <Input type="number" {...register('age')} />
              </Field>
              <Field label="Height (cm)">
                <Input type="number" step="0.5" {...register('heightCm')} />
              </Field>
              <Field label="Experience">
                <Select {...register('experience')}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </Select>
              </Field>
              <Field label="Activity level">
                <Select {...register('activityLevel')}>
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </Select>
              </Field>
              <Field label="Training days / week">
                <Input type="number" {...register('trainingDaysPerWeek')} />
              </Field>
              <Field label="Training time">
                <Select {...register('trainingTimeOfDay')}>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                </Select>
              </Field>
              <Field label="Diet style" className="col-span-2">
                <Input {...register('dietStyle')} />
              </Field>
            </div>
            <Button type="submit" leftIcon={<Save className="h-4 w-4" />} loading={formState.isSubmitting}>
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}

/* ------------------------------- Targets ------------------------------- */

const targetSchema = z.object({
  calorieTarget: z.coerce.number().min(1200).max(5000),
  proteinTarget: z.coerce.number().min(60).max(350),
  fatTarget: z.coerce.number().min(20).max(180),
  weeklyLossTargetKg: z.coerce.number().min(0.1).max(1.5),
  goalWeightKg: z.coerce.number().min(30).max(300),
})
type TargetValues = z.infer<typeof targetSchema>

function TargetsSection() {
  const goal = useGoal()
  const { register, handleSubmit, watch, reset, formState } = useForm<z.input<typeof targetSchema>, any, TargetValues>({
    resolver: zodResolver(targetSchema),
    defaultValues: { calorieTarget: 2700, proteinTarget: 180, fatTarget: 75, weeklyLossTargetKg: 0.5, goalWeightKg: 95 },
  })

  useEffect(() => {
    if (goal) {
      reset({
        calorieTarget: goal.calorieTarget,
        proteinTarget: goal.proteinTarget,
        fatTarget: goal.fatTarget,
        weeklyLossTargetKg: goal.weeklyLossTargetKg,
        goalWeightKg: goal.goalWeightKg ?? 95,
      })
    }
  }, [goal, reset])

  const values = watch()
  const reconciled = reconcileTargets(
    Number(values.calorieTarget) || 0,
    Number(values.proteinTarget) || 0,
    Number(values.fatTarget) || 0,
  )

  return (
    <section>
      <SectionHeader title="Nutrition targets" />
      <Card>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={handleSubmit(async (data) => {
              await updateGoal({
                calorieTarget: round(data.calorieTarget, 0),
                proteinTarget: round(data.proteinTarget, 0),
                fatTarget: round(data.fatTarget, 0),
                carbTarget: round(reconciled.carbs, 0),
                weeklyLossTargetKg: data.weeklyLossTargetKg,
                goalWeightKg: data.goalWeightKg,
              })
              toast.success('Targets updated')
            })}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Calories (kcal)">
                <Input type="number" {...register('calorieTarget')} />
              </Field>
              <Field label="Goal weight (kg)">
                <Input type="number" step="0.1" {...register('goalWeightKg')} />
              </Field>
              <Field label="Protein (g)">
                <Input type="number" {...register('proteinTarget')} />
              </Field>
              <Field label="Fat (g)">
                <Input type="number" {...register('fatTarget')} />
              </Field>
              <Field label="Target loss (kg / week)" className="col-span-2">
                <Input type="number" step="0.1" {...register('weeklyLossTargetKg')} />
              </Field>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carbohydrates (auto-balanced)</span>
                <span className="tnum font-semibold text-foreground">{round(reconciled.carbs, 0)} g</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Macro calories</span>
                <span className="tnum font-semibold text-foreground">
                  {round(reconciled.calories, 0)} / {round(Number(values.calorieTarget) || 0, 0)} kcal
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">
                Protein and fat are priorities; carbs absorb the remaining calories so the numbers stay consistent.
              </p>
            </div>
            <Button type="submit" leftIcon={<Save className="h-4 w-4" />} loading={formState.isSubmitting}>
              Save targets
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}

/* --------------------------- Training maxes ---------------------------- */

function TrainingMaxSection() {
  const tms = useTrainingMaxes()
  const [draft, setDraft] = useState<Record<string, { oneRm: string; tm: string; verified: boolean }>>({})

  useEffect(() => {
    if (!tms) return
    const d: typeof draft = {}
    for (const t of tms) {
      d[t.id] = { oneRm: t.oneRmKg?.toString() ?? '', tm: t.trainingMaxKg?.toString() ?? '', verified: t.oneRmVerified }
    }
    setDraft(d)
  }, [tms])

  async function saveOne(t: TrainingMax) {
    const d = draft[t.id]
    const oneRm = d.oneRm ? Number(d.oneRm) : null
    const tm = d.tm ? Number(d.tm) : oneRm != null ? round(oneRm * 0.9, 1) : null
    await db.trainingMaxes.update(t.id, {
      oneRmKg: oneRm,
      trainingMaxKg: tm,
      oneRmVerified: d.verified,
      updatedOn: nowISO().slice(0, 10),
      updatedAt: nowISO(),
    })
    toast.success(`${t.lift} training max saved`)
  }

  return (
    <section>
      <SectionHeader title="Training maxes" />
      <Card>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Training max defaults to ~90% of a verified 1RM. Never max-test weekly. Leave RIR 1–3 and let the eight-week
            percentages guide load.
          </p>
          {(tms ?? []).map((t) => {
            const d = draft[t.id] ?? { oneRm: '', tm: '', verified: false }
            return (
              <div key={t.id} className="rounded-xl border border-border bg-surface-2 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold capitalize text-foreground">{t.lift}</span>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Verified 1RM
                    <Switch
                      checked={d.verified}
                      onChange={(v) => setDraft((s) => ({ ...s, [t.id]: { ...d, verified: v } }))}
                      label="Verified"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Recent 1RM (kg)">
                    <Input
                      type="number"
                      step="0.5"
                      inputMode="decimal"
                      value={d.oneRm}
                      onChange={(e) => setDraft((s) => ({ ...s, [t.id]: { ...d, oneRm: e.target.value } }))}
                    />
                  </Field>
                  <Field label="Training max (kg)">
                    <Input
                      type="number"
                      step="0.5"
                      inputMode="decimal"
                      value={d.tm}
                      placeholder={d.oneRm ? String(round(Number(d.oneRm) * 0.9, 1)) : '—'}
                      onChange={(e) => setDraft((s) => ({ ...s, [t.id]: { ...d, tm: e.target.value } }))}
                    />
                  </Field>
                </div>
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => saveOne(t)} leftIcon={<Save className="h-3.5 w-3.5" />}>
                  Save {t.lift}
                </Button>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </section>
  )
}

/* ----------------------------- Preferences ----------------------------- */

function PreferencesSection() {
  const prefs = usePreferences()
  const { theme, setTheme } = useUIStore()
  const [showAdvanced, setShowAdvanced] = useState(false)

  if (!prefs) return null

  return (
    <section>
      <SectionHeader title="Preferences" />
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-foreground">Theme</div>
              <div className="text-xs text-muted-foreground">Charcoal by default</div>
            </div>
            <Segmented<Theme>
              value={theme}
              onChange={(v) => {
                setTheme(v)
                void updatePreferences({ theme: v })
              }}
              options={[
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
                { value: 'system', label: 'Auto' },
              ]}
            />
          </div>

          <Divider />
          <ToggleRow
            label="Reduced motion"
            hint="Minimise animations"
            checked={prefs.reducedMotion}
            onChange={(v) => void updatePreferences({ reducedMotion: v })}
          />
          <Divider />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-foreground">Units</div>
              <div className="text-xs text-muted-foreground">Weight display</div>
            </div>
            <Segmented
              value={prefs.units}
              onChange={(v) => void updatePreferences({ units: v })}
              options={[
                { value: 'metric', label: 'kg / cm' },
                { value: 'imperial', label: 'lb / in' },
              ]}
            />
          </div>

          <Divider />
          <button
            className="flex w-full items-center justify-between text-sm font-semibold text-foreground"
            onClick={() => setShowAdvanced((s) => !s)}
          >
            Daily targets
            {showAdvanced ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showAdvanced && (
            <div className="grid grid-cols-3 gap-3">
              <Field label="Water (ml)">
                <Input
                  type="number"
                  defaultValue={prefs.waterTargetMl}
                  onBlur={(e) => void updatePreferences({ waterTargetMl: Number(e.target.value) })}
                />
              </Field>
              <Field label="Steps">
                <Input
                  type="number"
                  defaultValue={prefs.stepTarget}
                  onBlur={(e) => void updatePreferences({ stepTarget: Number(e.target.value) })}
                />
              </Field>
              <Field label="Sleep (h)">
                <Input
                  type="number"
                  step="0.5"
                  defaultValue={prefs.sleepTargetHours}
                  onBlur={(e) => void updatePreferences({ sleepTargetHours: Number(e.target.value) })}
                />
              </Field>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

/* ------------------------------- Widgets ------------------------------- */

function WidgetsSection() {
  const prefs = usePreferences()
  if (!prefs) return null
  const hidden = new Set(prefs.hiddenWidgets ?? [])
  const order = prefs.homeWidgets?.length ? prefs.homeWidgets : Object.keys(WIDGET_LABELS)

  async function toggle(key: string, visible: boolean) {
    const next = new Set(hidden)
    if (visible) next.delete(key)
    else next.add(key)
    await updatePreferences({ hiddenWidgets: [...next] })
  }

  return (
    <section>
      <SectionHeader title="Home widgets" />
      <Card>
        <CardContent className="space-y-1">
          {order.map((key, i) => (
            <div key={key} className={cn('flex items-center justify-between rounded-lg px-1 py-2', i > 0 && 'border-t border-border/50')}>
              <span className="text-sm text-foreground">{WIDGET_LABELS[key] ?? key}</span>
              <Switch checked={!hidden.has(key)} onChange={(v) => void toggle(key, v)} label={key} />
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  )
}

/* ------------------------------ Reminders ------------------------------ */

function RemindersSection() {
  const reminders = useReminders()

  async function update(id: string, patch: Partial<Reminder>) {
    await db.reminders.update(id, { ...patch, updatedAt: nowISO() })
  }

  return (
    <section>
      <SectionHeader title="Reminders" />
      <Card>
        <CardContent className="space-y-1">
          <p className="mb-2 text-xs text-muted-foreground">
            Reminders use browser/local notifications where supported. If your device blocks them, these still act as
            in-app prompts.
          </p>
          {(reminders ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 border-t border-border/50 py-2 first:border-t-0">
              <span className="text-sm text-foreground">{r.label}</span>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={r.time}
                  onChange={(e) => void update(r.id, { time: e.target.value })}
                  className="h-9 w-28"
                />
                <Switch checked={r.enabled} onChange={(v) => void update(r.id, { enabled: v })} label={r.label} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  )
}

/* -------------------------------- Data --------------------------------- */

function DataSection() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function doExportJSON() {
    setBusy(true)
    try {
      const bundle = await exportAll()
      downloadJSON(bundle)
      toast.success('Backup downloaded')
    } finally {
      setBusy(false)
    }
  }

  async function doExportCSV(name: (typeof BACKUP_TABLES)[number]) {
    const csv = await exportTableCSV(name)
    if (!csv) {
      toast.info(`No ${name} data to export`)
      return
    }
    downloadText(`forge-${name}.csv`, csv, 'text/csv')
  }

  async function onImport(file: File | undefined) {
    if (!file) return
    const text = await file.text()
    const result = await importBundle(text)
    if (result.errors.length) {
      toast.error(`Imported ${result.imported} rows with ${result.errors.length} issue(s)`)
      console.warn('Import issues:', result.errors)
    } else {
      toast.success(`Imported ${result.imported} rows from ${result.tables} tables`)
    }
  }

  return (
    <section>
      <SectionHeader title="Data ownership" />
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Database className="h-4 w-4 text-primary" /> Backup & portability
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={doExportJSON} loading={busy}>
              Export full JSON
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => doExportCSV('weightEntries')}
            >
              Weight CSV
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => doExportCSV('mealEntries')}
            >
              Meals CSV
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => doExportCSV('workoutSessions')}
            >
              Workouts CSV
            </Button>
          </div>

          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
          <Button variant="outline" leftIcon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>
            Import JSON backup
          </Button>
          <p className="text-xs text-muted-foreground">
            Imports merge by record ID and never delete existing rows. Progress photos are excluded from JSON backups
            (they are binary); export them from the Physique screen if needed.
          </p>

          <Divider />

          <div className="flex items-center gap-2 text-sm font-bold text-danger">
            <RotateCcw className="h-4 w-4" /> Danger zone
          </div>
          <Button variant="danger" onClick={() => setResetOpen(true)}>
            Reset all local data
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset all local data?"
        description="This permanently clears every record in this browser’s IndexedDB, then re-seeds defaults."
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await resetAllData()
                await db.meta.delete(META_KEYS.seeded)
                await db.meta.delete(META_KEYS.onboardingComplete)
                toast.success('All data cleared. Reloading…')
                setTimeout(() => window.location.reload(), 600)
              }}
            >
              Yes, reset everything
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Export a backup first if you might want your history later. This cannot be undone.
        </p>
      </Dialog>
    </section>
  )
}

/* ------------------------------- Privacy ------------------------------- */

function PrivacySection() {
  const prefs = usePreferences()
  return (
    <>
      <AccountSection />
      <section>
        <SectionHeader title="Privacy & AI" />
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Lock className="h-4 w-4 text-success" /> Local-first by default
          </div>
          <ToggleRow
            label="AI features"
            hint="Gemini coaching (requires server-side key)"
            checked={prefs?.aiEnabled ?? false}
            onChange={(v) => void updatePreferences({ aiEnabled: v })}
          />
          <div className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> AI key status
            </div>
            <p className="mt-1">
              No API key is stored in this app. AI calls are proxied through a server endpoint that holds the key in an
              environment variable. Until that endpoint is configured, FORGE stays fully rules-based.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">Photos private</Badge>
            <Badge tone="success">No public image URLs</Badge>
            <Badge tone="neutral">No ads / no tracking</Badge>
          </div>
        </CardContent>
      </Card>
    </section>
    </>
  )
}

function AccountSection() {
  const auth = useAuth()
  const [busy, setBusy] = useState(false)
  if (!auth.configured) return null
  return (
    <section>
      <SectionHeader title="Cloud account" />
      <Card>
        <CardContent className="space-y-3">
          {auth.user ? (
            <>
              <div className="text-sm">
                Signed in as <span className="font-semibold">{auth.user.email}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  loading={busy}
                  onClick={async () => {
                    setBusy(true)
                    try {
                      await syncAll(auth.user!.id)
                      toast.success('Sync complete')
                    } catch (e: any) {
                      toast.error(e?.message ?? 'Sync failed')
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  Sync now
                </Button>
                <Button size="sm" variant="danger" onClick={() => void auth.signOut()}>
                  Sign out
                </Button>
              </div>
            </>
          ) : (
            <Button size="sm" onClick={() => (window.location.href = '/auth')}>
              Sign in / create account
            </Button>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

/* ------------------------------- helpers ------------------------------- */

function Divider() {
  return <div className="h-px w-full bg-border/60" />
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-semibold text-foreground">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  )
}
