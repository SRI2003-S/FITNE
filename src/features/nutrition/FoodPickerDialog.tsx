import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { addCustomFood, addMealEntry } from '@/db/repos'
import { nutritionForGrams } from '@/lib/nutrition'
import { nowISO, uid } from '@/lib/utils'
import { toast } from '@/store/ui'
import type { Food, MealCategory } from '@/types'
import { MEAL_LABELS, MEAL_ORDER } from './useNutrition'
import { cn } from '@/lib/utils'

export function FoodPickerDialog({
  open,
  onClose,
  date,
  meal,
  foods,
}: {
  open: boolean
  onClose: () => void
  date: string
  meal: MealCategory
  foods: Food[]
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Food | null>(null)
  const [grams, setGrams] = useState(100)
  const [category, setCategory] = useState<MealCategory>(meal)
  const [creating, setCreating] = useState(false)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? foods.filter(
          (f) => f.name.toLowerCase().includes(q) || f.aliases.some((a) => a.toLowerCase().includes(q)),
        )
      : foods
    return [...list].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 60)
  }, [foods, query])

  const macros = selected ? nutritionForGrams(selected, grams) : null

  function reset() {
    setQuery('')
    setSelected(null)
    setGrams(100)
    setCreating(false)
  }

  async function handleAdd() {
    if (!selected || !macros) return
    await addMealEntry({
      id: uid(),
      date,
      meal: category,
      kind: 'food',
      foodId: selected.id,
      name: selected.name,
      grams,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      loggedAt: nowISO(),
    })
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
      title={creating ? 'Create custom food' : selected ? selected.name : 'Add food'}
      description={
        creating
          ? 'Values per 100 g — stored only on this device'
          : selected
            ? `${selected.source} · per 100 g`
            : 'Search the Indian food database'
      }
      footer={
        creating ? undefined : selected ? (
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Back
            </Button>
            <Button onClick={handleAdd}>Add to {MEAL_LABELS[category]}</Button>
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
        <CreateFoodForm
          initialName={query}
          onCancel={() => setCreating(false)}
          onCreated={(food) => {
            setCreating(false)
            setSelected(food)
            setGrams(food.commonPortions[0]?.grams ?? 100)
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
              placeholder="Search rice, chicken, curd, dal…"
              className="pl-9"
            />
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto thin-scrollbar">
            {results.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setSelected(f)
                  const first = f.commonPortions[0]?.grams ?? 100
                  setGrams(first)
                }}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left hover:border-border hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{f.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {f.category} · {Math.round(f.calories)} kcal / 100 g
                  </div>
                </div>
                <span className="tnum shrink-0 text-xs text-muted-foreground">
                  {Math.round(f.protein)}P · {Math.round(f.carbs)}C · {Math.round(f.fat)}F
                </span>
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
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Amount (g)</label>
              <Input
                type="number"
                inputMode="decimal"
                value={grams}
                onChange={(e) => setGrams(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Meal</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MealCategory)}
                className="h-11 w-full rounded-xl border border-input bg-surface-2 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                {MEAL_ORDER.map((m) => (
                  <option key={m} value={m}>
                    {MEAL_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selected.commonPortions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.commonPortions.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setGrams(p.grams)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-semibold',
                    grams === p.grams
                      ? 'border-primary bg-primary/12 text-primary'
                      : 'border-border bg-surface-2 text-muted-foreground',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {macros && (
            <div className="grid grid-cols-4 gap-2 rounded-xl border border-border bg-surface-2 p-3 text-center">
              <MacroStat label="kcal" value={macros.calories} />
              <MacroStat label="Protein" value={macros.protein} />
              <MacroStat label="Carbs" value={macros.carbs} />
              <MacroStat label="Fat" value={macros.fat} />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {selected.state === 'cooked' ? 'Cooked values' : selected.state === 'raw' ? 'Raw / dry values' : 'As sold'} ·
            source: {selected.source}
          </p>
        </div>
      )}
    </Dialog>
  )
}

function MacroStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="tnum text-lg font-bold text-foreground">{Math.round(value)}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  )
}

/* --------------------------- Create custom food --------------------------- */

const foodSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  category: z.string().trim().max(40),
  calories: z.coerce.number().min(0).max(2000),
  protein: z.coerce.number().min(0).max(200),
  carbs: z.coerce.number().min(0).max(400),
  fat: z.coerce.number().min(0).max(200),
  state: z.enum(['raw', 'cooked', 'as_sold']),
})
type FoodValues = z.infer<typeof foodSchema>

function CreateFoodForm({
  initialName,
  onCreated,
  onCancel,
}: {
  initialName: string
  onCreated: (food: Food) => void
  onCancel: () => void
}) {
  const { register, handleSubmit, formState } = useForm<z.input<typeof foodSchema>, any, FoodValues>({
    resolver: zodResolver(foodSchema),
    defaultValues: {
      name: initialName,
      category: '',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      state: 'cooked',
    },
  })

  async function submit(data: FoodValues) {
    const id = await addCustomFood({
      name: data.name,
      aliases: [],
      category: data.category || 'Custom',
      perGrams: 100,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      state: data.state,
      commonPortions: [
        { label: '100 g', grams: 100 },
        { label: '50 g', grams: 50 },
      ],
      source: 'Custom (you)',
    })
    const now = nowISO()
    toast.success(`Saved ${data.name}`)
    onCreated({
      id,
      name: data.name,
      aliases: [],
      category: data.category || 'Custom',
      perGrams: 100,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      state: data.state,
      commonPortions: [
        { label: '100 g', grams: 100 },
        { label: '50 g', grams: 50 },
      ],
      source: 'Custom (you)',
      custom: true,
      createdAt: now,
      updatedAt: now,
    })
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit(submit)}>
      <Field label="Name" hint="e.g. Homemade paneer bhurji">
        <Input autoFocus {...register('name')} placeholder="Food name" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category / brand" hint="Optional">
          <Input {...register('category')} placeholder="e.g. Snack" />
        </Field>
        <Field label="Basis">
          <Select {...register('state')}>
            <option value="cooked">Cooked</option>
            <option value="raw">Raw / dry</option>
            <option value="as_sold">As sold</option>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="kcal / 100 g">
          <Input type="number" inputMode="decimal" step="0.1" {...register('calories')} />
        </Field>
        <Field label="Protein g">
          <Input type="number" inputMode="decimal" step="0.1" {...register('protein')} />
        </Field>
        <Field label="Carbs g">
          <Input type="number" inputMode="decimal" step="0.1" {...register('carbs')} />
        </Field>
        <Field label="Fat g">
          <Input type="number" inputMode="decimal" step="0.1" {...register('fat')} />
        </Field>
      </div>

      {Object.values(formState.errors).length > 0 && (
        <p className="text-xs text-danger">Check the highlighted numbers — use values per 100 g.</p>
      )}

      <p className="text-xs text-muted-foreground">
        Store real label or recipe numbers per 100 g. FORGE will scale any portion for you.
      </p>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={formState.isSubmitting}>
          Save food
        </Button>
      </div>
    </form>
  )
}
