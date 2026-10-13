import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Flame } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { useGoal, useProfile, useTrainingMaxes } from '@/hooks/useAppData'
import { db, META_KEYS } from '@/db/db'
import { updateGoal, updateProfile, updatePreferences } from '@/db/repos'
import { recommendedTargets } from '@/lib/targets'
import { nowISO, round } from '@/lib/utils'
import { todayKey } from '@/lib/date'
import { toast } from '@/store/ui'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a display name'),
  age: z.coerce.number().int().min(13, 'Enter a valid age').max(90),
  heightCm: z.coerce.number().min(120, 'Too short').max(230, 'Too tall'),
  weightKg: z.coerce.number().min(30, 'Too light').max(300, 'Too heavy'),
  goalWeightKg: z.coerce.number().min(30).max(300),
  calorieTarget: z.coerce.number().min(1200).max(5000),
  proteinTarget: z.coerce.number().min(60).max(350),
  fatTarget: z.coerce.number().min(20).max(180),
  squat1rm: z.coerce.number().min(0).max(500),
  bench1rm: z.coerce.number().min(0).max(400),
  deadlift1rm: z.coerce.number().min(0).max(500),
})

type FormValues = z.infer<typeof schema>

export function OnboardingScreen() {
  const navigate = useNavigate()
  const profile = useProfile()
  const goal = useGoal()
  const tms = useTrainingMaxes()
  const [step, setStep] = useState(0)

  const { register, handleSubmit, watch, trigger, formState } = useForm<z.input<typeof schema>, any, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: async () => ({
      name: profile?.name || '',
      age: profile?.age ?? 22,
      heightCm: profile?.heightCm ?? 188,
      weightKg: goal?.startWeightKg ?? 111,
      goalWeightKg: goal?.goalWeightKg ?? 95,
      calorieTarget: goal?.calorieTarget ?? 2700,
      proteinTarget: goal?.proteinTarget ?? 180,
      fatTarget: goal?.fatTarget ?? 75,
      squat1rm: tms?.find((t) => t.lift === 'squat')?.oneRmKg ?? 0,
      bench1rm: tms?.find((t) => t.lift === 'bench')?.oneRmKg ?? 0,
      deadlift1rm: tms?.find((t) => t.lift === 'deadlift')?.oneRmKg ?? 0,
    }),
  })

  const values = watch()
  const calc = recommendedTargets({
    age: Number(values.age) || 22,
    heightCm: Number(values.heightCm) || 180,
    weightKg: Number(values.weightKg) || 80,
    goalWeightKg: Number(values.goalWeightKg) || 75,
    activityLevel: profile?.activityLevel ?? 'moderate',
  })
  const reconciled = { calories: calc.calories, protein: calc.protein, carbs: calc.carbs, fat: calc.fat }

  const STEPS = [
    ['Profile', ['name', 'age', 'heightCm', 'weightKg', 'goalWeightKg']],
    ['Targets', ['calorieTarget', 'proteinTarget', 'fatTarget']],
    ['Training maxes', []],
  ] as const

  async function next() {
    const fields = STEPS[step][1] as unknown as (keyof FormValues)[]
    const ok = fields.length === 0 || (await trigger(fields))
    if (!ok) return
    if (step < STEPS.length - 1) setStep(step + 1)
    else await handleSubmit(submit)()
  }

  async function submit(data: FormValues) {
    await updateProfile({
      name: data.name,
      age: data.age,
      heightCm: data.heightCm,
    })
    const onboardingTargets = recommendedTargets({
      age: data.age,
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      goalWeightKg: data.goalWeightKg,
      activityLevel: profile?.activityLevel ?? 'moderate',
    })
    await updateGoal({
      startWeightKg: data.weightKg,
      currentWeightKg: data.weightKg,
      goalWeightKg: data.goalWeightKg,
      calorieTarget: round(onboardingTargets.calories, 0),
      proteinTarget: round(onboardingTargets.protein, 0),
      carbTarget: round(onboardingTargets.carbs, 0),
      fatTarget: round(onboardingTargets.fat, 0),
    })
    await updatePreferences({ waterTargetMl: onboardingTargets.waterMl })

    const liftMap: Record<string, number> = {
      squat: data.squat1rm,
      bench: data.bench1rm,
      deadlift: data.deadlift1rm,
    }
    for (const [lift, oneRm] of Object.entries(liftMap)) {
      if (!oneRm || oneRm <= 0) continue
      const existing = await db.trainingMaxes.where('lift').equals(lift).first()
      if (existing) {
        await db.trainingMaxes.update(existing.id, {
          oneRmKg: oneRm,
          oneRmVerified: true,
          trainingMaxKg: round(oneRm * 0.9, 1),
          updatedOn: todayKey(),
          updatedAt: nowISO(),
        })
      }
    }

    // Record the starting weight as the first real measurement.
    const already = await db.weightEntries.where('date').equals(todayKey()).first()
    if (!already) {
      await db.weightEntries.add({
        id: crypto.randomUUID(),
        date: todayKey(),
        weightKg: data.weightKg,
        standardized: true,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      })
    }

    await db.meta.put({ key: META_KEYS.onboardingComplete, value: true })
    toast.success('FORGE is ready. Let’s get to work.')
    navigate('/')
  }

  return (
    <div className="mx-auto max-w-lg py-4">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Flame className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-black tracking-tight">Welcome to FORGE</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A quick setup. Nothing leaves this device unless you enable sync later.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2">
        {STEPS.map(([label], i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                i < step
                  ? 'bg-success text-primary-foreground'
                  : i === step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface-3 text-muted-foreground'
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-xs font-semibold ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4">
          <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
            {step === 0 && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Display name" className="col-span-2">
                  <Input placeholder="e.g. Arjun" {...register('name')} />
                  {formState.errors.name && <p className="mt-1 text-xs text-danger">{formState.errors.name.message}</p>}
                </Field>
                <Field label="Age">
                  <Input type="number" inputMode="numeric" {...register('age')} />
                </Field>
                <Field label="Height (cm)">
                  <Input type="number" inputMode="decimal" {...register('heightCm')} />
                </Field>
                <Field label="Weight (kg)">
                  <Input type="number" inputMode="decimal" step="0.1" {...register('weightKg')} />
                </Field>
                <Field label="Goal weight (kg)" hint="Editable later">
                  <Input type="number" inputMode="decimal" step="0.1" {...register('goalWeightKg')} />
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <Field label="Calories (kcal/day)">
                  <Input type="number" inputMode="numeric" {...register('calorieTarget')} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Protein (g)">
                    <Input type="number" inputMode="numeric" {...register('proteinTarget')} />
                  </Field>
                  <Field label="Fat (g)">
                    <Input type="number" inputMode="numeric" {...register('fatTarget')} />
                  </Field>
                </div>
                <div className="rounded-xl border border-border bg-surface-2 p-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carbohydrates (auto)</span>
                    <span className="tnum font-semibold text-foreground">{round(reconciled.carbs, 0)} g</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    Carbs absorb the difference so macros match your calorie target ({round(reconciled.calories, 0)} kcal).
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Enter recent true one-rep maxes if you have them. Leave 0 if unsure — FORGE will never invent numbers.
                  Training maxes default to 90% of these and stay editable.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Squat 1RM">
                    <Input type="number" inputMode="decimal" {...register('squat1rm')} />
                  </Field>
                  <Field label="Bench 1RM">
                    <Input type="number" inputMode="decimal" {...register('bench1rm')} />
                  </Field>
                  <Field label="Dead 1RM">
                    <Input type="number" inputMode="decimal" {...register('deadlift1rm')} />
                  </Field>
                </div>
              </div>
            )}
          </motion.div>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </Button>
        <Button onClick={next} rightIcon={<ArrowRight className="h-4 w-4" />} loading={formState.isSubmitting}>
          {step === STEPS.length - 1 ? 'Finish setup' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
