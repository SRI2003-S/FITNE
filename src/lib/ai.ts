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
    if (!r.ok) return null
    const data = (await r.json()) as { text?: string }
    return data.text ?? null
  } catch {
    return null
  }
}
