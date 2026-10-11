import type { ISODate } from '@/types'

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export function toDateKey(date: Date): ISODate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromDateKey(key: ISODate): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function todayKey(): ISODate {
  return toDateKey(new Date())
}

export function addDays(key: ISODate, days: number): ISODate {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

export function diffDays(a: ISODate, b: ISODate): number {
  const ms = fromDateKey(a).getTime() - fromDateKey(b).getTime()
  return Math.round(ms / 86_400_000)
}

export function weekdayOf(key: ISODate): number {
  return fromDateKey(key).getDay()
}

/** Monday-based start of the week containing `key`. */
export function startOfWeek(key: ISODate, weekStartsOn: 0 | 1 = 1): ISODate {
  const d = fromDateKey(key)
  const day = d.getDay()
  const diff = weekStartsOn === 1 ? (day === 0 ? -6 : 1 - day) : -day
  return addDays(key, diff)
}

export function endOfWeek(key: ISODate, weekStartsOn: 0 | 1 = 1): ISODate {
  return addDays(startOfWeek(key, weekStartsOn), 6)
}

export function lastNDays(n: number, endKey: ISODate = todayKey()): ISODate[] {
  const out: ISODate[] = []
  for (let i = n - 1; i >= 0; i--) out.push(addDays(endKey, -i))
  return out
}

export function isToday(key: ISODate): boolean {
  return key === todayKey()
}

export function formatDate(
  key: ISODate,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
): string {
  return fromDateKey(key).toLocaleDateString(undefined, opts)
}

export function formatDateLong(key: ISODate): string {
  return fromDateKey(key).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function humanizeSeconds(total: number): string {
  const s = Math.max(0, Math.round(total))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`
  return `${sec}s`
}

export function relativeDayLabel(key: ISODate): string {
  const delta = diffDays(key, todayKey())
  if (delta === 0) return 'Today'
  if (delta === -1) return 'Yesterday'
  if (delta === 1) return 'Tomorrow'
  return formatDateLong(key)
}
