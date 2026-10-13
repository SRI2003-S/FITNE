import { supabase, isCloudEnabled } from './supabase'
import type { PhotoView } from '@/types'

/**
 * Upload a progress photo to Supabase Storage when cloud is configured.
 * Returns the storage path (or null if cloud is off / upload failed).
 * Local copy in IndexedDB is always kept.
 */
export async function uploadProgressPhoto(
  blob: Blob,
  opts: { date: string; view: PhotoView; userId?: string | null },
): Promise<string | null> {
  if (!isCloudEnabled() || !supabase) return null
  const path = `${opts.userId ?? 'anon'}/${opts.date}/${opts.view}-${Date.now()}.jpg`
  const { error } = await supabase.storage.from('progress-photos').upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: false,
  })
  if (error) {
    console.warn('progress photo upload failed:', error.message)
    return null
  }
  return path
}
