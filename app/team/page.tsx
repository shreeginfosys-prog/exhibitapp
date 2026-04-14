'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import MobileLayout from '../components/MobileLayout'

export default function TeamPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [paymentModal, setPaymentModal] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [couponError, setCouponError] = useState('')
  const [couponSuccess, setCouponSuccess] = useState(false)
  const [inviting, setInviting] = useState(false)
  const primary = '#0F6E56'
  const VALID_COUPONS = ['EXHIBIT2026','BETA2026','VIPUL100']

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: prof } = await supabase.from('users').select('*').eq('id', user.id).single()
    setProfile(prof)
    const { data: team } = await supabase.from('team_members').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
    setMembers(team || [])
    setLoading(false)
    // Sub-users cannot access team management
    if (prof?.parent_user_id) {
    router.push('/dashboard')
    return
    }
  }

  const maxUsers = profile?.account_type === 'enterprise' ? 5 : 2

  const handleAddMember = async () => {
    setError('')
    if (!email.trim()) { setError('Please enter an email address'); return }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Please enter a valid email'); return }
    if (members.length >= maxUsers) { setError(`Maximum ${maxUsers} team members allowed`); return }
    if (members.find(m => m.member_email === email.trim().toLowerCase())) { setError('This email is already added'); return }

    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('team_members').insert({
      owner_id: user.id,
      member_email: email.trim().toLowerCase(),
      account_type: profile.account_type,
      status: 'pending'
    })

    setEmail('')
    setAdding(false)
    fetchData()
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this team member?')) return
    await supabase.from('team_members').delete().eq('id', id)
    fetchData()
  }

  const handleActivate = async () => {
    setCouponError('')
    if (!VALID_COUPONS.includes(coupon.trim().toUpperCase())) {
      setCouponError('Invalid coupon code.')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setInviting(true)

    // Activate team in DB
    const paidUntil = new Date()
    paidUntil.setMonth(paidUntil.getMonth() + 1)
    await supabase.from('users').update({ enterprise_paid_until: paidUntil.toISOString() }).eq('id', user.id)
    await supabase.from('team_members').update({ status: 'active' }).eq('owner_id', user.id)

    // Send email invites to all members
    for (const member of members) {
      try {
        await fetch('/api/invite-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: member.member_email,
            ownerId: user.id
          })
        })
      } catch (e) {
        console.error('Invite failed for:', member.member_email)
      }
    }

    setCouponSuccess(true)
    setInviting(false)
    setTimeout(() => { setPaymentModal(false); fetchData() }, 2000)
  }

  if (loading) return (
    <MobileLayout>
      <div style={{padding:'24px',textAlign:'center',color:'#999'}}>Loading...</div>
    </MobileLayout>
  )

  const isEnterprise = profile?.account_type === 'enterprise'

  return (
    <MobileLayout>

      {/* Payment modal */}
      {paymentModal && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{backgroundColor:'white',borderRadius:'16px',padding:'24px',width:'100%',maxWidth:'360px'}}>
            <div style={{fontSize:'18px',fontWeight:'500',color:'#111',marginBottom:'4px'}}>Activate Team</div>
            <div style={{fontSize:'13px',color:'#666',marginBottom:'16px'}}>
              Invite emails will be sent to all {members.length} team member{members.length > 1 ? 's' : ''}
            </div>

            <div style={{backgroundColor:'#f9f9f9',borderRadius:'10px',padding:'14px',marginBottom:'16px'}}>
              {members.map(m => (
                <div key={m.id} style={{fontSize:'13px',color:'#444',padding:'4px 0',display:'flex',alignItems:'center',gap:'8px'}}>
                  <span>✉️</span>
                  <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.member_email}</span>
                  <span style={{fontSize:'11px',flexShrink:0,color:m.status==='active'?'#27500A':m.status==='invited'?'#185FA5':'#999'}}>
                    {m.status==='active'?'Active':m.status==='invited'?'Invited':'Pending'}
                  </span>
                </div>
              ))}
            </div>

            <button disabled style={{width:'100%',padding:'12px',backgroundColor:'#f5f5f5',color:'#999',border:'none',borderRadius:'8px',fontSize:'14px',cursor:'not-allowed',marginBottom:'16px'}}>
              Pay {isEnterprise ? '₹5,000' : '₹2,000'} — Coming soon
            </button>

            <div style={{borderTop:'1px solid #eee',paddingTop:'12px'}}>
              <div style={{fontSize:'13px',color:'#666',marginBottom:'8px',fontWeight:'500'}}>Have a coupon code?</div>
              <input
                value={coupon}
                onChange={e=>{setCoupon(e.target.value);setCouponError('')}}
                placeholder="Enter coupon code"
                style={{width:'100%',padding:'10px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'14px',fontFamily:'sans-serif',boxSizing:'border-box',marginBottom:'8px',textTransform:'uppercase'}}
                onKeyDown={e=>e.key==='Enter'&&!inviting&&handleActivate()}
              />
              {couponError && <div style={{fontSize:'12px',color:'#cc0000',marginBottom:'8px'}}>{couponError}</div>}
              {couponSuccess && (
                <div style={{fontSize:'12px',color:primary,marginBottom:'8px',fontWeight:'500'}}>
                  ✓ Team activated! Invite emails sent.
                </div>
              )}
              <button
                onClick={handleActivate}
                disabled={inviting}
                style={{width:'100%',padding:'11px',backgroundColor:inviting?'#999':primary,color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:'500',cursor:inviting?'not-allowed':'pointer',marginBottom:'8px'}}
              >
                {inviting ? 'Sending invites...' : 'Apply Coupon & Send Invites'}
              </button>
              <button
                onClick={()=>setPaymentModal(false)}
                style={{width:'100%',padding:'10px',backgroundColor:'white',color:'#666',border:'1px solid #eee',borderRadius:'8px',fontSize:'13px',cursor:'pointer'}}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{backgroundColor:primary,padding:'16px 20px 20px'}}>
        <div style={{fontSize:'18px',fontWeight:'600',color:'white',fontFamily:"'Fraunces', serif",marginBottom:'4px'}}>Team Members</div>
        <div style={{fontSize:'12px',color:'rgba(255,255,255,0.7)'}}>{members.length}/{maxUsers} members added</div>
      </div>

      <div style={{padding:'16px'}}>

        {/* Plan info */}
        <div style={{backgroundColor:'#EAF3DE',border:'1px solid #C0DD97',borderRadius:'12px',padding:'14px',marginBottom:'16px'}}>
          <div style={{fontSize:'13px',color:'#27500A'}}>
            {isEnterprise ? '🏢 Enterprise — up to 5 team members' : '🏪 Exhibitor — up to 2 team members'}
          </div>
          <div style={{fontSize:'12px',color:'#3B6D11',marginTop:'4px'}}>
            Each member gets their own login. They scan independently. Owner sees all leads.
          </div>
        </div>

        {/* Add member */}
        {members.length < maxUsers && (
          <div style={{backgroundColor:'white',border:'1px solid #eee',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
            <div style={{fontSize:'14px',fontWeight:'500',color:'#111',marginBottom:'10px'}}>Add team member</div>
            <input
              value={email}
              onChange={e=>{setEmail(e.target.value);setError('')}}
              placeholder="Enter email address"
              type="email"
              style={{width:'100%',padding:'10px 12px',borderRadius:'8px',border:error?'1px solid #ffcccc':'1px solid #ddd',fontSize:'14px',fontFamily:'sans-serif',boxSizing:'border-box',marginBottom:'8px'}}
              onKeyDown={e=>e.key==='Enter'&&handleAddMember()}
            />
            {error && <div style={{fontSize:'12px',color:'#cc0000',marginBottom:'8px'}}>{error}</div>}
            <button onClick={handleAddMember} disabled={adding} style={{width:'100%',padding:'10px',backgroundColor:adding?'#999':primary,color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:'500',cursor:'pointer'}}>
              {adding ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        )}

        {/* Members list */}
        {members.length > 0 && (
          <div style={{backgroundColor:'white',border:'1px solid #eee',borderRadius:'12px',overflow:'hidden',marginBottom:'16px'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid #f0f0f0',fontSize:'13px',fontWeight:'500',color:'#111'}}>
              Team members
            </div>
            {members.map((member, i) => (
              <div key={member.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 16px',borderBottom:i<members.length-1?'1px solid #f5f5f5':'none'}}>
                <div style={{width:'36px',height:'36px',borderRadius:'50%',backgroundColor:'#E6F1FB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',color:'#0C447C',fontWeight:'500',flexShrink:0}}>
                  {member.member_email[0].toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'13px',color:'#111',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{member.member_email}</div>
                  <div style={{fontSize:'11px',marginTop:'1px',color:member.status==='active'?'#27500A':member.status==='invited'?'#185FA5':'#999'}}>
                    {member.status==='active' ? '● Active' : member.status==='invited' ? '📧 Invite sent' : '⏳ Pending activation'}
                  </div>
                </div>
                <button onClick={()=>handleRemove(member.id)} style={{padding:'5px 10px',backgroundColor:'#fff0f0',color:'#cc0000',border:'1px solid #ffcccc',borderRadius:'6px',fontSize:'11px',cursor:'pointer',flexShrink:0}}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Activate button */}
        {members.length > 0 && (
          <button onClick={()=>setPaymentModal(true)} style={{width:'100%',padding:'14px',backgroundColor:primary,color:'white',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:'500',cursor:'pointer'}}>
            Activate & Send Invites →
          </button>
        )}

        {members.length === 0 && (
          <div style={{textAlign:'center',padding:'40px',color:'#575353ff',fontSize:'13px'}}>
            <div style={{fontSize:'40px',marginBottom:'12px'}}>👥</div>
            Add team members above then activate to send invite links
          </div>
        )}

      </div>
    </MobileLayout>
  )
}
