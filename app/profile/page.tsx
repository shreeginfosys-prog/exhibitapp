'use client'

import { useState, useRef } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [form, setForm] = useState({
    name: '', designation: '', company: '', phone: '',
    website: '', address: '', industry: ''
  })

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

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
        }
      } catch (e) { console.error(e) }
      setScanning(false)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!form.name) { alert('Please enter your name'); return }
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

  const primaryColor = '#0F6E56'
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'sans-serif', boxSizing: 'border-box' as const, marginBottom: '12px' }
  const labelStyle = { fontSize: '12px', color: '#666', fontWeight: '500' as const, marginBottom: '4px', display: 'block' as const }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '480px', margin: '0 auto', padding: '24px', paddingBottom: '40px' }}>

      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>👤</div>
        <h1 style={{ fontSize: '20px', fontWeight: '500', color: '#111', margin: '0 0 4px' }}>Set up your profile</h1>
        <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>This helps others know who you are</p>
      </div>

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={scanning}
        style={{ width: '100%', padding: '14px', backgroundColor: scanning ? '#999' : primaryColor, color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: scanning ? 'not-allowed' : 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
      >
        <span>📷</span>
        <span>{scanning ? 'Scanning your card...' : 'Scan your own business card to auto-fill'}</span>
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleScanOwnCard} style={{ display: 'none' }} />

      <div style={{ backgroundColor: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#111', marginBottom: '12px' }}>Personal details</div>
        <label style={labelStyle}>Full name *</label>
        <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Vipul Arora" style={inputStyle} />
        <label style={labelStyle}>Designation</label>
        <input value={form.designation} onChange={e => update('designation', e.target.value)} placeholder="Owner / Director / Manager" style={inputStyle} />
        <label style={labelStyle}>Phone number</label>
        <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="9999999999" type="tel" style={inputStyle} />
      </div>

      <div style={{ backgroundColor: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#111', marginBottom: '12px' }}>Company details</div>
        <label style={labelStyle}>Company name</label>
        <input value={form.company} onChange={e => update('company', e.target.value)} placeholder="ABC Plastics Pvt Ltd" style={inputStyle} />
        <label style={labelStyle}>Industry</label>
        <input value={form.industry} onChange={e => update('industry', e.target.value)} placeholder="Plastics / Textiles / Hardware..." style={inputStyle} />
        <label style={labelStyle}>Website</label>
        <input value={form.website} onChange={e => update('website', e.target.value)} placeholder="www.yourcompany.com" style={inputStyle} />
        <label style={labelStyle}>Address</label>
        <input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Shop / Office address" style={inputStyle} />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{ width: '100%', padding: '14px', backgroundColor: saving ? '#999' : primaryColor, color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '500', cursor: saving ? 'not-allowed' : 'pointer' }}
      >
        {saving ? 'Saving...' : 'Save & Continue →'}
      </button>
    </div>
  )
}
