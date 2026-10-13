import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return {
    configured: !!supabase,
    loading,
    session,
    user: session?.user ?? null,
    async signIn(email: string, password: string) {
      if (!supabase) throw new Error('Supabase not configured')
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    async signUp(email: string, password: string) {
      if (!supabase) throw new Error('Supabase not configured')
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
    },
    async signOut() {
      if (!supabase) return
      await supabase.auth.signOut()
    },
  }
}
