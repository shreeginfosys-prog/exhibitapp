'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import VoiceFollowUp from '../../components/VoiceFollowUp'
import MicButton from '../../components/MicButton'

export default function EventDetailPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string

  const [event, setEvent] = useState<any>(null)
  const [scans, setScans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTag, setFilterTag] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [activity, setActivity] = useState<Record<string,any[]>>({})
  const [editScan, setEditScan] = useState<any>(null)
  const [editTag, setEditTag] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editDeal, setEditDeal] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedScan, setExpandedScan] = useState<string|null>(null)
  const primary = '#0F6E56'

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: eventData } = await supabase.from('events').select('*').eq('id', eventId).single()
    setEvent(eventData)

    const { data: scansData } = await supabase
      .from('scans')
      .select('*, contacts(*)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    setScans(scansData || [])

    if (scansData && scansData.length > 0) {
      const { data: activityData } = await supabase
        .from('lead_activity')
        .select('*')
        .in('scan_id', scansData.map(s => s.id))
        .order('created_at', { ascending: true })

      const grouped: Record<string,any[]> = {}
      activityData?.forEach(a => {
        if (!grouped[a.scan_id]) grouped[a.scan_id] = []
        grouped[a.scan_id].push(a)
      })
      setActivity(grouped)
    }

    setLoading(false)
  }

  const openEdit = (scan: any) => {
    setEditScan(scan)
    setEditTag(scan.tag || '')
    setEditStatus(scan.lead_status || 'new')
    setEditNote(scan.note || '')
    setEditDeal(scan.deal_value ? String(scan.deal_value) : '')
  }

  const handleSave = async () => {
    if (!editScan) return
    if (!editNote.trim()) {
      alert('Please add a note explaining this update — it helps with future follow-ups')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('name').eq('id', user.id).single()
    const userName = profile?.name || 'Unknown'

    const oldStatus = editScan.lead_status || 'new'
    const oldTag = editScan.tag || ''

    const update: any = {
      tag: editTag,
      lead_status: editStatus,
      note: editNote,
      deal_value: editStatus === 'done' ? Number(editDeal) || 0 : editScan.deal_value
    }

    await supabase.from('scans').update(update).eq('id', editScan.id)

    const activities = []

    if (oldStatus !== editStatus) {
      activities.push({
        scan_id: editScan.id,
        user_id: user.id,
        user_name: userName,
        action: editStatus === 'done' ? 'deal_done' : 'status_changed',
        old_value: oldStatus,
        new_value: editStatus === 'done' ? String(Number(editDeal)||0) : editStatus,
        note: editNote
      })
    } else if (oldTag !== editTag) {
      activities.push({
        scan_id: editScan.id,
        user_id: user.id,
        user_name: userName,
        action: 'tag_changed',
        old_value: oldTag,
        new_value: editTag,
        note: editNote
      })
    } else {
      activities.push({
        scan_id: editScan.id,
        user_id: user.id,
        user_name: userName,
        action: 'note_added',
        old_value: '',
        new_value: '',
        note: editNote
      })
    }

    await supabase.from('lead_activity').insert(activities)

    setScans(prev => prev.map(s => s.id === editScan.id ? { ...s, ...update } : s))
    setEditScan(null)
    setSaving(false)
    fetchData()
  }

  const tagColors: Record<string,{color:string;bg:string}> = {
    'Hot':{color:'#D85A30',bg:'#FAECE7'},
    'Warm':{color:'#BA7517',bg:'#FAEEDA'},
    'Cold':{color:'#185FA5',bg:'#E6F1FB'},
  }

  const statusConfig: Record<string,{color:string;bg:string;label:string}> = {
    'new':{color:'#888',bg:'#f0f0f0',label:'New'},
    'contacted':{color:'#185FA5',bg:'#E6F1FB',label:'Contacted'},
    'interested':{color:'#BA7517',bg:'#FAEEDA',label:'Interested'},
    'done':{color:'#27500A',bg:'#EAF3DE',label:'Deal Done'},
    'lost':{color:'#993C1D',bg:'#FAECE7',label:'Not Now'},
  }

  const actionLabel: Record<string,Function> = {
    'scanned': (a:any) => `📷 Scanned by ${a.user_name}`,
    'tag_changed': (a:any) => `🏷️ ${a.user_name} tagged ${a.new_value}`,
    'status_changed': (a:any) => `🔄 ${a.user_name} → ${statusConfig[a.new_value]?.label||a.new_value}`,
    'deal_done': (a:any) => `💰 ${a.user_name} closed ₹${Number(a.new_value).toLocaleString('en-IN')}`,
    'note_added': (a:any) => `📝 ${a.user_name} added note`,
  }

  const now = new Date()
  const isLive = event && new Date(event.start_date) <= now && new Date(event.end_date) >= now

  const filtered = scans.filter(s => {
    if (filterTag !== 'All' && s.tag !== filterTag) return false
    if (filterStatus !== 'All' && (s.lead_status||'new') !== filterStatus) return false
    return true
  })

  const stats = {
    total: scans.length,
    hot: scans.filter(s=>s.tag==='Hot').length,
    warm: scans.filter(s=>s.tag==='Warm').length,
    cold: scans.filter(s=>s.tag==='Cold').length,
    done: scans.filter(s=>s.lead_status==='done').length,
    revenue: scans.reduce((sum,s)=>sum+(Number(s.deal_value)||0),0)
  }

  if (loading) return <div style={{padding:'24px',textAlign:'center',color:'#999',fontFamily:'sans-serif'}}>Loading...</div>
  if (!event) return <div style={{padding:'24px',textAlign:'center',color:'#cc0000',fontFamily:'sans-serif'}}>Event not found</div>

  return (
    <div style={{fontFamily:'sans-serif',maxWidth:'480px',margin:'0 auto',paddingBottom:'40px'}}>

      {editScan && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:1000,display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.4)'}} onClick={()=>setEditScan(null)} />
          <div style={{position:'relative',backgroundColor:'white',borderRadius:'20px 20px 0 0',padding:'20px 20px 30px',maxHeight:'75vh',overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
            <div style={{width:'36px',height:'4px',backgroundColor:'#e0e0e0',borderRadius:'2px',margin:'0 auto 16px'}} />

            <div style={{marginBottom:'16px'}}>
              <div style={{fontSize:'16px',fontWeight:'500',color:'#111'}}>{editScan.company||'Unknown'}</div>
              {editScan.city && <div style={{fontSize:'12px',color:'#999',marginTop:'2px'}}>📍 {editScan.city}</div>}
              {editScan.scanned_by_name && <div style={{fontSize:'12px',color:'#999',marginTop:'2px'}}>Scanned by {editScan.scanned_by_name}</div>}
            </div>

            <div style={{marginBottom:'16px'}}>
              <div style={{fontSize:'12px',fontWeight:'500',color:'#666',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Lead Temperature</div>
              <div style={{display:'flex',gap:'6px'}}>
                {['Hot','Warm','Cold'].map(t => (
                  <button key={t} onClick={()=>setEditTag(editTag===t?'':t)} style={{flex:1,padding:'8px',borderRadius:'8px',border:editTag===t?'2px solid '+tagColors[t].color:'2px solid #eee',backgroundColor:editTag===t?tagColors[t].bg:'white',color:editTag===t?tagColors[t].color:'#999',fontSize:'13px',fontWeight:'500',cursor:'pointer'}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{marginBottom:'16px'}}>
              <div style={{fontSize:'12px',fontWeight:'500',color:'#666',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Pipeline Stage</div>
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                {Object.entries(statusConfig).map(([key,val]) => (
                  <button key={key} onClick={()=>setEditStatus(key)} style={{padding:'10px 14px',borderRadius:'8px',border:editStatus===key?'2px solid '+val.color:'2px solid #eee',backgroundColor:editStatus===key?val.bg:'white',color:editStatus===key?val.color:'#666',fontSize:'13px',fontWeight:editStatus===key?'500':'400',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:'8px'}}>
                    <span style={{width:'8px',height:'8px',borderRadius:'50%',backgroundColor:editStatus===key?val.color:'#ddd',display:'inline-block',flexShrink:0}} />
                    {val.label}
                    {editStatus===key && <span style={{marginLeft:'auto',fontSize:'12px'}}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {editStatus === 'done' && (
              <div style={{marginBottom:'16px'}}>
                <div style={{fontSize:'12px',fontWeight:'500',color:'#666',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Deal Value</div>
                <input value={editDeal} onChange={e=>setEditDeal(e.target.value)} placeholder="₹ Enter deal amount" type="number" style={{width:'100%',padding:'10px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'14px',fontFamily:'sans-serif',boxSizing:'border-box'}} />
              </div>
            )}

            </div>
            <div style={{display:'flex',gap:'8px',alignItems:'flex-start'}}>
              <textarea
                value={editNote}
                onChange={e=>setEditNote(e.target.value)}
                placeholder="What happened? What was discussed? What is the next step?..."
                style={{flex:1,padding:'10px',borderRadius:'8px',border:editNote.trim()?'1px solid '+primary:'1px solid #ffcccc',fontSize:'13px',resize:'none',minHeight:'90px',fontFamily:'sans-serif',boxSizing:'border-box',outline:'none'}}
              />
              <MicButton onTranscript={(text) => setEditNote(prev => prev ? prev + ' ' + text : text)} />
            </div>
            <div style={{fontSize:'11px',color:'#999',marginTop:'4px'}}>This note will appear in the lead journey log</div>
            </div>

            <button onClick={handleSave} disabled={saving} style={{width:'100%',padding:'14px',backgroundColor:saving?'#999':primary,color:'white',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'500',cursor:'pointer'}}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      <div style={{backgroundColor:primary,padding:'16px 20px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
          <button onClick={()=>router.push('/events')} style={{background:'none',border:'none',color:'rgba(255,255,255,0.7)',fontSize:'14px',cursor:'pointer',padding:0}}>← Events</button>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{color:'white',fontSize:'18px',fontWeight:'500'}}>{event.name}</div>
            {event.location && <div style={{color:'rgba(255,255,255,0.7)',fontSize:'12px',marginTop:'2px'}}>📍 {event.location}</div>}
            <div style={{color:'rgba(255,255,255,0.6)',fontSize:'12px',marginTop:'2px'}}>
              📅 {new Date(event.start_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} – {new Date(event.end_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
            </div>
          </div>
          <span style={{padding:'3px 10px',borderRadius:'6px',backgroundColor:isLive?'rgba(255,255,255,0.25)':'rgba(255,255,255,0.1)',color:'white',fontSize:'11px',fontWeight:'500'}}>
            {isLive?'● Live':new Date(event.start_date)>now?'Upcoming':'Ended'}
          </span>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginTop:'14px'}}>
          {[
            {label:'Scanned',value:stats.total,bg:'rgba(255,255,255,0.15)',color:'white'},
            {label:'🔥 Hot',value:stats.hot,bg:'rgba(220,90,48,0.35)',color:'white'},
            {label:'🤝 Warm',value:stats.warm,bg:'rgba(186,117,23,0.35)',color:'white'},
            {label:'✅ Deals',value:stats.done,bg:'rgba(39,80,10,0.35)',color:'white'},
          ].map(s => (
            <div key={s.label} style={{backgroundColor:s.bg,borderRadius:'8px',padding:'8px',textAlign:'center'}}>
              <div style={{fontSize:'18px',fontWeight:'500',color:s.color}}>{s.value}</div>
              <div style={{fontSize:'9px',color:'rgba(255,255,255,0.75)',marginTop:'1px'}}>{s.label}</div>
            </div>
          ))}
        </div>

        {stats.revenue > 0 && (
          <div style={{marginTop:'8px',backgroundColor:'rgba(255,255,255,0.15)',borderRadius:'8px',padding:'10px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{color:'rgba(255,255,255,0.8)',fontSize:'13px'}}>💰 Total deal value</span>
            <span style={{color:'white',fontSize:'16px',fontWeight:'500'}}>₹{stats.revenue.toLocaleString('en-IN')}</span>
          </div>
        )}

        {isLive && (
          <button onClick={()=>router.push('/scan?event='+eventId)} style={{width:'100%',marginTop:'10px',padding:'11px',backgroundColor:'white',color:primary,border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'500',cursor:'pointer'}}>
            📷 Scan New Card
          </button>
        )}
      </div>

      <div style={{padding:'12px 16px 8px',backgroundColor:'#f5f5f5'}}>
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'6px'}}>
          {['All','Hot','Warm','Cold'].map(tag => (
            <button key={tag} onClick={()=>setFilterTag(tag)} style={{padding:'4px 12px',borderRadius:'20px',border:filterTag===tag?'2px solid '+(tag==='All'?'#111':tagColors[tag]?.color||'#111'):'2px solid #ddd',backgroundColor:filterTag===tag?(tag==='All'?'#111':tagColors[tag]?.bg||'#f0f0f0'):'white',color:filterTag===tag?(tag==='All'?'white':tagColors[tag]?.color||'#111'):'#999',fontSize:'12px',fontWeight:'500',cursor:'pointer'}}>
              {tag}{tag!=='All'&&stats[tag.toLowerCase() as keyof typeof stats]!==undefined?' ('+stats[tag.toLowerCase() as keyof typeof stats]+')':''}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
          {['All',...Object.keys(statusConfig)].map(s => (
            <button key={s} onClick={()=>setFilterStatus(s)} style={{padding:'3px 10px',borderRadius:'20px',border:filterStatus===s?'2px solid '+(s==='All'?'#111':statusConfig[s]?.color):'2px solid #ddd',backgroundColor:filterStatus===s?(s==='All'?'#111':statusConfig[s]?.bg):'white',color:filterStatus===s?(s==='All'?'white':statusConfig[s]?.color):'#999',fontSize:'11px',fontWeight:'500',cursor:'pointer'}}>
              {s==='All'?'All':statusConfig[s]?.label}
            </button>
          ))}
        </div>
        <div style={{fontSize:'11px',color:'#999',marginTop:'6px'}}>{filtered.length} leads</div>
      </div>

      <div style={{padding:'8px 16px'}}>
        {filtered.length===0 && (
          <div style={{textAlign:'center',padding:'40px',color:'#999'}}>
            <div style={{fontSize:'36px',marginBottom:'10px'}}>📇</div>
            <div>No leads match this filter</div>
          </div>
        )}

        {filtered.map(scan => {
          const scanActivity = activity[scan.id] || []
          const status = scan.lead_status || 'new'
          const statusInfo = statusConfig[status]||statusConfig['new']
          const tagInfo = tagColors[scan.tag]

          return (
            <div key={scan.id} style={{backgroundColor:'white',border:'1px solid #eee',borderRadius:'12px',marginBottom:'8px'}}>
              <div style={{padding:'14px 16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{flex:1,cursor:'pointer'}} onClick={()=>setExpandedScan(expandedScan===scan.id?null:scan.id)}>
                    <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'3px',flexWrap:'wrap'}}>
                      <div style={{fontSize:'15px',fontWeight:'500',color:'#111'}}>{scan.company||'Unknown'}</div>
                      {scan.tag && <span style={{fontSize:'10px',fontWeight:'500',padding:'1px 7px',borderRadius:'10px',backgroundColor:tagInfo?.bg,color:tagInfo?.color}}>{scan.tag}</span>}
                      {scan.industry && <span style={{fontSize:'10px',padding:'1px 6px',borderRadius:'8px',backgroundColor:'#EAF3DE',color:'#27500A'}}>{scan.industry}</span>}
                    </div>
                    {(scan.city||scan.state) && <div style={{fontSize:'12px',color:'#666'}}>📍 {[scan.city,scan.state].filter(Boolean).join(', ')}</div>}
                    <div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'4px'}}>
                      <span style={{fontSize:'10px',padding:'2px 8px',borderRadius:'6px',backgroundColor:statusInfo.bg,color:statusInfo.color,fontWeight:'500'}}>{statusInfo.label}</span>
                      {scan.scanned_by_name && <span style={{fontSize:'10px',color:'#bbb'}}>by {scan.scanned_by_name}</span>}
                      {scan.deal_value>0 && <span style={{fontSize:'11px',color:'#27500A',fontWeight:'500'}}>💰 ₹{Number(scan.deal_value).toLocaleString('en-IN')}</span>}
                    </div>
                  </div>

                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginLeft:'10px',flexShrink:0}}>
                    {scan.image_url && (
                      <img src={scan.image_url} alt="card" style={{width:'44px',height:'28px',objectFit:'cover',borderRadius:'4px',border:'1px solid #eee'}} />
                    )}
                    <button onClick={()=>openEdit(scan)} style={{width:'32px',height:'32px',borderRadius:'50%',border:'1px solid #eee',backgroundColor:'white',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'14px'}}>
                      ✏️
                    </button>
                  </div>
                </div>

                {scan.note && (
                  <div style={{marginTop:'8px',padding:'6px 10px',backgroundColor:'#fafafa',borderRadius:'6px',fontSize:'12px',color:'#666',borderLeft:'2px solid #ddd'}}>
                    {scan.note}
                  </div>
                )}
              </div>

              {expandedScan===scan.id && (
                <div style={{borderTop:'1px solid #f0f0f0',padding:'12px 16px'}}>
                  {scan.contacts?.length > 0 && (
                    <div style={{marginBottom:'12px'}}>
                      {scan.contacts.map((c:any) => (
                        <div key={c.id} style={{padding:'8px 10px',backgroundColor:'#fafafa',borderRadius:'8px',marginBottom:'6px'}}>
                          <div style={{fontSize:'13px',fontWeight:'500',color:'#111'}}>{c.name}{c.designation&&<span style={{fontSize:'11px',color:'#666',fontWeight:'400'}}> · {c.designation}</span>}</div>
                          <div style={{display:'flex',gap:'8px',marginTop:'4px',flexWrap:'wrap'}}>
                            {c.phone1 && <a href={'tel:'+c.phone1} style={{fontSize:'12px',color:primary,textDecoration:'none'}}>📞 {c.phone1}</a>}
                            {c.email && <a href={'mailto:'+c.email} style={{fontSize:'12px',color:'#4285F4',textDecoration:'none'}}>✉️ {c.email}</a>}
                          <div style={{marginTop:'12px'}}>
                            <VoiceFollowUp
                              scanId={scan.id}
                              contactName={scan.contacts?.[0]?.name}
                              company={scan.company}
                              onSaved={fetchData}
                            />
                          </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{marginTop:'12px',marginBottom:'4px'}}>
  <VoiceFollowUp
    scanId={scan.id}
    contactName={scan.contacts?.[0]?.name}
    company={scan.company}
    onSaved={fetchData}
  />
</div>

{scanActivity.length > 0 && (
  <div>
    <div style={{fontSize:'11px',fontWeight:'500',color:'#999',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Lead Journey</div>
    <div style={{position:'relative',paddingLeft:'18px'}}>
      <div style={{position:'absolute',left:'7px',top:'6px',bottom:'6px',width:'2px',backgroundColor:'#f0f0f0'}} />
      {scanActivity.map((a:any) => (
        <div key={a.id} style={{position:'relative',marginBottom:'10px'}}>
          <div style={{position:'absolute',left:'-14px',top:'4px',width:'10px',height:'10px',borderRadius:'50%',backgroundColor:primary,border:'2px solid white'}} />
          <div style={{fontSize:'12px',color:'#111',fontWeight:'500'}}>{(actionLabel[a.action]||((a:any)=>a.action))(a)}</div>
          <div style={{fontSize:'10px',color:'#bbb',marginTop:'1px'}}>
            {new Date(a.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} · {new Date(a.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
          </div>
          {a.note && (
            <div style={{fontSize:'12px',color:'#555',marginTop:'4px',padding:'6px 8px',backgroundColor:'#f9f9f9',borderRadius:'6px',borderLeft:'2px solid #ddd',fontStyle:'italic'}}>
              "{a.note}"
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}
</div>
)}
</div>
)
})}
</div>
</div>
)
}