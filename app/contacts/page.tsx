'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'

export default function ContactsPage() {
  const supabase = createClient()
  const [cards, setCards] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [userType, setUserType] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: profile } = await supabase
        .from('users')
        .select('type')
        .eq('id', user.id)
        .single()
      if (profile) setUserType(profile.type)

      const { data } = await supabase
        .from('cards')
        .select('*')
        .eq('scanner_id', user.id)
        .order('created_at', { ascending: false })

      setCards(data || [])
      setFiltered(data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const applyFilter = (tag: string) => {
    setActiveFilter(tag)
    if (tag === 'All') {
      setFiltered(cards)
    } else {
      setFiltered(cards.filter(c => c.tag === tag))
    }
  }

  const getTagStyle = (tag: string) => {
    const styles: Record<string, { color: string; bg: string }> = {
      'Hot':    { color: '#D85A30', bg: '#FAECE7' },
      'Warm':   { color: '#BA7517', bg: '#FAEEDA' },
      'Cold':   { color: '#185FA5', bg: '#E6F1FB' },
      'High':   { color: '#27500A', bg: '#EAF3DE' },
      'Medium': { color: '#BA7517', bg: '#FAEEDA' },
      'Low':    { color: '#5F5E5A', bg: '#F1EFE8' },
    }
    return styles[tag] || { color: '#999', bg: '#f5f5f5' }
  }

  const isExhibitor = userType === 'exhibitor'
  const filterTags = isExhibitor
    ? ['All', 'Hot', 'Warm', 'Cold']
    : ['All', 'High', 'Medium', 'Low']

  const tagCounts = filterTags.reduce((acc, tag) => {
    acc[tag] = tag === 'All' ? cards.length : cards.filter(c => c.tag === tag).length
    return acc
  }, {} as Record<string, number>)

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#999', marginTop: '60px', fontFamily: 'sans-serif' }}>Loading contacts...</div>
  }

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '500', margin: 0 }}>My Contacts</h1>
          <p style={{ color: '#999', fontSize: '13px', margin: '4px 0 0' }}>{cards.length} cards saved</p>
        </div>
        <a href="/scan" style={{ padding: '10px 18px', backgroundColor: '#111', color: 'white', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>+ Scan Card</a>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {filterTags.map((tag) => {
          const isActive = activeFilter === tag
          const style = tag === 'All' ? { color: '#111', bg: '#f0f0f0' } : getTagStyle(tag)
          return (
            <button
              key={tag}
              onClick={() => applyFilter(tag)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: isActive ? '2px solid ' + style.color : '2px solid #eee',
                backgroundColor: isActive ? style.bg : 'white',
                color: isActive ? style.color : '#999',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              {tag} {tagCounts[tag] > 0 ? '(' + tagCounts[tag] + ')' : ''}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📇</div>
          <div style={{ fontSize: '16px', marginBottom: '8px', color: '#666' }}>
            {activeFilter === 'All' ? 'No contacts yet' : 'No ' + activeFilter + ' contacts'}
          </div>
          <div style={{ fontSize: '14px' }}>
            {activeFilter === 'All' ? 'Scan your first business card to get started' : 'Scan cards and tag them as ' + activeFilter}
          </div>
        </div>
      )}

      {filtered.map((card) => (
        <div key={card.id} style={{ backgroundColor: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <div style={{ fontSize: '15px', fontWeight: '500', color: '#111' }}>
                  {card.name || 'Unknown Name'}
                </div>
                {card.tag && (
                  <span style={{ fontSize: '11px', fontWeight: '500', padding: '2px 8px', borderRadius: '10px', backgroundColor: getTagStyle(card.tag).bg, color: getTagStyle(card.tag).color }}>
                    {card.tag}
                  </span>
                )}
              </div>

              {(card.designation || card.company) && (
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                  {card.designation && card.company ? card.designation + ' · ' + card.company : card.designation || card.company}
                </div>
              )}

              {card.phone && <div style={{ fontSize: '13px', color: '#444', marginBottom: '2px' }}>📞 {card.phone}</div>}
              {card.email && <div style={{ fontSize: '13px', color: '#4285F4', marginBottom: '2px' }}>✉ {card.email}</div>}
              {card.address && <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>📍 {card.address}</div>}

              {card.note && (
                <div style={{ marginTop: '8px', padding: '8px 10px', backgroundColor: '#fafafa', borderRadius: '6px', fontSize: '12px', color: '#666', borderLeft: '2px solid #ddd' }}>
                  {card.note}
                </div>
              )}
            </div>

            <div style={{ fontSize: '11px', color: '#bbb', whiteSpace: 'nowrap', marginLeft: '12px' }}>
              {new Date(card.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
