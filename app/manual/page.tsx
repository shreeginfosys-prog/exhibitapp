'use client'

import { useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import MobileLayout from '../components/MobileLayout'
import MicButton from '../components/MicButton'

export default function ManualEntry() {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [userType, setUserType] = useState<string | null>(null)
  const [tag, setTag] = useState('')
  const [form, setForm] = useState({
    company: '', industry: '', city: '', state: '',
    address: '', products: '', note: '',
    person1_name: '', person1_phone1: '', person1_phone2: '', person1_email: '', person1_designation: '',
    person2_name: '', person2_phone1: '', person2_phone2: '', person2_email: '', person2_designation: '',
  })
  const primary = '#0F6E56'

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const getUserType = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('type').eq('id', user.id).single()
    if (profile) setUserType(profile.type)
  }

  if (!userType) { getUserType() }

  const isExhibitor = userType === 'exhibitor'
  const tags = isExhibitor
    ? [{ label: 'Hot', color: '#D85A30', bg: '#FAECE7' }, { label: 'Warm', color: '#BA7517', bg: '#FAEEDA' }, { label: 'Cold', color: '#185FA5', bg: '#E6F1FB' }]
    : [{ label: 'High', color: '#27500A', bg: '#EAF3DE' }, { label: 'Medium', color: '#BA7517', bg: '#FAEEDA' }, { label: 'Low', color: '#5F5E5A', bg: '#F1EFE8' }]

  const handleSave = async () => {
    if (!form.person1_name && !form.company) {
      alert('Please enter at least a name or company')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data: scan, error: scanError } = await supabase.from('scans').insert({
      scanner_id: user.id,
      company: form.company,
      industry: form.industry,
      address: form.address,
      city: form.city,
      state: form.state,
      products: form.products,
      note: form.note,
      tag,
      image_url: '',
      raw_text: ''
    }).select().single()

    if (scanError || !scan) { setSaving(false); return }

    const people = []
    if (form.person1_name || form.person1_phone1) {
      people.push({
        scan_id: scan.id, scanner_id: user.id,
        name: form.person1_name, designation: form.person1_designation,
        phone1: form.person1_phone1, phone2: form.person1_phone2,
        phone3: '', email: form.person1_email
      })
    }
    if (form.person2_name || form.person2_phone1) {
      people.push({
        scan_id: scan.id, scanner_id: user.id,
        name: form.person2_name, designation: form.person2_designation,
        phone1: form.person2_phone1, phone2: form.person2_phone2,
        phone3: '', email: form.person2_email
      })
    }

    if (people.length > 0) await supabase.from('contacts').insert(people)

    setSaving(false)
    router.push('/contacts')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px', borderRadius: '8px',
    border: '1px solid #ddd', fontSize: '13px',
    fontFamily: 'sans-serif', boxSizing: 'border-box', marginBottom: '10px'
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '12px', color: '#999', fontWeight: '500',
    marginBottom: '4px', display: 'block'
  }
  const sectionStyle: React.CSSProperties = {
    backgroundColor: 'white', border: '1px solid #eee',
    borderRadius: '12px', padding: '16px', marginBottom: '12px'
  }

  return (
    <MobileLayout>

      {/* Header */}
      <div style={{backgroundColor:primary,padding:'16px 20px 20px'}}>
        <div style={{fontSize:'18px',fontWeight:'600',color:'white',fontFamily:"'Fraunces', serif"}}>
          Manual Entry
        </div>
        <div style={{fontSize:'12px',color:'rgba(255,255,255,0.7)',marginTop:'4px'}}>
          Add a contact without scanning
        </div>
      </div>

      <div style={{padding:'16px'}}>

        {/* Company */}
        <div style={sectionStyle}>
          <div style={{fontSize:'14px',fontWeight:'500',color:'#111',marginBottom:'12px'}}>Company Details</div>
          <label style={labelStyle}>Company Name</label>
          <input value={form.company} onChange={e => update('company', e.target.value)} placeholder="e.g. Sharma Enterprises" style={inputStyle} />
          <label style={labelStyle}>Industry</label>
          <input value={form.industry} onChange={e => update('industry', e.target.value)} placeholder="e.g. Plastics, Textiles" style={inputStyle} />
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            <div>
              <label style={labelStyle}>City</label>
              <input value={form.city} onChange={e => update('city', e.target.value)} placeholder="Delhi" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>State</label>
              <input value={form.state} onChange={e => update('state', e.target.value)} placeholder="Delhi" style={inputStyle} />
            </div>
          </div>
          <label style={labelStyle}>Address</label>
          <input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Shop no, street, area" style={inputStyle} />
          <label style={labelStyle}>Products / Services</label>
          <input value={form.products} onChange={e => update('products', e.target.value)} placeholder="What do they sell?" style={inputStyle} />
        </div>

        {/* Person 1 */}
        <div style={sectionStyle}>
          <div style={{fontSize:'14px',fontWeight:'500',color:'#111',marginBottom:'12px'}}>Person 1</div>
          <label style={labelStyle}>Full Name</label>
          <input value={form.person1_name} onChange={e => update('person1_name', e.target.value)} placeholder="Rahul Sharma" style={inputStyle} />
          <label style={labelStyle}>Designation</label>
          <input value={form.person1_designation} onChange={e => update('person1_designation', e.target.value)} placeholder="Owner / Manager" style={inputStyle} />
          <label style={labelStyle}>Phone 1</label>
          <input value={form.person1_phone1} onChange={e => update('person1_phone1', e.target.value)} placeholder="9999999999" type="tel" style={inputStyle} />
          <label style={labelStyle}>Phone 2 (optional)</label>
          <input value={form.person1_phone2} onChange={e => update('person1_phone2', e.target.value)} placeholder="9999999999" type="tel" style={inputStyle} />
          <label style={labelStyle}>Email (optional)</label>
          <input value={form.person1_email} onChange={e => update('person1_email', e.target.value)} placeholder="email@company.com" type="email" style={inputStyle} />
        </div>

        {/* Person 2 */}
        <div style={sectionStyle}>
          <div style={{fontSize:'14px',fontWeight:'500',color:'#111',marginBottom:'12px'}}>Person 2 (optional)</div>
          <label style={labelStyle}>Full Name</label>
          <input value={form.person2_name} onChange={e => update('person2_name', e.target.value)} placeholder="Suresh Kumar" style={inputStyle} />
          <label style={labelStyle}>Designation</label>
          <input value={form.person2_designation} onChange={e => update('person2_designation', e.target.value)} placeholder="Sales Manager" style={inputStyle} />
          <label style={labelStyle}>Phone 1</label>
          <input value={form.person2_phone1} onChange={e => update('person2_phone1', e.target.value)} placeholder="9999999999" type="tel" style={inputStyle} />
          <label style={labelStyle}>Email (optional)</label>
          <input value={form.person2_email} onChange={e => update('person2_email', e.target.value)} placeholder="email@company.com" type="email" style={inputStyle} />
        </div>

        {/* Tag + Note */}
        <div style={sectionStyle}>
          <div style={{fontSize:'14px',fontWeight:'500',color:'#111',marginBottom:'12px'}}>Tag & Note</div>

          <div style={{display:'flex',gap:'8px',marginBottom:'14px',flexWrap:'wrap'}}>
            {tags.map(t => (
              <button key={t.label} onClick={() => setTag(tag === t.label ? '' : t.label)} style={{padding:'6px 16px',borderRadius:'20px',border:tag===t.label?'2px solid '+t.color:'2px solid #eee',backgroundColor:tag===t.label?t.bg:'white',color:tag===t.label?t.color:'#999',fontSize:'13px',fontWeight:'500',cursor:'pointer'}}>
                {t.label}
              </button>
            ))}
          </div>

          <label style={labelStyle}>Note</label>
          <div style={{display:'flex',gap:'8px',alignItems:'flex-start'}}>
            <textarea
              value={form.note}
              onChange={e => update('note', e.target.value)}
              placeholder="Type or hold 🎤 to speak..."
              style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px',resize:'none',minHeight:'80px',fontFamily:'sans-serif',boxSizing:'border-box'}}
            />
            <MicButton onTranscript={(text) => update('note', form.note ? form.note + ' ' + text : text)} />
          </div>
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving} style={{width:'100%',padding:'14px',backgroundColor:saving?'#999':primary,color:'white',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'500',cursor:saving?'not-allowed':'pointer',marginBottom:'8px'}}>
          {saving ? 'Saving...' : 'Save Contact'}
        </button>

      </div>
    </MobileLayout>
  )
}
