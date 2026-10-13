import { db } from '@/db/db'
import { supabase } from '@/lib/supabase'
import { uploadProgressPhoto } from '@/lib/cloudPhotos'

export async function pushDirty(userId: string) {
  if (!supabase) return
  for (const table of db.tables) {
    const rows: any[] = await table.filter((r: any) => r.dirty === 1).toArray()
    for (const row of rows) {
      let payload: any = { ...row }

      if (table.name === 'progressPhotos' && row.blob) {
        if (!row.storagePath) {
          const path = await uploadProgressPhoto(row.blob, {
            date: row.date,
            view: row.view,
            userId,
          })
          if (path) {
            await table.update(row.id, { storagePath: path })
            payload.storagePath = path
          }
        }
        delete payload.blob
        delete payload.thumbBlob
      }

      const { error } = await supabase.from('app_records').upsert(
        {
          user_id: userId,
          table_name: table.name,
          id: row.id,
          payload,
          updated_at: row.updatedAt ?? new Date().toISOString(),
        },
        { onConflict: 'user_id,table_name,id' },
      )
      if (!error) {
        await table.update(row.id, { dirty: 0 })
      }
    }
  }
}

export async function pullAll(userId: string) {
  if (!supabase) return
  const { data, error } = await supabase
    .from('app_records')
    .select('table_name,id,payload')
    .eq('user_id', userId)
  if (error || !data) return
  for (const rec of data) {
    const table = db.table(rec.table_name)
    if (!table) continue
    const existing = await table.get(rec.id)
    await table.put({
      ...rec.payload,
      blob: rec.payload?.blob ?? existing?.blob,
      thumbBlob: rec.payload?.thumbBlob ?? existing?.thumbBlob,
      dirty: 0,
    })
  }
}

export async function syncAll(userId: string) {
  await pushDirty(userId)
  await pullAll(userId)
}
