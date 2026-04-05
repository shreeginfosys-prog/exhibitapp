import { NextRequest, NextResponse } from 'next/server'

function parseBusinessCard(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  let name = ''
  let company = ''
  let designation = ''
  let phone = ''
  let email = ''
  let website = ''
  let address = ''

  // Extract email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  if (emailMatch) email = emailMatch[0]

  // Extract all phone numbers
  const phoneMatches = text.match(/(\+91[\s-]?)?[6-9]\d{9}/g)
  if (phoneMatches) phone = [...new Set(phoneMatches)].join(' / ')

  // Extract website
  const websiteMatch = text.match(/(?:www\.|https?:\/\/)[^\s\n]+/)
  if (websiteMatch) website = websiteMatch[0]

  // Extract address — line with pipe or pincode
  const addressLine = lines.find(l => (l.includes('|') || /\d{6}/.test(l)) && !/^(\+91[\s-]?)?[6-9]\d{9}/.test(l.replace(/\s/g, '')))
  if (addressLine) address = addressLine

  // Find name and company from remaining lines
  const skipPatterns = [
    /\d{7,}/,          // phone numbers
    /@/,               // email
    /www\./,           // website
    /http/,            // url
    /\|/,              // address with pipes
    /\d{6}/,           // pincode
  ]

  const businessWords = [
    'tech', 'pvt', 'ltd', 'limited', 'inc', 'corp', 'industries',
    'enterprise', 'solutions', 'group', 'star', 'company', 'co.',
    'trading', 'international', 'exports', 'imports', 'services',
    'panel', 'power', 'energy', 'auto', 'phase'
  ]

  const designationWords = [
    'manager', 'director', 'ceo', 'founder', 'owner', 'partner',
    'executive', 'sales', 'engineer', 'consultant', 'head',
    'officer', 'president', 'vice', 'senior', 'junior', 'md',
    'proprietor', 'general'
  ]

  for (const line of lines) {
    const lower = line.toLowerCase()

    // Skip lines with these patterns
    if (skipPatterns.some(p => p.test(line))) continue
    if (line === address) continue

    const hasBusinessWord = businessWords.some(w => lower.includes(w))
    const hasDesignationWord = designationWords.some(w => lower.includes(w))
    const isAllCaps = line === line.toUpperCase() && line.length > 2
    const isProperCase = /^[A-Z][a-z]/.test(line)
    const wordCount = line.split(' ').length

    // Designation
    if (hasDesignationWord && !designation) {
      designation = line
      continue
    }

    // Company — all caps or has business word
    if ((hasBusinessWord || isAllCaps) && wordCount <= 6 && !company) {
      company = line
      continue
    }

    // Name — proper case, 2-4 words, not yet assigned
    if (isProperCase && wordCount >= 1 && wordCount <= 4 && !name) {
      name = line
      continue
    }
  }

  return { name, company, designation, phone, email, website, address }
}

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()

    // Google Vision extracts raw text
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: image },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
          }]
        })
      }
    )

    const visionData = await visionResponse.json()
    const rawText = visionData.responses?.[0]?.fullTextAnnotation?.text || ''

    if (!rawText) {
      return NextResponse.json({
        error: 'No text found. Please try a clearer photo.'
      }, { status: 400 })
    }

    // Parse locally — completely free
    const contactData = parseBusinessCard(rawText)

    return NextResponse.json({
      success: true,
      data: contactData,
      rawText: rawText
    })

  } catch (error) {
    console.error('Scan error:', error)
    return NextResponse.json({
      error: `Failed to scan: ${error}`
    }, { status: 500 })
  }
}