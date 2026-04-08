'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import TemplateEditor from './TemplateEditor'

export default function DashboardClient({ profile, userId, totalScans, totalContacts, hotLeads, recentScans }: {
  profile: any
  userId: string
  totalScans: number
  totalContacts: number
  hotLeads: number
  recentScans: any[]
}) {
  const supabase = createClient()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('home')
  const [signingOut, setSigningOut] = useState(false)
  const [mode, setMode] = useState<'exhibitor'|'visitor'>(profile.type || 'exhibitor')

  const isExhibitor = mode === 'exhibitor'
  const primaryColor = '#0F6E56'
  const primaryLight = '#E1F5EE'

  const tagColors: Record<string, {bg:string,color:string}> = {
    'Hot':    {bg:'#FAECE7', color:'#993C1D'},
    'Warm':   {bg:'#FAEEDA', color:'#854F0B'},
    'Cold':   {bg:'#E6F1FB', color:'#0C447C'},
    'High':   {bg:'#EAF3DE', color:'#27500A'},
    'Medium': {bg:'#FAEEDA', color:'#854F0B'},
    'Low':    {bg:'#F1EFE8', color:'#5F5E5A'},
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navigate = (path: string) => {
    router.push(path)
  }

  const initials = (name: string) => {
    if (!name) return 'U'
    const parts = name.split(' ')
    return parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0][0]
  }

  const avatarColors = ['#E6F1FB', '#EAF3DE', '#FAEEDA', '#FAECE7', '#EEEDFE']
  const avatarTextColors = ['#0C447C', '#27500A', '#854F0B', '#993C1D', '#3C3489']

  const getAvatarColor = (name: string) => {
    const idx = name.charCodeAt(0) % avatarColors.length
    return { bg: avatarColors[idx], color: avatarTextColors[idx] }
  }

  return (
    <div style={{fontFamily:'sans-serif',maxWidth:'480px',margin:'0 auto',backgroundColor:'#f5f5f5',minHeight:'100vh'}}>

      <div style={{background:primaryColor,padding:'16px 20px 24px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            {profile.photo ? (
              <img src={profile.photo} alt="profile" style={{width:'42px',height:'42px',borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)'}} />
            ) : (
              <div style={{width:'42px',height:'42px',borderRadius:'50%',backgroundColor:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',fontWeight:'500',color:'white'}}>
                {initials(profile.name || 'U')}
              </div>
            )}
            <div>
              <div style={{color:'white',fontSize:'15px',fontWeight:'500'}}>{profile.name || 'User'}</div>
              <div style={{color:'rgba(255,255,255,0.6)',fontSize:'11px'}}>{profile.email}</div>
            </div>
          </div>
          <button onClick={handleSignOut} disabled={signingOut} style={{padding:'6px 12px',backgroundColor:'rgba(255,255,255,0.15)',color:'white',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'6px',fontSize:'11px',cursor:'pointer',fontWeight:'500'}}>
            {signingOut ? '...' : 'Sign out'}
          </button>
        </div>

        <div style={{marginTop:'16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{color:'white',fontSize:'17px',fontWeight:'500'}}>
              Good day, {(profile.name || 'there').split(' ')[0]} 👋
            </div>
            <div style={{color:'rgba(255,255,255,0.5)',fontSize:'12px',marginTop:'2px'}}>
              {isExhibitor ? 'Exhibitor mode — collecting visitor leads' : 'Visitor mode — collecting exhibitor contacts'}
            </div>
          </div>
        </div>

        <div style={{marginTop:'14px',display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{fontSize:'12px',color:'rgba(255,255,255,0.7)'}}>Mode:</span>
          <div style={{display:'flex',backgroundColor:'rgba(255,255,255,0.15)',borderRadius:'20px',padding:'2px'}}>
            <button
              onClick={() => setMode('exhibitor')}
              style={{padding:'4px 12px',borderRadius:'18px',border:'none',fontSize:'12px',fontWeight:'500',cursor:'pointer',backgroundColor:isExhibitor?'white':'transparent',color:isExhibitor?primaryColor:'rgba(255,255,255,0.7)',transition:'all 0.2s'}}
            >
              Exhibitor
            </button>
            <button
              onClick={() => setMode('visitor')}
              style={{padding:'4px 12px',borderRadius:'18px',border:'none',fontSize:'12px',fontWeight:'500',cursor:'pointer',backgroundColor:!isExhibitor?'white':'transparent',color:!isExhibitor?primaryColor:'rgba(255,255,255,0.7)',transition:'all 0.2s'}}
            >
              Visitor
            </button>
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',padding:'0 16px',marginTop:'-12px',marginBottom:'16px'}}>
        <div style={{backgroundColor:'white',borderRadius:'10px',padding:'12px',textAlign:'center',border:'0.5px solid #eee'}}>
          <div style={{fontSize:'22px',fontWeight:'500',color:'#111'}}>{totalScans}</div>
          <div style={{fontSize:'10px',color:'#999',marginTop:'2px'}}>Cards scanned</div>
        </div>
        <div style={{backgroundColor:'white',borderRadius:'10px',padding:'12px',textAlign:'center',border:'0.5px solid #eee'}}>
          <div style={{fontSize:'22px',fontWeight:'500',color:'#111'}}>{totalContacts}</div>
          <div style={{fontSize:'10px',color:'#999',marginTop:'2px'}}>People saved</div>
        </div>
        <div style={{backgroundColor:'#FAECE7',borderRadius:'10px',padding:'12px',textAlign:'center',border:'0.5px solid #F5C4B3'}}>
          <div style={{fontSize:'22px',fontWeight:'500',color:'#D85A30'}}>{hotLeads}</div>
          <div style={{fontSize:'10px',color:'#993C1D',marginTop:'2px'}}>{isExhibitor ? 'Hot leads' : 'High interest'}</div>
        </div>
      </div>

      <div style={{display:'flex',backgroundColor:'white',borderBottom:'1px solid #eee',borderTop:'1px solid #eee'}}>
        {[
          {id:'home', label:'Home', icon:'🏠'},
          {id:'contacts', label:'Contacts', icon:'📇'},
          {id:'scan', label:'Scan', icon:'📷'},
          {id:'settings', label:'Settings', icon:'⚙️'},
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{flex:1,padding:'12px 8px',border:'none',backgroundColor:'transparent',fontSize:'12px',fontWeight:'500',cursor:'pointer',color:activeTab===tab.id?primaryColor:'#999',borderBottom:activeTab===tab.id?'2px solid '+primaryColor:'2px solid transparent',display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
            <span style={{fontSize:'16px'}}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div style={{padding:'20px 16px'}}>

        {activeTab === 'home' && (
          <div>
            <div style={{fontSize:'12px',fontWeight:'500',color:'#999',letterSpacing:'0.05em',textTransform:'uppercase',marginBottom:'10px'}}>Quick actions</div>

            <button onClick={() => navigate('/scan')} style={{width:'100%',padding:'16px',backgroundColor:primaryColor,color:'white',border:'none',borderRadius:'12px',fontSize:'15px',fontWeight:'500',cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{fontSize:'20px'}}>📷</span>
                <div>
                  <div>Scan business card</div>
                  <div style={{fontSize:'11px',opacity:0.6,marginTop:'1px'}}>AI extracts all details instantly</div>
                </div>
              </div>
              <span style={{opacity:0.6,fontSize:'18px'}}>→</span>
            </button>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
              <button onClick={() => navigate('/contacts')} style={{padding:'14px',backgroundColor:'white',color:'#111',border:'0.5px solid #eee',borderRadius:'12px',cursor:'pointer',textAlign:'left'}}>
                <div style={{fontSize:'20px',marginBottom:'6px'}}>📇</div>
                <div style={{fontSize:'13px',fontWeight:'500'}}>My contacts</div>
                <div style={{fontSize:'11px',color:'#999',marginTop:'2px'}}>{totalContacts} people saved</div>
              </button>
              <button onClick={() => navigate('/manual')} style={{padding:'14px',backgroundColor:'white',color:'#111',border:'0.5px solid #eee',borderRadius:'12px',cursor:'pointer',textAlign:'left'}}>
                <div style={{fontSize:'20px',marginBottom:'6px'}}>✏️</div>
                <div style={{fontSize:'13px',fontWeight:'500'}}>Manual entry</div>
                <div style={{fontSize:'11px',color:'#999',marginTop:'2px'}}>Type details manually</div>
              </button>
            </div>

            {isExhibitor && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'16px'}}>
                <button onClick={() => setActiveTab('settings')} style={{padding:'14px',backgroundColor:'white',color:'#111',border:'0.5px solid #eee',borderRadius:'12px',cursor:'pointer',textAlign:'left'}}>
                  <div style={{fontSize:'20px',marginBottom:'6px'}}>💬</div>
                  <div style={{fontSize:'13px',fontWeight:'500'}}>WA template</div>
                  <div style={{fontSize:'11px',color:'#999',marginTop:'2px'}}>Edit your message</div>
                </button>
                <button onClick={() => navigate('/contacts')} style={{padding:'14px',backgroundColor:'white',color:'#111',border:'0.5px solid #eee',borderRadius:'12px',cursor:'pointer',textAlign:'left'}}>
                  <div style={{fontSize:'20px',marginBottom:'6px'}}>📊</div>
                  <div style={{fontSize:'13px',fontWeight:'500'}}>Export CSV</div>
                  <div style={{fontSize:'11px',color:'#999',marginTop:'2px'}}>Download all leads</div>
                </button>
              </div>
            )}

            {recentScans && recentScans.length > 0 && (
              <div>
                <div style={{fontSize:'12px',fontWeight:'500',color:'#999',letterSpacing:'0.05em',textTransform:'uppercase',marginBottom:'10px'}}>Recent contacts</div>
                <div style={{backgroundColor:'white',borderRadius:'12px',border:'0.5px solid #eee',overflow:'hidden'}}>
                  {recentScans.slice(0,3).map((scan: any, i: number) => {
                    const av = getAvatarColor(scan.company || 'U')
                    const tag = scan.tag
                    const tagStyle = tagColors[tag] || {bg:'#f0f0f0',color:'#666'}
                    return (
                      <div key={scan.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 14px',borderBottom:i<2?'0.5px solid #f0f0f0':'none',cursor:'pointer'}} onClick={() => navigate('/contacts')}>
                        <div style={{width:'36px',height:'36px',borderRadius:'8px',backgroundColor:av.bg,color:av.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'500',flexShrink:0}}>
                          {initials(scan.company || 'UN')}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:'13px',fontWeight:'500',color:'#111',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                            {scan.company || 'Unknown'}
                          </div>
                          <div style={{fontSize:'11px',color:'#999'}}>
                            {[scan.city, scan.industry].filter(Boolean).join(' · ') || 'No details'}
                          </div>
                        </div>
                        {tag && (
                          <span style={{fontSize:'10px',padding:'2px 7px',borderRadius:'6px',fontWeight:'500',backgroundColor:tagStyle.bg,color:tagStyle.color,flexShrink:0}}>
                            {tag}
                          </span>
                        )}
                      </div>
                    )
                  })}
                  <div style={{textAlign:'center',padding:'10px',borderTop:'0.5px solid #f0f0f0',cursor:'pointer'}} onClick={() => navigate('/contacts')}>
                    <span style={{fontSize:'12px',color:primaryColor,fontWeight:'500'}}>View all contacts →</span>
                  </div>
                </div>
              </div>
            )}

            {(!recentScans || recentScans.length === 0) && (
              <div style={{textAlign:'center',padding:'40px 20px',backgroundColor:'white',borderRadius:'12px',border:'0.5px solid #eee'}}>
                <div style={{fontSize:'36px',marginBottom:'10px'}}>📇</div>
                <div style={{fontSize:'14px',fontWeight:'500',color:'#111',marginBottom:'4px'}}>No contacts yet</div>
                <div style={{fontSize:'12px',color:'#999',marginBottom:'14px'}}>Scan your first business card to get started</div>
                <button onClick={() => navigate('/scan')} style={{padding:'10px 20px',backgroundColor:primaryColor,color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'500',cursor:'pointer'}}>
                  Scan first card
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'contacts' && (
          <div>
            <div style={{fontSize:'17px',fontWeight:'500',color:'#111',marginBottom:'16px'}}>Contacts</div>
            <button onClick={() => navigate('/contacts')} style={{width:'100%',padding:'16px',backgroundColor:primaryColor,color:'white',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'500',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
              <span>Open full contacts list</span>
              <span>→</span>
            </button>
            <button onClick={() => navigate('/scan')} style={{width:'100%',padding:'16px',backgroundColor:'white',color:'#111',border:'0.5px solid #eee',borderRadius:'12px',fontSize:'14px',fontWeight:'500',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
              <span>📷 Scan new card</span>
              <span style={{color:'#ccc'}}>→</span>
            </button>
            <button onClick={() => navigate('/manual')} style={{width:'100%',padding:'16px',backgroundColor:'white',color:'#111',border:'0.5px solid #eee',borderRadius:'12px',fontSize:'14px',fontWeight:'500',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>✏️ Add manually</span>
              <span style={{color:'#ccc'}}>→</span>
            </button>
          </div>
        )}

        {activeTab === 'scan' && (
          <div>
            <div style={{fontSize:'17px',fontWeight:'500',color:'#111',marginBottom:'16px'}}>Add contact</div>
            <button onClick={() => navigate('/scan')} style={{width:'100%',padding:'20px',backgroundColor:primaryColor,color:'white',border:'none',borderRadius:'12px',cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
              <div>
                <div style={{fontSize:'15px',fontWeight:'500'}}>📷 Scan business card</div>
                <div style={{fontSize:'12px',opacity:0.6,marginTop:'4px'}}>Take photo — AI extracts all details</div>
              </div>
              <span style={{opacity:0.6}}>→</span>
            </button>
            <button onClick={() => navigate('/manual')} style={{width:'100%',padding:'20px',backgroundColor:'white',color:'#111',border:'0.5px solid #eee',borderRadius:'12px',cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:'15px',fontWeight:'500'}}>✏️ Manual entry</div>
                <div style={{fontSize:'12px',color:'#999',marginTop:'4px'}}>Type contact details manually</div>
              </div>
              <span style={{color:'#ccc'}}>→</span>
            </button>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <div style={{fontSize:'17px',fontWeight:'500',color:'#111',marginBottom:'16px'}}>Settings</div>

            <div style={{backgroundColor:'white',border:'0.5px solid #eee',borderRadius:'12px',padding:'16px',marginBottom:'10px'}}>
              <div style={{fontSize:'13px',fontWeight:'500',color:'#111',marginBottom:'2px'}}>Account</div>
              <div style={{fontSize:'12px',color:'#999',marginBottom:'12px'}}>{profile.email}</div>
              <div style={{fontSize:'12px',color:'#666',marginBottom:'12px'}}>
                Current mode: <span style={{fontWeight:'500',color:primaryColor}}>{mode}</span>
              </div>
              <button onClick={handleSignOut} style={{padding:'8px 16px',backgroundColor:'#fff0f0',color:'#cc0000',border:'1px solid #ffcccc',borderRadius:'8px',fontSize:'13px',cursor:'pointer'}}>
                Sign out
              </button>
            </div>

            {isExhibitor && (
              <TemplateEditor userId={userId} currentTemplate={profile.whatsapp_template || ''} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
