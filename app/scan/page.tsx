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
      const base64 = event.target?.result as string
      if (side === 'front') {
        setPreview(base64)
        setResult(null)
        setError(null)
        setSaved(false)
        setNote('')
        setTag('')
        setPreview2(null)
        getUserType()
      } else {
        setPreview2(base64)
      }
    }
    reader.readAsDataURL(file)
  }

  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxSize = 1024
        let width = img.width
        let height = img.height
        if (width > height) {
          if (width > maxSize) { height = height * maxSize / width; width = maxSize }
        } else {
          if (height > maxSize) { width = width * maxSize / height; height = maxSize }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        const compressed = canvas.toDataURL('image/jpeg', 0.7)
        resolve(compressed.split(',')[1])
      }
      img.src = base64
    })
  }

  const handleScan = async () => {
    if (!preview) return
    setLoading(true)
    setError(null)
    try {
      const base64Front = await compressImage(preview)
      const base64Back = preview2 ? await compressImage(preview2) : null
      const response = await fetch('/api/scan-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Front, imageBack: base64Back })
      })
      const data = await response.json()
      if (data.success) {
        setResult(data.data)
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Failed to scan. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!result) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('cards').insert({
      scanner_id: user.id,
      name: result.name || '',
      company: result.company || '',
      designation: result.designation || '',
      phone: result.phone || '',
      email: result.email || '',
      website: result.website || '',
      address: result.address || '',
      raw_text: result.rawText || '',
      note: note,
      tag: tag
    })
    if (!error) setSaved(true)
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
    <div style={{ padding: '24px', maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <a href="/dashboard" style={{ color: '#999', textDecoration: 'none', fontSize: '14px' }}>← Back</a>
        <h1 style={{ fontSize: '20px', fontWeight: '500', margin: 0 }}>Scan Business Card</h1>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', color: '#999', marginBottom: '6px' }}>FRONT OF CARD</div>
        <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed #ddd', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#fafafa' }}>
          {preview ? (
            <img src={preview} alt="front" style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '8px' }} />
          ) : (
            <div>
              <div style={{ fontSize: '32px', marginBottom: '6px' }}>📷</div>
              <div style={{ fontSize: '13px', color: '#666' }}>Tap to scan front of card</div>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'front')} style={{ display: 'none' }} />
      </div>

      {preview && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '6px' }}>BACK OF CARD (optional)</div>
          <div onClick={() => fileInputRef2.current?.click()} style={{ border: '2px dashed #ddd', borderRadius: '12px', padding: '16px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#fafafa' }}>
            {preview2 ? (
              <img src={preview2} alt="back" style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '8px' }} />
            ) : (
              <div style={{ fontSize: '13px', color: '#999' }}>+ Scan back of card (if it has more info)</div>
            )}
          </div>
          <input ref={fileInputRef2} type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'back')} style={{ display: 'none' }} />
        </div>
      )}

      {preview && !result && (
        <button onClick={handleScan} disabled={loading} style={{ width: '100%', padding: '14px', backgroundColor: loading ? '#999' : '#111', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '16px' }}>
          {loading ? 'Scanning...' : 'Extract Contact Info'}
        </button>
      )}

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fff0f0', border: '1px solid #ffcccc', borderRadius: '8px', color: '#cc0000', fontSize: '14px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ backgroundColor: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', marginBottom: '16px', color: '#111' }}>Contact Details Found</h2>

          {[
            { label: 'Name', value: result.name },
            { label: 'Company', value: result.company },
            { label: 'Designation', value: result.designation },
            { label: 'Phone', value: result.phone },
            { label: 'Email', value: result.email },
            { label: 'Website', value: result.website },
            { label: 'Address', value: result.address },
          ].map(({ label, value }) => value ? (
            <div key={label} style={{ display: 'flex', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ color: '#999', fontSize: '13px', minWidth: '90px', paddingTop: '1px' }}>{label}</span>
              <span style={{ fontSize: '14px', color: '#111' }}>{value}</span>
            </div>
          ) : null)}

          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#111' }}>
              {isExhibitor ? 'Lead Temperature' : 'Interest Level'}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {tags.map((t) => (
                <button
                  key={t.label}
                  onClick={() => setTag(tag === t.label ? '' : t.label)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '20px',
                    border: tag === t.label ? `2px solid ${t.color}` : '2px solid #eee',
                    backgroundColor: tag === t.label ? t.bg : 'white',
                    color: tag === t.label ? t.color : '#999',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#111' }}>Note</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a short note about this conversation..."
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '13px',
                resize: 'vertical',
                minHeight: '80px',
                fontFamily: 'sans-serif',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {!saved ? (
            <button onClick={handleSave} disabled={saving} style={{ marginTop: '16px', width: '100%', padding: '12px', backgroundColor: saving ? '#999' : '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : 'Save Contact'}
            </button>
          ) : (
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#EAF3DE', borderRadius: '8px', color: '#27500A', fontSize: '14px', textAlign: 'center' }}>
              Contact saved successfully!
            </div>
          )}

          <button onClick={reset} style={{ marginTop: '10px', width: '100%', padding: '12px', backgroundColor: 'white', color: '#666', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
            Scan Another Card
          </button>
        </div>
      )}
    </div>
  )
}
