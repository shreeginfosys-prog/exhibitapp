'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'

export default function ContactsPage() {
  const supabase = createClient()
  const [scans, setScans] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [userType, setUserType] = useState<string | null>(null)
  const [template, setTemplate] = useState('Hi, great meeting you at the exhibition! Looking forward to staying in touch.')
  const [expandedScan, setExpandedScan] = useState<string | null>(null)
  const [viewingCard, setViewingCard] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: profile } = await supabase.from('users').select('type, whatsapp_template').eq('id', user.id).single()
      if (profile) {
        setUserType(profile.type)
        if (profile.whatsapp_template) setTemplate(profile.whatsapp_template)
      }

      const { data: scansData } = await supabase
        .from('scans')
        .select('*, contacts(*)')
        .eq('scanner_id', user.id)
        .order('created_at', { ascending: false })

      setScans(scansData || [])
      setFiltered(scansData || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const applyFilter = (tag: string) => {
    setActiveFilter(tag)
    setFiltered(tag === 'All' ? scans : scans.filter(s => s.tag === tag))
  }

  const exportCSV = () => {
    const headers = ['Company','Industry','City','State','Person Name','Designation','Phone1','Phone2','Email','Address','Tag','Note','Date']
    const rows: any[] = []
    scans.forEach(scan => {
      if (scan.contacts && scan.contacts.length > 0) {
        scan.contacts.forEach((c: any) => {
          rows.push([
            scan.company || '',
            scan.industry || '',
            scan.city || '',
            scan.state || '',
            c.name || '',
            c.designation || '',
            c.phone1 || '',
            c.phone2 || '',
            c.email || '',
            scan.address || '',
            scan.tag || '',
            scan.note || '',
            new Date(scan.created_at).toLocaleDateString('en-IN')
          ])
        })
      }
    })
    const csv = [headers, ...rows].map(r => r.map((v: any) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contacts.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const tagStyle = (tag: string) => {
    const s: Record<string, { color: string; bg: string }> = {
      'Hot': { color: '#D85A30', bg: '#FAECE7' },
      'Warm': { color: '#BA7517', bg: '#FAEEDA' },
      'Cold': { color: '#185FA5', bg: '#E6F1FB' },
      'High': { color: '#27500A', bg: '#EAF3DE' },
      'Medium': { color: '#BA7517', bg: '#FAEEDA' },
      'Low': { color: '#5F5E5A', bg: '#F1EFE8' },
    }
    return s[tag] || { color: '#999', bg: '#f5f5f5' }
  }

  const isExhibitor = userType === 'exhibitor'
  const filterTags = isExhibitor ? ['All', 'Hot', 'Warm', 'Cold'] : ['All', 'High', 'Medium', 'Low']
  const counts = filterTags.reduce((a, t) => {
    a[t] = t === 'All' ? scans.length : scans.filter(s => s.tag === t).length
    return a
  }, {} as Record<string, number>)

  const totalContacts = scans.reduce((sum, s) => sum + (s.contacts?.length || 0), 0)

  if (loading) return (
    <div style={{ padding: '24px', textAlign: 'center', color: '#999', marginTop: '60px', fontFamily: 'sans-serif' }}>
      Loading contacts...
    </div>
  )

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>

      {viewingCard && (
        <div onClick={() => setViewingCard(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <img src={viewingCard} alt="card" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '8px' }} />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '500', margin: 0 }}>My Contacts</h1>
          <p style={{ color: '#999', fontSize: '13px', margin: '4px 0 0' }}>{scans.length} cards · {totalContacts} people</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={exportCSV} style={{ padding: '10px 14px', backgroundColor: '#f5f5f5', color: '#111', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            Export CSV
          </button>
          <a href="/scan" style={{ padding: '10px 18px', backgroundColor: '#111', color: 'white', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
            + Scan
          </a>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {filterTags.map(tag => {
          const active = activeFilter === tag
          const s = tag === 'All' ? { color: '#111', bg: '#f0f0f0' } : tagStyle(tag)
          return (
            <button key={tag} onClick={() => applyFilter(tag)} style={{ padding: '6px 14px', borderRadius: '20px', border: active ? '2px solid ' + s.color : '2px solid #eee', backgroundColor: active ? s.bg : 'white', color: active ? s.color : '#999', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              {tag} {counts[tag] > 0 ? '(' + counts[tag] + ')' : ''}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📇</div>
          <div style={{ fontSize: '16px', marginBottom: '8px', color: '#666' }}>No contacts yet</div>
          <div style={{ fontSize: '14px' }}>Scan your first business card to get started</div>
        </div>
      )}

      {filtered.map(scan => (
        <div key={scan.id} style={{ backgroundColor: 'white', border: '1px solid #eee', borderRadius: '12px', marginBottom: '10px', overflow: 'hidden' }}>

          <div style={{ padding: '16px', cursor: 'pointer' }} onClick={() => setExpandedScan(expandedScan === scan.id ? null : scan.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '15px', fontWeight: '500', color: '#111' }}>
                    {scan.company || 'Unknown Company'}
                  </div>
                  {scan.tag && (
                    <span style={{ fontSize: '11px', fontWeight: '500', padding: '2px 8px', borderRadius: '10px', backgroundColor: tagStyle(scan.tag).bg, color: tagStyle(scan.tag).color }}>
                      {scan.tag}
                    </span>
                  )}
                  {scan.industry && (
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#EAF3DE', color: '#27500A' }}>
                      {scan.industry}
                    </span>
                  )}
                </div>

                {(scan.city || scan.state) && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    📍 {[scan.city, scan.state].filter(Boolean).join(', ')}
                    {scan.pincode ? ' - ' + scan.pincode : ''}
                  </div>
                )}

                {scan.contacts && (
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    {scan.contacts.length} {scan.contacts.length === 1 ? 'person' : 'people'} · tap to {expandedScan === scan.id ? 'collapse' : 'expand'}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', marginLeft: '12px' }}>
                {scan.image_url && (
                  <img
                    src={scan.image_url}
                    alt="card"
                    onClick={(e) => { e.stopPropagation(); setViewingCard(scan.image_url) }}
                    style={{ width: '52px', height: '32px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #eee', cursor: 'zoom-in' }}
                  />
                )}
                <div style={{ fontSize: '11px', color: '#bbb' }}>
                  {new Date(scan.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            </div>

            {scan.note && (
              <div style={{ marginTop: '8px', padding: '8px 10px', backgroundColor: '#fafafa', borderRadius: '6px', fontSize: '12px', color: '#666', borderLeft: '2px solid #ddd' }}>
                {scan.note}
              </div>
            )}
          </div>

          {expandedScan === scan.id && scan.contacts && scan.contacts.length > 0 && (
            <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 16px' }}>
              {scan.address && (
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>
                  📍 {scan.address}
                </div>
              )}
              {scan.products && (
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px', fontStyle: 'italic' }}>
                  {scan.products}
                </div>
              )}
              {scan.contacts.map((contact: any) => (
                <div key={contact.id} style={{ padding: '10px', backgroundColor: '#fafafa', borderRadius: '8px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#111', marginBottom: '6px' }}>
                    {contact.name}
                    {contact.designation && (
                      <span style={{ fontSize: '12px', color: '#666', fontWeight: '400' }}> · {contact.designation}</span>
                    )}
                  </div>
                  {[contact.phone1, contact.phone2, contact.phone3].filter(Boolean).map((ph: string, j: number) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#444' }}>{ph}</span>
                      <a href={'tel:' + ph} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#EAF3DE', textDecoration: 'none', fontSize: '14px' }} title="Call">📞</a>
                      {isExhibitor && (
                        <a href={'https://wa.me/91' + ph + '?text=' + encodeURIComponent(template)} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#E1F5EE', textDecoration: 'none', fontSize: '14px' }} title="WhatsApp">💬</a>
                      )}
                    </div>
                  ))}
                  {contact.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#444' }}>{contact.email}</span>
                      <a href={'mailto:' + contact.email} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#E6F1FB', textDecoration: 'none', fontSize: '14px' }}>✉️</a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
