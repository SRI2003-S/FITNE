import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input } from '@/components/ui/Field'
import { Switch } from '@/components/ui/Switch'
import { saveWeightEntry, updateGoal } from '@/db/repos'
import { todayKey } from '@/lib/date'
import { toast } from '@/store/ui'
import type { WeightEntry } from '@/types'

const schema = z.object({
  date: z.string().min(1),
  weightKg: z.coerce.number().min(20, 'Enter a realistic weight').max(400),
  waistCm: z.coerce.number().min(0).max(250).optional(),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function WeightDialog({
  open,
  onClose,
  defaultDate = todayKey(),
  entry,
}: {
  open: boolean
  onClose: () => void
  defaultDate?: string
  entry?: WeightEntry | null
}) {
  const [standardized, setStandardized] = useState(true)
  const { register, handleSubmit, reset, formState } = useForm<z.input<typeof schema>, any, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: defaultDate, weightKg: 0, waistCm: undefined, note: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        date: entry?.date ?? defaultDate,
        weightKg: entry?.weightKg ?? 0,
        waistCm: entry?.waistCm ?? undefined,
        note: entry?.note ?? '',
      })
      setStandardized(entry?.standardized ?? true)
    }
  }, [open, defaultDate, entry, reset])

  async function onSubmit(data: FormValues) {
    await saveWeightEntry({
      date: data.date,
      weightKg: data.weightKg,
      waistCm: data.waistCm || null,
      note: data.note,
      standardized,
    })
    if (data.date === todayKey()) await updateGoal({ currentWeightKg: data.weightKg })
    toast.success('Weight saved')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Log morning weight"
      description="Measured fasted, after the bathroom, before eating."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={formState.isSubmitting}>
            Save
          </Button>
        </>
      }
    >
      <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input type="date" {...register('date')} />
          </Field>
          <Field label="Weight (kg)">
            <Input type="number" step="0.1" inputMode="decimal" autoFocus {...register('weightKg')} />
          </Field>
        </div>
        {formState.errors.weightKg && (
          <p className="text-xs text-danger">{formState.errors.weightKg.message}</p>
        )}
        <Field label="Waist (cm)" hint="Optional — useful alongside the scale">
          <Input type="number" step="0.1" inputMode="decimal" placeholder="—" {...register('waistCm')} />
        </Field>
        <Field label="Note" hint="Optional">
          <Input placeholder="e.g. poor sleep, high sodium" {...register('note')} />
        </Field>

        <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 p-3">
          <div>
            <div className="text-sm font-semibold text-foreground">Standardised measurement</div>
            <div className="text-xs text-muted-foreground">Fasted, post-void, before food</div>
          </div>
          <Switch checked={standardized} onChange={setStandardized} label="Standardised" />
        </div>
      </form>
    </Dialog>
  )
}
