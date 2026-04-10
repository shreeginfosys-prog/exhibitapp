'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function EventsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [paymentModal, setPaymentModal] = useState<any>(null)
  const [coupon, setCoupon] = useState('')
  const [couponError, setCouponError] = useState('')
  const [couponSuccess, setCouponSuccess] = useState(false)
  const [form, setForm] = useState({name:'',location:'',start_date:'',end_date:''})
  const primary = '#0F6E56'
  const VALID_COUPONS = ['EXHIBIT2026','BETA2026','VIPUL100']

  useEffect(() => { fetchEvents() }, [])

  const fetchEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase
      .from('events')
      .select('*, scans(id, tag, lead_status, deal_value)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setEvents(data || [])
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!form.name) { alert('Please enter exhibition name'); return }
    if (!form.start_date || !form.end_date) { alert('Please enter start and end dates'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('events').insert({
      user_id: user.id,
      name: form.name,
      location: form.location,
      start_date: form.start_date,
      end_date: form.end_date,
      is_active: false,
      paid: false
    })
    setForm({name:'',location:'',start_date:'',end_date:''})
    setShowForm(false)
    setSaving(false)
    fetchEvents()
  }

  const handleActivateClick = (event: any) => {
    setCoupon('')
    setCouponError('')
    setCouponSuccess(false)
    setPaymentModal(event)
  }

  const handlePayment = async () => {
    setCouponError('')
    if (VALID_COUPONS.includes(coupon.trim().toUpperCase())) {
      await supabase.from('events').update({
        paid: true,
        is_active: true,
        payment_code: coupon.trim().toUpperCase()
      }).eq('id', paymentModal.id)
      setCouponSuccess(true)
      setTimeout(() => { setPaymentModal(null); fetchEvents() }, 1500)
    } else {
      setCouponError('Invalid coupon code. Please try again.')
    }
  }

  const getStats = (event: any) => {
    const scans = event.scans || []
    const total = scans.length
    const hot = scans.filter((s:any) => s.tag === 'Hot').length
    const done = scans.filter((s:any) => s.lead_status === 'done').length
    return {total, hot, done}
  }

  const now = new Date()

  const getEventStatus = (event: any) => {
    if (!event.paid) return {label:'Unpaid',color:'#999',bg:'#f0f0f0'}
    const start = new Date(event.start_date)
    const end = new Date(event.end_date)
    if (now < start) return {label:'Upcoming',color:'#185FA5',bg:'#E6F1FB'}
    if (now >= start && now <= end) return {label:'Live ●',color:'#27500A',bg:'#EAF3DE'}
    return {label:'Ended',color:'#666',bg:'#f0f0f0'}
  }

  const inputStyle = {width:'100%',padding:'10px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'14px',fontFamily:'sans-serif',boxSizing:'border-box' as const,marginBottom:'10px'}

  if (loading) return <div style={{padding:'24px',textAlign:'center',color:'#999',fontFamily:'sans-serif'}}>Loading...</div>

  return (
    <div style={{padding:'24px',maxWidth:'480px',margin:'0 auto',fontFamily:'sans-serif',paddingBottom:'40px'}}>

      {paymentModal && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{backgroundColor:'white',borderRadius:'16px',padding:'24px',width:'100%',maxWidth:'360px'}}>
            <div style={{fontSize:'18px',fontWeight:'500',color:'#111',marginBottom:'4px'}}>Activate Event</div>
            <div style={{fontSize:'13px',color:'#666',marginBottom:'16px'}}>🏪 {paymentModal.name}</div>

            <div style={{backgroundColor:'#f9f9f9',borderRadius:'10px',padding:'14px',marginBottom:'16px'}}>
              <div style={{fontSize:'13px',color:'#666',marginBottom:'4px'}}>Exhibition Pack</div>
              <div style={{fontSize:'24px',fontWeight:'500',color:'#111',marginBottom:'4px'}}>₹2,000</div>
              <div style={{fontSize:'12px',color:'#999'}}>
                Unlimited scans · {new Date(paymentModal.start_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} – {new Date(paymentModal.end_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
              </div>
            </div>

            <button disabled style={{width:'100%',padding:'12px',backgroundColor:'#f5f5f5',color:'#999',border:'none',borderRadius:'8px',fontSize:'14px',cursor:'not-allowed',marginBottom:'16px'}}>
              Pay ₹2,000 — Coming soon
            </button>

            <div style={{borderTop:'1px solid #eee',paddingTop:'16px'}}>
              <div style={{fontSize:'13px',color:'#666',marginBottom:'8px',fontWeight:'500'}}>Have a coupon code?</div>
              <input
                value={coupon}
                onChange={e=>{setCoupon(e.target.value);setCouponError('')}}
                placeholder="Enter coupon e.g. EXHIBIT2026"
                style={{...inputStyle,textTransform:'uppercase'}}
                onKeyDown={e=>e.key==='Enter'&&handlePayment()}
              />
              {couponError && <div style={{fontSize:'12px',color:'#cc0000',marginBottom:'8px'}}>{couponError}</div>}
              {couponSuccess && <div style={{fontSize:'12px',color:primary,marginBottom:'8px',fontWeight:'500'}}>✓ Event activated! Scanning is now live.</div>}
              <button onClick={handlePayment} style={{width:'100%',padding:'11px',backgroundColor:primary,color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:'500',cursor:'pointer',marginBottom:'8px'}}>
                Apply Coupon & Activate
              </button>
              <button onClick={()=>setPaymentModal(null)} style={{width:'100%',padding:'10px',backgroundColor:'white',color:'#666',border:'1px solid #eee',borderRadius:'8px',fontSize:'13px',cursor:'pointer'}}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px'}}>
        <button onClick={()=>router.push('/dashboard')} style={{background:'none',border:'none',color:'#999',fontSize:'14px',cursor:'pointer',padding:0}}>← Back</button>
        <h1 style={{fontSize:'20px',fontWeight:'500',margin:0}}>My Exhibitions</h1>
      </div>

      <button onClick={()=>setShowForm(!showForm)} style={{width:'100%',padding:'14px',backgroundColor:primary,color:'white',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:'500',cursor:'pointer',marginBottom:'16px'}}>
        + Create New Exhibition
      </button>

      {showForm && (
        <div style={{backgroundColor:'white',border:'1px solid #eee',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
          <div style={{fontSize:'14px',fontWeight:'500',color:'#111',marginBottom:'12px'}}>New Exhibition</div>
          <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Exhibition name e.g. Gifts World Expo 2026" style={inputStyle} />
          <input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="Venue e.g. Pragati Maidan, Delhi" style={inputStyle} />
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
            <div>
              <div style={{fontSize:'11px',color:'#999',marginBottom:'4px'}}>Start date</div>
              <input type="date" value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))} style={inputStyle} />
            </div>
            <div>
              <div style={{fontSize:'11px',color:'#999',marginBottom:'4px'}}>End date</div>
              <input type="date" value={form.end_date} onChange={e=>setForm(f=>({...f,end_date:e.target.value}))} style={inputStyle} />
            </div>
          </div>
          <button onClick={handleCreate} disabled={saving} style={{width:'100%',padding:'12px',backgroundColor:saving?'#999':primary,color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:'500',cursor:'pointer'}}>
            {saving ? 'Creating...' : 'Create Exhibition'}
          </button>
        </div>
      )}

      {events.length === 0 && !showForm && (
        <div style={{textAlign:'center',padding:'40px 20px',backgroundColor:'white',borderRadius:'12px',border:'1px solid #eee'}}>
          <div style={{fontSize:'36px',marginBottom:'10px'}}>🏪</div>
          <div style={{fontSize:'14px',fontWeight:'500',color:'#111',marginBottom:'4px'}}>No exhibitions yet</div>
          <div style={{fontSize:'12px',color:'#999'}}>Create your first exhibition to start scanning</div>
        </div>
      )}

      {events.map(event => {
        const stats = getStats(event)
        const status = getEventStatus(event)
        const isLive = event.paid && new Date(event.start_date) <= now && new Date(event.end_date) >= now

        return (
          <div key={event.id} style={{backgroundColor:'white',border:isLive?'2px solid '+primary:'1px solid #eee',borderRadius:'12px',padding:'16px',marginBottom:'10px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:'15px',fontWeight:'500',color:'#111'}}>{event.name}</div>
                {event.location && <div style={{fontSize:'12px',color:'#999',marginTop:'2px'}}>📍 {event.location}</div>}
                {event.start_date && (
                  <div style={{fontSize:'12px',color:'#666',marginTop:'2px'}}>
                    📅 {new Date(event.start_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                    {event.end_date && ' — '+new Date(event.end_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                  </div>
                )}
              </div>
              <span style={{padding:'3px 10px',borderRadius:'6px',backgroundColor:status.bg,color:status.color,fontSize:'11px',fontWeight:'500',flexShrink:0,marginLeft:'8px'}}>
                {status.label}
              </span>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px',marginBottom:'12px'}}>
              <div style={{backgroundColor:'#f9f9f9',borderRadius:'8px',padding:'8px',textAlign:'center'}}>
                <div style={{fontSize:'18px',fontWeight:'500',color:'#111'}}>{stats.total}</div>
                <div style={{fontSize:'10px',color:'#999'}}>Scanned</div>
              </div>
              <div style={{backgroundColor:'#FAECE7',borderRadius:'8px',padding:'8px',textAlign:'center'}}>
                <div style={{fontSize:'18px',fontWeight:'500',color:'#D85A30'}}>{stats.hot}</div>
                <div style={{fontSize:'10px',color:'#993C1D'}}>Hot leads</div>
              </div>
              <div style={{backgroundColor:'#EAF3DE',borderRadius:'8px',padding:'8px',textAlign:'center'}}>
                <div style={{fontSize:'18px',fontWeight:'500',color:'#27500A'}}>{stats.done}</div>
                <div style={{fontSize:'10px',color:'#27500A'}}>Deals done</div>
              </div>
            </div>

            {!event.paid ? (
              <button onClick={()=>handleActivateClick(event)} style={{width:'100%',padding:'11px',backgroundColor:primary,color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'500',cursor:'pointer'}}>
                Activate & Pay →
              </button>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                <button onClick={()=>router.push('/events/'+event.id)} style={{padding:'10px',backgroundColor:'#f5f5f5',color:'#111',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:'500',cursor:'pointer'}}>
                  📊 View Leads
                </button>
                {isLive ? (
                  <button onClick={()=>router.push('/scan?event='+event.id)} style={{padding:'10px',backgroundColor:primary,color:'white',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:'500',cursor:'pointer'}}>
                    📷 Scan Card
                  </button>
                ) : (
                  <button disabled style={{padding:'10px',backgroundColor:'#f0f0f0',color:'#999',border:'none',borderRadius:'8px',fontSize:'12px',cursor:'not-allowed'}}>
                    {new Date(event.start_date) > now ? 'Not started' : 'Event ended'}
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
