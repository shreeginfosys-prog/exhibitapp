import { NextRequest, NextResponse } from 'next/server'

function parseIndianCard(rawText: string) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const lowerText = rawText.toLowerCase()
  const businessWords = ['enterprises','enterprise','pvt','ltd','limited','industries','solutions','group','trading','international','exports','imports','services','flowers','plastics','chemicals','agency','associates','corporation','company','wholesale','wholesaler','manufacturer','supplier','dealer']
  const industryMap: Record<string, string> = {
    'flower': 'Flowers', 'floral': 'Flowers', 'plastic': 'Plastics', 'polymer': 'Plastics',
    'textile': 'Textiles', 'fabric': 'Textiles', 'pharma': 'Pharma', 'medical': 'Healthcare',
    'software': 'IT', 'tech': 'IT', 'hardware': 'Hardware', 'electronic': 'Electronics',
    'chemical': 'Chemicals', 'food': 'Food', 'auto': 'Auto', 'construction': 'Construction',
    'steel': 'Manufacturing', 'metal': 'Manufacturing', 'packaging': 'Packaging'
  }
  const emails = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
  const pincodeMatch = rawText.match(/\b[1-9][0-9]{5}\b/)
  const pincode = pincodeMatch ? pincodeMatch[0] : ''
  let city = '', state = ''
  if (lowerText.includes('delhi')) { city = 'Delhi'; state = 'Delhi' }
  else if (lowerText.includes('mumbai')) { city = 'Mumbai'; state = 'Maharashtra' }
  else if (lowerText.includes('bangalore') || lowerText.includes('bengaluru')) { city = 'Bangalore'; state = 'Karnataka' }
  else if (lowerText.includes('chennai')) { city = 'Chennai'; state = 'Tamil Nadu' }
  else if (lowerText.includes('hyderabad')) { city = 'Hyderabad'; state = 'Telangana' }
  else if (lowerText.includes('pune')) { city = 'Pune'; state = 'Maharashtra' }
  else if (lowerText.includes('ahmedabad')) { city = 'Ahmedabad'; state = 'Gujarat' }
  else if (lowerText.includes('surat')) { city = 'Surat'; state = 'Gujarat' }
  else if (lowerText.includes('kolkata')) { city = 'Kolkata'; state = 'West Bengal' }
  else if (lowerText.includes('jaipur')) { city = 'Jaipur'; state = 'Rajasthan' }
  else if (lowerText.includes('noida')) { city = 'Noida'; state = 'Uttar Pradesh' }
  else if (lowerText.includes('gurgaon') || lowerText.includes('gurugram')) { city = 'Gurgaon'; state = 'Haryana' }
  else if (lowerText.includes('ludhiana')) { city = 'Ludhiana'; state = 'Punjab' }
  else if (lowerText.includes('chandigarh')) { city = 'Chandigarh'; state = 'Punjab' }
  let industry = ''
  for (const [keyword, ind] of Object.entries(industryMap)) {
    if (lowerText.includes(keyword)) { industry = ind; break }
  }
  let company = ''
  for (const line of lines) {
    const lower = line.toLowerCase()
    const isAllCaps = line === line.toUpperCase() && line.length > 3 && !/\d{6,}/.test(line) && !/^\d/.test(line)
    const hasBusinessWord = businessWords.some(w => lower.includes(w))
    if ((isAllCaps || hasBusinessWord) && !company && line.length > 3 && !line.includes('@')) { company = line; break }
  }
  let address = ''
  for (const line of lines) {
    const lower = line.toLowerCase()
    if ((lower.includes('shop') || lower.includes('road') || lower.includes('opp') || lower.includes('near') || lower.includes('floor') || lower.includes('nagar') || lower.includes('market') || lower.includes('bazar') || lower.includes('chowk') || /\d{6}/.test(line)) && line.length > 10) { address = line; break }
  }
  let products = ''
  for (const line of lines) {
    const lower = line.toLowerCase()
    if ((lower.includes('wholesale') || lower.includes('manufacturer') || lower.includes('dealer') || lower.includes('supplier') || lower.includes('etc') || lower.includes('item')) && !products && line !== company && line.length > 5) { products = line }
  }
  const people: any[] = []
  const usedPhones = new Set<string>()
  const sameLinePattern = /([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s+([6-9]\d{9})(?:[,\s]+([6-9]\d{9}))?(?:[,\s]+([6-9]\d{9}))?/g
  let match
  while ((match = sameLinePattern.exec(rawText)) !== null) {
    const name = match[1].trim()
    const phones = [match[2], match[3], match[4]].filter(Boolean)
    const isBusinessName = businessWords.some(w => name.toLowerCase().includes(w))
    if (!isBusinessName && name.split(' ').length >= 2) {
      phones.forEach(p => usedPhones.add(p))
      if (!people.find(p => p.name === name)) {
        people.push({ name, designation: '', phone1: phones[0]||'', phone2: phones[1]||'', phone3: phones[2]||'', email: '' })
      }
    }
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isName = /^[A-Z][a-z]+(?:\s[A-Z][a-z]+){1,3}$/.test(line) && !businessWords.some(w => line.toLowerCase().includes(w)) && line.split(' ').length >= 2 && !people.find(p => p.name === line)
    if (isName) {
      const personPhones: string[] = []
      let j = i + 1
      while (j < lines.length && j < i + 5) {
        const phoneMatch = lines[j].match(/[6-9]\d{9}/g)
        if (phoneMatch) { phoneMatch.forEach(p => { if (!usedPhones.has(p)) { personPhones.push(p); usedPhones.add(p) } }); j++ }
        else break
      }
      if (personPhones.length > 0) {
        people.push({ name: line, designation: '', phone1: personPhones[0]||'', phone2: personPhones[1]||'', phone3: personPhones[2]||'', email: emails[0]||'' })
      }
    }
  }
  if (people.length === 0) {
    const allPhones = rawText.match(/(?:\+91[\s-]?)?[6-9]\d{9}/g) || []
    const cleanPhones = [...new Set(allPhones.map(p => p.replace(/[\s\-\+91]/g, '').slice(-10)))]
    if (cleanPhones.length > 0) {
      people.push({ name: company || 'Contact', designation: '', phone1: cleanPhones[0]||'', phone2: cleanPhones[1]||'', phone3: cleanPhones[2]||'', email: emails[0]||'' })
    }
  }
  return { company, industry, address, city, state, pincode, products, people }
}

export async function POST(request: NextRequest) {
  try {
    console.log('API called - start')
    const body = await request.json()
    const { image, imageBack, imageUrl } = body

    if (!image && !imageUrl) return NextResponse.json({ error: 'No image received' }, { status: 400 })

    const imageRequest = imageUrl
      ? { source: { imageUri: imageUrl } }
      : { content: image }

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ image: imageRequest, features: [{ type: 'TEXT_DETECTION', maxResults: 1 }] }] })
      }
    )
    const visionData = await visionRes.json()
    console.log('Vision full:', JSON.stringify(visionData).slice(0, 500))

    let rawText = visionData.responses?.[0]?.fullTextAnnotation?.text || ''

    if (imageBack) {
      const visionRes2 = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: [{ image: { content: imageBack }, features: [{ type: 'TEXT_DETECTION', maxResults: 1 }] }] })
        }
      )
      const visionData2 = await visionRes2.json()
      const backText = visionData2.responses?.[0]?.fullTextAnnotation?.text || ''
      if (backText) rawText = rawText + '\n' + backText
    }

    console.log('Raw text length:', rawText.length)
    console.log('Raw text:', rawText.slice(0, 200))

    if (!rawText) return NextResponse.json({ error: 'No text found. Please try a clearer photo.' }, { status: 400 })

    const cardData = parseIndianCard(rawText)
    console.log('Parsed:', JSON.stringify(cardData).slice(0, 300))

    return NextResponse.json({ success: true, data: { ...cardData, rawText }, rawText })

  } catch (error) {
    console.error('Scan error:', error)
    return NextResponse.json({ error: `Failed to scan: ${error}` }, { status: 500 })
  }
}