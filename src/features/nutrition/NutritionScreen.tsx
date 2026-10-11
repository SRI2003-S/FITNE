import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Copy, Plus, Trash2, UtensilsCrossed } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { EmptyState } from '@/components/common/EmptyState'
import { useFoods, useMeals } from '@/hooks/useAppData'
import { clearMealsForDate, copyMealsFromDate, deleteMealEntry } from '@/db/repos'
import { addMealEntry } from '@/db/repos'
import { SAMPLE_DAY } from '@/data/foods'
import { nutritionForGrams, remainingMacros } from '@/lib/nutrition'
import { nowISO, uid } from '@/lib/utils'
import { addDays, isToday, relativeDayLabel, todayKey } from '@/lib/date'
import { toast } from '@/store/ui'
import { MEAL_LABELS, MEAL_ORDER, mealsToMacros, useDayTarget } from './useNutrition'
import { FoodPickerDialog } from './FoodPickerDialog'
import type { MealCategory } from '@/types'

export function NutritionScreen() {
  const [date, setDate] = useState(todayKey())
  const [pickerMeal, setPickerMeal] = useState<MealCategory | null>(null)

  const meals = useMeals(date)
  const foods = useFoods()
  const target = useDayTarget()

  const consumed = useMemo(() => mealsToMacros(meals ?? []), [meals])
  const remaining = remainingMacros(target, consumed)

  const grouped = useMemo(() => {
    const map = new Map<MealCategory, NonNullable<typeof meals>>()
    for (const m of meals ?? []) {
      const list = map.get(m.meal) ?? []
      list.push(m)
      map.set(m.meal, list)
    }
    return map
  }, [meals])

  async function loadSampleDay() {
    if (!foods) return
    let added = 0
    for (const item of SAMPLE_DAY) {
      const food = foods.find((f) => f.id === item.foodId)
      if (!food) continue
      const macros = nutritionForGrams(food, item.grams)
      await addMealEntry({
        id: uid(),
        date,
        meal: item.meal as MealCategory,
        kind: 'food',
        foodId: food.id,
        name: item.label,
        grams: item.grams,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        loggedAt: nowISO(),
      })
      added++
    }
    toast.success(`Loaded sample day (${added} items) — edit freely`)
  }

  async function copyYesterday() {
    const n = await copyMealsFromDate(addDays(date, -1), date)
    toast[n ? 'success' : 'info'](n ? `Copied ${n} items from yesterday` : 'Nothing logged yesterday')
  }

  async function clearDay() {
    await clearMealsForDate(date)
    toast.info('Cleared this day')
  }

  const totalMealKcal = consumed.calories

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nutrition"
        subtitle="Indian-focused food logging with honest portion maths"
        actions={
          <div className="flex items-center gap-1">
            <Button size="icon-sm" variant="secondary" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="icon-sm" variant="secondary" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-bold text-foreground">
              {isToday(date) ? 'Today' : relativeDayLabel(date)}
            </div>
            <div className="text-xs text-muted-foreground">
              {isToday(date) ? 'Logging live' : date}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <BigMacro label="Calories" value={consumed.calories} target={target.calories} unit="kcal" tone="primary" />
            <BigMacro label="Protein" value={consumed.protein} target={target.protein} unit="g" tone="success" />
            <BigMacro label="Carbs" value={consumed.carbs} target={target.carbs} unit="g" tone="default" />
            <BigMacro label="Fat" value={consumed.fat} target={target.fat} unit="g" tone="warning" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={copyYesterday}>
              Copy yesterday
            </Button>
            <Button size="sm" variant="ghost" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={loadSampleDay}>
              Load sample day
            </Button>
            {(meals?.length ?? 0) > 0 && (
              <Button size="sm" variant="ghost" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={clearDay}>
                Clear
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Remaining: <span className="font-semibold text-foreground">{Math.max(0, Math.round(remaining.calories))} kcal</span> ·{' '}
            {Math.max(0, Math.round(remaining.protein))} g protein
          </p>
        </CardContent>
      </Card>

      {(meals?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="h-6 w-6" />}
          title="Nothing logged for this day"
          description="Add foods by meal, copy yesterday, or load the sample Indian day as a starting template (clearly labelled, fully editable)."
          action={
            <div className="flex gap-2">
              <Button onClick={() => setPickerMeal('breakfast')} leftIcon={<Plus className="h-4 w-4" />}>
                Add food
              </Button>
              <Button variant="secondary" onClick={loadSampleDay}>
                Load sample day
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-3">
          {MEAL_ORDER.map((meal) => {
            const entries = grouped.get(meal) ?? []
            const mealKcal = entries.reduce((a, e) => a + e.calories, 0)
            const mealProtein = entries.reduce((a, e) => a + e.protein, 0)
            return (
              <Card key={meal}>
                <CardContent className="p-3 sm:p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-sm font-bold text-foreground">{MEAL_LABELS[meal]}</h3>
                      {entries.length > 0 && (
                        <span className="tnum text-xs text-muted-foreground">
                          {Math.round(mealKcal)} kcal · {Math.round(mealProtein)} g P
                        </span>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setPickerMeal(meal)}>
                      Add
                    </Button>
                  </div>

                  {entries.length === 0 ? (
                    <p className="py-2 text-xs text-muted-foreground">Nothing here yet.</p>
                  ) : (
                    <ul className="divide-y divide-border/60">
                      {entries.map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-foreground">{e.name}</div>
                            <div className="tnum text-xs text-muted-foreground">
                              {e.grams ? `${Math.round(e.grams)} g · ` : ''}
                              {Math.round(e.calories)} kcal · {Math.round(e.protein)}P / {Math.round(e.carbs)}C / {Math.round(e.fat)}F
                            </div>
                          </div>
                          <button
                            onClick={() => deleteMealEntry(e.id)}
                            aria-label="Delete entry"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )
          })}

          <p className="text-center text-xs text-muted-foreground">
            Total planned vs actual: {Math.round(totalMealKcal)} / {target.calories} kcal. Nutrition data is approximate.
          </p>
        </div>
      )}

      <FoodPickerDialog
        open={pickerMeal !== null}
        onClose={() => setPickerMeal(null)}
        date={date}
        meal={pickerMeal ?? 'breakfast'}
        foods={foods ?? []}
      />
    </div>
  )
}

function BigMacro({
  label,
  value,
  target,
  unit,
  tone,
}: {
  label: string
  value: number
  target: number
  unit: string
  tone: 'primary' | 'success' | 'default' | 'warning'
}) {
  const barColor =
    tone === 'success' ? 'bg-chart-3' : tone === 'warning' ? 'bg-chart-5' : tone === 'primary' ? 'bg-primary' : 'bg-chart-2'
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <div className="tnum mt-1 text-xl font-black text-foreground">
        {Math.round(value)}
        <span className="ml-0.5 text-xs font-medium text-muted-foreground">/ {Math.round(target)} {unit}</span>
      </div>
      <Progress value={value} max={target} className="mt-2" barClassName={barColor} />
    </div>
  )
}
