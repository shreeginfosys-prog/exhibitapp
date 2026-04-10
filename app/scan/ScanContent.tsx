'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useSearchParams } from 'next/navigation'
import MicButton from '../components/MicButton'

export default function ScanPageContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('event')
  const [preview, setPreview] = useState<string | null>(null)
  const [preview2, setPreview2] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [note, setNote] = useState('')
  const [tag, setTag] = useState('')
  const [scanMode, setScanMode] = useState<'seller'|'buyer'>('seller')
  const [eventName, setEventName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef2 = useRef<HTMLInputElement>(null)
  const primary = '#0F6E56'

  useEffect(() => {
    const loadData = async () => {
      if (eventId) {
        const { data: event } = await supabase.from('events').select('name').eq('id', eventId).single()
        if (event) setEventName(event.name)
      }
    }
    loadData()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const res = ev.target?.result as string
      if (side === 'front') {
        setPreview(res)
        setResult(null)
        setError(null)
        setSaved(false)
        setNote('')
        setTag('')
        setPreview2(null)
      } else {
        setPreview2(res)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleScan = async () => {
    if (!preview) return
    setLoading(true)
    setError(null)
    try {
      const compress = (dataUrl: string): Promise<string> => new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let w = img.width, h = img.height
          const max = 600
          if (w > h) { if (w > max) { h = Math.round(h*max/w); w = max } }
          else { if (h > max) { w = Math.round(w*max/h); h = max } }
          canvas.width = w; canvas.height = h
          canvas.getContext('2d')?.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/jpeg', 0.5).split(',')[1])
        }
        img.onerror = () => resolve('')
        img.src = dataUrl
      })

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in'); setLoading(false); return }

      const base64 = await compress(preview)
      if (!base64) { setError('Could not process image'); setLoading(false); return }

      const uploadRes = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, userId: user.id })
      })
      const uploadData = await uploadRes.json()
      if (!uploadData.success) { setError('Upload failed: ' + uploadData.error); setLoading(false); return }

      const scanRes = await fetch('/api/scan-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: uploadData.url })
      })
      if (!scanRes.ok) { setError('Scan error'); setLoading(false); return }

      const data = await scanRes.json()
      if (data.success) {
        setResult({ ...data.data, uploadedImageUrl: uploadData.url })
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch (e: any) {
      setError('Error: ' + (e?.message || 'Unknown'))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!result) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data: profile } = await supabase.from('users').select('name').eq('id', user.id).single()
    const userName = profile?.name || 'Unknown'

    const { data: scan, error: scanError } = await supabase.from('scans').insert({
      scanner_id: user.id,
      scanned_by_name: userName,
      mode: scanMode,
      event_id: eventId || null,
      company: result.company || '',
      industry: result.industry || '',
      address: result.address || '',
      city: result.city || '',
      state: result.state || '',
      pincode: result.pincode || '',
      products: result.products || '',
      image_url: result.uploadedImageUrl || '',
      raw_text: result.rawText || '',
      note,
      tag,
      lead_status: 'new',
      deal_value: 0
    }).select().single()

    if (scanError || !scan) { setSaving(false); return }

    if (result.people?.length > 0) {
      await supabase.from('contacts').insert(
        result.people.map((p: any) => ({
          scan_id: scan.id,
          scanner_id: user.id,
          name: p.name || '',
          designation: p.designation || '',
          phone1: p.phone1 || '',
          phone2: p.phone2 || '',
          phone3: p.phone3 || '',
          email: p.email || ''
        }))
      )
    }

    await supabase.from('lead_activity').insert({
      scan_id: scan.id,
      user_id: user.id,
      user_name: userName,
      action: 'scanned',
      new_value: tag || 'untagged',
      note: note || ''
    })

    setSaved(true)
    setSaving(false)
  }

  const reset = () => {
    setPreview(null); setPreview2(null); setResult(null)
    setError(null); setSaved(false); setNote(''); setTag('')
  }

  const isSeller = scanMode === 'seller'
  const tags = isSeller
    ? [{label:'Hot',color:'#D85A30',bg:'#FAECE7'},{label:'Warm',color:'#BA7517',bg:'#FAEEDA'},{label:'Cold',color:'#185FA5',bg:'#E6F1FB'}]
    : [{label:'High',color:'#27500A',bg:'#EAF3DE'},{label:'Medium',color:'#BA7517',bg:'#FAEEDA'},{label:'Low',color:'#5F5E5A',bg:'#F1EFE8'}]

  return (
    <div style={{maxWidth:'480px',margin:'0 auto',fontFamily:'sans-serif'}}>
      <div style={{backgroundColor:primary,padding:'16px 20px 14px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
          <a href="/dashboard" style={{color:'rgba(255,255,255,0.7)',textDecoration:'none',fontSize:'14px'}}>← Back</a>
          <h1 style={{fontSize:'18px',fontWeight:'500',margin:0,color:'white'}}>Scan Business Card</h1>
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
        <div style={{marginBottom:'12px'}}>
          <div style={{fontSize:'12px',color:'#999',marginBottom:'6px',fontWeight:'500'}}>FRONT OF CARD</div>
          <div onClick={()=>fileInputRef.current?.click()} style={{border:'2px dashed #ddd',borderRadius:'12px',padding:'20px',textAlign:'center',cursor:'pointer',backgroundColor:'#fafafa'}}>
            {preview
              ? <img src={preview} alt="front" style={{maxWidth:'100%',maxHeight:'160px',borderRadius:'8px'}} />
              : <div><div style={{fontSize:'32px',marginBottom:'6px'}}>📷</div><div style={{fontSize:'13px',color:'#666'}}>Tap to upload front of card</div></div>
            }
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={e=>handleFileChange(e,'front')} style={{display:'none'}} />
        </div>

        {preview && (
          <div style={{marginBottom:'16px'}}>
            <div style={{fontSize:'12px',color:'#999',marginBottom:'6px',fontWeight:'500'}}>BACK OF CARD (optional)</div>
            <div onClick={()=>fileInputRef2.current?.click()} style={{border:'2px dashed #ddd',borderRadius:'12px',padding:'16px',textAlign:'center',cursor:'pointer',backgroundColor:'#fafafa'}}>
              {preview2
                ? <img src={preview2} alt="back" style={{maxWidth:'100%',maxHeight:'120px',borderRadius:'8px'}} />
                : <div style={{fontSize:'13px',color:'#999'}}>+ Add back of card</div>
              }
            </div>
            <input ref={fileInputRef2} type="file" accept="image/*" onChange={e=>handleFileChange(e,'back')} style={{display:'none'}} />
          </div>
        )}

        {preview && !result && (
          <button onClick={handleScan} disabled={loading} style={{width:'100%',padding:'14px',backgroundColor:loading?'#999':primary,color:'white',border:'none',borderRadius:'8px',fontSize:'15px',cursor:loading?'not-allowed':'pointer',marginBottom:'16px'}}>
            {loading ? 'Scanning...' : 'Extract Contact Info'}
          </button>
        )}

        {error && (
          <div style={{padding:'12px',backgroundColor:'#fff0f0',border:'1px solid #ffcccc',borderRadius:'8px',color:'#cc0000',fontSize:'14px',marginBottom:'16px'}}>
            {error}
          </div>
        )}

        {result && (
          <div style={{backgroundColor:'white',border:'1px solid #eee',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
            <div style={{marginBottom:'8px'}}>
              <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'10px',backgroundColor:isSeller?'#FAECE7':'#EAF3DE',color:isSeller?'#993C1D':'#27500A',fontWeight:'500'}}>
                {isSeller ? 'Seller lead' : 'Buyer contact'}
              </span>
            </div>
            <h2 style={{fontSize:'16px',margin:'0 0 4px',color:'#111'}}>{result.company||'Company'}</h2>
            {result.industry && <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'10px',backgroundColor:'#EAF3DE',color:'#27500A',fontWeight:'500'}}>{result.industry}</span>}
            {(result.city||result.state) && <div style={{fontSize:'13px',color:'#666',marginTop:'6px'}}>📍 {[result.city,result.state,result.pincode].filter(Boolean).join(', ')}</div>}
            {result.address && <div style={{fontSize:'12px',color:'#999',marginTop:'2px'}}>{result.address}</div>}
            {result.products && <div style={{fontSize:'12px',color:'#666',marginTop:'4px',fontStyle:'italic'}}>{result.products}</div>}

            {result.people?.length > 0 && (
              <div style={{marginTop:'16px',borderTop:'1px solid #f0f0f0',paddingTop:'12px'}}>
                <div style={{fontSize:'12px',color:'#999',marginBottom:'8px',fontWeight:'500'}}>PEOPLE ON THIS CARD</div>
                {result.people.map((p:any,i:number) => (
                  <div key={i} style={{padding:'10px',backgroundColor:'#fafafa',borderRadius:'8px',marginBottom:'8px'}}>
                    <div style={{fontSize:'14px',fontWeight:'500',color:'#111',marginBottom:'4px'}}>
                      {p.name}{p.designation && <span style={{fontSize:'12px',color:'#666',fontWeight:'400'}}> · {p.designation}</span>}
                    </div>
                    {[p.phone1,p.phone2,p.phone3].filter(Boolean).map((ph:string,j:number) => (
                      <div key={j} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                        <span style={{fontSize:'13px',color:'#444'}}>{ph}</span>
                        <a href={'tel:'+ph} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'26px',height:'26px',borderRadius:'50%',backgroundColor:'#EAF3DE',textDecoration:'none',fontSize:'13px'}}>📞</a>
                      </div>
                    ))}
                    {p.email && <div style={{fontSize:'12px',color:'#4285F4'}}>{p.email}</div>}
                  </div>
                ))}
              </div>
            )}

            <div style={{marginTop:'16px'}}>
              <div style={{fontSize:'13px',fontWeight:'500',marginBottom:'8px',color:'#111'}}>
                {isSeller ? 'Lead temperature' : 'Interest level'}
              </div>
              <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
                {tags.map(t => (
                  <button key={t.label} onClick={()=>setTag(tag===t.label?'':t.label)} style={{padding:'6px 16px',borderRadius:'20px',border:tag===t.label?'2px solid '+t.color:'2px solid #eee',backgroundColor:tag===t.label?t.bg:'white',color:tag===t.label?t.color:'#999',fontSize:'13px',fontWeight:'500',cursor:'pointer'}}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{fontSize:'13px',fontWeight:'500',marginBottom:'8px',color:'#111'}}>Note</div>
              <div style={{fontSize:'13px',fontWeight:'500',marginBottom:'8px',color:'#111'}}>Note</div>
              <div style={{display:'flex',gap:'8px',alignItems:'flex-start'}}>
                <textarea
                  value={note}
                  onChange={e=>setNote(e.target.value)}
                  placeholder="Type or hold 🎤 to speak..."
                  style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px',resize:'none',minHeight:'80px',fontFamily:'sans-serif',boxSizing:'border-box'}}
                />
                <MicButton onTranscript={(text) => setNote(prev => prev ? prev + ' ' + text : text)} />
              </div>
            </div>

            {!saved ? (
              <button onClick={handleSave} disabled={saving} style={{marginTop:'16px',width:'100%',padding:'12px',backgroundColor:saving?'#999':primary,color:'white',border:'none',borderRadius:'8px',fontSize:'14px',cursor:saving?'not-allowed':'pointer'}}>
                {saving ? 'Saving...' : `Save as ${isSeller?'Seller':'Buyer'} Contact`}
              </button>
            ) : (
              <div style={{marginTop:'16px',padding:'12px',backgroundColor:'#EAF3DE',borderRadius:'8px',color:'#27500A',fontSize:'14px',textAlign:'center'}}>
                ✓ Saved as {isSeller?'Seller':'Buyer'} — {result.people?.length||0} people added
              </div>
            )}

            <button onClick={reset} style={{marginTop:'10px',width:'100%',padding:'12px',backgroundColor:'white',color:'#666',border:'1px solid #ddd',borderRadius:'8px',fontSize:'14px',cursor:'pointer'}}>
              Scan Another Card
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
