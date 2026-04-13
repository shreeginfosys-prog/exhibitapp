'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useSearchParams } from 'next/navigation'
import MicButton from '../components/MicButton'
import MobileLayout from '../components/MobileLayout'

export default function ScanPageContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('event')

  const [previewFront, setPreviewFront] = useState<string | null>(null)
  const [previewBack, setPreviewBack] = useState<string | null>(null)
  const [uploadedFrontUrl, setUploadedFrontUrl] = useState('')
  const [uploadedBackUrl, setUploadedBackUrl] = useState('')
  const [uploading, setUploading] = useState<'front'|'back'|null>(null)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eventName, setEventName] = useState<string | null>(null)
  const [whatsappTemplate, setWhatsappTemplate] = useState('Hi, great meeting you at the exhibition! Looking forward to staying in touch.')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [scanMode, setScanMode] = useState<'seller'|'buyer'>('seller')
  const [tag, setTag] = useState('')
  const [note, setNote] = useState('')

  // Editable fields
  const [company, setCompany] = useState('')
  const [industry, setIndustry] = useState('')
  const [city, setCity] = useState('')
  const [stateName, setStateName] = useState('')
  const [pincode, setPincode] = useState('')
  const [address, setAddress] = useState('')
  const [products, setProducts] = useState('')
  const [aiSummary, setAiSummary] = useState('')

  const [people, setPeople] = useState([
    { name:'', designation:'', phone1:'', phone2:'', email:'' },
    { name:'', designation:'', phone1:'', phone2:'', email:'' },
    { name:'', designation:'', phone1:'', phone2:'', email:'' },
  ])

  const fileInputFront = useRef<HTMLInputElement>(null)
  const fileInputBack = useRef<HTMLInputElement>(null)
  const primary = '#0F6E56'

  useEffect(() => {
    const load = async () => {
      if (eventId) {
        const { data: event } = await supabase.from('events').select('name').eq('id', eventId).single()
        if (event) setEventName(event.name)
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('users').select('whatsapp_template').eq('id', user.id).single()
        if (profile?.whatsapp_template) setWhatsappTemplate(profile.whatsapp_template)
      }
    }
    load()
  }, [])

  const updatePerson = (index: number, field: string, value: string) => {
    setPeople(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  const compress = (dataUrl: string): Promise<string> => new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let w = img.width, h = img.height
      const max = 800
      if (w > h) { if (w > max) { h = Math.round(h*max/w); w = max } }
      else { if (h > max) { w = Math.round(w*max/h); h = max } }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')?.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1])
    }
    img.onerror = () => resolve('')
    img.src = dataUrl
  })

  const uploadImage = async (dataUrl: string, userId: string): Promise<string> => {
    const base64 = await compress(dataUrl)
    if (!base64) throw new Error('Could not compress image')
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, userId })
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || 'Upload failed')
    return data.url
  }

  const handleFrontChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setScanned(false)

    const dataUrl = await new Promise<string>((resolve) => {
      const r = new FileReader()
      r.onload = (ev) => resolve(ev.target?.result as string)
      r.readAsDataURL(file)
    })
    setPreviewFront(dataUrl)

    // Upload front
    setUploading('front')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in'); return }
      const url = await uploadImage(dataUrl, user.id)
      setUploadedFrontUrl(url)
    } catch (e: any) {
      setError('Upload failed: ' + e.message)
    } finally {
      setUploading(null)
    }
  }

  const handleBackChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    const dataUrl = await new Promise<string>((resolve) => {
      const r = new FileReader()
      r.onload = (ev) => resolve(ev.target?.result as string)
      r.readAsDataURL(file)
    })
    setPreviewBack(dataUrl)

    // Upload back
    setUploading('back')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const url = await uploadImage(dataUrl, user.id)
      setUploadedBackUrl(url)
    } catch (e: any) {
      setError('Back upload failed: ' + e.message)
    } finally {
      setUploading(null)
    }
  }

  const handleScanCard = async () => {
    if (!uploadedFrontUrl) { setError('Please upload front of card first'); return }
    setScanning(true)
    setError(null)

    try {
      const res = await fetch('/api/scan-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: uploadedFrontUrl,
          imageUrl2: uploadedBackUrl || undefined
        })
      })
      const data = await res.json()

      if (data.success) {
        const d = data.data
        setCompany(d.company || '')
        setIndustry(d.industry || '')
        setCity(d.city || '')
        setStateName(d.state || '')
        setPincode(d.pincode || '')
        setAddress(d.address || '')
        setProducts(d.products || '')
        setAiSummary(d.ai_summary || '')

        if (d.people?.length > 0) {
          setPeople(prev => prev.map((p, i) =>
            d.people[i] ? {
              name: d.people[i].name || '',
              designation: d.people[i].designation || '',
              phone1: d.people[i].phone1 || '',
              phone2: d.people[i].phone2 || '',
              email: d.people[i].email || ''
            } : p
          ))
          setWhatsappNumber(d.people[0]?.phone1 || '')
        }
        setScanned(true)
      } else {
        setError(data.error || 'Could not read card. Please fill details manually.')
      }
    } catch (e: any) {
      setError('Error: ' + (e?.message || 'Unknown'))
    } finally {
      setScanning(false)
    }
  }

  const handleSave = async () => {
    const hasData = company || people[0].name || people[0].phone1
    if (!hasData) { alert('Please fill at least company name or contact details'); return }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data: profile } = await supabase.from('users').select('name').eq('id', user.id).single()
    const userName = profile?.name || 'Unknown'

    const fullNote = [aiSummary, note].filter(Boolean).join('\n')

    const { data: scan, error: scanError } = await supabase.from('scans').insert({
      scanner_id: user.id,
      scanned_by_name: userName,
      mode: scanMode,
      event_id: eventId || null,
      company, industry, address,
      city, state: stateName, pincode, products,
      image_url: uploadedFrontUrl,
      raw_text: aiSummary,
      note: fullNote, tag,
      lead_status: 'new',
      deal_value: 0
    }).select().single()

    if (scanError || !scan) { setSaving(false); return }

    const validPeople = people.filter(p => p.name || p.phone1)
    if (validPeople.length > 0) {
      await supabase.from('contacts').insert(
        validPeople.map(p => ({
          scan_id: scan.id, scanner_id: user.id,
          name: p.name, designation: p.designation,
          phone1: p.phone1, phone2: p.phone2,
          phone3: '', email: p.email
        }))
      )
    }

    await supabase.from('lead_activity').insert({
      scan_id: scan.id, user_id: user.id, user_name: userName,
      action: 'scanned', new_value: tag || 'untagged',
      note: fullNote || ''
    })

    setSaved(true)
    setSaving(false)
  }

  const reset = () => {
    setPreviewFront(null); setPreviewBack(null)
    setUploadedFrontUrl(''); setUploadedBackUrl('')
    setScanned(false); setSaved(false); setError(null)
    setTag(''); setNote(''); setAiSummary('')
    setCompany(''); setIndustry(''); setCity('')
    setStateName(''); setPincode(''); setAddress(''); setProducts('')
    setWhatsappNumber('')
    setPeople([
      { name:'', designation:'', phone1:'', phone2:'', email:'' },
      { name:'', designation:'', phone1:'', phone2:'', email:'' },
      { name:'', designation:'', phone1:'', phone2:'', email:'' },
    ])
  }

  const isSeller = scanMode === 'seller'
  const tags = isSeller
    ? [{label:'Hot',color:'#D85A30',bg:'#FAECE7'},{label:'Warm',color:'#BA7517',bg:'#FAEEDA'},{label:'Cold',color:'#185FA5',bg:'#E6F1FB'}]
    : [{label:'High',color:'#27500A',bg:'#EAF3DE'},{label:'Medium',color:'#BA7517',bg:'#FAEEDA'},{label:'Low',color:'#5F5E5A',bg:'#F1EFE8'}]

  const inputStyle: React.CSSProperties = {
    width:'100%', padding:'9px 10px', borderRadius:'8px',
    border:'1px solid #e0e0e0', fontSize:'13px',
    fontFamily:'sans-serif', boxSizing:'border-box',
    backgroundColor:'white', color:'#111'
  }
  const labelStyle: React.CSSProperties = {
    fontSize:'11px', color:'#999', fontWeight:'500',
    marginBottom:'3px', display:'block',
    textTransform:'uppercase', letterSpacing:'0.04em'
  }

  const Field = ({ label, value, onChange, placeholder, type='text' }: any) => (
    <div style={{marginBottom:'10px'}}>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={(e:any)=>onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  )

  return (
    <MobileLayout>
      {/* Header */}
      <div style={{backgroundColor:primary,padding:'16px 20px 14px'}}>
        <div style={{fontSize:'18px',fontWeight:'600',color:'white',fontFamily:"'Fraunces', serif",marginBottom:'8px'}}>
          Scan Business Card
        </div>
        {eventName && <div style={{fontSize:'12px',color:'rgba(255,255,255,0.8)',marginBottom:'10px'}}>🏪 {eventName}</div>}
        <div style={{display:'flex',backgroundColor:'rgba(255,255,255,0.15)',borderRadius:'20px',padding:'2px',width:'fit-content'}}>
          <button onClick={()=>{setScanMode('seller');setTag('')}} style={{padding:'5px 18px',borderRadius:'18px',border:'none',fontSize:'13px',fontWeight:'500',cursor:'pointer',backgroundColor:isSeller?'white':'transparent',color:isSeller?primary:'rgba(255,255,255,0.8)'}}>
            Seller
          </button>
          <button onClick={()=>{setScanMode('buyer');setTag('')}} style={{padding:'5px 18px',borderRadius:'18px',border:'none',fontSize:'13px',fontWeight:'500',cursor:'pointer',backgroundColor:!isSeller?'white':'transparent',color:!isSeller?primary:'rgba(255,255,255,0.8)'}}>
            Buyer
          </button>
        </div>
      </div>

      <div style={{padding:'16px'}}>

        {/* WhatsApp after save */}
        {saved && (
          <div>
            <div style={{padding:'14px',backgroundColor:'#EAF3DE',borderRadius:'10px',color:'#27500A',fontSize:'14px',textAlign:'center',marginBottom:'14px',fontWeight:'500'}}>
              ✅ Contact saved!
            </div>
            <div style={{backgroundColor:'#E7F7EE',borderRadius:'12px',padding:'16px',border:'1px solid #b2dfdb',marginBottom:'12px'}}>
              <div style={{fontSize:'14px',fontWeight:'600',color:'#111',marginBottom:'4px'}}>💬 Send WhatsApp now?</div>
              <div style={{fontSize:'12px',color:'#666',marginBottom:'12px'}}>Select number to message</div>
              {people.filter(p=>p.phone1).map((p,i)=>(
                <button key={i} onClick={()=>setWhatsappNumber(p.phone1)} style={{display:'block',width:'100%',padding:'10px 12px',marginBottom:'6px',borderRadius:'8px',border:whatsappNumber===p.phone1?'2px solid '+primary:'1px solid #ddd',backgroundColor:whatsappNumber===p.phone1?'#EAF3DE':'white',textAlign:'left',cursor:'pointer',fontSize:'13px',boxSizing:'border-box'}}>
                  {p.name?`${p.name} — `:''}{p.phone1}
                  {whatsappNumber===p.phone1&&<span style={{float:'right',color:primary}}>✓</span>}
                </button>
              ))}
              <input value={whatsappNumber} onChange={e=>setWhatsappNumber(e.target.value)} placeholder="Or type number" style={{...inputStyle,marginBottom:'10px',marginTop:'4px'}} />
              <div style={{display:'flex',gap:'8px'}}>
                <a href={whatsappNumber?`https://wa.me/91${whatsappNumber.replace(/\D/g,'')}?text=${encodeURIComponent(whatsappTemplate)}`:'#'} target="_blank" rel="noreferrer" style={{flex:1,padding:'12px',backgroundColor:whatsappNumber?'#25D366':'#ccc',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'500',textAlign:'center',textDecoration:'none',display:'block'}}>
                  💬 Open WhatsApp
                </a>
                <button onClick={reset} style={{padding:'12px 14px',backgroundColor:'#f5f5f5',color:'#666',border:'none',borderRadius:'8px',fontSize:'13px',cursor:'pointer'}}>Skip</button>
              </div>
            </div>
            <button onClick={reset} style={{width:'100%',padding:'12px',backgroundColor:'white',color:'#666',border:'1px solid #ddd',borderRadius:'8px',fontSize:'14px',cursor:'pointer'}}>
              📷 Scan Another Card
            </button>
          </div>
        )}

        {!saved && (
          <>
            {/* FRONT + BACK card upload */}
            <div style={{backgroundColor:'white',border:'1px solid #eee',borderRadius:'12px',padding:'14px',marginBottom:'12px'}}>
              <div style={{fontSize:'13px',fontWeight:'600',color:'#111',marginBottom:'12px'}}>📷 Card Photos</div>

              {/* Front */}
              <div style={{marginBottom:'10px'}}>
                <label style={labelStyle}>Front of card <span style={{color:'#cc0000'}}>*</span></label>
                <div
                  onClick={()=>fileInputFront.current?.click()}
                  style={{border:previewFront?'2px solid '+primary:'2px dashed #ccc',borderRadius:'10px',padding:previewFront?'8px':'20px',textAlign:'center',cursor:'pointer',backgroundColor:previewFront?'#f0faf5':'#fafafa',position:'relative'}}
                >
                  {uploading==='front' && (
                    <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(255,255,255,0.9)',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'8px',zIndex:1}}>
                      <span style={{fontSize:'12px',color:primary}}>Uploading...</span>
                    </div>
                  )}
                  {previewFront ? (
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                      <img src={previewFront} alt="front" style={{width:'70px',height:'44px',objectFit:'cover',borderRadius:'6px',border:'1px solid #ddd',flexShrink:0}} />
                      <div style={{textAlign:'left'}}>
                        <div style={{fontSize:'12px',fontWeight:'600',color:primary}}>✓ Front uploaded</div>
                        <div style={{fontSize:'11px',color:'#999'}}>Tap to change</div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{fontSize:'24px',marginBottom:'4px'}}>📸</div>
                      <div style={{fontSize:'13px',color:'#444',fontWeight:'500'}}>Tap to add front of card</div>
                    </div>
                  )}
                </div>
                <input ref={fileInputFront} type="file" accept="image/*" capture="environment" onChange={handleFrontChange} style={{display:'none'}} />
              </div>

              {/* Back */}
              <div style={{marginBottom:'12px'}}>
                <label style={labelStyle}>Back of card <span style={{color:'#bbb'}}>optional</span></label>
                <div
                  onClick={()=>fileInputBack.current?.click()}
                  style={{border:previewBack?'2px solid #BA7517':'2px dashed #eee',borderRadius:'10px',padding:previewBack?'8px':'14px',textAlign:'center',cursor:'pointer',backgroundColor:previewBack?'#FAEEDA':'#fafafa',position:'relative'}}
                >
                  {uploading==='back' && (
                    <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(255,255,255,0.9)',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'8px',zIndex:1}}>
                      <span style={{fontSize:'12px',color:'#BA7517'}}>Uploading...</span>
                    </div>
                  )}
                  {previewBack ? (
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                      <img src={previewBack} alt="back" style={{width:'70px',height:'44px',objectFit:'cover',borderRadius:'6px',border:'1px solid #ddd',flexShrink:0}} />
                      <div style={{textAlign:'left'}}>
                        <div style={{fontSize:'12px',fontWeight:'600',color:'#BA7517'}}>✓ Back uploaded</div>
                        <div style={{fontSize:'11px',color:'#999'}}>Tap to change</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{fontSize:'12px',color:'#bbb'}}>+ Add back of card for more details</div>
                  )}
                </div>
                <input ref={fileInputBack} type="file" accept="image/*" capture="environment" onChange={handleBackChange} style={{display:'none'}} />
              </div>

              {/* Scan button */}
              {uploadedFrontUrl && !scanned && (
                <button
                  onClick={handleScanCard}
                  disabled={scanning || !!uploading}
                  style={{width:'100%',padding:'12px',backgroundColor:scanning?'#999':primary,color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:'500',cursor:scanning?'not-allowed':'pointer'}}
                >
                  {scanning ? '🤖 AI Reading Card...' : `🤖 Read Card with AI${uploadedBackUrl?' (Front + Back)':' (Front only)'}`}
                </button>
              )}

              {scanned && (
                <div style={{padding:'8px 12px',backgroundColor:'#EAF3DE',borderRadius:'8px',fontSize:'12px',color:'#27500A',fontWeight:'500',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  ✓ Card read — check and edit below
                  <button onClick={()=>{setScanned(false)}} style={{fontSize:'11px',color:'#666',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Re-scan</button>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{padding:'10px 12px',backgroundColor:'#fff8e1',border:'1px solid #ffe082',borderRadius:'8px',color:'#795548',fontSize:'12px',marginBottom:'12px'}}>
                ⚠️ {error}
              </div>
            )}

            {/* AI Summary */}
            {aiSummary && (
              <div style={{backgroundColor:'#EAF3DE',border:'1px solid #C0DD97',borderRadius:'12px',padding:'12px 14px',marginBottom:'12px'}}>
                <div style={{fontSize:'11px',fontWeight:'600',color:'#27500A',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.04em'}}>🤖 AI Summary</div>
                <div style={{fontSize:'13px',color:'#1a3a12',lineHeight:'1.5'}}>{aiSummary}</div>
              </div>
            )}

            {/* Company */}
            <div style={{backgroundColor:'white',border:'1px solid #eee',borderRadius:'12px',padding:'14px',marginBottom:'12px'}}>
              <div style={{fontSize:'13px',fontWeight:'600',color:'#111',marginBottom:'12px'}}>
                🏢 Company Details
                {scanning && <span style={{fontSize:'11px',color:primary,fontWeight:'400',marginLeft:'6px'}}>reading...</span>}
              </div>
              <Field label="Company Name" value={company} onChange={setCompany} placeholder="e.g. Sharma Enterprises" />
              <Field label="Industry" value={industry} onChange={setIndustry} placeholder="e.g. Plastics, Textiles" />
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'10px'}}>
                <div>
                  <label style={labelStyle}>City</label>
                  <input value={city} onChange={e=>setCity(e.target.value)} placeholder="Delhi" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>State</label>
                  <input value={stateName} onChange={e=>setStateName(e.target.value)} placeholder="Delhi" style={inputStyle} />
                </div>
              </div>
              <Field label="Address" value={address} onChange={setAddress} placeholder="Shop, street, area" />
              <Field label="Products / Services" value={products} onChange={setProducts} placeholder="What do they sell?" />
            </div>

            {/* People */}
            {[0,1,2].map(i => (
              <div key={i} style={{backgroundColor:'white',border:'1px solid #eee',borderRadius:'12px',padding:'14px',marginBottom:'12px'}}>
                <div style={{fontSize:'13px',fontWeight:'600',color:'#111',marginBottom:'12px'}}>
                  👤 Person {i+1}
                  {i>0 && <span style={{fontSize:'11px',color:'#bbb',fontWeight:'400',marginLeft:'6px'}}>optional</span>}
                </div>
                <Field label="Full Name" value={people[i].name} onChange={(v:string)=>updatePerson(i,'name',v)} placeholder="Rahul Sharma" />
                <Field label="Designation" value={people[i].designation} onChange={(v:string)=>updatePerson(i,'designation',v)} placeholder="Owner / Manager" />
                <Field label="Phone" value={people[i].phone1} onChange={(v:string)=>updatePerson(i,'phone1',v)} placeholder="9999999999" type="tel" />
                <Field label="Phone 2" value={people[i].phone2} onChange={(v:string)=>updatePerson(i,'phone2',v)} placeholder="optional" type="tel" />
                <Field label="Email" value={people[i].email} onChange={(v:string)=>updatePerson(i,'email',v)} placeholder="email@company.com" type="email" />
              </div>
            ))}

            {/* Tag */}
            <div style={{backgroundColor:'white',border:'1px solid #eee',borderRadius:'12px',padding:'14px',marginBottom:'12px'}}>
              <div style={{fontSize:'13px',fontWeight:'600',color:'#111',marginBottom:'10px'}}>
                {isSeller?'🌡️ Lead Temperature':'📊 Interest Level'}
              </div>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                {tags.map(t=>(
                  <button key={t.label} onClick={()=>setTag(tag===t.label?'':t.label)} style={{padding:'7px 20px',borderRadius:'20px',border:tag===t.label?'2px solid '+t.color:'2px solid #eee',backgroundColor:tag===t.label?t.bg:'white',color:tag===t.label?t.color:'#999',fontSize:'13px',fontWeight:'500',cursor:'pointer'}}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div style={{backgroundColor:'white',border:'1px solid #eee',borderRadius:'12px',padding:'14px',marginBottom:'16px'}}>
              <div style={{fontSize:'13px',fontWeight:'600',color:'#111',marginBottom:'10px'}}>📝 Your Note</div>
              <div style={{display:'flex',gap:'8px',alignItems:'flex-start'}}>
                <textarea
                  value={note}
                  onChange={e=>setNote(e.target.value)}
                  placeholder="Type or hold 🎤 to speak..."
                  style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid #e0e0e0',fontSize:'13px',resize:'none',minHeight:'70px',fontFamily:'sans-serif',boxSizing:'border-box'}}
                />
                <MicButton onTranscript={(text)=>setNote(prev=>prev?prev+' '+text:text)} />
              </div>
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving||scanning||!!uploading}
              style={{width:'100%',padding:'14px',backgroundColor:(saving||scanning||uploading)?'#ccc':primary,color:'white',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'500',cursor:(saving||scanning||uploading)?'not-allowed':'pointer',marginBottom:'8px'}}
            >
              {saving?'Saving...':scanning?'Reading card...':uploading?'Uploading...':scanned?`Save ${isSeller?'Seller':'Buyer'} Contact`:`Save ${isSeller?'Seller':'Buyer'} Contact`}
            </button>
          </>
        )}

      </div>
    </MobileLayout>
  )
}
