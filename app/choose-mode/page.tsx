'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function ChooseMode() {
  const router = useRouter()
  const supabase = createClient()
  const [selecting, setSelecting] = useState<string|null>(null)
  const primary = '#0F6E56'

  const selectType = async (type: string) => {
    setSelecting(type)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('users').update({ account_type: type }).eq('id', user.id)
    }
    router.push('/dashboard')
  }

  return (
    <div style={{fontFamily:'sans-serif',maxWidth:'480px',margin:'0 auto',padding:'40px 24px'}}>
      <div style={{textAlign:'center',marginBottom:'32px'}}>
        <div style={{fontSize:'32px',marginBottom:'12px'}}>🎯</div>
        <h1 style={{fontSize:'22px',fontWeight:'500',color:'#111',margin:'0 0 8px'}}>How will you use ExhibitApp?</h1>
        <p style={{fontSize:'14px',color:'#999',margin:0}}>You can change this anytime from settings</p>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
        <button onClick={()=>selectType('free')} disabled={!!selecting} style={{padding:'24px',backgroundColor:primary,color:'white',border:'none',borderRadius:'14px',cursor:'pointer',textAlign:'left'}}>
          <div style={{fontSize:'24px',marginBottom:'8px'}}>👤</div>
          <div style={{fontSize:'17px',fontWeight:'500',marginBottom:'4px'}}>Individual — Free</div>
          <div style={{fontSize:'13px',opacity:0.8}}>Seller and Buyer mode · 20 free scans · Unlimited manual entry</div>
          {selecting==='free' && <div style={{fontSize:'12px',marginTop:'8px',opacity:0.8}}>Setting up...</div>}
        </button>

        <button onClick={()=>selectType('exhibitor')} disabled={!!selecting} style={{padding:'24px',backgroundColor:'white',color:'#111',border:'1px solid #eee',borderRadius:'14px',cursor:'pointer',textAlign:'left'}}>
          <div style={{fontSize:'24px',marginBottom:'8px'}}>🏪</div>
          <div style={{fontSize:'17px',fontWeight:'500',marginBottom:'4px'}}>Exhibitor — ₹2,000/event</div>
          <div style={{fontSize:'13px',color:'#666'}}>Create exhibitions · Unlimited scanning during event · Invite 2 team members</div>
          {selecting==='exhibitor' && <div style={{fontSize:'12px',marginTop:'8px',color:primary}}>Setting up...</div>}
        </button>

        <div style={{padding:'24px',backgroundColor:'#f9f9f9',border:'1px solid #eee',borderRadius:'14px',opacity:0.5}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <div style={{fontSize:'24px',marginBottom:'8px'}}>��</div>
              <div style={{fontSize:'17px',fontWeight:'500',marginBottom:'4px',color:'#999'}}>Enterprise — Coming Soon</div>
              <div style={{fontSize:'13px',color:'#bbb'}}>5 team members · Shared dashboard · ₹5,000/event</div>
            </div>
            <span style={{fontSize:'11px',padding:'3px 8px',backgroundColor:'#eee',color:'#999',borderRadius:'6px',flexShrink:0}}>Phase 2</span>
          </div>
        </div>
      </div>
    </div>
  )
}
