/**
 * Thin client for the (optional) server-side AI proxy. When the endpoint is
 * unavailable or aiEnabled is false, callers fall back to local rules.
 */
export async function askCoach(prompt: string): Promise<string | null> {
  try {
    const r = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    const data = (await r.json().catch(() => ({}))) as { text?: string; error?: string }
    if (!r.ok) return `AI unavailable: ${data.error ?? r.statusText}`
    return data.text ?? 'No response from model'
  } catch {
    return null
  }
}
