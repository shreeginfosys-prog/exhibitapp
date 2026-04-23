'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import MicButton from '../../components/MicButton'
import MobileLayout from '../../components/MobileLayout'

const primary = '#0F6E56'

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
  const [activeView, setActiveView] = useState<'leads'|'team'|'stats'>('leads')
  const [teamMembers, setTeamMembers] = useState<any[]>([])

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.push('/login'); return }

    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()
    setEvent(eventData)

    // Get team members for owner
    const { data: profile } = await supabase
      .from('users')
      .select('parent_user_id')
      .eq('id', session.user.id)
      .single()

    if (!profile?.parent_user_id) {
      const { data: team } = await supabase
        .from('team_members')
        .select('member_user_id, member_email')
        .eq('owner_id', session.user.id)
        .eq('status', 'active')
      setTeamMembers(team || [])
    }

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
        .order('created_at', { ascending: false })

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
    setEditNote('')
    setEditDeal(scan.deal_value ? String(scan.deal_value) : '')
  }

  const handleSave = async () => {
    if (!editScan) return
    if (!editNote.trim()) {
      alert('Please add a note explaining this update')
      return
    }
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { data: profile } = await supabase.from('users').select('name').eq('id', session.user.id).single()
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
        user_id: session.user.id,
        user_name: userName,
        action: editStatus === 'done' ? 'deal_done' : 'status_changed',
        old_value: oldStatus,
        new_value: editStatus === 'done' ? String(Number(editDeal)||0) : editStatus,
        note: editNote
      })
    } else if (oldTag !== editTag) {
      activities.push({
        scan_id: editScan.id,
        user_id: session.user.id,
        user_name: userName,
        action: 'tag_changed',
        old_value: oldTag,
        new_value: editTag,
        note: editNote
      })
    } else {
      activities.push({
        scan_id: editScan.id,
        user_id: session.user.id,
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

  const now = new Date()
  const isLive = event && new Date(event.start_date) <= now && new Date(event.end_date) >= now
  const isEnded = event && new Date(event.end_date) < now

  const filtered = scans.filter(s => {
    if (filterTag !== 'All' && s.tag !== filterTag) return false
    if (filterStatus !== 'All' && (s.lead_status||'new') !== filterStatus) return false
    return true
  })

  // Real time stats
  const stats = {
    total: scans.length,
    hot: scans.filter(s=>s.tag==='Hot').length,
    warm: scans.filter(s=>s.tag==='Warm').length,
    cold: scans.filter(s=>s.tag==='Cold').length,
    contacted: scans.filter(s=>s.lead_status==='contacted').length,
    interested: scans.filter(s=>s.lead_status==='interested').length,
    done: scans.filter(s=>s.lead_status==='done').length,
    lost: scans.filter(s=>s.lead_status==='lost').length,
    revenue: scans.reduce((sum,s)=>sum+(Number(s.deal_value)||0),0),
    conversion: scans.length > 0 ? Math.round((scans.filter(s=>s.lead_status==='done').length / scans.length) * 100) : 0
  }

  // Team performance
  const teamStats = useCallback(() => {
    const memberMap: Record<string, {name:string; scans:number; hot:number; done:number; revenue:number}> = {}
    scans.forEach(s => {
      const key = s.scanned_by_name || 'Unknown'
      if (!memberMap[key]) memberMap[key] = {name:key, scans:0, hot:0, done:0, revenue:0}
      memberMap[key].scans++
      if (s.tag==='Hot') memberMap[key].hot++
      if (s.lead_status==='done') memberMap[key].done++
      memberMap[key].revenue += Number(s.deal_value)||0
    })
    return Object.values(memberMap).sort((a,b)=>b.scans-a.scans)
  }, [scans])

  if (loading) return (
    <MobileLayout>
      <div style={{padding:'24px',textAlign:'center',color:'#999'}}>Loading...</div>
    </MobileLayout>
  )

  if (!event) return (
    <MobileLayout>
      <div style={{padding:'24px',textAlign:'center',color:'#cc0000'}}>Event not found</div>
    </MobileLayout>
  )

  return (
    <MobileLayout>

      {/* Edit bottom sheet */}
      {editScan && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:1000,display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.4)'}} onClick={()=>setEditScan(null)} />
          <div style={{position:'relative',backgroundColor:'white',borderRadius:'20px 20px 0 0',padding:'20px 20px 30px',maxHeight:'80vh',overflowY:'auto'}}>

            <div style={{width:'36px',height:'4px',backgroundColor:'#e0e0e0',borderRadius:'2px',margin:'0 auto 16px'}} />

            <div style={{marginBottom:'16px'}}>
              <div style={{fontSize:'16px',fontWeight:'600',color:'#111'}}>{editScan.company||'Unknown'}</div>
              {editScan.city && <div style={{fontSize:'12px',color:'#999',marginTop:'2px'}}>📍 {editScan.city}</div>}
              {editScan.scanned_by_name && <div style={{fontSize:'12px',color:'#999',marginTop:'2px'}}>by {editScan.scanned_by_name}</div>}
            </div>

            {/* Tag */}
            <div style={{marginBottom:'16px'}}>
              <div style={{fontSize:'12px',fontWeight:'600',color:'#666',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Lead Temperature</div>
              <div style={{display:'flex',gap:'6px'}}>
                {['Hot','Warm','Cold'].map(t => (
                  <button key={t} onClick={()=>setEditTag(editTag===t?'':t)} style={{flex:1,padding:'8px',borderRadius:'8px',border:editTag===t?'2px solid '+tagColors[t].color:'2px solid #eee',backgroundColor:editTag===t?tagColors[t].bg:'white',color:editTag===t?tagColors[t].color:'#999',fontSize:'13px',fontWeight:'500',cursor:'pointer'}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div style={{marginBottom:'16px'}}>
              <div style={{fontSize:'12px',fontWeight:'600',color:'#666',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Pipeline Stage</div>
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                {Object.entries(statusConfig).map(([key,val]) => (
                  <button key={key} onClick={()=>setEditStatus(key)} style={{padding:'10px 14px',borderRadius:'8px',border:editStatus===key?'2px solid '+val.color:'2px solid #eee',backgroundColor:editStatus===key?val.bg:'white',color:editStatus===key?val.color:'#666',fontSize:'13px',fontWeight:editStatus===key?'600':'400',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:'8px'}}>
                    <span style={{width:'8px',height:'8px',borderRadius:'50%',backgroundColor:editStatus===key?val.color:'#ddd',display:'inline-block',flexShrink:0}} />
                    {val.label}
                    {editStatus===key && <span style={{marginLeft:'auto',fontSize:'12px'}}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Deal value */}
            {editStatus === 'done' && (
              <div style={{marginBottom:'16px'}}>
                <div style={{fontSize:'12px',fontWeight:'600',color:'#666',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Deal Value (₹)</div>
                <input value={editDeal} onChange={e=>setEditDeal(e.target.value)} placeholder="Enter deal amount" type="number" style={{width:'100%',padding:'10px 12px',borderRadius:'8px',border:'1.5px solid #D1FAE5',fontSize:'14px',fontFamily:"'DM Sans',sans-serif",boxSizing:'border-box',outline:'none'}} />
              </div>
            )}

            {/* Note — required */}
            <div style={{marginBottom:'20px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'8px'}}>
                <div style={{fontSize:'12px',fontWeight:'600',color:'#666',textTransform:'uppercase',letterSpacing:'0.05em'}}>Note</div>
                <span style={{fontSize:'10px',padding:'1px 6px',borderRadius:'4px',backgroundColor:'#FAECE7',color:'#D85A30',fontWeight:'600'}}>Required</span>
              </div>
              <div style={{display:'flex',gap:'8px',alignItems:'flex-start'}}>
                <textarea
                  value={editNote}
                  onChange={e=>setEditNote(e.target.value)}
                  placeholder="What happened? What was discussed? Next step?..."
                  style={{flex:1,padding:'10px',borderRadius:'8px',border:editNote.trim()?'1.5px solid '+primary:'1.5px solid #ffcccc',fontSize:'13px',resize:'none',minHeight:'90px',fontFamily:"'DM Sans',sans-serif",boxSizing:'border-box',outline:'none'}}
                />
                <MicButton onTranscript={(text) => setEditNote(prev => prev ? prev + ' ' + text : text)} />
              </div>
              <div style={{fontSize:'11px',color:'#999',marginTop:'4px'}}>This note appears in the lead journey</div>
            </div>

            <button onClick={handleSave} disabled={saving} style={{width:'100%',padding:'14px',backgroundColor:saving?'#999':primary,color:'white',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'600',cursor:'pointer',boxShadow:'0 4px 14px rgba(15,110,86,0.3)'}}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Event header */}
      <div style={{backgroundColor:primary,padding:'16px 20px 16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
          <button onClick={()=>router.push('/events')} style={{background:'none',border:'none',color:'rgba(255,255,255,0.7)',fontSize:'14px',cursor:'pointer',padding:0}}>← Events</button>
          <span style={{padding:'2px 10px',borderRadius:'10px',backgroundColor:isLive?'rgba(255,255,255,0.25)':isEnded?'rgba(0,0,0,0.2)':'rgba(255,255,255,0.1)',color:'white',fontSize:'11px',fontWeight:'600'}}>
            {isLive?'● Live':isEnded?'Ended':'Upcoming'}
          </span>
        </div>

        <div style={{fontSize:'19px',fontWeight:'600',color:'white',fontFamily:"'Fraunces', serif",marginBottom:'4px'}}>{event.name}</div>
        {event.location && <div style={{color:'rgba(255,255,255,0.7)',fontSize:'12px',marginBottom:'2px'}}>📍 {event.location}</div>}
        <div style={{color:'rgba(255,255,255,0.6)',fontSize:'12px',marginBottom:'14px'}}>
          📅 {new Date(event.start_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} – {new Date(event.end_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
        </div>

        {/* Key stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginBottom:'10px'}}>
          {[
            {label:'Scanned',value:stats.total,bg:'rgba(255,255,255,0.15)'},
            {label:'🔥 Hot',value:stats.hot,bg:'rgba(220,90,48,0.35)'},
            {label:'✅ Deals',value:stats.done,bg:'rgba(39,80,10,0.35)'},
            {label:'📊 Conv%',value:stats.conversion+'%',bg:'rgba(255,255,255,0.1)'},
          ].map(s => (
            <div key={s.label} style={{backgroundColor:s.bg,borderRadius:'8px',padding:'8px 4px',textAlign:'center'}}>
              <div style={{fontSize:'17px',fontWeight:'600',color:'white'}}>{s.value}</div>
              <div style={{fontSize:'9px',color:'rgba(255,255,255,0.75)',marginTop:'1px'}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Revenue */}
        {stats.revenue > 0 && (
          <div style={{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:'8px',padding:'10px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
            <span style={{color:'rgba(255,255,255,0.8)',fontSize:'13px'}}>💰 Total deal value</span>
            <span style={{color:'white',fontSize:'16px',fontWeight:'600'}}>₹{stats.revenue.toLocaleString('en-IN')}</span>
          </div>
        )}

        {isLive && (
          <button onClick={()=>router.push('/scan?event='+eventId)} style={{width:'100%',padding:'11px',backgroundColor:'white',color:primary,border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'600',cursor:'pointer'}}>
            📷 Scan New Card
          </button>
        )}
      </div>

      {/* View tabs */}
      <div style={{backgroundColor:'white',borderBottom:'1px solid #f0f0f0',display:'flex'}}>
        {([
          {key:'leads',label:'Leads'},
          {key:'stats',label:'Stats'},
          {key:'team',label:'Team'},
        ] as {key:'leads'|'stats'|'team', label:string}[]).map(t => (
          <button
            key={t.key}
            onClick={()=>setActiveView(t.key)}
            style={{flex:1,padding:'11px 8px',border:'none',backgroundColor:'transparent',fontSize:'13px',fontWeight:activeView===t.key?'700':'400',cursor:'pointer',color:activeView===t.key?primary:'#999',borderBottom:activeView===t.key?'2px solid '+primary:'2px solid transparent'}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* STATS VIEW */}
      {activeView==='stats' && (
        <div style={{padding:'16px'}}>
          <div style={{backgroundColor:'white',borderRadius:'12px',border:'1px solid #eee',padding:'16px',marginBottom:'12px'}}>
            <div style={{fontSize:'13px',fontWeight:'700',color:'#111',marginBottom:'14px',textTransform:'uppercase',letterSpacing:'0.05em'}}>📊 Pipeline Breakdown</div>
            {[
              {label:'New',value:scans.filter(s=>!s.lead_status||s.lead_status==='new').length,color:'#888',bg:'#f0f0f0'},
              {label:'Contacted',value:stats.contacted,color:'#185FA5',bg:'#E6F1FB'},
              {label:'Interested',value:stats.interested,color:'#BA7517',bg:'#FAEEDA'},
              {label:'Deal Done',value:stats.done,color:'#27500A',bg:'#EAF3DE'},
              {label:'Not Now',value:stats.lost,color:'#993C1D',bg:'#FAECE7'},
            ].map(s=>(
              <div key={s.label} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
                <div style={{fontSize:'12px',color:s.color,fontWeight:'600',width:'80px',flexShrink:0}}>{s.label}</div>
                <div style={{flex:1,backgroundColor:'#f5f5f5',borderRadius:'4px',height:'8px',overflow:'hidden'}}>
                  <div style={{height:'8px',backgroundColor:s.color,borderRadius:'4px',width:stats.total>0?`${(s.value/stats.total)*100}%`:'0%',transition:'width 0.5s ease'}} />
                </div>
                <div style={{fontSize:'13px',fontWeight:'600',color:s.color,width:'30px',textAlign:'right'}}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{backgroundColor:'white',borderRadius:'12px',border:'1px solid #eee',padding:'16px',marginBottom:'12px'}}>
            <div style={{fontSize:'13px',fontWeight:'700',color:'#111',marginBottom:'14px',textTransform:'uppercase',letterSpacing:'0.05em'}}>🌡️ Lead Temperature</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
              {[
                {label:'Hot',value:stats.hot,color:'#D85A30',bg:'#FAECE7'},
                {label:'Warm',value:stats.warm,color:'#BA7517',bg:'#FAEEDA'},
                {label:'Cold',value:stats.cold,color:'#185FA5',bg:'#E6F1FB'},
              ].map(s=>(
                <div key={s.label} style={{backgroundColor:s.bg,borderRadius:'10px',padding:'14px',textAlign:'center'}}>
                  <div style={{fontSize:'24px',fontWeight:'700',color:s.color}}>{s.value}</div>
                  <div style={{fontSize:'11px',color:s.color,opacity:0.8,marginTop:'3px'}}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {stats.revenue > 0 && (
            <div style={{backgroundColor:'#EAF3DE',borderRadius:'12px',border:'1px solid #C0DD97',padding:'16px'}}>
              <div style={{fontSize:'13px',fontWeight:'700',color:'#27500A',marginBottom:'8px'}}>💰 Revenue Summary</div>
              <div style={{fontSize:'28px',fontWeight:'700',color:'#27500A',fontFamily:"'Fraunces',serif"}}>₹{stats.revenue.toLocaleString('en-IN')}</div>
              <div style={{fontSize:'12px',color:'#3B6D11',marginTop:'4px'}}>from {stats.done} deal{stats.done!==1?'s':''} · avg ₹{stats.done>0?Math.round(stats.revenue/stats.done).toLocaleString('en-IN'):0}</div>
            </div>
          )}
        </div>
      )}

      {/* TEAM VIEW */}
      {activeView==='team' && (
        <div style={{padding:'16px'}}>
          {teamStats().length === 0 ? (
            <div style={{textAlign:'center',padding:'40px',color:'#999'}}>
              <div style={{fontSize:'36px',marginBottom:'10px'}}>👥</div>
              <div>No team data yet</div>
            </div>
          ) : teamStats().map((member, i) => (
            <div key={member.name} style={{backgroundColor:'white',border:'1px solid #eee',borderRadius:'12px',padding:'16px',marginBottom:'10px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
                <div style={{width:'40px',height:'40px',borderRadius:'50%',backgroundColor:'#EAF3DE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',fontWeight:'700',color:primary,flexShrink:0}}>
                  {member.name[0]?.toUpperCase()||'?'}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:'14px',fontWeight:'600',color:'#111'}}>{member.name}</div>
                  <div style={{fontSize:'11px',color:'#999'}}>{i===0?'🏆 Top performer':i===1?'🥈 2nd':i===2?'🥉 3rd':''}</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px'}}>
                {[
                  {label:'Scanned',value:member.scans,color:'#111',bg:'#f9f9f9'},
                  {label:'Hot leads',value:member.hot,color:'#D85A30',bg:'#FAECE7'},
                  {label:'Deals',value:member.done,color:'#27500A',bg:'#EAF3DE'},
                ].map(s=>(
                  <div key={s.label} style={{backgroundColor:s.bg,borderRadius:'8px',padding:'8px',textAlign:'center'}}>
                    <div style={{fontSize:'18px',fontWeight:'600',color:s.color}}>{s.value}</div>
                    <div style={{fontSize:'10px',color:s.color,opacity:0.8,marginTop:'1px'}}>{s.label}</div>
                  </div>
                ))}
              </div>
              {member.revenue > 0 && (
                <div style={{marginTop:'8px',fontSize:'12px',color:'#27500A',fontWeight:'600',textAlign:'center',backgroundColor:'#EAF3DE',borderRadius:'6px',padding:'5px'}}>
                  💰 ₹{member.revenue.toLocaleString('en-IN')} deal value
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* LEADS VIEW */}
      {activeView==='leads' && (
        <>
          {/* Filters */}
          <div style={{padding:'10px 16px 8px',backgroundColor:'#f5f5f5'}}>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'6px'}}>
              {['All','Hot','Warm','Cold'].map(tag => (
                <button key={tag} onClick={()=>setFilterTag(tag)} style={{padding:'4px 12px',borderRadius:'20px',border:filterTag===tag?'2px solid '+(tag==='All'?'#111':tagColors[tag]?.color||'#111'):'2px solid #ddd',backgroundColor:filterTag===tag?(tag==='All'?'#111':tagColors[tag]?.bg||'#f0f0f0'):'white',color:filterTag===tag?(tag==='All'?'white':tagColors[tag]?.color||'#111'):'#999',fontSize:'12px',fontWeight:'500',cursor:'pointer'}}>
                  {tag}
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
            <div style={{fontSize:'11px',color:'#999',marginTop:'6px'}}>{filtered.length} of {scans.length} leads</div>
          </div>

          {/* Leads list */}
          <div style={{padding:'8px 16px 24px'}}>
            {filtered.length===0 && (
              <div style={{textAlign:'center',padding:'40px',color:'#999'}}>
                <div style={{fontSize:'36px',marginBottom:'10px'}}>📇</div>
                <div>No leads match this filter</div>
              </div>
            )}

            {filtered.map(scan => {
              const scanActivity = activity[scan.id] || []
              const status = scan.lead_status || 'new'
              const statusInfo = statusConfig[status] || statusConfig['new']
              const tagInfo = tagColors[scan.tag]
              const isExpanded = expandedScan === scan.id

              return (
                <div key={scan.id} style={{backgroundColor:'white',border:'1px solid #eee',borderRadius:'12px',marginBottom:'8px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>

                  <div style={{padding:'14px 16px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                      <div style={{flex:1,cursor:'pointer'}} onClick={()=>setExpandedScan(isExpanded?null:scan.id)}>
                        <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px',flexWrap:'wrap'}}>
                          <div style={{fontSize:'15px',fontWeight:'600',color:'#111'}}>{scan.company||'Unknown'}</div>
                          {scan.tag && <span style={{fontSize:'10px',fontWeight:'600',padding:'2px 7px',borderRadius:'10px',backgroundColor:tagInfo?.bg,color:tagInfo?.color}}>{scan.tag}</span>}
                          {scan.industry && <span style={{fontSize:'10px',padding:'2px 6px',borderRadius:'8px',backgroundColor:'#EAF3DE',color:'#27500A'}}>{scan.industry}</span>}
                        </div>
                        {(scan.city||scan.state) && <div style={{fontSize:'12px',color:'#666',marginBottom:'4px'}}>📍 {[scan.city,scan.state].filter(Boolean).join(', ')}</div>}
                        <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
                          <span style={{fontSize:'10px',padding:'2px 8px',borderRadius:'6px',backgroundColor:statusInfo.bg,color:statusInfo.color,fontWeight:'600'}}>{statusInfo.label}</span>
                          {scan.scanned_by_name && <span style={{fontSize:'10px',color:'#bbb'}}>by {scan.scanned_by_name}</span>}
                          {scan.deal_value>0 && <span style={{fontSize:'11px',color:'#27500A',fontWeight:'600'}}>💰 ₹{Number(scan.deal_value).toLocaleString('en-IN')}</span>}
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

                    {/* Latest note */}
                    {scan.note && (
                      <div style={{marginTop:'8px',padding:'6px 10px',backgroundColor:'#f9f9f9',borderRadius:'6px',fontSize:'12px',color:'#555',borderLeft:'2px solid '+primary,lineHeight:'1.5'}}>
                        {scan.note}
                      </div>
                    )}
                  </div>

                  {/* Expanded — contacts + journey */}
                  {isExpanded && (
                    <div style={{borderTop:'1px solid #f0f0f0',padding:'12px 16px'}}>

                      {/* Contacts */}
                      {scan.contacts?.length > 0 && (
                        <div style={{marginBottom:'12px'}}>
                          {scan.contacts.map((c:any) => (
                            <div key={c.id} style={{padding:'8px 10px',backgroundColor:'#fafafa',borderRadius:'8px',marginBottom:'6px'}}>
                              <div style={{fontSize:'13px',fontWeight:'600',color:'#111',marginBottom:'6px'}}>
                                {c.name}
                                {c.designation && <span style={{fontSize:'11px',color:'#666',fontWeight:'400'}}> · {c.designation}</span>}
                              </div>
                              {[c.phone1, c.phone2, c.phone3].filter(Boolean).map((ph:string, j:number) => (
                                <div key={j} style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'6px'}}>
                                  <span style={{fontSize:'12px',color:'#333',flex:1,fontWeight:'500'}}>{ph}</span>
                                  <a href={'tel:'+ph} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'32px',height:'32px',borderRadius:'50%',backgroundColor:'#EAF3DE',textDecoration:'none',fontSize:'15px',flexShrink:0}}>📞</a>
                                  <a href={'https://wa.me/91'+ph.replace(/\D/g,'')} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'32px',height:'32px',borderRadius:'50%',backgroundColor:'#E7F7EE',textDecoration:'none',fontSize:'15px',flexShrink:0}}>💬</a>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Lead Journey — latest first */}
                      {scanActivity.length > 0 && (
                        <div>
                          <div style={{fontSize:'11px',fontWeight:'700',color:'#999',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>📋 Lead Journey</div>
                          <div style={{position:'relative',paddingLeft:'20px'}}>
                            <div style={{position:'absolute',left:'7px',top:'6px',bottom:'6px',width:'2px',backgroundColor:'#f0f0f0'}} />
                            {scanActivity.map((a:any, idx:number) => {
                              const isLatest = idx === 0
                              return (
                                <div key={a.id} style={{position:'relative',marginBottom:'12px'}}>
                                  <div style={{position:'absolute',left:'-15px',top:'4px',width:'10px',height:'10px',borderRadius:'50%',backgroundColor:isLatest?primary:'#ddd',border:isLatest?'none':'2px solid white'}} />
                                  <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap',marginBottom:'2px'}}>
                                    <span style={{fontSize:'12px',fontWeight:'600',color:'#111'}}>{a.user_name}</span>
                                    {isLatest && <span style={{fontSize:'10px',color:primary,fontWeight:'600'}}>Latest</span>}
                                    {a.action==='status_changed' && (
                                      <span style={{fontSize:'11px',padding:'1px 6px',borderRadius:'8px',backgroundColor:statusConfig[a.new_value]?.bg||'#f0f0f0',color:statusConfig[a.new_value]?.color||'#666',fontWeight:'600'}}>
                                        → {statusConfig[a.new_value]?.label||a.new_value}
                                      </span>
                                    )}
                                    {a.action==='deal_done' && (
                                      <span style={{fontSize:'11px',padding:'1px 6px',borderRadius:'8px',backgroundColor:'#EAF3DE',color:'#27500A',fontWeight:'600'}}>
                                        💰 ₹{Number(a.new_value).toLocaleString('en-IN')}
                                      </span>
                                    )}
                                  </div>
                                  {a.note && (
                                    <div style={{fontSize:'12px',color:'#555',padding:'5px 8px',backgroundColor:'#f9f9f9',borderRadius:'6px',borderLeft:'2px solid #D1FAE5',fontStyle:'italic',lineHeight:'1.5',marginBottom:'2px'}}>
                                      "{a.note}"
                                    </div>
                                  )}
                                  <div style={{fontSize:'10px',color:'#bbb'}}>
                                    {new Date(a.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} · {new Date(a.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              )
            })}
          </div>
        </>
      )}

    </MobileLayout>
  )
}
