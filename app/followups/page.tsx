'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import MobileLayout from '../components/MobileLayout'

const supabase = createClient()
const primary = '#0F6E56'

const STATUS_CONFIG: Record<string,{label:string;color:string;bg:string}> = {
  'new':{label:'New',color:'#888',bg:'#f0f0f0'},
  'contacted':{label:'Contacted',color:'#185FA5',bg:'#E6F1FB'},
  'interested':{label:'Interested',color:'#BA7517',bg:'#FAEEDA'},
  'done':{label:'Deal Done ✓',color:'#27500A',bg:'#EAF3DE'},
  'lost':{label:'Not Interested',color:'#993C1D',bg:'#FAECE7'},
}

export default function FollowupsPage() {
  const [followups, setFollowups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending'|'done'>('pending')

  const [rescheduleId, setRescheduleId] = useState<string|null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [statusChangeId, setStatusChangeId] = useState<string|null>(null)
  const [statusChangeVal, setStatusChangeVal] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [addNoteId, setAddNoteId] = useState<string|null>(null)
  const [addNoteText, setAddNoteText] = useState('')

  useEffect(() => { fetchFollowups() }, [])

  const fetchFollowups = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { window.location.href = '/login'; return }

    // Owner sees team follow-ups too
    const { data: profile } = await supabase
      .from('users')
      .select('parent_user_id')
      .eq('id', session.user.id)
      .single()

    let userIds = [session.user.id]
    if (!profile?.parent_user_id) {
      const { data: team } = await supabase
        .from('team_members')
        .select('member_user_id')
        .eq('owner_id', session.user.id)
        .eq('status', 'active')
        .not('member_user_id', 'is', null)
      if (team?.length) {
        userIds = [session.user.id, ...team.map((t:any) => t.member_user_id)]
      }
    }

    const { data } = await supabase
      .from('follow_ups')
      .select('*, scans(id, company, city, lead_status, raw_text, note, contacts(name, phone1))')
      .in('user_id', userIds)
      .order('due_date', { ascending: true })

    setFollowups(data || [])
    setLoading(false)
  }

  const markDone = async (id: string) => {
    await supabase.from('follow_ups').update({
      status: 'done',
      completed_at: new Date().toISOString()
    }).eq('id', id)
    setFollowups(prev => prev.map(f => f.id===id ? {...f, status:'done', completed_at: new Date().toISOString()} : f))
  }

  const reschedule = async (id: string) => {
    if (!rescheduleDate) return
    await supabase.from('follow_ups').update({
      due_date: rescheduleDate,
      snoozed_until: null
    }).eq('id', id)
    setRescheduleId(null)
    setRescheduleDate('')
    fetchFollowups()
  }

  const addNote = async (followup: any) => {
    if (!addNoteText.trim()) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { data: profile } = await supabase.from('users').select('name').eq('id', session.user.id).single()
    const userName = profile?.name || 'Unknown'

    // Add note to lead activity
    await supabase.from('lead_activity').insert({
      scan_id: followup.scan_id,
      user_id: session.user.id,
      user_name: userName,
      action: 'note_added',
      new_value: 'note',
      note: addNoteText
    })

    // Update follow-up note
    await supabase.from('follow_ups').update({
      note: addNoteText
    }).eq('id', followup.id)

    setAddNoteId(null)
    setAddNoteText('')
    fetchFollowups()
  }

  const changeLeadStatus = async (followup: any) => {
    if (!statusNote.trim()) { alert('Note is required'); return }
    if (!statusChangeVal) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { data: profile } = await supabase.from('users').select('name').eq('id', session.user.id).single()
    const userName = profile?.name || 'Unknown'

    await supabase.from('scans').update({ lead_status: statusChangeVal }).eq('id', followup.scan_id)

    await supabase.from('lead_activity').insert({
      scan_id: followup.scan_id,
      user_id: session.user.id,
      user_name: userName,
      action: 'status_changed',
      new_value: statusChangeVal,
      note: statusNote
    })

    // If done — mark follow-up as done too
    if (statusChangeVal === 'done') {
      await supabase.from('follow_ups').update({
        status: 'done',
        completed_at: new Date().toISOString()
      }).eq('id', followup.id)
    }

    setStatusChangeId(null)
    setStatusChangeVal('')
    setStatusNote('')
    fetchFollowups()
  }

  const now = new Date()

  const pending = followups.filter(f => {
    if (f.status === 'done') return false
    if (f.snoozed_until && new Date(f.snoozed_until) > now) return false
    return true
  }).sort((a, b) => {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })

  const done = followups.filter(f => f.status === 'done')
    .sort((a, b) => new Date(b.completed_at||b.created_at).getTime() - new Date(a.completed_at||a.created_at).getTime())

  const overdue = pending.filter(f => f.due_date && new Date(f.due_date) < now)
  const upcoming = pending.filter(f => !f.due_date || new Date(f.due_date) >= now)

  const formatDate = (d: string) => {
    if (!d) return 'No date set'
    const date = new Date(d)
    const today = new Date()
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1)
    if (date.toDateString()===today.toDateString()) return 'Today'
    if (date.toDateString()===tomorrow.toDateString()) return 'Tomorrow'
    const diff = Math.floor((date.getTime()-today.getTime())/(1000*60*60*24))
    if (diff > 0 && diff <= 7) return `In ${diff} days`
    if (diff < 0) return `${Math.abs(diff)} days ago ⚠️`
    return date.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})
  }

  const inputBase: React.CSSProperties = {
    width:'100%', padding:'9px 10px', borderRadius:'8px',
    border:'1.5px solid #D1FAE5', fontSize:'12px',
    fontFamily:"'DM Sans',sans-serif", boxSizing:'border-box',
    backgroundColor:'white', color:'#111', outline:'none'
  }

  const FollowupCard = ({ item, isOverdue }: { item: any, isOverdue?: boolean }) => {
    const contact = item.scans?.contacts?.[0]
    const scanStatus = item.scans?.lead_status || 'new'
    const isRescheduling = rescheduleId === item.id
    const isChangingStatus = statusChangeId === item.id
    const isAddingNote = addNoteId === item.id

    return (
      <div style={{backgroundColor:'white',border:isOverdue?'1.5px solid #FAECE7':'1px solid #eee',borderRadius:'12px',padding:'14px 16px',marginBottom:'10px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>

        {/* Header row */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:'14px',fontWeight:'600',color:'#111',marginBottom:'2px'}}>
              {item.contact_name || contact?.name || 'Unknown'}
            </div>
            <div style={{fontSize:'12px',color:'#666',marginBottom:'4px'}}>
              {item.company || item.scans?.company || ''}
            </div>
            <span style={{fontSize:'10px',padding:'2px 7px',borderRadius:'8px',backgroundColor:STATUS_CONFIG[scanStatus]?.bg||'#f0f0f0',color:STATUS_CONFIG[scanStatus]?.color||'#888',fontWeight:'600'}}>
              {STATUS_CONFIG[scanStatus]?.label||scanStatus}
            </span>
          </div>
          {item.due_date && (
            <div style={{textAlign:'right',flexShrink:0,marginLeft:'10px'}}>
              <div style={{fontSize:'11px',padding:'3px 8px',borderRadius:'6px',backgroundColor:isOverdue?'#FAECE7':'#EAF3DE',color:isOverdue?'#D85A30':'#27500A',fontWeight:'600'}}>
                📅 {formatDate(item.due_date)}
              </div>
            </div>
          )}
        </div>

        {/* Action — what needs to be done */}
        {item.action && (
          <div style={{fontSize:'13px',color:'#333',backgroundColor:'#f0faf5',padding:'8px 10px',borderRadius:'8px',borderLeft:'3px solid '+primary,marginBottom:'8px',lineHeight:'1.5'}}>
            {item.action}
          </div>
        )}

        {/* Note from last interaction */}
        {item.note && item.note !== item.action && (
          <div style={{fontSize:'12px',color:'#555',backgroundColor:'#f9f9f9',padding:'7px 10px',borderRadius:'8px',borderLeft:'2px solid #ddd',marginBottom:'8px',lineHeight:'1.5',fontStyle:'italic'}}>
            "{item.note}"
          </div>
        )}

        {/* AI summary from scan */}
        {item.scans?.raw_text && (
          <div style={{fontSize:'11px',color:'#27500A',backgroundColor:'#EAF3DE',padding:'6px 10px',borderRadius:'6px',marginBottom:'8px',lineHeight:'1.5'}}>
            🤖 {item.scans.raw_text}
          </div>
        )}

        {/* Phone */}
        {contact?.phone1 && (
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}}>
            <span style={{fontSize:'13px',color:'#333',flex:1,fontWeight:'500'}}>{contact.phone1}</span>
            <a href={'tel:'+contact.phone1} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'34px',height:'34px',borderRadius:'50%',backgroundColor:'#EAF3DE',textDecoration:'none',fontSize:'16px'}}>📞</a>
            <a href={'https://wa.me/91'+contact.phone1.replace(/\D/g,'')} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'34px',height:'34px',borderRadius:'50%',backgroundColor:'#E7F7EE',textDecoration:'none',fontSize:'16px'}}>💬</a>
          </div>
        )}

        {/* Reschedule panel */}
        {isRescheduling && (
          <div style={{backgroundColor:'#EAF3DE',borderRadius:'10px',padding:'12px',marginBottom:'10px',border:'1px solid #C0DD97'}}>
            <div style={{fontSize:'12px',fontWeight:'600',color:'#27500A',marginBottom:'8px'}}>📅 Set new follow-up date</div>
            <input
              type="date"
              value={rescheduleDate}
              onChange={e=>setRescheduleDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{...inputBase,marginBottom:'8px'}}
            />
            <div style={{display:'flex',gap:'6px'}}>
              <button onClick={()=>reschedule(item.id)} style={{flex:1,padding:'8px',backgroundColor:primary,color:'white',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>Save New Date</button>
              <button onClick={()=>{setRescheduleId(null);setRescheduleDate('')}} style={{padding:'8px 12px',backgroundColor:'#f5f5f5',color:'#666',border:'none',borderRadius:'8px',fontSize:'12px',cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        )}

        {/* Add note panel */}
        {isAddingNote && (
          <div style={{backgroundColor:'#f9f9f9',borderRadius:'10px',padding:'12px',marginBottom:'10px',border:'1px solid #eee'}}>
            <div style={{fontSize:'12px',fontWeight:'600',color:'#666',marginBottom:'8px'}}>📝 Add note to this follow-up</div>
            <textarea
              value={addNoteText}
              onChange={e=>setAddNoteText(e.target.value)}
              placeholder="What happened? What did you discuss?..."
              autoFocus
              style={{...inputBase,minHeight:'60px',resize:'none',marginBottom:'8px'}}
            />
            <div style={{display:'flex',gap:'6px'}}>
              <button onClick={()=>addNote(item)} style={{flex:1,padding:'8px',backgroundColor:primary,color:'white',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>Save Note</button>
              <button onClick={()=>{setAddNoteId(null);setAddNoteText('')}} style={{padding:'8px 12px',backgroundColor:'#f5f5f5',color:'#666',border:'none',borderRadius:'8px',fontSize:'12px',cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        )}

        {/* Change status panel */}
        {isChangingStatus && (
          <div style={{backgroundColor:'#fffbf0',borderRadius:'10px',padding:'12px',marginBottom:'10px',border:'1.5px solid #f5e6a3'}}>
            <div style={{fontSize:'12px',fontWeight:'600',color:'#666',marginBottom:'8px'}}>Update lead status</div>
            <div style={{display:'flex',gap:'5px',flexWrap:'wrap',marginBottom:'8px'}}>
              {Object.entries(STATUS_CONFIG).map(([key,cfg])=>(
                <button key={key} onClick={()=>setStatusChangeVal(key)} style={{padding:'4px 10px',borderRadius:'16px',border:statusChangeVal===key?'2px solid '+cfg.color:'1.5px solid #eee',backgroundColor:statusChangeVal===key?cfg.bg:'white',color:statusChangeVal===key?cfg.color:'#bbb',fontSize:'11px',fontWeight:'600',cursor:'pointer'}}>
                  {cfg.label}
                </button>
              ))}
            </div>
            <textarea
              value={statusNote}
              onChange={e=>setStatusNote(e.target.value)}
              placeholder="Note is required — what happened in this follow-up?"
              style={{...inputBase,minHeight:'55px',resize:'none',marginBottom:'8px'}}
            />
            <div style={{display:'flex',gap:'6px'}}>
              <button onClick={()=>changeLeadStatus(item)} disabled={!statusChangeVal} style={{flex:1,padding:'8px',backgroundColor:statusChangeVal?primary:'#ccc',color:'white',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:'600',cursor:statusChangeVal?'pointer':'not-allowed'}}>Save</button>
              <button onClick={()=>{setStatusChangeId(null);setStatusChangeVal('');setStatusNote('')}} style={{padding:'8px 12px',backgroundColor:'#f5f5f5',color:'#666',border:'none',borderRadius:'8px',fontSize:'12px',cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {filter==='pending' && !isRescheduling && !isChangingStatus && !isAddingNote && (
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
            <button onClick={()=>markDone(item.id)} style={{flex:1,padding:'9px',backgroundColor:primary,color:'white',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>
              ✓ Done
            </button>
            <button onClick={()=>{setAddNoteId(item.id);setAddNoteText('')}} style={{padding:'9px 10px',backgroundColor:'#f9f9f9',color:'#666',border:'1px solid #eee',borderRadius:'8px',fontSize:'12px',fontWeight:'500',cursor:'pointer'}}>
              📝 Note
            </button>
            <button onClick={()=>{setRescheduleId(item.id);setRescheduleDate(item.due_date?.split('T')[0]||'')}} style={{padding:'9px 10px',backgroundColor:'#EAF3DE',color:'#27500A',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:'500',cursor:'pointer'}}>
              📅
            </button>
            <button onClick={()=>{setStatusChangeId(item.id);setStatusChangeVal(scanStatus)}} style={{padding:'9px 10px',backgroundColor:'#E6F1FB',color:'#185FA5',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:'500',cursor:'pointer'}}>
              🔄
            </button>
          </div>
        )}

        {filter==='done' && item.completed_at && (
          <div style={{fontSize:'11px',color:'#27500A',fontWeight:'500',marginTop:'4px'}}>
            ✓ Completed {formatDate(item.completed_at)}
          </div>
        )}
      </div>
    )
  }

  if (loading) return (
    <MobileLayout>
      <div style={{padding:'24px',textAlign:'center',color:'#999',marginTop:'60px'}}>Loading...</div>
    </MobileLayout>
  )

  return (
    <MobileLayout>

      {/* Header */}
      <div style={{backgroundColor:primary,padding:'16px 20px 14px'}}>
        <div style={{fontSize:'18px',fontWeight:'600',color:'white',fontFamily:"'Fraunces', serif",marginBottom:'8px'}}>Follow-ups</div>
        <div style={{display:'flex',gap:'8px'}}>
          {[
            {label:'Overdue',count:overdue.length,warn:overdue.length>0},
            {label:'Upcoming',count:upcoming.length,warn:false},
            {label:'Done',count:done.length,warn:false},
          ].map(item=>(
            <div key={item.label} style={{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:'8px',padding:'8px 6px',textAlign:'center',flex:1}}>
              <div style={{fontSize:'20px',fontWeight:'600',color:item.warn?'#FAEEDA':'white'}}>{item.count}</div>
              <div style={{fontSize:'10px',color:'rgba(255,255,255,0.7)'}}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Toggle */}
      <div style={{padding:'12px 16px',backgroundColor:'white',borderBottom:'1px solid #f0f0f0'}}>
        <div style={{display:'flex',backgroundColor:'#f5f5f5',borderRadius:'10px',padding:'3px'}}>
          {[{key:'pending',label:`Pending (${pending.length})`},{key:'done',label:`Done (${done.length})`}].map(t=>(
            <button key={t.key} onClick={()=>setFilter(t.key as any)} style={{flex:1,padding:'8px',borderRadius:'8px',border:'none',fontSize:'13px',fontWeight:'600',cursor:'pointer',backgroundColor:filter===t.key?'white':'transparent',color:filter===t.key?primary:'#999',boxShadow:filter===t.key?'0 1px 3px rgba(0,0,0,0.1)':'none'}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:'12px 16px 24px'}}>

        {filter==='pending' && overdue.length>0 && (
          <>
            <div style={{fontSize:'11px',fontWeight:'700',color:'#D85A30',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>⚠️ Overdue — Action Needed</div>
            {overdue.map(item => <FollowupCard key={item.id} item={item} isOverdue />)}
          </>
        )}

        {filter==='pending' && upcoming.length>0 && (
          <>
            {overdue.length>0 && <div style={{marginTop:'16px'}} />}
            <div style={{fontSize:'11px',fontWeight:'700',color:'#27500A',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>📅 Upcoming — Sorted by Date</div>
            {upcoming.map(item => <FollowupCard key={item.id} item={item} />)}
          </>
        )}

        {filter==='done' && done.map(item => <FollowupCard key={item.id} item={item} />)}

        {(filter==='pending'?pending:done).length===0 && (
          <div style={{textAlign:'center',padding:'48px 20px',color:'#999'}}>
            <div style={{fontSize:'48px',marginBottom:'12px'}}>{filter==='pending'?'✅':'📋'}</div>
            <div style={{fontSize:'15px',fontWeight:'500',color:'#666',marginBottom:'6px'}}>
              {filter==='pending'?'All caught up!':'No completed follow-ups yet'}
            </div>
            <div style={{fontSize:'13px',color:'#bbb'}}>
              {filter==='pending'?'Set follow-up dates from the contacts page':'Mark follow-ups as done to see them here'}
            </div>
          </div>
        )}

      </div>
    </MobileLayout>
  )
}
