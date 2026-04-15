import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { audio, textOnly, text } = body

    const GEMINI_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_KEY) {
      return NextResponse.json({ success: false, error: 'Gemini API key not configured' })
    }

    let transcript = text || ''

    // If audio provided, transcribe with Gemini
    if (audio && !textOnly) {
      const transcribeRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: 'Transcribe this audio exactly as spoken. The speaker may speak in Hindi, English, or a mix of both (Hinglish). Return ONLY the transcribed text, nothing else.' },
                { inline_data: { mime_type: 'audio/webm', data: audio } }
              ]
            }],
            generationConfig: { temperature: 0, maxOutputTokens: 500 }
          })
        }
      )
      const transcribeData = await transcribeRes.json()
      transcript = transcribeData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (!transcript) return NextResponse.json({ success: false, error: 'Could not transcribe audio' })
    }

    if (!transcript) return NextResponse.json({ success: false, error: 'No text to process' })

    // Extract follow-up details
    const extractRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Extract follow-up action from this note. Text may be Hindi, English, or Hinglish.

Text: "${transcript}"

Today's date: ${new Date().toISOString().split('T')[0]}

Return ONLY valid JSON:
{
  "action": "what needs to be done in English, clear and specific",
  "due_date": "YYYY-MM-DD if date mentioned else null",
  "note": "additional context if any"
}

Examples:
- "kal call karna" → {"action":"Call them tomorrow","due_date":"${new Date(Date.now()+86400000).toISOString().split('T')[0]}","note":""}
- "next week quotation bhejni" → {"action":"Send quotation next week","due_date":"${new Date(Date.now()+7*86400000).toISOString().split('T')[0]}","note":""}
- "interested, demo chahiye" → {"action":"Schedule product demo","due_date":null,"note":"Customer is interested"}`
            }]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
        })
      }
    )

    const extractData = await extractRes.json()
    const raw = extractData?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    let parsed: any = null
    try {
      const clean = raw.replace(/```json/g,'').replace(/```/g,'').trim()
      parsed = JSON.parse(clean)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) { try { parsed = JSON.parse(match[0]) } catch {} }
    }

    return NextResponse.json({
      success: true,
      transcript,
      action: parsed?.action || transcript,
      due_date: parsed?.due_date || null,
      note: parsed?.note || ''
    })

  } catch (e: any) {
    console.error('Voice followup error:', e)
    return NextResponse.json({ success: false, error: e?.message || 'Unknown error' })
  }
}
