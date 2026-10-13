import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

// Lazily created so the app boots without env vars (local-first mode).
export const supabase = SUPABASE_CONFIGURED
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
  : null

export function isCloudEnabled() {
  return supabase !== null
}
