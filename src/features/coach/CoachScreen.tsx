import { useMemo, useState } from 'react'
import { Bot, Lock, Sparkles, Utensils } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useFoods, useGoal, usePreferences, useProfile, useMeals } from '@/hooks/useAppData'
import { useWeeklyStats } from '@/features/home/useWeeklyStats'
import { mealsToMacros, useDayTarget } from '@/features/nutrition/useNutrition'
import { explainWeightChange, mealIdeas, summarizeWeek } from '@/lib/insights'
import { remainingMacros } from '@/lib/nutrition'
import { todayKey } from '@/lib/date'

type Insight = { title: string; lines: string[] }

export function CoachScreen() {
  const today = todayKey()
  const profile = useProfile()
  const prefs = usePreferences()
  const goal = useGoal()
  const foods = useFoods()
  const meals = useMeals(today)
  const target = useDayTarget()
  const weekly = useWeeklyStats(today, profile?.trainingDaysPerWeek ?? 5, 1)

  const [insight, setInsight] = useState<Insight | null>(null)

  const consumed = useMemo(() => mealsToMacros(meals ?? []), [meals])
  const remaining = remainingMacros(target, consumed)

  function runWeekSummary() {
    if (!weekly) return
    setInsight({
      title: 'Last 7 days',
      lines: summarizeWeek({
        avgCalories: weekly.avgCalories,
        avgProtein: weekly.avgProtein,
        sessionsCompleted: weekly.sessionsCompleted,
        sessionsPlanned: profile?.trainingDaysPerWeek ?? 5,
        weightChangeKg: weekly.weightChangeKg,
        calorieTarget: goal?.calorieTarget ?? 2700,
        proteinTarget: goal?.proteinTarget ?? 180,
        daysLogged: weekly.loggedDays,
      }),
    })
  }

  function runWeightExplanation() {
    setInsight({
      title: 'Weight trend',
      lines: [explainWeightChange(weekly?.weightChangeKg ?? null, goal?.weeklyLossTargetKg ?? 0.5)],
    })
  }

  function runMealIdeas() {
    const ideas = mealIdeas(
      { calories: remaining.calories, protein: remaining.protein },
      foods ?? [],
      { avoid: ['whey', 'egg', 'whole egg', 'yolk'] },
    )
    setInsight({
      title: 'Protein ideas for the rest of today',
      lines: ideas.length
        ? ideas.map((i) => `${i.label} — ${i.grams} g (${i.calories} kcal, ${i.protein} g protein)`)
        : ['You have little calorie room left. Prioritise a lean protein source such as curd or grilled fish in a small portion.'],
    })
  }

  return (
    <div className="space-y-4">
      <PageHeader title="AI Coach" subtitle="Transparent guidance from your own logged data" />

      <Card className="border-primary/20">
        <CardContent>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Bot className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">Coach status</h2>
                <Badge tone={prefs?.aiEnabled ? 'success' : 'neutral'}>
                  {prefs?.aiEnabled ? 'Gemini enabled' : 'Rules-based (no AI)'}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {prefs?.aiEnabled
                  ? 'Gemini is configured. Responses are validated before they are shown.'
                  : 'AI is off by default so the app works fully offline. Every insight below is computed locally from your real data — no model, no invention.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button variant="secondary" onClick={runWeekSummary} leftIcon={<Sparkles className="h-4 w-4" />}>
          7-day summary
        </Button>
        <Button variant="secondary" onClick={runWeightExplanation}>
          Weight trend
        </Button>
        <Button variant="secondary" onClick={runMealIdeas} leftIcon={<Utensils className="h-4 w-4" />}>
          Meal ideas
        </Button>
        <Button variant="secondary" onClick={() => setInsight({ title: 'Training', lines: trainingLines(weekly?.sessionsCompleted ?? 0, profile?.trainingDaysPerWeek ?? 5) })}>
          Training review
        </Button>
      </div>

      {insight ? (
        <Card>
          <CardContent>
            <h3 className="mb-2 text-sm font-bold text-foreground">{insight.title}</h3>
            <ul className="space-y-2">
              {insight.lines.map((l, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Rule-based output · derived only from entries you logged · not medical advice.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-primary" />
            <p className="text-sm text-muted-foreground">
              Choose an insight above. Everything is computed on this device from your real logs.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <div className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Lock className="h-4 w-4 text-success" /> Secure Gemini integration (optional)
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>• The API key lives only in a server-side environment variable — never in this app’s code or storage.</li>
            <li>• Requests go through a server endpoint with input validation and per-user quotas.</li>
            <li>• Private photos are never sent to the model without explicit consent.</li>
            <li>• Structured output is validated with Zod before it can touch your data.</li>
            <li>• If the model is unavailable or quota-limited, this rules-based fallback keeps working.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function trainingLines(completed: number, planned: number): string[] {
  const ratio = planned ? completed / planned : 0
  const lines = [`You completed ${completed} of ${planned} planned sessions (${Math.round(ratio * 100)}%).`]
  if (ratio >= 0.9) lines.push('Adherence is excellent; keep main-lift intensity honest with 1–3 reps in reserve.')
  else if (ratio >= 0.6) lines.push('Decent consistency. Aim to protect the two heavy days if life gets busy.')
  else lines.push('Consistency is the lever here. Even abbreviated sessions preserve the habit and muscle.')
  lines.push('Never max-test weekly. Let the eight-week percentages guide load and stop 1–2 reps short on heavy sets.')
  return lines
}
