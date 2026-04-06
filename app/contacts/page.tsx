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
  const [template, setTemplate] = useState('Hi, great meeting you at the exhibition! Looking forward to staying in touch.')

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('users').select('type, whatsapp_template').eq('id', user.id).single()
      if (profile) {
        setUserType(profile.type)
        if (profile.whatsapp_template) setTemplate(profile.whatsapp_template)
      }
      const { data } = await supabase.from('cards').select('*').eq('scanner_id', user.id).order('created_at', { ascending: false })
      setCards(data || [])
      setFiltered(data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const applyFilter = (tag: string) => {
    setActiveFilter(tag)
    setFiltered(tag === 'All' ? cards : cards.filter(c => c.tag === tag))
  }

  const exportCSV = () => {
    const headers = ['Name','Company','Designation','Phone','Email','Address','Tag','Note','Date']
    const rows = cards.map(c => [
      c.name || '',
      c.company || '',
      c.designation || '',
      c.phone || '',
      c.email || '',
      c.address || '',
      c.tag || '',
      c.note || '',
      new Date(c.created_at).toLocaleDateString('en-IN')
    ])
    const csv = [headers, ...rows].map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n')
    const blob = new Blob([csv], {type: 'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contacts.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const tagStyle = (tag: string) => {
    const s: Record<string, {color: string; bg: string}> = {
      'Hot':    {color:'#D85A30',bg:'#FAECE7'},
      'Warm':   {color:'#BA7517',bg:'#FAEEDA'},
      'Cold':   {color:'#185FA5',bg:'#E6F1FB'},
      'High':   {color:'#27500A',bg:'#EAF3DE'},
      'Medium': {color:'#BA7517',bg:'#FAEEDA'},
      'Low':    {color:'#5F5E5A',bg:'#F1EFE8'},
    }
    return s[tag] || {color:'#999',bg:'#f5f5f5'}
  }

  const isExhibitor = userType === 'exhibitor'
  const filterTags = isExhibitor ? ['All','Hot','Warm','Cold'] : ['All','High','Medium','Low']
  const counts = filterTags.reduce((a,t) => { a[t] = t==='All' ? cards.length : cards.filter(c=>c.tag===t).length; return a }, {} as Record<string,number>)

  if (loading) return (
    <div style={{padding:'24px',textAlign:'center',color:'#999',marginTop:'60px',fontFamily:'sans-serif'}}>
      Loading contacts...
    </div>
  )

  return (
    <div style={{padding:'24px',maxWidth:'600px',margin:'0 auto',fontFamily:'sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
        <div>
          <h1 style={{fontSize:'20px',fontWeight:'500',margin:0}}>My Contacts</h1>
          <p style={{color:'#999',fontSize:'13px',margin:'4px 0 0'}}>{cards.length} cards saved</p>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={exportCSV} style={{padding:'10px 14px',backgroundColor:'#f5f5f5',color:'#111',border:'none',borderRadius:'8px',fontSize:'13px',cursor:'pointer'}}>
            Export CSV
          </button>
          <a href="/scan" style={{padding:'10px 18px',backgroundColor:'#111',color:'white',borderRadius:'8px',fontSize:'13px',textDecoration:'none'}}>
            + Scan Card
          </a>
        </div>
      </div>

      <div style={{display:'flex',gap:'8px',marginBottom:'20px',flexWrap:'wrap'}}>
        {filterTags.map(tag => {
          const active = activeFilter === tag
          const s = tag === 'All' ? {color:'#111',bg:'#f0f0f0'} : tagStyle(tag)
          return (
            <button key={tag} onClick={() => applyFilter(tag)} style={{padding:'6px 14px',borderRadius:'20px',border: active ? '2px solid '+s.color : '2px solid #eee',backgroundColor: active ? s.bg : 'white',color: active ? s.color : '#999',fontSize:'13px',fontWeight:'500',cursor:'pointer'}}>
              {tag} {counts[tag] > 0 ? '('+counts[tag]+')' : ''}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{textAlign:'center',padding:'60px 20px',color:'#999'}}>
          <div style={{fontSize:'48px',marginBottom:'16px'}}>📇</div>
          <div style={{fontSize:'16px',marginBottom:'8px',color:'#666'}}>
            {activeFilter === 'All' ? 'No contacts yet' : 'No ' + activeFilter + ' contacts'}
          </div>
          <div style={{fontSize:'14px'}}>
            {activeFilter === 'All' ? 'Scan your first business card to get started' : 'Tag cards as ' + activeFilter + ' when scanning'}
          </div>
        </div>
      )}

      {filtered.map(card => (
        <div key={card.id} style={{backgroundColor:'white',border:'1px solid #eee',borderRadius:'12px',padding:'16px',marginBottom:'10px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'2px'}}>
                <div style={{fontSize:'15px',fontWeight:'500',color:'#111'}}>
                  {card.name || 'Unknown Name'}
                </div>
                {card.tag && (
                  <span style={{fontSize:'11px',fontWeight:'500',padding:'2px 8px',borderRadius:'10px',backgroundColor:tagStyle(card.tag).bg,color:tagStyle(card.tag).color}}>
                    {card.tag}
                  </span>
                )}
              </div>

              {(card.designation || card.company) && (
                <div style={{fontSize:'13px',color:'#666',marginBottom:'8px'}}>
                  {card.designation && card.company ? card.designation + ' · ' + card.company : card.designation || card.company}
                </div>
              )}

              {card.phone && (
                <div style={{marginBottom:'4px'}}>
                  {card.phone.split('/').map((ph: string, i: number) => {
                    const num = ph.trim()
                    if (!num) return null
                    return (
                      <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                        <span style={{fontSize:'13px',color:'#444'}}>{num}</span>
                        <a href={'tel:'+num.replace(/\D/g,'')} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'30px',height:'30px',borderRadius:'50%',backgroundColor:'#EAF3DE',textDecoration:'none',fontSize:'14px'}} title="Call">
                          📞
                        </a>
                        {isExhibitor && (
                          <a href={'https://wa.me/91'+num.replace(/\D/g,'')+'?text='+encodeURIComponent(template)} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'30px',height:'30px',borderRadius:'50%',backgroundColor:'#E1F5EE',textDecoration:'none',fontSize:'14px'}} title="WhatsApp">
                            💬
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {card.email && (
                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'2px'}}>
                  <span style={{fontSize:'13px',color:'#444'}}>{card.email}</span>
                  <a href={'mailto:'+card.email} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'30px',height:'30px',borderRadius:'50%',backgroundColor:'#E6F1FB',textDecoration:'none',fontSize:'14px'}} title="Send Email">
                    ✉️
                  </a>
                </div>
              )}

              {card.address && (
                <div style={{fontSize:'12px',color:'#999',marginTop:'4px'}}>
                  📍 {card.address}
                </div>
              )}

              {card.note && (
                <div style={{marginTop:'8px',padding:'8px 10px',backgroundColor:'#fafafa',borderRadius:'6px',fontSize:'12px',color:'#666',borderLeft:'2px solid #ddd'}}>
                  {card.note}
                </div>
              )}
            </div>

            <div style={{fontSize:'11px',color:'#bbb',whiteSpace:'nowrap',marginLeft:'12px'}}>
              {new Date(card.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
