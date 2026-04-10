import { NextRequest, NextResponse } from 'next/server'

function parseIndianCard(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  
  const indianCities = ['delhi','mumbai','kolkata','chennai','bangalore','bengaluru','hyderabad','pune','ahmedabad','surat','jaipur','lucknow','kanpur','nagpur','indore','bhopal','patna','ludhiana','agra','nashik','faridabad','meerut','rajkot','varanasi','srinagar','aurangabad','dhanbad','amritsar','navi mumbai','allahabad','ranchi','howrah','coimbatore','jabalpur','gwalior','vijayawada','jodhpur','madurai','raipur','kota','guwahati','chandigarh','solapur','hubli','tiruchirappalli','bareilly','moradabad','mysore','tiruppur','gurgaon','gurugram','noida','aligarh','jalandhar','bhubaneswar','salem','mira bhayandar','thiruvananthapuram','bhiwandi','saharanpur','gorakhpur','guntur','bikaner','amravati','warangal','surat','dehradun','hapur','noida','mathura','kolhapur','siliguri','rohtak','panipat','sadar bazar','karol bagh','lajpat nagar','connaught place','nehru place']
  
  const indianStates = ['delhi','maharashtra','karnataka','tamil nadu','telangana','uttar pradesh','gujarat','rajasthan','west bengal','madhya pradesh','bihar','punjab','haryana','odisha','kerala','jharkhand','assam','himachal pradesh','uttarakhand','chhattisgarh','goa','tripura','manipur','meghalaya','nagaland','arunachal pradesh','mizoram','sikkim','j&k','jammu','kashmir']

  const industries = {
    'plastic': ['plastic','polymer','pvc','hdpe','ldpe','pp','pet','nylon','resin','moulding','molding','injection','extrusion','packaging'],
    'textile': ['textile','fabric','garment','cloth','yarn','thread','weaving','knitting','embroidery','saree','dupatta','cotton','silk','polyester'],
    'hardware': ['hardware','tools','fastener','bolt','nut','screw','fitting','pipe','valve','pump'],
    'electrical': ['electrical','electronic','wire','cable','switch','panel','motor','transformer','led','lighting'],
    'food': ['food','beverage','snack','spice','masala','rice','flour','oil','dairy','bakery'],
    'pharma': ['pharma','medicine','drug','chemical','lab','diagnostic','healthcare','medical'],
    'furniture': ['furniture','wood','plywood','laminate','interior','decor','sofa','chair','table'],
    'auto': ['auto','automobile','vehicle','car','bike','motorcycle','tractor','spare','parts'],
    'handicraft': ['handicraft','craft','art','gift','souvenir','toy','doll','statue','idol','marble','brass','copper'],
    'jewellery': ['jewellery','jewelry','gold','silver','diamond','gem','stone','bangle','ring','necklace'],
    'paper': ['paper','print','printing','packaging','box','carton','corrugated','stationery'],
    'machinery': ['machine','machinery','equipment','industrial','engineering','fabrication','welding'],
    'real estate': ['real estate','property','builder','developer','construction','infra'],
    'it': ['software','it','technology','tech','digital','computer','app','web'],
    'export': ['export','import','trading','international','foreign','overseas'],
  }

  // Extract company — usually first or second line, often has Pvt Ltd, Inc, etc
  let company = ''
  const companyPatterns = [/pvt\.?\s*ltd/i, /private\s+limited/i, /ltd\.?/i, /limited/i, /inc\.?/i, /llp/i, /& co/i, /industries/i, /enterprise/i, /trading/i, /manufacturer/i, /exports/i, /international/i]
  
  for (const line of lines.slice(0, 5)) {
    if (companyPatterns.some(p => p.test(line)) && line.length > 3) {
      company = line; break
    }
  }
  if (!company && lines.length > 0) company = lines[0]

  // Extract phone numbers
  const phoneRegex = /(?:\+91[-.\s]?)?(?:\(?0?[6-9]\d{9}\)?|(?:\d{2,5}[-.\s]?\d{6,8}))/g
  const phones = [...new Set((text.match(phoneRegex) || []).map(p => p.replace(/[\s\-().]/g, '').replace(/^\+91/, '').replace(/^0/, '')))]
    .filter(p => p.length >= 10 && p.length <= 12)
    .slice(0, 5)

  // Extract emails
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
  const emails = (text.match(emailRegex) || []).slice(0, 3)

  // Extract website
  const webRegex = /(?:www\.)?[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?(?:\/\S*)?/gi
  const websites = (text.match(webRegex) || []).filter(w => !w.includes('@') && w.includes('.')).slice(0, 1)

  // Extract pincode
  const pincodeMatch = text.match(/\b[1-9][0-9]{5}\b/)
  const pincode = pincodeMatch ? pincodeMatch[0] : ''

  // Detect city and state
  let city = '', state = ''
  const lowerText = text.toLowerCase()
  for (const c of indianCities) {
    if (lowerText.includes(c)) { city = c.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '); break }
  }
  for (const s of indianStates) {
    if (lowerText.includes(s)) { state = s.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '); break }
  }

  // Detect industry
  let industry = ''
  for (const [ind, keywords] of Object.entries(industries)) {
    if (keywords.some(k => lowerText.includes(k))) {
      industry = ind.charAt(0).toUpperCase() + ind.slice(1); break
    }
  }

  // Extract people (name + designation)
  const designations = ['director','md','ceo','coo','cfo','manager','officer','executive','proprietor','owner','partner','chairman','president','head','chief','sales','purchase','marketing','gm','agm','dgm','engineer','consultant','founder','co-founder']
  
  const people: any[] = []
  const usedLines = new Set<number>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lline = line.toLowerCase()
    
    // Skip lines that are clearly not names
    if (phones.some(p => line.includes(p))) continue
    if (emails.some(e => line.includes(e))) continue
    if (companyPatterns.some(p => p.test(line))) continue
    if (/\d{4,}/.test(line)) continue
    if (line.length > 50) continue
    if (websites.some(w => line.includes(w))) continue
    if (indianCities.some(c => lline === c)) continue

    const hasDesignation = designations.some(d => lline.includes(d))
    
    // Check if looks like a name (2-4 words, capitalized)
    const words = line.split(/\s+/)
    const looksLikeName = words.length >= 2 && words.length <= 4 && 
      words.every(w => w.length > 1 && /^[A-Z]/.test(w)) &&
      !lline.includes('@') && !lline.includes('www')

    if (looksLikeName || hasDesignation) {
      // Try to find associated designation on next line
      let designation = ''
      let name = line

      if (hasDesignation && !looksLikeName) {
        designation = line
        // Look for name on previous line
        if (i > 0 && !usedLines.has(i-1)) {
          const prevLine = lines[i-1]
          const prevWords = prevLine.split(/\s+/)
          if (prevWords.length >= 1 && prevWords.length <= 4 && /^[A-Z]/.test(prevWords[0])) {
            name = prevLine
            usedLines.add(i-1)
          } else {
            name = ''
          }
        } else {
          name = ''
        }
      } else if (looksLikeName) {
        // Look for designation on next line
        if (i+1 < lines.length && !usedLines.has(i+1)) {
          const nextLine = lines[i+1]
          if (designations.some(d => nextLine.toLowerCase().includes(d))) {
            designation = nextLine
            usedLines.add(i+1)
          }
        }
      }

      if (name || designation) {
        // Find phone for this person
        const personPhone = phones[people.length] || ''
        const personEmail = emails[people.length] || ''
        
        if (name || designation) {
          people.push({
            name: name || '',
            designation: designation || '',
            phone1: personPhone,
            phone2: people.length === 0 && phones[1] ? phones[1] : '',
            phone3: people.length === 0 && phones[2] ? phones[2] : '',
            email: personEmail
          })
          usedLines.add(i)
        }
      }
    }
  }

  // If no people found but phones exist — create generic entry
  if (people.length === 0 && phones.length > 0) {
    people.push({
      name: '',
      designation: '',
      phone1: phones[0] || '',
      phone2: phones[1] || '',
      phone3: phones[2] || '',
      email: emails[0] || ''
    })
  }

  // Extract address
  const addressLines: string[] = []
  for (const line of lines) {
    if (line.length > 10 && line.length < 100) {
      const isPhone = phones.some(p => line.includes(p))
      const isEmail = emails.some(e => line.includes(e))
      const isCompany = line === company
      const isPerson = people.some(p => p.name === line || p.designation === line)
      const hasAddressKeyword = /plot|shop|flat|floor|road|street|nagar|colony|sector|phase|industrial|area|market|bazaar|gali|marg|chowk|near|opp|behind|above|beside/i.test(line)
      
      if (!isPhone && !isEmail && !isCompany && !isPerson && hasAddressKeyword) {
        addressLines.push(line)
      }
    }
  }

  // Extract products/services
  const productKeywords = /product|service|manufactur|deal|special|offer|supply|export|import/i
  let products = ''
  for (const line of lines) {
    if (productKeywords.test(line) && line.length < 100) {
      products = line; break
    }
  }

  return {
    company: company.trim(),
    industry,
    city,
    state,
    pincode,
    address: addressLines.slice(0, 2).join(', '),
    products,
    website: websites[0] || '',
    people,
    rawText: text
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imageUrl } = body

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'No image URL provided' })
    }

    const apiKey = process.env.GOOGLE_VISION_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Vision API key not configured' })
    }

    // Call Google Vision API
    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { source: { imageUri: imageUrl } },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
          }]
        })
      }
    )

    const visionData = await visionRes.json()
    const rawText = visionData?.responses?.[0]?.fullTextAnnotation?.text || 
                    visionData?.responses?.[0]?.textAnnotations?.[0]?.description || ''

    if (!rawText) {
      return NextResponse.json({ success: false, error: 'No text found on card. Please try a clearer photo.' })
    }

    const parsed = parseIndianCard(rawText)

    return NextResponse.json({ success: true, data: { ...parsed, rawText } })

  } catch (e: any) {
    console.error('Scan card error:', e)
    return NextResponse.json({ success: false, error: e?.message || 'Unknown error' })
  }
}
