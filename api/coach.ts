import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'Gemini not configured (GEMINI_API_KEY missing)' })
  }
  const { prompt } = (req.body ?? {}) as { prompt?: string }
  if (!prompt || typeof prompt !== 'string' || prompt.length > 4000) {
    return res.status(400).json({ error: 'Invalid prompt' })
  }
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
        }),
      },
    )
    const data = await r.json()
    const candidate = data?.candidates?.[0]
    const text = candidate?.content?.parts?.map((p: any) => p.text).join('')?.trim()
    if (!text) {
      return res.status(502).json({
        error: 'No response from model',
        finishReason: candidate?.finishReason,
        safetyRatings: candidate?.safetyRatings,
        raw: data,
      })
    }
    return res.status(200).json({ text })
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message })
  }
}
