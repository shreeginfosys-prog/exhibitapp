'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import MobileLayout from '../components/MobileLayout'

const supabase = createClient()
const primary = '#0F6E56'

const tagStyle = (tag: string) => {
  const s: Record<string,{color:string;bg:string}> = {
    'Hot':{color:'#D85A30',bg:'#FAECE7'},'Warm':{color:'#BA7517',bg:'#FAEEDA'},'Cold':{color:'#185FA5',bg:'#E6F1FB'},
    'High':{color:'#27500A',bg:'#EAF3DE'},'Medium':{color:'#BA7517',bg:'#FAEEDA'},'Low':{color:'#5F5E5A',bg:'#F1EFE8'},
  }
  return s[tag] || {color:'#999',bg:'#f5f5f5'}
}

const statusConfig: Record<string,{label:string;color:string;bg:string}> = {
  'new':{label:'New',color:'#888',bg:'#f0f0f0'},
  'contacted':{label:'Contacted',color:'#185FA5',bg:'#E6F1FB'},
  'interested':{label:'Interested',color:'#BA7517',bg:'#FAEEDA'},
  'done':{label:'Deal Done ✓',color:'#27500A',bg:'#EAF3DE'},
  'lost':{label:'Not Now',color:'#993C1D',bg:'#FAECE7'},
}

export default function ContactsPage() {
  const [scans, setScans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [modeFilter, setModeFilter] = useState('seller')
  const [template, setTemplate] = useState('Hi, great meeting you at the exhibition! Looking forward to staying in touch.')
  const [expandedScan, setExpandedScan] = useState<string | null>(null)
  const [viewingCard, setViewingCard] = useState<string | null>(null)
  const [dealModal, setDealModal] = useState<string | null>(null)
  const [dealValue, setDealValue] = useState('')
  const [statusNote, setStatusNote] = useState<Record<string, string>>({})
  const [pendingStatus, setPendingStatus] = useState<Record<string, string>>({})
  const [journeyMap, setJourneyMap] = useState<Record<string, any[]>>({})
  const [journeyLoading, setJourneyLoading] = useState<string | null>(null)

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
      .order('created_at', { ascending: true })
    setJourneyMap(prev => ({ ...prev, [scanId]: data || [] }))
    setJourneyLoading(null)
  }

  const handleExpand = (scanId: string) => {
    const newExpanded = expandedScan === scanId ? null : scanId
    setExpandedScan(newExpanded)
    if (newExpanded) loadJourney(newExpanded)
  }

  const updateLeadStatus = async (scanId: string, status: string, value?: number, note?: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { data: profile } = await supabase.from('users').select('name').eq('id', session.user.id).single()
    const userName = profile?.name || 'Unknown'

    const update: any = { lead_status: status }
    if (value !== undefined) update.deal_value = value
    await supabase.from('scans').update(update).eq('id', scanId)

    await supabase.from('lead_activity').insert({
      scan_id: scanId,
      user_id: session.user.id,
      user_name: userName,
      action: status === 'done' ? 'deal_done' : 'status_changed',
      new_value: status === 'done' ? String(value || 0) : status,
      note: note || ''
    })

    setScans(prev => prev.map(s => s.id === scanId ? { ...s, ...update } : s))
    // Refresh journey
    setJourneyMap(prev => { const n = {...prev}; delete n[scanId]; return n })
    loadJourney(scanId)
    setDealModal(null)
    setDealValue('')
    setPendingStatus(prev => { const n = {...prev}; delete n[scanId]; return n })
    setStatusNote(prev => { const n = {...prev}; delete n[scanId]; return n })
  }

  const handleStatusChange = (scanId: string, newStatus: string, currentStatus: string) => {
    if (newStatus === currentStatus) return
    if (newStatus === 'done') { setDealModal(scanId); return }
    setPendingStatus(prev => ({ ...prev, [scanId]: newStatus }))
    setStatusNote(prev => ({ ...prev, [scanId]: '' }))
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

  const getFiltered = () => {
    let result = scans.filter(s => (s.mode || 'seller') === modeFilter)
    if (activeFilter !== 'All') result = result.filter(s => s.tag === activeFilter)
    return result
  }

  const isSeller = modeFilter === 'seller'
  const filterTags = isSeller ? ['All','Hot','Warm','Cold'] : ['All','High','Medium','Low']
  const filtered = getFiltered()
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

      {viewingCard && (
        <div onClick={()=>setViewingCard(null)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.85)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <img src={viewingCard} alt="card" style={{maxWidth:'100%',maxHeight:'90vh',borderRadius:'8px'}} />
        </div>
      )}

      {dealModal && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.5)',zIndex:1999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{backgroundColor:'white',borderRadius:'16px',padding:'24px',width:'100%',maxWidth:'360px'}}>
            <div style={{fontSize:'16px',fontWeight:'600',color:'#111',marginBottom:'8px'}}>🎉 Deal Done!</div>
            <div style={{fontSize:'13px',color:'#666',marginBottom:'16px'}}>Enter the deal value (optional)</div>
            <input
              value={dealValue}
              onChange={e=>setDealValue(e.target.value)}
              placeholder="Deal value in ₹ e.g. 50000"
              type="number"
              style={{...inputBase, marginBottom:'12px'}}
            />
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={()=>updateLeadStatus(dealModal,'done',Number(dealValue)||0)} style={{flex:1,padding:'12px',backgroundColor:primary,color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:'600',cursor:'pointer'}}>Save Deal</button>
              <button onClick={()=>{setDealModal(null);setDealValue('')}} style={{padding:'12px 16px',backgroundColor:'#f5f5f5',color:'#666',border:'none',borderRadius:'8px',fontSize:'14px',cursor:'pointer'}}>Skip</button>
            </div>
          </div>
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

        <div style={{display:'flex',backgroundColor:'rgba(255,255,255,0.15)',borderRadius:'20px',padding:'2px',marginBottom:'12px',width:'fit-content'}}>
          {['seller','buyer'].map(m => (
            <button key={m} onClick={()=>{setModeFilter(m);setActiveFilter('All')}} style={{padding:'5px 16px',borderRadius:'18px',border:'none',fontSize:'13px',fontWeight:'500',cursor:'pointer',backgroundColor:modeFilter===m?'white':'transparent',color:modeFilter===m?primary:'rgba(255,255,255,0.8)',textTransform:'capitalize'}}>
              {m}
            </button>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
          <div style={{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:'8px',padding:'10px',textAlign:'center'}}>
            <div style={{fontSize:'20px',fontWeight:'600',color:'white'}}>{filtered.length}</div>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.7)'}}>Cards Scanned</div>
          </div>
          <div style={{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:'8px',padding:'10px',textAlign:'center'}}>
            <div style={{fontSize:'20px',fontWeight:'600',color:'white'}}>{totalDeals}</div>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.7)'}}>Deals Done</div>
          </div>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{padding:'12px 16px 8px',backgroundColor:'white',borderBottom:'1px solid #f0f0f0'}}>
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
          {filterTags.map(tag => {
            const active = activeFilter === tag
            const s = tag==='All' ? {color:'#111',bg:'#f0f0f0'} : tagStyle(tag)
            const count = tag==='All'
              ? scans.filter(s=>(s.mode||'seller')===modeFilter).length
              : scans.filter(s=>(s.mode||'seller')===modeFilter && s.tag===tag).length
            return (
              <button key={tag} onClick={()=>setActiveFilter(tag)} style={{padding:'5px 12px',borderRadius:'20px',border:active?'2px solid '+s.color:'2px solid #eee',backgroundColor:active?s.bg:'white',color:active?s.color:'#999',fontSize:'12px',fontWeight:'500',cursor:'pointer'}}>
                {tag}{count>0?' ('+count+')':''}
              </button>
            )
          })}
        </div>
      </div>

      {/* List */}
      <div style={{padding:'8px 16px 24px'}}>
        {filtered.length === 0 && (
          <div style={{textAlign:'center',padding:'40px 20px',color:'#999'}}>
            <div style={{fontSize:'36px',marginBottom:'10px'}}>📇</div>
            <div style={{fontSize:'14px',color:'#666'}}>No contacts yet</div>
          </div>
        )}

        {filtered.map(scan => {
          const status = scan.lead_status || 'new'
          const statusInfo = statusConfig[status] || statusConfig['new']
          const hasPending = pendingStatus[scan.id]
          const journey = journeyMap[scan.id] || []

          return (
            <div key={scan.id} style={{backgroundColor:'white',border:'1px solid #eee',borderRadius:'12px',marginBottom:'10px',overflow:'hidden'}}>

              {/* Card header */}
              <div style={{padding:'14px 16px',cursor:'pointer'}} onClick={()=>handleExpand(scan.id)}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'3px',flexWrap:'wrap'}}>
                      <div style={{fontSize:'15px',fontWeight:'600',color:'#111'}}>{scan.company||'Unknown Company'}</div>
                      {scan.tag && <span style={{fontSize:'10px',fontWeight:'600',padding:'2px 7px',borderRadius:'8px',backgroundColor:tagStyle(scan.tag).bg,color:tagStyle(scan.tag).color}}>{scan.tag}</span>}
                      {scan.industry && <span style={{fontSize:'10px',padding:'2px 7px',borderRadius:'8px',backgroundColor:'#EAF3DE',color:'#27500A'}}>{scan.industry}</span>}
                    </div>
                    {scan.events?.name && <div style={{fontSize:'11px',color:primary,marginBottom:'2px',fontWeight:'500'}}>🏪 {scan.events.name}</div>}
                    {(scan.city||scan.state) && <div style={{fontSize:'12px',color:'#666'}}>📍 {[scan.city,scan.state].filter(Boolean).join(', ')}</div>}
                    <div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'3px',flexWrap:'wrap'}}>
                      <div style={{fontSize:'11px',color:'#bbb'}}>{new Date(scan.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div>
                      {scan.scanned_by_name && <div style={{fontSize:'11px',color:'#bbb'}}>· by {scan.scanned_by_name}</div>}
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'6px',marginLeft:'10px',flexShrink:0}}>
                    {scan.image_url && (
                      <img src={scan.image_url} alt="card" onClick={(e)=>{e.stopPropagation();setViewingCard(scan.image_url)}} style={{width:'52px',height:'33px',objectFit:'cover',borderRadius:'5px',border:'1px solid #eee',cursor:'zoom-in'}} />
                    )}
                    <div style={{fontSize:'10px',color:'#bbb'}}>{expandedScan===scan.id?'▴':'▾'}</div>
                  </div>
                </div>
              </div>

              {/* Status selector — always visible for seller */}
              {isSeller && (
                <div style={{padding:'0 16px 12px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                    <select
                      value={hasPending || status}
                      onChange={(e) => handleStatusChange(scan.id, e.target.value, status)}
                      style={{
                        padding:'6px 10px',borderRadius:'8px',
                        border:'1.5px solid '+(hasPending?statusConfig[hasPending]?.color||'#D1FAE5':statusInfo.color),
                        backgroundColor:hasPending?statusConfig[hasPending]?.bg||'#f9f9f9':statusInfo.bg,
                        color:hasPending?statusConfig[hasPending]?.color||'#666':statusInfo.color,
                        fontSize:'12px',fontWeight:'600',cursor:'pointer',outline:'none',
                        fontFamily:"'DM Sans', sans-serif"
                      }}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="interested">Interested</option>
                      <option value="done">Deal Done</option>
                      <option value="lost">Not Now</option>
                    </select>
                    {status==='done' && scan.deal_value>0 && (
                      <span style={{fontSize:'12px',color:'#27500A',fontWeight:'600'}}>₹{Number(scan.deal_value).toLocaleString('en-IN')}</span>
                    )}
                  </div>

                  {/* Mandatory note when changing status */}
                  {hasPending && (
                    <div style={{marginTop:'10px',padding:'12px',backgroundColor:'#fffbf0',borderRadius:'10px',border:'1.5px solid #f5e6a3'}}>
                      <div style={{fontSize:'12px',color:'#666',marginBottom:'8px',fontWeight:'600'}}>
                        Why changing to <span style={{color:statusConfig[hasPending]?.color||primary}}>{statusConfig[hasPending]?.label}</span>? <span style={{color:'#E53E3E'}}>*</span>
                      </div>
                      <textarea
                        value={statusNote[scan.id] || ''}
                        onChange={e => setStatusNote(prev => ({...prev, [scan.id]: e.target.value}))}
                        placeholder="Add a note — this helps you remember the conversation later..."
                        autoFocus
                        style={{width:'100%',padding:'9px',borderRadius:'8px',border:'1.5px solid #D1FAE5',fontSize:'12px',resize:'none',minHeight:'65px',fontFamily:"'DM Sans', sans-serif",boxSizing:'border-box',outline:'none',backgroundColor:'white'}}
                      />
                      <div style={{display:'flex',gap:'6px',marginTop:'8px'}}>
                        <button
                          onClick={() => {
                            if (!statusNote[scan.id]?.trim()) { alert('Please add a note before saving'); return }
                            updateLeadStatus(scan.id, hasPending, undefined, statusNote[scan.id])
                          }}
                          style={{flex:1,padding:'9px',backgroundColor:primary,color:'white',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setPendingStatus(prev => { const n={...prev}; delete n[scan.id]; return n })
                            setStatusNote(prev => { const n={...prev}; delete n[scan.id]; return n })
                          }}
                          style={{padding:'9px 14px',backgroundColor:'#f5f5f5',color:'#666',border:'none',borderRadius:'8px',fontSize:'12px',cursor:'pointer'}}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Summary / Note */}
              {scan.note && (
                <div style={{margin:'0 16px 12px',padding:'8px 12px',backgroundColor:'#f0faf5',borderRadius:'8px',fontSize:'12px',color:'#333',borderLeft:'3px solid '+primary,lineHeight:'1.5'}}>
                  {scan.note}
                </div>
              )}

              {/* Expanded section */}
              {expandedScan===scan.id && (
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
                            <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'4px'}}>
                              <span style={{fontSize:'12px',color:'#444',flex:1}}>{contact.email}</span>
                              <a href={'mailto:'+contact.email} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'36px',height:'36px',borderRadius:'50%',backgroundColor:'#E6F1FB',textDecoration:'none',fontSize:'17px',flexShrink:0}}>✉️</a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Lead Journey + Notes Journey */}
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
                        {/* Timeline line */}
                        <div style={{position:'absolute',left:'12px',top:'8px',bottom:'8px',width:'2px',backgroundColor:'#e8e8e8'}} />
                        {journey.map((activity: any, idx: number) => {
                          const actionIcons: Record<string,string> = {
                            'scanned':'📷','status_changed':'🔄','deal_done':'💰','note_added':'📝','tag_changed':'🏷️'
                          }
                          const icon = actionIcons[activity.action] || '📌'
                          const newVal = activity.new_value
                          const statusLabel = statusConfig[newVal]?.label || newVal
                          const statusColor = statusConfig[newVal]?.color || '#666'

                          return (
                            <div key={activity.id || idx} style={{display:'flex',gap:'12px',marginBottom:'14px',position:'relative'}}>
                              <div style={{width:'26px',height:'26px',borderRadius:'50%',backgroundColor:'white',border:'2px solid #e8e8e8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',flexShrink:0,zIndex:1}}>
                                {icon}
                              </div>
                              <div style={{flex:1,paddingTop:'3px'}}>
                                <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap',marginBottom:'3px'}}>
                                  <span style={{fontSize:'12px',fontWeight:'600',color:'#111'}}>{activity.user_name || 'Unknown'}</span>
                                  {activity.action==='status_changed' && (
                                    <span style={{fontSize:'11px',padding:'1px 7px',borderRadius:'10px',backgroundColor:statusConfig[newVal]?.bg||'#f0f0f0',color:statusColor,fontWeight:'600'}}>→ {statusLabel}</span>
                                  )}
                                  {activity.action==='deal_done' && (
                                    <span style={{fontSize:'11px',padding:'1px 7px',borderRadius:'10px',backgroundColor:'#EAF3DE',color:'#27500A',fontWeight:'600'}}>💰 ₹{Number(newVal).toLocaleString('en-IN')}</span>
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
