import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { audio: audioBase64, mimeType } = body

    if (!audioBase64) {
      return NextResponse.json({ success: false, error: 'No audio received' })
    }

    const buffer = Buffer.from(audioBase64, 'base64')

    if (buffer.length < 500) {
      return NextResponse.json({ success: false, error: 'Audio too short — please hold and speak clearly' })
    }

    // Strip codec suffix — Whisper only accepts base mime type
    const cleanMime = (mimeType || 'audio/webm').split(';')[0].trim()
    const ext = cleanMime.includes('mp4') ? 'mp4' : cleanMime.includes('ogg') ? 'ogg' : 'webm'
    const audioFile = new File([buffer], `audio.${ext}`, { type: cleanMime })

    let transcriptText = ''
    // If textOnly mode — just return transcript, skip Gemini
    if (body.textOnly) {
      return NextResponse.json({ success: true, transcript: transcriptText })
    }
    try {
      const transcript = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
      })
      transcriptText = transcript?.text?.trim() || ''
    } catch (e: any) {
      console.error('Whisper error:', e?.message)
      return NextResponse.json({ success: false, error: 'Could not transcribe. Speak clearly and try again.' })
    }

    if (!transcriptText) {
      return NextResponse.json({ success: false, error: 'No speech detected. Please try again.' })
    }

    // Extract follow-up using Gemini
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const fallbackDate = new Date(today.getTime() + 3 * 86400000).toISOString().split('T')[0]

    const prompt = `Today is ${todayStr}.

Sales person said: "${transcriptText}"

Extract follow-up. Return ONLY JSON, no markdown:
{
  "action": "call" or "whatsapp" or "email" or "meeting" or "send_quote" or "follow_up",
  "due_date": "YYYY-MM-DD",
  "note": "brief English summary",
  "confidence": "high" or "medium" or "low"
}

Date rules:
- kal/tomorrow = ${new Date(today.getTime() + 86400000).toISOString().split('T')[0]}
- parso = ${new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0]}
- agle hafte/next week = ${new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0]}
- 2 din baad = ${new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0]}
- No date mentioned = ${fallbackDate}
- Monday=next Monday, Tuesday=next Tuesday etc`

    let extracted = { action: 'follow_up', due_date: fallbackDate, note: transcriptText, confidence: 'low' }

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
          })
        }
      )
      const geminiData = await geminiRes.json()
      const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const clean = raw.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      extracted = {
        action: parsed.action || 'follow_up',
        due_date: parsed.due_date || fallbackDate,
        note: parsed.note || transcriptText,
        confidence: parsed.confidence || 'medium'
      }
    } catch (e) {
      console.log('Gemini extraction failed, using transcript as note')
    }

    return NextResponse.json({
      success: true,
      transcript: transcriptText,
      action: extracted.action,
      due_date: extracted.due_date,
      note: extracted.note,
      confidence: extracted.confidence
    })

  } catch (e: any) {
    console.error('Voice followup error:', e)
    return NextResponse.json({ success: false, error: e?.message || 'Server error' })
  }
}