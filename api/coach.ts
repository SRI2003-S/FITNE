import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleGenAI } from '@google/genai'

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
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    })
    const text = (response as any)?.text
    if (!text) return res.status(502).json({ error: 'No response from model', raw: response })
    return res.status(200).json({ text })
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message })
  }
}
