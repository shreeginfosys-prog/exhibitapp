'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '../../lib/supabase'
import MobileLayout from '../components/MobileLayout'

const supabase = createClient()
const primary = '#0F6E56'

const tagStyle = (tag: string) => {
  const s: Record<string,{color:string;bg:string}> = {
    'Hot':{color:'#D85A30',bg:'#FAECE7'},
    'Warm':{color:'#BA7517',bg:'#FAEEDA'},
    'Cold':{color:'#185FA5',bg:'#E6F1FB'},
    'High':{color:'#27500A',bg:'#EAF3DE'},
    'Medium':{color:'#BA7517',bg:'#FAEEDA'},
    'Low':{color:'#5F5E5A',bg:'#F1EFE8'},
  }
  return s[tag] || {color:'#999',bg:'#f5f5f5'}
}

const STATUS_CONFIG: Record<string,{label:string;color:string;bg:string}> = {
  'new':{label:'New',color:'#888',bg:'#f0f0f0'},
  'contacted':{label:'Contacted',color:'#185FA5',bg:'#E6F1FB'},
  'interested':{label:'Interested',color:'#BA7517',bg:'#FAEEDA'},
  'done':{label:'Deal Done ✓',color:'#27500A',bg:'#EAF3DE'},
  'lost':{label:'Not Now',color:'#993C1D',bg:'#FAECE7'},
}

// Tabs: seller | buyer | ni
type TabType = 'seller' | 'buyer' | 'ni'

export default function ContactsPage() {
  const [scans, setScans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabType>('seller')
  const [tagFilter, setTagFilter] = useState('All')
  const [keyword, setKeyword] = useState('')
  const [template, setTemplate] = useState('Hi, great meeting you at the exhibition! Looking forward to staying in touch.')
  const [expandedScan, setExpandedScan] = useState<string | null>(null)
  const [viewingCard, setViewingCard] = useState<string | null>(null)
  const [journeyMap, setJourneyMap] = useState<Record<string, any[]>>({})
  const [journeyLoading, setJourneyLoading] = useState<string | null>(null)

  // Status change state
  const [pendingStatus, setPendingStatus] = useState<Record<string, string>>({})
  const [statusNote, setStatusNote] = useState<Record<string, string>>({})
  const [followupDate, setFollowupDate] = useState<Record<string, string>>({})
  const [dealValue, setDealValue] = useState<Record<string, string>>({})

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { window.location.href = '/login'; return }
    const userId = session.user.id

    const { data: profile } = await supabase
      .from('users')
      .select('account_type, parent_user_id, whatsapp_template')
      .eq('id', userId)
      .single()

    if (profile?.whatsapp_template) setTemplate(profile.whatsapp_template)

    // Owner sees all team leads, sub-user sees only own
    let scannerIds = [userId]
    const isOwner = !profile?.parent_user_id

    if (isOwner) {
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('member_user_id')
        .eq('owner_id', userId)
        .eq('status', 'active')
        .not('member_user_id', 'is', null)

      if (teamMembers?.length) {
        scannerIds = [userId, ...teamMembers.map((m: any) => m.member_user_id)]
      }
    }

    const { data } = await supabase
      .from('scans')
      .select('*, contacts(*), events(name)')
      .in('scanner_id', scannerIds)
      .order('created_at', { ascending: false })

    setScans(data || [])
    setLoading(false)
  }

  const loadJourney = async (scanId: string) => {
    if (journeyMap[scanId]) return
    setJourneyLoading(scanId)
    const { data } = await supabase
      .from('lead_activity')
      .select('*')
      .eq('scan_id', scanId)
      .order('created_at', { ascending: false }) // Latest first
    setJourneyMap(prev => ({ ...prev, [scanId]: data || [] }))
    setJourneyLoading(null)
  }

  const handleExpand = (scanId: string) => {
    const next = expandedScan === scanId ? null : scanId
    setExpandedScan(next)
    if (next) loadJourney(next)
  }

  const handleStatusSelect = (scanId: string, newStatus: string, currentStatus: string) => {
    if (newStatus === currentStatus) return
    setPendingStatus(prev => ({ ...prev, [scanId]: newStatus }))
    setStatusNote(prev => ({ ...prev, [scanId]: '' }))
    setFollowupDate(prev => ({ ...prev, [scanId]: '' }))
    setDealValue(prev => ({ ...prev, [scanId]: '' }))
  }

  const cancelStatusChange = (scanId: string) => {
    setPendingStatus(prev => { const n={...prev}; delete n[scanId]; return n })
    setStatusNote(prev => { const n={...prev}; delete n[scanId]; return n })
    setFollowupDate(prev => { const n={...prev}; delete n[scanId]; return n })
    setDealValue(prev => { const n={...prev}; delete n[scanId]; return n })
  }

  const saveStatusChange = async (scan: any) => {
    const scanId = scan.id
    const note = statusNote[scanId]?.trim()
    const newStatus = pendingStatus[scanId]
    const fDate = followupDate[scanId]
    const dVal = dealValue[scanId]

    if (!note) { alert('Note is required — tell yourself why you made this change'); return }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { data: profile } = await supabase.from('users').select('name').eq('id', session.user.id).single()
    const userName = profile?.name || 'Unknown'

    const update: any = { lead_status: newStatus }
    if (newStatus === 'done' && dVal) update.deal_value = Number(dVal)

    // If moving to NI (lost) — mark as NI
    await supabase.from('scans').update(update).eq('id', scanId)

    await supabase.from('lead_activity').insert({
      scan_id: scanId,
      user_id: session.user.id,
      user_name: userName,
      action: newStatus === 'done' ? 'deal_done' : 'status_changed',
      new_value: newStatus === 'done' ? String(dVal || 0) : newStatus,
      note
    })

    // Auto create follow-up if date set
    if (fDate) {
      const firstContact = scan.contacts?.[0]
      await supabase.from('follow_ups').insert({
        scan_id: scanId,
        user_id: session.user.id,
        contact_name: firstContact?.name || '',
        company: scan.company || '',
        action: note,
        due_date: fDate,
        note,
        status: 'pending'
      })
    }

    setScans(prev => prev.map(s => s.id === scanId ? { ...s, ...update } : s))
    setJourneyMap(prev => { const n = {...prev}; delete n[scanId]; return n })
    loadJourney(scanId)
    cancelStatusChange(scanId)
  }

  const exportCSV = () => {
    const source = getFiltered()
    const headers = ['Company','Industry','City','Mode','Event','Person','Phone','Email','Tag','Status','Note','Date','Scanned By']
    const rows: any[] = []
    source.forEach(scan => {
      if (scan.contacts?.length > 0) {
        scan.contacts.forEach((c: any) => {
          rows.push([scan.company||'',scan.industry||'',scan.city||'',scan.mode||'seller',scan.events?.name||'',c.name||'',c.phone1||'',c.email||'',scan.tag||'',scan.lead_status||'new',scan.note||'',new Date(scan.created_at).toLocaleDateString('en-IN'),scan.scanned_by_name||''])
        })
      }
    })
    const csv = [headers,...rows].map(r=>r.map((v:any)=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n')
    const blob = new Blob([csv],{type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download='contacts.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const getFiltered = useCallback(() => {
    let result = scans

    // Tab filter
    if (tab === 'ni') {
      result = result.filter(s => s.lead_status === 'lost')
    } else {
      result = result.filter(s => (s.mode || 'seller') === tab && s.lead_status !== 'lost')
    }

    // Tag filter
    if (tagFilter !== 'All') {
      result = result.filter(s => s.tag === tagFilter)
    }

    // Keyword filter — search company, name, phone, city, industry, notes
    if (keyword.trim()) {
      const kw = keyword.toLowerCase()
      result = result.filter(s => {
        const fields = [
          s.company, s.industry, s.city, s.state,
          s.note, s.raw_text, s.products,
          ...(s.contacts || []).flatMap((c: any) => [c.name, c.phone1, c.phone2, c.email, c.designation])
        ]
        return fields.some(f => f && String(f).toLowerCase().includes(kw))
      })
    }

    return result
  }, [scans, tab, tagFilter, keyword])

  const isSeller = tab === 'seller'
  const filterTags = isSeller ? ['All','Hot','Warm','Cold'] : tab === 'buyer' ? ['All','High','Medium','Low'] : ['All']
  const filtered = getFiltered()

  const sellerCount = scans.filter(s => (s.mode||'seller') === 'seller' && s.lead_status !== 'lost').length
  const buyerCount = scans.filter(s => (s.mode||'seller') === 'buyer' && s.lead_status !== 'lost').length
  const niCount = scans.filter(s => s.lead_status === 'lost').length
  const totalDeals = filtered.filter(s=>s.lead_status==='done').length

  const inputBase: React.CSSProperties = {
    width:'100%', padding:'10px 12px', borderRadius:'8px',
    border:'1.5px solid #D1FAE5', fontSize:'13px',
    fontFamily:"'DM Sans', sans-serif", boxSizing:'border-box',
    backgroundColor:'white', color:'#111', outline:'none'
  }

  if (loading) return (
    <MobileLayout>
      <div style={{padding:'24px',textAlign:'center',color:'#999',marginTop:'60px'}}>Loading...</div>
    </MobileLayout>
  )

  return (
    <MobileLayout>

      {/* Full screen card viewer */}
      {viewingCard && (
        <div onClick={()=>setViewingCard(null)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.9)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <img src={viewingCard} alt="card" style={{maxWidth:'100%',maxHeight:'90vh',borderRadius:'8px',boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}} />
          <div style={{position:'absolute',top:'20px',right:'20px',color:'white',fontSize:'24px',cursor:'pointer'}}>✕</div>
        </div>
      )}

      {/* Header */}
      <div style={{backgroundColor:primary,padding:'16px 20px 14px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
          <div style={{fontSize:'18px',fontWeight:'600',color:'white',fontFamily:"'Fraunces', serif"}}>My Contacts</div>
          <button onClick={exportCSV} style={{padding:'6px 12px',backgroundColor:'rgba(255,255,255,0.15)',color:'white',border:'none',borderRadius:'6px',fontSize:'12px',cursor:'pointer',fontWeight:'500'}}>
            Export CSV
          </button>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'12px'}}>
          <div style={{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:'8px',padding:'10px',textAlign:'center'}}>
            <div style={{fontSize:'20px',fontWeight:'600',color:'white'}}>{filtered.length}</div>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.7)'}}>Showing</div>
          </div>
          <div style={{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:'8px',padding:'10px',textAlign:'center'}}>
            <div style={{fontSize:'20px',fontWeight:'600',color:'white'}}>{totalDeals}</div>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.7)'}}>Deals Done</div>
          </div>
          <div style={{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:'8px',padding:'10px',textAlign:'center'}}>
            <div style={{fontSize:'20px',fontWeight:'600',color:'#FAEEDA'}}>{niCount}</div>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.7)'}}>Not Interested</div>
          </div>
        </div>

        {/* Keyword search */}
        <div style={{position:'relative'}}>
          <span style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',fontSize:'14px',opacity:0.6}}>🔍</span>
          <input
            value={keyword}
            onChange={e=>setKeyword(e.target.value)}
            placeholder="Search company, name, phone, city..."
            style={{width:'100%',padding:'9px 10px 9px 32px',borderRadius:'8px',border:'none',fontSize:'13px',fontFamily:"'DM Sans', sans-serif",boxSizing:'border-box',backgroundColor:'rgba(255,255,255,0.15)',color:'white',outline:'none'}}
          />
        </div>
      </div>

      {/* Tabs — Seller | Buyer | NI */}
      <div style={{backgroundColor:'white',borderBottom:'1px solid #f0f0f0',display:'flex'}}>
        {([
          {key:'seller', label:`Sellers (${sellerCount})`},
          {key:'buyer', label:`Buyers (${buyerCount})`},
          {key:'ni', label:`NI (${niCount})`},
        ] as {key:TabType, label:string}[]).map(t => (
          <button
            key={t.key}
            onClick={()=>{setTab(t.key);setTagFilter('All')}}
            style={{flex:1,padding:'11px 8px',border:'none',backgroundColor:'transparent',fontSize:'12px',fontWeight:tab===t.key?'700':'400',cursor:'pointer',color:tab===t.key?primary:'#999',borderBottom:tab===t.key?'2px solid '+primary:'2px solid transparent'}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tag filter pills */}
      {filterTags.length > 1 && (
        <div style={{padding:'10px 16px 8px',backgroundColor:'white',borderBottom:'1px solid #f5f5f5'}}>
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
            {filterTags.map(tag => {
              const active = tagFilter === tag
              const s = tag==='All' ? {color:'#111',bg:'#f0f0f0'} : tagStyle(tag)
              const count = tag==='All'
                ? scans.filter(s=>(s.mode||'seller')===tab && s.lead_status!=='lost').length
                : scans.filter(s=>(s.mode||'seller')===tab && s.tag===tag && s.lead_status!=='lost').length
              return (
                <button key={tag} onClick={()=>setTagFilter(tag)} style={{padding:'4px 12px',borderRadius:'20px',border:active?'2px solid '+s.color:'2px solid #eee',backgroundColor:active?s.bg:'white',color:active?s.color:'#999',fontSize:'12px',fontWeight:'500',cursor:'pointer'}}>
                  {tag}{count>0?` (${count})`:''}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Contact list */}
      <div style={{padding:'8px 16px 24px'}}>
        {filtered.length === 0 && (
          <div style={{textAlign:'center',padding:'48px 20px',color:'#999'}}>
            <div style={{fontSize:'40px',marginBottom:'12px'}}>
              {tab==='ni'?'🚫':keyword?'🔍':'📇'}
            </div>
            <div style={{fontSize:'14px',color:'#666',marginBottom:'4px'}}>
              {keyword ? `No results for "${keyword}"` : tab==='ni' ? 'No NI contacts yet' : 'No contacts yet'}
            </div>
            {keyword && <button onClick={()=>setKeyword('')} style={{marginTop:'8px',padding:'6px 14px',backgroundColor:primary,color:'white',border:'none',borderRadius:'6px',fontSize:'12px',cursor:'pointer'}}>Clear search</button>}
          </div>
        )}

        {filtered.map(scan => {
          const status = scan.lead_status || 'new'
          const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG['new']
          const hasPending = pendingStatus[scan.id]
          const journey = journeyMap[scan.id] || []
          const isExpanded = expandedScan === scan.id

          return (
            <div key={scan.id} style={{backgroundColor:'white',border:'1px solid #eee',borderRadius:'12px',marginBottom:'10px',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>

              {/* Card header */}
              <div style={{padding:'14px 16px',cursor:'pointer'}} onClick={()=>handleExpand(scan.id)}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px',flexWrap:'wrap'}}>
                      <div style={{fontSize:'15px',fontWeight:'600',color:'#111'}}>{scan.company||'Unknown Company'}</div>
                      {scan.tag && (
                        <span style={{fontSize:'10px',fontWeight:'600',padding:'2px 7px',borderRadius:'8px',backgroundColor:tagStyle(scan.tag).bg,color:tagStyle(scan.tag).color}}>
                          {scan.tag}
                        </span>
                      )}
                      {scan.industry && (
                        <span style={{fontSize:'10px',padding:'2px 7px',borderRadius:'8px',backgroundColor:'#EAF3DE',color:'#27500A'}}>
                          {scan.industry}
                        </span>
                      )}
                    </div>
                    {scan.events?.name && (
                      <div style={{fontSize:'11px',color:primary,marginBottom:'2px',fontWeight:'500'}}>🏪 {scan.events.name}</div>
                    )}
                    {(scan.city||scan.state) && (
                      <div style={{fontSize:'12px',color:'#666',marginBottom:'2px'}}>📍 {[scan.city,scan.state].filter(Boolean).join(', ')}</div>
                    )}
                    <div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'4px',flexWrap:'wrap'}}>
                      {/* Status badge */}
                      <span style={{fontSize:'10px',padding:'2px 8px',borderRadius:'8px',backgroundColor:statusInfo.bg,color:statusInfo.color,fontWeight:'600'}}>
                        {statusInfo.label}
                      </span>
                      {status==='done' && scan.deal_value>0 && (
                        <span style={{fontSize:'11px',color:'#27500A',fontWeight:'600'}}>₹{Number(scan.deal_value).toLocaleString('en-IN')}</span>
                      )}
                      <div style={{fontSize:'10px',color:'#bbb'}}>{new Date(scan.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div>
                      {scan.scanned_by_name && <div style={{fontSize:'10px',color:'#bbb'}}>· {scan.scanned_by_name}</div>}
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'6px',marginLeft:'10px',flexShrink:0}}>
                    {scan.image_url && (
                      <img
                        src={scan.image_url}
                        alt="card"
                        onClick={(e)=>{e.stopPropagation();setViewingCard(scan.image_url)}}
                        style={{width:'52px',height:'33px',objectFit:'cover',borderRadius:'5px',border:'1px solid #eee',cursor:'zoom-in'}}
                      />
                    )}
                    <span style={{fontSize:'11px',color:'#bbb'}}>{isExpanded?'▴':'▾'}</span>
                  </div>
                </div>
              </div>

              {/* Status pills — seller mode only, not NI tab */}
              {tab === 'seller' && (
                <div style={{padding:'0 16px 12px'}}>
                  <div style={{display:'flex',gap:'5px',flexWrap:'wrap',marginBottom:hasPending?'10px':'0'}}>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                      const isActive = (hasPending ? hasPending : status) === key
                      return (
                        <button
                          key={key}
                          onClick={() => handleStatusSelect(scan.id, key, status)}
                          style={{
                            padding:'4px 10px',borderRadius:'16px',fontSize:'11px',fontWeight:'600',cursor:'pointer',
                            border:isActive?'2px solid '+cfg.color:'1.5px solid #eee',
                            backgroundColor:isActive?cfg.bg:'white',
                            color:isActive?cfg.color:'#bbb',
                          }}
                        >
                          {isActive?'● ':''}{cfg.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Status change form */}
                  {hasPending && (
                    <div style={{backgroundColor:'#fffbf0',borderRadius:'10px',border:'1.5px solid #f5e6a3',padding:'12px'}}>
                      <div style={{fontSize:'12px',color:'#666',marginBottom:'8px',fontWeight:'600'}}>
                        Changing to <span style={{color:STATUS_CONFIG[hasPending]?.color}}>{STATUS_CONFIG[hasPending]?.label}</span>
                      </div>

                      {hasPending === 'done' && (
                        <div style={{marginBottom:'8px'}}>
                          <label style={{fontSize:'11px',color:'#999',fontWeight:'600',display:'block',marginBottom:'4px',textTransform:'uppercase'}}>Deal Value (₹)</label>
                          <input
                            type="number"
                            value={dealValue[scan.id]||''}
                            onChange={e=>setDealValue(prev=>({...prev,[scan.id]:e.target.value}))}
                            placeholder="Enter deal amount"
                            style={{...inputBase,marginBottom:'0'}}
                          />
                        </div>
                      )}

                      <div style={{marginBottom:'8px'}}>
                        <label style={{fontSize:'11px',color:'#E53E3E',fontWeight:'600',display:'block',marginBottom:'4px',textTransform:'uppercase'}}>Note (required) *</label>
                        <textarea
                          value={statusNote[scan.id]||''}
                          onChange={e=>setStatusNote(prev=>({...prev,[scan.id]:e.target.value}))}
                          placeholder="What happened? Why this change?..."
                          style={{width:'100%',padding:'9px',borderRadius:'8px',border:'1.5px solid #D1FAE5',fontSize:'12px',resize:'none',minHeight:'60px',fontFamily:"'DM Sans',sans-serif",boxSizing:'border-box',outline:'none',backgroundColor:'white'}}
                        />
                      </div>

                      <div style={{marginBottom:'10px'}}>
                        <label style={{fontSize:'11px',color:'#999',fontWeight:'600',display:'block',marginBottom:'4px',textTransform:'uppercase'}}>Set Follow-up Date (optional)</label>
                        <input
                          type="date"
                          value={followupDate[scan.id]||''}
                          onChange={e=>setFollowupDate(prev=>({...prev,[scan.id]:e.target.value}))}
                          min={new Date().toISOString().split('T')[0]}
                          style={{...inputBase}}
                        />
                      </div>

                      <div style={{display:'flex',gap:'6px'}}>
                        <button
                          onClick={()=>saveStatusChange(scan)}
                          style={{flex:1,padding:'9px',backgroundColor:primary,color:'white',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}
                        >
                          {followupDate[scan.id]?'Save + Set Follow-up':'Save'}
                        </button>
                        <button
                          onClick={()=>cancelStatusChange(scan.id)}
                          style={{padding:'9px 14px',backgroundColor:'#f5f5f5',color:'#666',border:'none',borderRadius:'8px',fontSize:'12px',cursor:'pointer'}}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Summary */}
              {scan.raw_text && (
                <div style={{margin:'0 16px 10px',padding:'8px 12px',backgroundColor:'#EAF3DE',borderRadius:'8px',fontSize:'12px',color:'#1a3a12',borderLeft:'3px solid #27500A',lineHeight:'1.5'}}>
                  <div style={{fontSize:'10px',fontWeight:'700',color:'#27500A',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'3px'}}>🤖 AI Summary</div>
                  <div>{scan.raw_text}</div>
                </div>
              )}

              {/* User Note */}
              {scan.note && (
                <div style={{margin:'0 16px 12px',padding:'8px 12px',backgroundColor:'#f9f9f9',borderRadius:'8px',fontSize:'12px',color:'#333',borderLeft:'3px solid '+primary,lineHeight:'1.5'}}>
                  <div style={{fontSize:'10px',fontWeight:'700',color:primary,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'3px'}}>📝 Note</div>
                  <div>{scan.note}</div>
                </div>
              )}

              {/* Expanded section */}
              {isExpanded && (
                <div style={{borderTop:'1px solid #f0f0f0'}}>

                  {/* Contacts */}
                  {scan.contacts?.length>0 && (
                    <div style={{padding:'12px 16px'}}>
                      {scan.address && <div style={{fontSize:'12px',color:'#999',marginBottom:'8px'}}>📍 {scan.address}</div>}
                      {scan.contacts.map((contact:any)=>(
                        <div key={contact.id} style={{padding:'10px 12px',backgroundColor:'#fafafa',borderRadius:'10px',marginBottom:'8px',border:'1px solid #f0f0f0'}}>
                          <div style={{fontSize:'14px',fontWeight:'600',color:'#111',marginBottom:'8px'}}>
                            {contact.name}
                            {contact.designation && <span style={{fontSize:'12px',color:'#666',fontWeight:'400'}}> · {contact.designation}</span>}
                          </div>
                          {[contact.phone1,contact.phone2,contact.phone3].filter(Boolean).map((ph:string,j:number)=>(
                            <div key={j} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                              <span style={{fontSize:'13px',color:'#333',flex:1,fontWeight:'500'}}>{ph}</span>
                              <a href={'tel:'+ph} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'36px',height:'36px',borderRadius:'50%',backgroundColor:'#EAF3DE',textDecoration:'none',fontSize:'17px',flexShrink:0}}>📞</a>
                              <a href={'https://wa.me/91'+ph.replace(/\D/g,'')+'?text='+encodeURIComponent(template)} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'36px',height:'36px',borderRadius:'50%',backgroundColor:'#E7F7EE',textDecoration:'none',fontSize:'17px',flexShrink:0}}>💬</a>
                            </div>
                          ))}
                          {contact.email && (
                            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                              <span style={{fontSize:'12px',color:'#444',flex:1}}>{contact.email}</span>
                              <a href={'mailto:'+contact.email} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'36px',height:'36px',borderRadius:'50%',backgroundColor:'#E6F1FB',textDecoration:'none',fontSize:'17px',flexShrink:0}}>✉️</a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Lead Journey — latest first */}
                  <div style={{padding:'12px 16px',borderTop:'1px solid #f5f5f5'}}>
                    <div style={{fontSize:'12px',fontWeight:'700',color:'#111',marginBottom:'12px',textTransform:'uppercase',letterSpacing:'0.05em'}}>
                      📋 Lead Journey
                    </div>
                    {journeyLoading===scan.id ? (
                      <div style={{fontSize:'12px',color:'#999'}}>Loading...</div>
                    ) : journey.length === 0 ? (
                      <div style={{fontSize:'12px',color:'#bbb'}}>No activity yet</div>
                    ) : (
                      <div style={{position:'relative'}}>
                        <div style={{position:'absolute',left:'12px',top:'8px',bottom:'8px',width:'2px',backgroundColor:'#e8e8e8'}} />
                        {journey.map((activity: any, idx: number) => {
                          const actionIcons: Record<string,string> = {
                            'scanned':'📷','status_changed':'🔄','deal_done':'💰','note_added':'📝','tag_changed':'🏷️'
                          }
                          const icon = actionIcons[activity.action] || '📌'
                          const newVal = activity.new_value
                          const isLatest = idx === 0

                          return (
                            <div key={activity.id||idx} style={{display:'flex',gap:'12px',marginBottom:'14px',position:'relative'}}>
                              <div style={{width:'26px',height:'26px',borderRadius:'50%',backgroundColor:isLatest?primary:'white',border:isLatest?'none':'2px solid #e8e8e8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',flexShrink:0,zIndex:1}}>
                                {isLatest ? <span style={{fontSize:'11px'}}>⭐</span> : icon}
                              </div>
                              <div style={{flex:1,paddingTop:'3px'}}>
                                <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap',marginBottom:'3px'}}>
                                  <span style={{fontSize:'12px',fontWeight:'600',color:'#111'}}>{activity.user_name||'Unknown'}</span>
                                  {isLatest && <span style={{fontSize:'10px',color:primary,fontWeight:'600'}}>Latest</span>}
                                  {activity.action==='status_changed' && (
                                    <span style={{fontSize:'11px',padding:'1px 7px',borderRadius:'10px',backgroundColor:STATUS_CONFIG[newVal]?.bg||'#f0f0f0',color:STATUS_CONFIG[newVal]?.color||'#666',fontWeight:'600'}}>
                                      → {STATUS_CONFIG[newVal]?.label||newVal}
                                    </span>
                                  )}
                                  {activity.action==='deal_done' && (
                                    <span style={{fontSize:'11px',padding:'1px 7px',borderRadius:'10px',backgroundColor:'#EAF3DE',color:'#27500A',fontWeight:'600'}}>
                                      💰 ₹{Number(newVal).toLocaleString('en-IN')}
                                    </span>
                                  )}
                                  {activity.action==='scanned' && (
                                    <span style={{fontSize:'11px',color:'#999'}}>scanned card</span>
                                  )}
                                </div>
                                {activity.note && (
                                  <div style={{fontSize:'12px',color:'#444',backgroundColor:'#f9f9f9',padding:'6px 9px',borderRadius:'6px',borderLeft:'2px solid #D1FAE5',lineHeight:'1.5',marginBottom:'3px'}}>
                                    "{activity.note}"
                                  </div>
                                )}
                                <div style={{fontSize:'10px',color:'#bbb'}}>
                                  {new Date(activity.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} · {new Date(activity.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          )
        })}
      </div>

    </MobileLayout>
  )
}
