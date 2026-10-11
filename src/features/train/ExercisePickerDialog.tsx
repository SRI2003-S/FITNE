import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { addCustomExercise } from '@/db/repos'
import { nowISO } from '@/lib/utils'
import { toast } from '@/store/ui'
import type { Equipment, Exercise, MuscleGroup } from '@/types'

const MUSCLES: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'fullbody',
]

const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'ez-bar', 'other']

const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  fullbody: 'Full body',
}

export interface ExerciseConfig {
  sets: number
  repsLow: number
  repsHigh: number
  restSeconds: number
}

export function ExercisePickerDialog({
  open,
  onClose,
  exercises,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  exercises: Exercise[]
  onAdd: (exercise: Exercise, config: ExerciseConfig) => void
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [creating, setCreating] = useState(false)
  const [sets, setSets] = useState(3)
  const [repsLow, setRepsLow] = useState(8)
  const [repsHigh, setRepsHigh] = useState(12)
  const [restSeconds, setRestSeconds] = useState(90)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? exercises.filter(
          (e) => e.name.toLowerCase().includes(q) || e.aliases.some((a) => a.toLowerCase().includes(q)),
        )
      : exercises
    return [...list].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 80)
  }, [exercises, query])

  function reset() {
    setQuery('')
    setSelected(null)
    setCreating(false)
    setSets(3)
    setRepsLow(8)
    setRepsHigh(12)
    setRestSeconds(90)
  }

  function handleAdd() {
    if (!selected) return
    onAdd(selected, { sets, repsLow, repsHigh, restSeconds })
    toast.success(`Added ${selected.name}`)
    reset()
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title={creating ? 'Create custom exercise' : selected ? selected.name : 'Add exercise'}
      description={
        creating
          ? 'Stored only on this device'
          : selected
            ? `${MUSCLE_LABEL[selected.muscle]} · ${selected.equipment}`
            : 'Pick an exercise to add to this workout'
      }
      footer={
        creating ? undefined : selected ? (
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Back
            </Button>
            <Button onClick={handleAdd}>Add to workout</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreating(true)}>
              Create custom
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </>
        )
      }
    >
      {creating ? (
        <CreateExerciseForm
          initialName={query}
          onCancel={() => setCreating(false)}
          onCreated={(exercise) => {
            setCreating(false)
            setSelected(exercise)
            setQuery('')
          }}
        />
      ) : !selected ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bench, squat, curl…"
              className="pl-9"
            />
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto thin-scrollbar">
            {results.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelected(e)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left hover:border-border hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{e.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {MUSCLE_LABEL[e.muscle]} · {e.equipment}
                    {e.custom && ' · custom'}
                  </div>
                </div>
              </button>
            ))}
            {results.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">No match for “{query}”.</p>
                <Button
                  className="mt-3"
                  variant="secondary"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setCreating(true)}
                >
                  Create “{query.trim()}”
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sets">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={12}
                value={sets}
                onChange={(e) => setSets(Number(e.target.value) || 1)}
              />
            </Field>
            <Field label="Rest (seconds)">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={600}
                value={restSeconds}
                onChange={(e) => setRestSeconds(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Reps (low)">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                value={repsLow}
                onChange={(e) => setRepsLow(Number(e.target.value) || 1)}
              />
            </Field>
            <Field label="Reps (high)">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                value={repsHigh}
                onChange={(e) => setRepsHigh(Number(e.target.value) || 1)}
              />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            {sets} × {repsLow}
            {repsHigh !== repsLow ? `–${repsHigh}` : ''} reps · rest {restSeconds}s. You can adjust sets after adding.
          </p>
        </div>
      )}
    </Dialog>
  )
}

/* --------------------------- Create custom exercise --------------------------- */

const exerciseSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  muscle: z.enum([
    'chest',
    'back',
    'shoulders',
    'biceps',
    'triceps',
    'quads',
    'hamstrings',
    'glutes',
    'calves',
    'core',
    'fullbody',
  ]),
  equipment: z.enum(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'ez-bar', 'other']),
  isCompound: z.boolean(),
})
type ExerciseValues = z.infer<typeof exerciseSchema>

function CreateExerciseForm({
  initialName,
  onCreated,
  onCancel,
}: {
  initialName: string
  onCreated: (exercise: Exercise) => void
  onCancel: () => void
}) {
  const { register, handleSubmit, formState } = useForm<z.input<typeof exerciseSchema>, any, ExerciseValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: initialName,
      muscle: 'chest',
      equipment: 'barbell',
      isCompound: false,
    },
  })

  async function submit(data: ExerciseValues) {
    const id = await addCustomExercise({
      name: data.name,
      aliases: [],
      muscle: data.muscle,
      secondaryMuscles: [],
      equipment: data.equipment,
      instructions: '',
      isCompound: data.isCompound,
    })
    const now = nowISO()
    toast.success(`Saved ${data.name}`)
    onCreated({
      id,
      name: data.name,
      aliases: [],
      muscle: data.muscle,
      secondaryMuscles: [],
      equipment: data.equipment,
      instructions: '',
      isCompound: data.isCompound,
      custom: true,
      createdAt: now,
      updatedAt: now,
    })
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit(submit)}>
      <Field label="Name" hint="e.g. Incline cable fly">
        <Input autoFocus {...register('name')} placeholder="Exercise name" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Primary muscle">
          <Select {...register('muscle')}>
            {MUSCLES.map((m) => (
              <option key={m} value={m}>
                {MUSCLE_LABEL[m]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Equipment">
          <Select {...register('equipment')}>
            {EQUIPMENT.map((eq) => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
        <input type="checkbox" className="h-4 w-4 accent-primary" {...register('isCompound')} />
        <span className="text-sm text-foreground">Compound lift</span>
      </label>

      <p className="text-xs text-muted-foreground">
        Custom exercises are saved for future workouts and kept only on this device.
      </p>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={formState.isSubmitting}>
          Save exercise
        </Button>
      </div>
    </form>
  )
}
