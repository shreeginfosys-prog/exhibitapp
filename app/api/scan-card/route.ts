import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imageUrl, imageUrl2 } = body

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'No image URL provided' })
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_KEY) {
      return NextResponse.json({ success: false, error: 'Gemini API key not configured' })
    }

    // Build image parts — front is required, back is optional
    const imageParts: any[] = [
      { image_url: { url: imageUrl } }
    ]
    if (imageUrl2) {
      imageParts.push({ image_url: { url: imageUrl2 } })
    }

    const prompt = `You are reading an Indian business card. Extract ALL information accurately.

Return ONLY a valid JSON object. No markdown. No explanation. No extra text.

{
  "company": "company name exactly as printed",
  "industry": "one word industry — e.g. Plastics, Textiles, Hardware, Electronics, Pharma, Food, Furniture, Auto, Handicraft, Jewellery, Real Estate, IT, Export, Machinery, Chemical, Paper, Construction",
  "city": "city name only",
  "state": "state name only",
  "pincode": "6 digit pincode or empty string",
  "address": "full address line without city/state/pincode",
  "products": "products or services mentioned on card",
  "website": "website url or empty string",
  "ai_summary": "1-2 sentences describing what this company/person does based on the card. Be specific and helpful for a salesperson to remember context.",
  "people": [
    {
      "name": "full name",
      "designation": "job title or designation",
      "phone1": "first phone number digits only no spaces no dashes",
      "phone2": "second phone number or empty string",
      "phone3": "third phone number or empty string",
      "email": "email address or empty string"
    }
  ]
}

Rules:
- Extract ALL people found on the card — some Indian cards have 3-4 people
- Phone numbers: remove +91, 0 prefix, spaces, dashes — give 10 digit numbers only
- If multiple phones listed under one person include them in phone2 phone3
- Company name: include Pvt Ltd, LLP, & Co etc exactly as printed
- Industry: infer from company name or products if not explicitly stated
- ai_summary: write like "Manufacturer of plastic moulded products based in Delhi. Likely supplies to packaging and industrial clients." Be specific not generic.
- If card is unclear or unreadable for any field use empty string
- people array must always have at least one object even if name is empty`

    // Use Gemini 1.5 Flash with vision
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: await fetchImageAsBase64(imageUrl)
                }
              },
              ...(imageUrl2 ? [{
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: await fetchImageAsBase64(imageUrl2)
                }
              }] : [])
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000
          }
        })
      }
    )

    const geminiData = await geminiRes.json()
    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!raw) {
      console.error('Gemini returned empty:', geminiData)
      return NextResponse.json({ success: false, error: 'Could not read card. Please fill details manually.' })
    }

    // Clean and parse JSON
    const clean = raw
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()

    let parsed: any = null
    try {
      parsed = JSON.parse(clean)
    } catch (e) {
      // Try to extract JSON from the response
      const match = clean.match(/\{[\s\S]*\}/)
      if (match) {
        try {
          parsed = JSON.parse(match[0])
        } catch (e2) {
          console.error('JSON parse failed:', clean)
          return NextResponse.json({ success: false, error: 'Could not parse card data. Please fill manually.' })
        }
      }
    }

    if (!parsed) {
      return NextResponse.json({ success: false, error: 'Could not read card. Please fill details manually.' })
    }

    // Ensure people array exists
    if (!parsed.people || !Array.isArray(parsed.people) || parsed.people.length === 0) {
      parsed.people = [{ name:'', designation:'', phone1:'', phone2:'', phone3:'', email:'' }]
    }

    // Clean phone numbers — ensure 10 digits
    parsed.people = parsed.people.map((p: any) => ({
      ...p,
      phone1: cleanPhone(p.phone1 || ''),
      phone2: cleanPhone(p.phone2 || ''),
      phone3: cleanPhone(p.phone3 || ''),
    }))

    return NextResponse.json({ success: true, data: parsed })

  } catch (e: any) {
    console.error('Scan card error:', e)
    return NextResponse.json({ success: false, error: e?.message || 'Unknown error' })
  }
}

function cleanPhone(phone: string): string {
  // Remove everything except digits
  let digits = phone.replace(/\D/g, '')
  // Remove country code
  if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2)
  if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1)
  // Only return if valid 10 digit Indian mobile
  if (digits.length === 10 && /^[6-9]/.test(digits)) return digits
  // Return as-is if it looks like a landline
  if (digits.length >= 6) return digits
  return ''
}

async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url)
    const buffer = await res.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    return base64
  } catch (e) {
    console.error('Failed to fetch image:', url, e)
    return ''
  }
}
