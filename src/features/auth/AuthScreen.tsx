import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Field } from '@/components/ui/Field'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { syncAll } from '@/lib/sync'
import { toast } from '@/store/ui'

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const auth = useAuth()
  const navigate = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'signin') await auth.signIn(email, password)
      else await auth.signUp(email, password)
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } }
      const uid = data?.session?.user?.id
      if (uid) await syncAll(uid)
      toast.success(mode === 'signin' ? 'Signed in & synced' : 'Account created')
      window.location.replace('/')
    } catch (err: any) {
      toast.error(err?.message ?? 'Auth failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5 pt-10">
      <PageHeader
        title="FORGE cloud"
        subtitle="Sign in to sync your data across devices"
      />
      <Card>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Password">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </Field>
            <Button type="submit" loading={busy} className="w-full">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === 'signin' ? "No account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </CardContent>
      </Card>
      <p className="text-center text-xs text-muted-foreground">
        With Supabase not configured, FORGE runs fully locally and this screen is skipped.
      </p>
    </div>
  )
}
