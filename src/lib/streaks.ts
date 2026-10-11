import { addDays, todayKey } from './date'

/**
 * Consecutive-day streak ending today (or yesterday, so a single missed
 * morning doesn't erase the streak). Never guilt-based — just a count.
 */
export function currentStreak(dates: Iterable<string>, endDate = todayKey(), maxLookback = 1000): number {
  const set = new Set(dates)
  if (set.size === 0) return 0

  let cursor = endDate
  if (!set.has(cursor)) {
    cursor = addDays(cursor, -1)
    if (!set.has(cursor)) return 0
  }

  let count = 0
  for (let i = 0; i < maxLookback; i++) {
    if (set.has(cursor)) {
      count++
      cursor = addDays(cursor, -1)
    } else {
      break
    }
  }
  return count
}

export function longestStreak(dates: Iterable<string>): number {
  const sorted = [...new Set(dates)].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of sorted) {
    if (prev && addDays(prev, 1) === d) run++
    else run = 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}
