'use client'

import { useState, useRef } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const primary = '#0F6E56'

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1.5px solid #D1FAE5',
  fontSize: '14px',
  fontFamily: "'DM Sans', sans-serif",
  boxSizing: 'border-box' as const,
  marginBottom: '12px',
  backgroundColor: 'white',
  color: '#111',
  outline: 'none'
}

const requiredInputStyle = (hasError: boolean) => ({
  ...inputStyle,
  border: hasError ? '1.5px solid #E53E3E' : '1.5px solid #D1FAE5',
})

const labelStyle = {
  fontSize: '12px',
  color: '#4A5568',
  fontWeight: '600' as const,
  marginBottom: '4px',
  display: 'block' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em'
}

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [form, setForm] = useState({
    name: '', designation: '', company: '', phone: '',
    website: '', address: '', industry: ''
  })

  const update = (key: string, value: string) => {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(prev => { const n={...prev}; delete n[key]; return n })
  }

  const handleScanOwnCard = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string
      try {
        const compressToBase64 = (url: string): Promise<string> => {
          return new Promise((resolve) => {
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
            img.src = url
          })
        }
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const base64 = await compressToBase64(dataUrl)
        const uploadRes = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, userId: user.id })
        })
        const uploadData = await uploadRes.json()
        if (!uploadData.success) { setScanning(false); return }
        const scanRes = await fetch('/api/scan-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: uploadData.url })
        })
        const scanData = await scanRes.json()
        if (scanData.success) {
          const d = scanData.data
          const person = d.people?.[0]
          setForm(f => ({
            ...f,
            name: person?.name || f.name,
            designation: person?.designation || f.designation,
            company: d.company || f.company,
            phone: person?.phone1 || f.phone,
            website: d.website || f.website,
            address: d.address || f.address,
            industry: d.industry || f.industry,
          }))
          setErrors({})
        }
      } catch (e) { console.error(e) }
      setScanning(false)
    }
    reader.readAsDataURL(file)
  }

  const validate = () => {
    const newErrors: Record<string,string> = {}
    if (!form.name.trim()) newErrors.name = 'Full name is required'
    if (!form.phone.trim()) newErrors.phone = 'Phone number is required'
    if (!form.company.trim()) newErrors.company = 'Company name is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) {
      // Scroll to top to show errors
      window.scrollTo(0, 0)
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from('users').update({
      name: form.name,
      designation: form.designation,
      company: form.company,
      phone: form.phone,
      website: form.website,
      address: form.address,
      industry: form.industry,
      onboarding_complete: true
    }).eq('id', user.id)
    setSaving(false)
    router.push('/choose-mode')
  }

  return (
    <div style={{fontFamily:"'DM Sans', sans-serif", maxWidth:'480px', margin:'0 auto', minHeight:'100dvh', backgroundColor:'#f5f5f5'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:wght@600;700&display=swap'); * { box-sizing: border-box; }`}</style>

      {/* Header */}
      <div style={{backgroundColor:primary, padding:'24px 20px 20px'}}>
        <div style={{fontSize:'22px', fontWeight:'700', color:'white', fontFamily:"'Fraunces', serif", marginBottom:'6px'}}>
          Set up your profile
        </div>
        <div style={{fontSize:'13px', color:'rgba(255,255,255,0.7)'}}>
          This helps us personalise your experience
        </div>
      </div>

      <div style={{padding:'16px', paddingBottom:'40px'}}>

        {/* Scan card button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={scanning}
          style={{
            width:'100%', padding:'16px',
            backgroundColor: scanning ? '#999' : 'white',
            color: scanning ? 'white' : primary,
            border: `2px solid ${scanning ? '#999' : primary}`,
            borderRadius:'12px', fontSize:'14px', fontWeight:'600',
            cursor: scanning ? 'not-allowed' : 'pointer',
            marginBottom:'16px',
            display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
            boxShadow: scanning ? 'none' : '0 2px 8px rgba(15,110,86,0.15)'
          }}
        >
          <span style={{fontSize:'20px'}}>📷</span>
          <span>{scanning ? 'Reading your card...' : 'Scan your business card to auto-fill'}</span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleScanOwnCard} style={{display:'none'}} />

        {/* Errors summary */}
        {Object.keys(errors).length > 0 && (
          <div style={{padding:'12px 14px', backgroundColor:'#FFF5F5', border:'1.5px solid #E53E3E', borderRadius:'10px', marginBottom:'16px'}}>
            <div style={{fontSize:'13px', fontWeight:'600', color:'#E53E3E', marginBottom:'4px'}}>Please fill required fields:</div>
            {Object.values(errors).map((err, i) => (
              <div key={i} style={{fontSize:'12px', color:'#C53030'}}>· {err}</div>
            ))}
          </div>
        )}

        {/* Personal details */}
        <div style={{backgroundColor:'white', border:'1px solid #eee', borderRadius:'12px', padding:'16px', marginBottom:'12px'}}>
          <div style={{fontSize:'14px', fontWeight:'700', color:'#111', marginBottom:'14px'}}>👤 Personal Details</div>

          <label style={labelStyle}>Full Name <span style={{color:'#E53E3E'}}>*</span></label>
          <input
            value={form.name}
            onChange={e => update('name', e.target.value)}
            placeholder="Vipul Arora"
            style={requiredInputStyle(!!errors.name)}
          />
          {errors.name && <div style={{fontSize:'11px',color:'#E53E3E',marginTop:'-8px',marginBottom:'10px'}}>{errors.name}</div>}

          <label style={labelStyle}>Designation</label>
          <input
            value={form.designation}
            onChange={e => update('designation', e.target.value)}
            placeholder="Owner / Director / Manager"
            style={inputStyle}
          />

          <label style={labelStyle}>Phone Number <span style={{color:'#E53E3E'}}>*</span></label>
          <input
            value={form.phone}
            onChange={e => update('phone', e.target.value)}
            placeholder="9876543210"
            type="tel"
            style={requiredInputStyle(!!errors.phone)}
          />
          {errors.phone && <div style={{fontSize:'11px',color:'#E53E3E',marginTop:'-8px',marginBottom:'10px'}}>{errors.phone}</div>}
        </div>

        {/* Company details */}
        <div style={{backgroundColor:'white', border:'1px solid #eee', borderRadius:'12px', padding:'16px', marginBottom:'16px'}}>
          <div style={{fontSize:'14px', fontWeight:'700', color:'#111', marginBottom:'14px'}}>🏢 Company Details</div>

          <label style={labelStyle}>Company Name <span style={{color:'#E53E3E'}}>*</span></label>
          <input
            value={form.company}
            onChange={e => update('company', e.target.value)}
            placeholder="ABC Plastics Pvt Ltd"
            style={requiredInputStyle(!!errors.company)}
          />
          {errors.company && <div style={{fontSize:'11px',color:'#E53E3E',marginTop:'-8px',marginBottom:'10px'}}>{errors.company}</div>}

          <label style={labelStyle}>Industry</label>
          <input
            value={form.industry}
            onChange={e => update('industry', e.target.value)}
            placeholder="Plastics / Textiles / Hardware"
            style={inputStyle}
          />

          <label style={labelStyle}>Website</label>
          <input
            value={form.website}
            onChange={e => update('website', e.target.value)}
            placeholder="www.yourcompany.com"
            style={inputStyle}
          />

          <label style={labelStyle}>Office Address</label>
          <input
            value={form.address}
            onChange={e => update('address', e.target.value)}
            placeholder="Shop / Office address"
            style={inputStyle}
          />
        </div>

        {/* Required note */}
        <div style={{fontSize:'12px', color:'#999', marginBottom:'16px', textAlign:'center'}}>
          Fields marked <span style={{color:'#E53E3E'}}>*</span> are required
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width:'100%', padding:'16px',
            backgroundColor: saving ? '#999' : primary,
            color:'white', border:'none', borderRadius:'12px',
            fontSize:'15px', fontWeight:'700',
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: saving ? 'none' : '0 4px 14px rgba(15,110,86,0.3)'
          }}
        >
          {saving ? 'Saving...' : 'Save & Continue →'}
        </button>
      </div>
    </div>
  )
}
