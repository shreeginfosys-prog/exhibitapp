'use client'

import { useState, useRef } from 'react'
import { createClient } from '../../lib/supabase'

export default function ScanPage() {
  const supabase = createClient()
  const [preview, setPreview] = useState<string | null>(null)
  const [preview2, setPreview2] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [note, setNote] = useState('')
  const [tag, setTag] = useState('')
  const [userType, setUserType] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef2 = useRef<HTMLInputElement>(null)

  const getUserType = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('type').eq('id', user.id).single()
    if (profile) setUserType(profile.type)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      if (side === 'front') {
        setPreview(result)
        setResult(null)
        setError(null)
        setSaved(false)
        setNote('')
        setTag('')
        setPreview2(null)
        getUserType()
      } else {
        setPreview2(result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleScan = async () => {
    if (!preview) return
    setLoading(true)
    setError(null)
    try {
      const compressToBase64 = (dataUrl: string): Promise<string> => {
        return new Promise((resolve) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            let width = img.width
            let height = img.height
            const maxSize = 600
            if (width > height) {
              if (width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize }
            } else {
              if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize }
            }
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            ctx?.drawImage(img, 0, 0, width, height)
            resolve(canvas.toDataURL('image/jpeg', 0.5).split(',')[1])
          }
          img.onerror = () => resolve('')
          img.src = dataUrl
        })
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in'); setLoading(false); return }

      const base64Front = await compressToBase64(preview)
      if (!base64Front) { setError('Could not process image'); setLoading(false); return }

      const uploadRes = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Front, userId: user.id })
      })

      const uploadData = await uploadRes.json()
      if (!uploadData.success) {
        setError('Upload failed: ' + uploadData.error)
        setLoading(false)
        return
      }

      const response = await fetch('/api/scan-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: uploadData.url })
      })

      if (!response.ok) {
        const text = await response.text()
        setError('Scan error: ' + text.slice(0, 100))
        setLoading(false)
        return
      }

      const data = await response.json()
      if (data.success) {
        setResult({ ...data.data, uploadedImageUrl: uploadData.url })
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch (e: any) {
      setError('Error: ' + (e?.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!result) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const image_url = result?.uploadedImageUrl || ''

    const { data: scan, error: scanError } = await supabase.from('scans').insert({
      scanner_id: user.id,
      company: result.company || '',
      industry: result.industry || '',
      address: result.address || '',
      city: result.city || '',
      state: result.state || '',
      pincode: result.pincode || '',
      products: result.products || '',
      image_url,
      raw_text: result.rawText || '',
      note,
      tag
    }).select().single()

    if (scanError || !scan) { setSaving(false); return }

    if (result.people && result.people.length > 0) {
      const contactRows = result.people.map((p: any) => ({
        scan_id: scan.id,
        scanner_id: user.id,
        name: p.name || '',
        designation: p.designation || '',
        phone1: p.phone1 || '',
        phone2: p.phone2 || '',
        phone3: p.phone3 || '',
        email: p.email || ''
      }))
      await supabase.from('contacts').insert(contactRows)
    }

    setSaved(true)
    setSaving(false)
  }

  const reset = () => {
    setPreview(null)
    setPreview2(null)
    setResult(null)
    setError(null)
    setSaved(false)
    setNote('')
    setTag('')
  }

  const isExhibitor = userType === 'exhibitor'
  const exhibitorTags = [
    { label: 'Hot', color: '#D85A30', bg: '#FAECE7' },
    { label: 'Warm', color: '#BA7517', bg: '#FAEEDA' },
    { label: 'Cold', color: '#185FA5', bg: '#E6F1FB' },
  ]
  const visitorTags = [
    { label: 'High', color: '#27500A', bg: '#EAF3DE' },
    { label: 'Medium', color: '#BA7517', bg: '#FAEEDA' },
    { label: 'Low', color: '#5F5E5A', bg: '#F1EFE8' },
  ]
  const tags = isExhibitor ? exhibitorTags : visitorTags

  return (
    <div style={{padding:'24px',maxWidth:'480px',margin:'0 auto',fontFamily:'sans-serif'}}>
      <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px'}}>
        <a href="/dashboard" style={{color:'#999',textDecoration:'none',fontSize:'14px'}}>← Back</a>
        <h1 style={{fontSize:'20px',fontWeight:'500',margin:0}}>Scan Business Card</h1>
      </div>

      <div style={{marginBottom:'12px'}}>
        <div style={{fontSize:'12px',color:'#999',marginBottom:'6px'}}>FRONT OF CARD</div>
        <div onClick={() => fileInputRef.current?.click()} style={{border:'2px dashed #ddd',borderRadius:'12px',padding:'20px',textAlign:'center',cursor:'pointer',backgroundColor:'#fafafa'}}>
          {preview ? (
            <img src={preview} alt="front" style={{maxWidth:'100%',maxHeight:'160px',borderRadius:'8px'}} />
          ) : (
            <div>
              <div style={{fontSize:'32px',marginBottom:'6px'}}>📷</div>
              <div style={{fontSize:'13px',color:'#666'}}>Tap to scan front of card</div>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'front')} style={{display:'none'}} />
      </div>

      {preview && (
        <div style={{marginBottom:'16px'}}>
          <div style={{fontSize:'12px',color:'#999',marginBottom:'6px'}}>BACK OF CARD (optional)</div>
          <div onClick={() => fileInputRef2.current?.click()} style={{border:'2px dashed #ddd',borderRadius:'12px',padding:'16px',textAlign:'center',cursor:'pointer',backgroundColor:'#fafafa'}}>
            {preview2 ? (
              <img src={preview2} alt="back" style={{maxWidth:'100%',maxHeight:'120px',borderRadius:'8px'}} />
            ) : (
              <div style={{fontSize:'13px',color:'#999'}}>+ Scan back of card (if it has more info)</div>
            )}
          </div>
          <input ref={fileInputRef2} type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'back')} style={{display:'none'}} />
        </div>
      )}

      {preview && !result && (
        <button onClick={handleScan} disabled={loading} style={{width:'100%',padding:'14px',backgroundColor:loading?'#999':'#111',color:'white',border:'none',borderRadius:'8px',fontSize:'15px',cursor:loading?'not-allowed':'pointer',marginBottom:'16px'}}>
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
          <h2 style={{fontSize:'16px',marginBottom:'4px',color:'#111'}}>{result.company || 'Company'}</h2>

          {result.industry && (
            <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'10px',backgroundColor:'#EAF3DE',color:'#27500A',fontWeight:'500'}}>
              {result.industry}
            </span>
          )}

          {(result.city || result.state) && (
            <div style={{fontSize:'13px',color:'#666',marginTop:'6px'}}>
              📍 {[result.city, result.state, result.pincode].filter(Boolean).join(', ')}
            </div>
          )}

          {result.address && (
            <div style={{fontSize:'12px',color:'#999',marginTop:'2px'}}>{result.address}</div>
          )}

          {result.products && (
            <div style={{fontSize:'12px',color:'#666',marginTop:'4px',fontStyle:'italic'}}>{result.products}</div>
          )}

          {result.people && result.people.length > 0 && (
            <div style={{marginTop:'16px',borderTop:'1px solid #f0f0f0',paddingTop:'12px'}}>
              <div style={{fontSize:'12px',color:'#999',marginBottom:'8px',fontWeight:'500'}}>PEOPLE ON THIS CARD</div>
              {result.people.map((person: any, i: number) => (
                <div key={i} style={{padding:'10px',backgroundColor:'#fafafa',borderRadius:'8px',marginBottom:'8px'}}>
                  <div style={{fontSize:'14px',fontWeight:'500',color:'#111',marginBottom:'4px'}}>
                    {person.name}
                    {person.designation && <span style={{fontSize:'12px',color:'#666',fontWeight:'400'}}> · {person.designation}</span>}
                  </div>
                  {[person.phone1, person.phone2, person.phone3].filter(Boolean).map((ph: string, j: number) => (
                    <div key={j} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                      <span style={{fontSize:'13px',color:'#444'}}>{ph}</span>
                      <a href={'tel:'+ph} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'26px',height:'26px',borderRadius:'50%',backgroundColor:'#EAF3DE',textDecoration:'none',fontSize:'13px'}}>📞</a>
                    </div>
                  ))}
                  {person.email && <div style={{fontSize:'12px',color:'#4285F4'}}>{person.email}</div>}
                </div>
              ))}
            </div>
          )}

          <div style={{marginTop:'16px'}}>
            <div style={{fontSize:'13px',fontWeight:'500',marginBottom:'8px',color:'#111'}}>
              {isExhibitor ? 'Lead Temperature' : 'Interest Level'}
            </div>
            <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
              {tags.map((t) => (
                <button key={t.label} onClick={() => setTag(tag === t.label ? '' : t.label)} style={{padding:'6px 16px',borderRadius:'20px',border:tag===t.label?'2px solid '+t.color:'2px solid #eee',backgroundColor:tag===t.label?t.bg:'white',color:tag===t.label?t.color:'#999',fontSize:'13px',fontWeight:'500',cursor:'pointer'}}>
                  {t.label}
                </button>
              ))}
            </div>
            <div style={{fontSize:'13px',fontWeight:'500',marginBottom:'8px',color:'#111'}}>Note</div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a short note about this conversation..." style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px',resize:'vertical',minHeight:'80px',fontFamily:'sans-serif',boxSizing:'border-box'}} />
          </div>

          {!saved ? (
            <button onClick={handleSave} disabled={saving} style={{marginTop:'16px',width:'100%',padding:'12px',backgroundColor:saving?'#999':'#1D9E75',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',cursor:saving?'not-allowed':'pointer'}}>
              {saving ? 'Saving...' : 'Save Contact'}
            </button>
          ) : (
            <div style={{marginTop:'16px',padding:'12px',backgroundColor:'#EAF3DE',borderRadius:'8px',color:'#27500A',fontSize:'14px',textAlign:'center'}}>
              Saved — {result.people?.length || 0} contacts added
            </div>
          )}

          <button onClick={reset} style={{marginTop:'10px',width:'100%',padding:'12px',backgroundColor:'white',color:'#666',border:'1px solid #ddd',borderRadius:'8px',fontSize:'14px',cursor:'pointer'}}>
            Scan Another Card
          </button>
        </div>
      )}
    </div>
  )
}
