'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import MobileLayout from '../components/MobileLayout'

const supabase = createClient()
const primary = '#0F6E56'

export default function FollowupsPage() {
  const [followups, setFollowups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending'|'done'>('pending')

  useEffect(() => { fetchFollowups() }, [])

  const fetchFollowups = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { window.location.href = '/login'; return }

    const { data } = await supabase
      .from('follow_ups')
      .select('*, scans(company, city, contacts(name, phone1))')
      .eq('user_id', session.user.id)
      .order('due_date', { ascending: true })

    setFollowups(data || [])
    setLoading(false)
  }

  const markDone = async (id: string) => {
    await supabase.from('follow_ups').update({
      status: 'done',
      completed_at: new Date().toISOString()
    }).eq('id', id)
    setFollowups(prev => prev.map(f => f.id===id ? {...f, status:'done'} : f))
  }

  const snooze = async (id: string) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await supabase.from('follow_ups').update({
      snoozed_until: tomorrow.toISOString()
    }).eq('id', id)
    fetchFollowups()
  }

  const now = new Date()

  const pending = followups.filter(f => {
    if (f.status === 'done') return false
    if (f.snoozed_until && new Date(f.snoozed_until) > now) return false
    return true
  })

  const done = followups.filter(f => f.status === 'done')

  const overdue = pending.filter(f => f.due_date && new Date(f.due_date) < now)
  const upcoming = pending.filter(f => !f.due_date || new Date(f.due_date) >= now)

  const formatDate = (d: string) => {
    if (!d) return ''
    const date = new Date(d)
    const today = new Date()
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1)
    if (date.toDateString()===today.toDateString()) return 'Today'
    if (date.toDateString()===tomorrow.toDateString()) return 'Tomorrow'
    return date.toLocaleDateString('en-IN',{day:'numeric',month:'short'})
  }

  const FollowupCard = ({ item, isOverdue }: { item: any, isOverdue?: boolean }) => {
    const contact = item.scans?.contacts?.[0]
    return (
      <div style={{backgroundColor:'white',border:isOverdue?'1.5px solid #FAECE7':'1px solid #eee',borderRadius:'12px',padding:'14px 16px',marginBottom:'10px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:'14px',fontWeight:'600',color:'#111',marginBottom:'2px'}}>
              {item.contact_name || contact?.name || 'Unknown'}
            </div>
            <div style={{fontSize:'12px',color:'#666'}}>{item.company || item.scans?.company || ''}</div>
          </div>
          {item.due_date && (
            <span style={{fontSize:'11px',padding:'3px 8px',borderRadius:'6px',backgroundColor:isOverdue?'#FAECE7':'#EAF3DE',color:isOverdue?'#D85A30':'#27500A',fontWeight:'600',flexShrink:0,marginLeft:'8px'}}>
              {isOverdue?'⚠️ ':''}{formatDate(item.due_date)}
            </span>
          )}
        </div>

        {item.action && (
          <div style={{fontSize:'13px',color:'#333',backgroundColor:'#f9f9f9',padding:'8px 10px',borderRadius:'8px',borderLeft:'3px solid '+primary,marginBottom:'10px',lineHeight:'1.5'}}>
            {item.action}
          </div>
        )}

        {item.note && (
          <div style={{fontSize:'12px',color:'#666',marginBottom:'10px',fontStyle:'italic'}}>
            "{item.note}"
          </div>
        )}

        {contact?.phone1 && (
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}}>
            <span style={{fontSize:'13px',color:'#333',flex:1,fontWeight:'500'}}>{contact.phone1}</span>
            <a href={'tel:'+contact.phone1} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'34px',height:'34px',borderRadius:'50%',backgroundColor:'#EAF3DE',textDecoration:'none',fontSize:'16px'}}>📞</a>
            <a href={'https://wa.me/91'+contact.phone1.replace(/\D/g,'')} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'34px',height:'34px',borderRadius:'50%',backgroundColor:'#E7F7EE',textDecoration:'none',fontSize:'16px'}}>💬</a>
          </div>
        )}

        {filter==='pending' && (
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={()=>markDone(item.id)} style={{flex:1,padding:'9px',backgroundColor:primary,color:'white',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>
              ✓ Done
            </button>
            <button onClick={()=>snooze(item.id)} style={{padding:'9px 14px',backgroundColor:'#f5f5f5',color:'#666',border:'none',borderRadius:'8px',fontSize:'12px',cursor:'pointer'}}>
              💤 Snooze
            </button>
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

  const displayList = filter === 'pending' ? pending : done

  return (
    <MobileLayout>

      {/* Header */}
      <div style={{backgroundColor:primary,padding:'16px 20px 14px'}}>
        <div style={{fontSize:'18px',fontWeight:'600',color:'white',fontFamily:"'Fraunces', serif",marginBottom:'8px'}}>
          Follow-ups
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <div style={{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:'8px',padding:'8px 14px',textAlign:'center',flex:1}}>
            <div style={{fontSize:'20px',fontWeight:'600',color:overdue.length>0?'#FAEEDA':'white'}}>{overdue.length}</div>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.7)'}}>Overdue</div>
          </div>
          <div style={{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:'8px',padding:'8px 14px',textAlign:'center',flex:1}}>
            <div style={{fontSize:'20px',fontWeight:'600',color:'white'}}>{upcoming.length}</div>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.7)'}}>Upcoming</div>
          </div>
          <div style={{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:'8px',padding:'8px 14px',textAlign:'center',flex:1}}>
            <div style={{fontSize:'20px',fontWeight:'600',color:'white'}}>{done.length}</div>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.7)'}}>Done</div>
          </div>
        </div>
      </div>

      {/* Toggle */}
      <div style={{padding:'12px 16px',backgroundColor:'white',borderBottom:'1px solid #f0f0f0'}}>
        <div style={{display:'flex',backgroundColor:'#f5f5f5',borderRadius:'10px',padding:'3px'}}>
          <button onClick={()=>setFilter('pending')} style={{flex:1,padding:'8px',borderRadius:'8px',border:'none',fontSize:'13px',fontWeight:'600',cursor:'pointer',backgroundColor:filter==='pending'?'white':'transparent',color:filter==='pending'?primary:'#999',boxShadow:filter==='pending'?'0 1px 3px rgba(0,0,0,0.1)':'none'}}>
            Pending ({pending.length})
          </button>
          <button onClick={()=>setFilter('done')} style={{flex:1,padding:'8px',borderRadius:'8px',border:'none',fontSize:'13px',fontWeight:'600',cursor:'pointer',backgroundColor:filter==='done'?'white':'transparent',color:filter==='done'?primary:'#999',boxShadow:filter==='done'?'0 1px 3px rgba(0,0,0,0.1)':'none'}}>
            Done ({done.length})
          </button>
        </div>
      </div>

      <div style={{padding:'12px 16px 24px'}}>

        {/* Overdue section */}
        {filter==='pending' && overdue.length>0 && (
          <>
            <div style={{fontSize:'11px',fontWeight:'700',color:'#D85A30',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>
              ⚠️ Overdue
            </div>
            {overdue.map(item => <FollowupCard key={item.id} item={item} isOverdue />)}
          </>
        )}

        {/* Upcoming section */}
        {filter==='pending' && upcoming.length>0 && (
          <>
            {overdue.length>0 && <div style={{marginTop:'16px'}} />}
            <div style={{fontSize:'11px',fontWeight:'700',color:'#27500A',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>
              📅 Upcoming
            </div>
            {upcoming.map(item => <FollowupCard key={item.id} item={item} />)}
          </>
        )}

        {/* Done list */}
        {filter==='done' && done.map(item => <FollowupCard key={item.id} item={item} />)}

        {/* Empty state */}
        {displayList.length===0 && (
          <div style={{textAlign:'center',padding:'48px 20px',color:'#999'}}>
            <div style={{fontSize:'48px',marginBottom:'12px'}}>{filter==='pending'?'✅':'📋'}</div>
            <div style={{fontSize:'15px',fontWeight:'500',color:'#666',marginBottom:'6px'}}>
              {filter==='pending'?'All caught up!':'No completed follow-ups yet'}
            </div>
            <div style={{fontSize:'13px',color:'#bbb'}}>
              {filter==='pending'?'No pending follow-ups':'Complete some follow-ups to see them here'}
            </div>
          </div>
        )}

      </div>
    </MobileLayout>
  )
}
