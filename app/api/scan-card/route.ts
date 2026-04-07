import { NextRequest, NextResponse } from 'next/server'

function parseBusinessCard(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  let name = '', company = '', designation = '', phone = '', email = '', website = '', address = ''

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  if (emailMatch) email = emailMatch[0]

  const phoneMatches = text.match(/(\+91[\s-]?)?[6-9]\d{9}/g)
  if (phoneMatches) phone = [...new Set(phoneMatches)].join(' / ')

  const websiteMatch = text.match(/(?:www\.|https?:\/\/)[^\s\n]+/)
  if (websiteMatch) website = websiteMatch[0]

  const addressLine = lines.find(l => (l.includes('|') || /\d{6}/.test(l)) && !/^(\+91[\s-]?)?[6-9]\d{9}/.test(l.replace(/\s/g,'')))
  if (addressLine) address = addressLine

  const businessWords = ['tech','pvt','ltd','limited','inc','corp','industries','enterprise','solutions','group','star','company','co.','trading','international','exports','imports','services','panel','power','energy','auto','phase','mfg','manufacturing','products','agency']
  const designationWords = ['manager','director','ceo','founder','owner','partner','executive','sales','engineer','consultant','head','officer','president','vice','senior','junior','md','proprietor','general','representative','advisor']

  for (const line of lines) {
    const lower = line.toLowerCase()
    if (/\d{7,}/.test(line)) continue
    if (line.includes('@')) continue
    if (line.includes('www.') || line.includes('http')) continue
    if (line.includes('|') || /\d{6}/.test(line)) continue

    const hasBusinessWord = businessWords.some(w => lower.includes(w))
    const hasDesignationWord = designationWords.some(w => lower.includes(w))
    const isAllCaps = line === line.toUpperCase() && line.length > 2
    const isProperCase = /^[A-Z][a-z]/.test(line)
    const wordCount = line.split(' ').length

    if (hasDesignationWord && !designation) { designation = line; continue }
    if ((hasBusinessWord || isAllCaps) && wordCount <= 6 && !company) { company = line; continue }
    if (isProperCase && wordCount >= 1 && wordCount <= 4 && !name) { name = line; continue }
  }

  return { name, company, designation, phone, email, website, address }
}

async function parseWithGemini(rawText: string) {
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Extract contact information from this business card text. Return ONLY a raw JSON object with these exact fields: name, company, designation, phone, email, website, address. Use empty string for missing fields. No markdown, no code blocks, just raw JSON.

Business card text:
${rawText}`
          }]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 500 }
      })
    }
  )

  const geminiData = await geminiResponse.json()
  if (geminiData.error) return null

  const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const jsonMatch = geminiText.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  return JSON.parse(jsonMatch[0])
}

export async function POST(request: NextRequest) {
  try {
    console.log('API called - start')
    const body = await request.json()
    console.log('Body received, image length:', body.image?.length || 0)
    const { image, imageBack } = body

    if (!image) {
      return NextResponse.json({ error: 'No image received' }, { status: 400 })
    }

    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{ image: { content: image }, features: [{ type: 'TEXT_DETECTION', maxResults: 1 }] }]
        })
      }
    )

    const visionData = await visionResponse.json()
    let rawText = visionData.responses?.[0]?.fullTextAnnotation?.text || ''

    if (imageBack) {
      const visionResponse2 = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{ image: { content: imageBack }, features: [{ type: 'TEXT_DETECTION', maxResults: 1 }] }]
          })
        }
      )
      const visionData2 = await visionResponse2.json()
      const backText = visionData2.responses?.[0]?.fullTextAnnotation?.text || ''
      if (backText) rawText = rawText + '\n' + backText
    }

    if (!rawText) {
      return NextResponse.json({ error: 'No text found. Please try a clearer photo.' }, { status: 400 })
    }

    // Try Gemini first — better accuracy
    let contactData = null
    try {
      contactData = await parseWithGemini(rawText)
    } catch (e) {
      console.log('Gemini failed, falling back to local parser')
    }

    // Fall back to local parser if Gemini fails
    if (!contactData) {
      contactData = parseBusinessCard(rawText)
    }

    return NextResponse.json({
      success: true,
      data: { ...contactData, rawText },
      rawText
    })

  } catch (error) {
    console.error('Scan error:', error)
    return NextResponse.json({ error: `Failed to scan: ${error}` }, { status: 500 })
  }
}
