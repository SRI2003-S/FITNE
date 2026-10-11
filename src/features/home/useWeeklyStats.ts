import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { addDays, startOfWeek } from '@/lib/date'

export interface WeeklyStats {
  avgCalories: number | null
  avgProtein: number | null
  loggedDays: number
  sessionsCompleted: number
  weightChangeKg: number | null
}

export function useWeeklyStats(today: string, trainingDaysPerWeek = 5, weekStartsOn: 0 | 1 = 1) {
  const weekStart = startOfWeek(today, weekStartsOn)
  return useLiveQuery(async () => {
    const [meals, sessions, weights] = await Promise.all([
      db.mealEntries.where('date').between(weekStart, today, true, true).toArray(),
      db.workoutSessions.where('date').between(weekStart, today, true, true).toArray(),
      db.weightEntries.where('date').between(addDays(today, -13), today, true, true).toArray(),
    ])

    const byDay = new Map<string, { cal: number; pro: number }>()
    for (const m of meals) {
      const cur = byDay.get(m.date) ?? { cal: 0, pro: 0 }
      cur.cal += m.calories
      cur.pro += m.protein
      byDay.set(m.date, cur)
    }
    const days = [...byDay.values()]
    const avgCalories = days.length ? days.reduce((a, d) => a + d.cal, 0) / days.length : null
    const avgProtein = days.length ? days.reduce((a, d) => a + d.pro, 0) / days.length : null

    const sessionsCompleted = sessions.filter((s) => s.status === 'completed').length

    const sorted = [...weights].sort((a, b) => (a.date < b.date ? -1 : 1))
    const recent = sorted.filter((w) => w.date >= addDays(today, -6))
    const prior = sorted.filter((w) => w.date >= addDays(today, -13) && w.date < addDays(today, -6))
    const avg = (arr: typeof sorted) => (arr.length ? arr.reduce((a, w) => a + w.weightKg, 0) / arr.length : null)
    const rAvg = avg(recent)
    const pAvg = avg(prior)
    const weightChangeKg = rAvg != null && pAvg != null ? Math.round((rAvg - pAvg) * 100) / 100 : null

    return {
      avgCalories,
      avgProtein,
      loggedDays: byDay.size,
      sessionsCompleted,
      weightChangeKg,
    } satisfies WeeklyStats
  }, [weekStart, today, trainingDaysPerWeek])
}
