'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

const VALID_COUPONS = ['EXHIBIT2026', 'BETA2026', 'VIPUL100']

export default function ExhibitorAccess() {
  const router = useRouter()
  const supabase = createClient()
  const [coupon, setCoupon] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const primary = '#0F6E56'

  const handleCoupon = async () => {
    setError('')
    if (VALID_COUPONS.includes(coupon.trim().toUpperCase())) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('users').update({ account_type: 'exhibitor' }).eq('id', user.id)
      }
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    } else {
      setError('Invalid coupon code. Please try again.')
    }
  }

  return (
    <div style={{fontFamily:'sans-serif',maxWidth:'480px',margin:'0 auto',padding:'40px 24px'}}>
      <button onClick={()=>router.back()} style={{background:'none',border:'none',color:'#999',fontSize:'14px',cursor:'pointer',marginBottom:'24px',padding:0}}>← Back</button>

      <div style={{textAlign:'center',marginBottom:'32px'}}>
        <div style={{fontSize:'32px',marginBottom:'12px'}}>🏪</div>
        <h1 style={{fontSize:'22px',fontWeight:'500',color:'#111',margin:'0 0 8px'}}>Exhibitor Access</h1>
        <p style={{fontSize:'14px',color:'#999',margin:0}}>Unlock scanning during your exhibition</p>
      </div>

      <div style={{backgroundColor:'#EAF3DE',border:'1px solid #C0DD97',borderRadius:'12px',padding:'16px',marginBottom:'24px'}}>
        <div style={{fontSize:'13px',fontWeight:'500',color:'#27500A',marginBottom:'8px'}}>What you get as Exhibitor:</div>
        {['Scan visitor cards during your event','Hot/Warm/Cold lead tagging','WhatsApp follow-up','Export all leads to CSV','Invite 2 team members'].map(f => (
          <div key={f} style={{fontSize:'13px',color:'#3B6D11',padding:'3px 0'}}>✓ {f}</div>
        ))}
      </div>

      <div style={{backgroundColor:'white',border:'1px solid #eee',borderRadius:'12px',padding:'20px',marginBottom:'12px'}}>
        <div style={{fontSize:'14px',fontWeight:'500',color:'#111',marginBottom:'4px'}}>Exhibition Pack</div>
        <div style={{fontSize:'28px',fontWeight:'500',color:'#111',marginBottom:'4px'}}>₹2,000 <span style={{fontSize:'14px',color:'#999',fontWeight:'400'}}>/ event</span></div>
        <div style={{fontSize:'12px',color:'#999',marginBottom:'16px'}}>Unlimited scans during event dates</div>
        <button disabled style={{width:'100%',padding:'12px',backgroundColor:'#f5f5f5',color:'#999',border:'none',borderRadius:'8px',fontSize:'14px',cursor:'not-allowed'}}>
          Pay ₹2,000 — Coming soon
        </button>
      </div>

      <div style={{backgroundColor:'white',border:'1px solid #eee',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
        <div style={{fontSize:'14px',fontWeight:'500',color:'#111',marginBottom:'12px'}}>Have a coupon code?</div>
        <input
          value={coupon}
          onChange={e=>{setCoupon(e.target.value);setError('')}}
          placeholder="Enter coupon code e.g. EXHIBIT2026"
          style={{width:'100%',padding:'10px 12px',borderRadius:'8px',border:error?'1px solid #ffcccc':'1px solid #ddd',fontSize:'14px',fontFamily:'sans-serif',boxSizing:'border-box',marginBottom:'10px',textTransform:'uppercase'}}
          onKeyDown={e=>e.key==='Enter'&&handleCoupon()}
        />
        {error && <div style={{fontSize:'12px',color:'#cc0000',marginBottom:'8px'}}>{error}</div>}
        {success && <div style={{fontSize:'12px',color:primary,marginBottom:'8px',fontWeight:'500'}}>✓ Valid coupon! Taking you to dashboard...</div>}
        <button onClick={handleCoupon} style={{width:'100%',padding:'12px',backgroundColor:primary,color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:'500',cursor:'pointer'}}>
          Apply Coupon
        </button>
      </div>
    </div>
  )
}
