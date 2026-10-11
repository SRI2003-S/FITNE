/**
 * Weight-trend maths. Weekly averages and smoothed trends — never a single
 * daily reading — are the basis for judging fat-loss progress.
 */
import type { ISODate } from '@/types'
import { addDays, diffDays, startOfWeek } from './date'
import { round } from './utils'

export interface WeightPoint {
  date: ISODate
  weightKg: number
}

export function sortByDate(points: WeightPoint[]): WeightPoint[] {
  return [...points].sort((a, b) => (a.date < b.date ? -1 : 1))
}

/** Trailing moving average over `windowDays` calendar days. */
export function movingAverage(points: WeightPoint[], windowDays = 7): WeightPoint[] {
  const sorted = sortByDate(points)
  return sorted.map((p) => {
    const start = addDays(p.date, -(windowDays - 1))
    const window = sorted.filter((q) => q.date >= start && q.date <= p.date)
    const avg = window.reduce((a, q) => a + q.weightKg, 0) / (window.length || 1)
    return { date: p.date, weightKg: round(avg, 2) }
  })
}

export interface WeeklyAverage {
  weekStart: ISODate
  averageKg: number
  entries: number
}

export function weeklyAverages(points: WeightPoint[], weekStartsOn: 0 | 1 = 1): WeeklyAverage[] {
  const buckets = new Map<ISODate, number[]>()
  for (const p of sortByDate(points)) {
    const key = startOfWeek(p.date, weekStartsOn)
    const list = buckets.get(key) ?? []
    list.push(p.weightKg)
    buckets.set(key, list)
  }
  return [...buckets.entries()]
    .map(([weekStart, values]) => ({
      weekStart,
      averageKg: round(values.reduce((a, b) => a + b, 0) / values.length, 2),
      entries: values.length,
    }))
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1))
}

/** Least-squares slope in kg per week. Positive = gaining. */
export function trendKgPerWeek(points: WeightPoint[]): number | null {
  const sorted = sortByDate(points)
  if (sorted.length < 3) return null
  const base = sorted[0].date
  const xs = sorted.map((p) => diffDays(p.date, base))
  const ys = sorted.map((p) => p.weightKg)
  const n = xs.length
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY)
    den += (xs[i] - meanX) ** 2
  }
  if (den === 0) return null
  return round((num / den) * 7, 3)
}

function averageInRange(points: WeightPoint[], from: ISODate, to: ISODate): number | null {
  const window = points.filter((p) => p.date >= from && p.date <= to)
  if (!window.length) return null
  return round(window.reduce((a, b) => a + b.weightKg, 0) / window.length, 2)
}

export interface WeightSummary {
  latest: WeightPoint | null
  sevenDayAvg: number | null
  previousSevenDayAvg: number | null
  weeklyChangeKg: number | null
  totalChangeKg: number | null
  trendKgPerWeek: number | null
  direction: 'down' | 'up' | 'flat' | 'unknown'
}

export function summarizeWeight(points: WeightPoint[], today: ISODate): WeightSummary {
  const sorted = sortByDate(points)
  if (!sorted.length) {
    return {
      latest: null,
      sevenDayAvg: null,
      previousSevenDayAvg: null,
      weeklyChangeKg: null,
      totalChangeKg: null,
      trendKgPerWeek: null,
      direction: 'unknown',
    }
  }
  const latest = sorted[sorted.length - 1]
  const sevenDayAvg = averageInRange(sorted, addDays(today, -6), today)
  const previousSevenDayAvg = averageInRange(sorted, addDays(today, -13), addDays(today, -7))

  const weeklyChangeKg =
    sevenDayAvg != null && previousSevenDayAvg != null ? round(sevenDayAvg - previousSevenDayAvg, 2) : null

  const totalChangeKg = round(latest.weightKg - sorted[0].weightKg, 2)
  const trend = trendKgPerWeek(sorted)
  const direction: WeightSummary['direction'] =
    trend == null ? 'unknown' : trend < -0.05 ? 'down' : trend > 0.05 ? 'up' : 'flat'

  return {
    latest,
    sevenDayAvg,
    previousSevenDayAvg,
    weeklyChangeKg,
    totalChangeKg,
    trendKgPerWeek: trend,
    direction,
  }
}
