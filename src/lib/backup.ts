import { db } from '@/db/db'

export const BACKUP_TABLES = [
  'profile',
  'preferences',
  'goals',
  'weightEntries',
  'bodyMeasurements',
  'progressPhotos',
  'exercises',
  'workoutTemplates',
  'workoutSessions',
  'personalRecords',
  'trainingMaxes',
  'foods',
  'recipes',
  'mealEntries',
  'nutritionTargetDays',
  'waterEntries',
  'recoveryEntries',
  'habits',
  'habitLogs',
  'reminders',
  'weeklyReports',
] as const

export type BackupTable = (typeof BACKUP_TABLES)[number]

export interface BackupBundle {
  app: 'FORGE'
  version: 1
  exportedAt: string
  tables: Partial<Record<BackupTable, unknown[]>>
}

export async function exportAll(): Promise<BackupBundle> {
  const tables: BackupBundle['tables'] = {}
  for (const name of BACKUP_TABLES) {
    // progressPhotos contain Blobs, which don't survive JSON; export metadata only.
    const rows = await (db as unknown as Record<string, { toArray: () => Promise<unknown[]> }>)[name].toArray()
    tables[name] = rows.map((r) => {
      if (name === 'progressPhotos') {
        const { blob: _blob, thumbBlob: _thumb, ...rest } = r as Record<string, unknown>
        return { ...rest, blobStored: true }
      }
      return r
    })
  }
  return { app: 'FORGE', version: 1, exportedAt: new Date().toISOString(), tables }
}

export function downloadText(filename: string, text: string, mime = 'application/json') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadJSON(bundle: BackupBundle, prefix = 'forge-backup') {
  downloadText(`${prefix}-${bundle.exportedAt.slice(0, 10)}.json`, JSON.stringify(bundle, null, 2))
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  const escape = (v: unknown) => {
    if (v == null) return ''
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(',')]
  for (const r of rows) lines.push(headers.map((h) => escape(r[h])).join(','))
  return lines.join('\n')
}

export async function exportTableCSV(name: BackupTable): Promise<string> {
  const rows = await (db as unknown as Record<string, { toArray: () => Promise<Record<string, unknown>[]> }>)[name].toArray()
  return toCSV(
    rows.map((r) => {
      const copy = { ...r }
      delete copy.blob
      delete copy.thumbBlob
      return copy
    }),
  )
}

export interface ImportResult {
  imported: number
  tables: number
  errors: string[]
}

/** Validate a backup bundle structurally, then merge it into the local DB. */
export async function importBundle(text: string): Promise<ImportResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { imported: 0, tables: 0, errors: ['File is not valid JSON'] }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { imported: 0, tables: 0, errors: ['Backup must be a JSON object'] }
  }

  const bundle = parsed as Partial<BackupBundle>
  if (bundle.app !== 'FORGE' || !bundle.tables || typeof bundle.tables !== 'object') {
    return { imported: 0, tables: 0, errors: ['Not a recognised FORGE backup (missing app/tables)'] }
  }

  const errors: string[] = []
  let imported = 0
  let tables = 0

  for (const name of BACKUP_TABLES) {
    const rows = (bundle.tables as Record<string, unknown>)[name]
    if (!Array.isArray(rows) || rows.length === 0) continue
    const valid = rows.filter((r) => r && typeof r === 'object' && typeof (r as { id?: unknown }).id === 'string')
    if (valid.length !== rows.length) {
      errors.push(`${name}: skipped ${rows.length - valid.length} invalid record(s)`)
    }
    if (name === 'progressPhotos') {
      // Photos can't be restored from JSON alone; skip blobs but keep metadata.
      continue
    }
    try {
      await (db as unknown as Record<string, { bulkPut: (r: unknown[]) => Promise<unknown> }>)[name].bulkPut(valid)
      imported += valid.length
      tables++
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : 'import failed'}`)
    }
  }

  return { imported, tables, errors }
}
