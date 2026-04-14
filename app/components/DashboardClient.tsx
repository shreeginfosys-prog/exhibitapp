'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import TemplateEditor from './TemplateEditor'

export default function DashboardClient({ profile, userId, totalScans, totalContacts, hotLeads, recentScans, activeEvent }: {
  profile: any, userId: string, totalScans: number, totalContacts: number, hotLeads: number, recentScans: any[], activeEvent: any
}) {
  const supabase = createClient()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('home')
  const [signingOut, setSigningOut] = useState(false)
  const [isMobile, setIsMobile] = useState(true)
  const primary = '#0F6E56'

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const accountType = profile.account_type || 'free'
  const isExhibitor = accountType === 'exhibitor'
  const isEnterprise = accountType === 'enterprise'
  const isPaidUser = isExhibitor || isEnterprise
  const now = new Date()
  const eventActive = activeEvent && activeEvent.paid && new Date(activeEvent.start_date) <= now && new Date(activeEvent.end_date) >= now
  const canScan = accountType === 'free' || (isExhibitor && eventActive) || (isEnterprise && profile.enterprise_paid_until && new Date(profile.enterprise_paid_until) > now)

  const initials = (name: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase()
  }

  const tagColors: Record<string, { bg: string, color: string }> = {
    'Hot': { bg: '#FAECE7', color: '#993C1D' }, 'Warm': { bg: '#FAEEDA', color: '#854F0B' },
    'Cold': { bg: '#E6F1FB', color: '#0C447C' }, 'High': { bg: '#EAF3DE', color: '#27500A' },
    'Medium': { bg: '#FAEEDA', color: '#854F0B' }, 'Low': { bg: '#F1EFE8', color: '#5F5E5A' },
  }

  const warmLeads = recentScans.filter((s: any) => s.tag === 'Warm').length

  const ScanLocked = () => (
    <div style={{ width: '100%', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '12px', marginBottom: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <span style={{ fontSize: '20px' }}>📷</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#999' }}>Scan business card</div>
          <div style={{ fontSize: '11px', color: '#bbb', marginTop: '1px' }}>
            {isExhibitor ? 'Create an event and activate to start scanning' : 'Upgrade your account to scan cards'}
          </div>
        </div>
        <span style={{ fontSize: '16px' }}>🔒</span>
      </div>
      {isExhibitor && (
        <button onClick={() => router.push('/events')} style={{ width: '100%', padding: '10px', backgroundColor: primary, color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          Create Exhibition →
        </button>
      )}
    </div>
  )

  const LiveEventCard = () => (
    <div style={{ backgroundColor: 'white', border: '2px solid ' + primary, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: primary, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>● Live Event</div>
          <div style={{ fontSize: '16px', fontWeight: '500', color: '#111' }}>{activeEvent.name}</div>
          {activeEvent.location && <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>📍 {activeEvent.location}</div>}
        </div>
        <button onClick={() => router.push('/events/' + activeEvent.id)} style={{ padding: '6px 12px', backgroundColor: '#EAF3DE', color: primary, border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
          View leads
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '12px' }}>
        {[{ label: 'Scanned', value: totalScans, bg: '#f9f9f9', color: '#111' }, { label: '🔥 Hot', value: hotLeads, bg: '#FAECE7', color: '#D85A30' }, { label: '🤝 Warm', value: warmLeads, bg: '#FAEEDA', color: '#BA7517' }].map(s => (
          <div key={s.label} style={{ backgroundColor: s.bg, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '600', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '10px', color: s.color, opacity: 0.8, marginTop: '1px' }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <button onClick={() => router.push('/scan?event=' + activeEvent.id)} style={{ padding: '10px', backgroundColor: primary, color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          📷 Scan Card
        </button>
        <button onClick={() => router.push('/contacts')} style={{ padding: '10px', backgroundColor: '#f5f5f5', color: '#111', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          📇 All Leads
        </button>
      </div>
    </div>
  )

  const HomeContent = () => (
    <div>
      {eventActive && activeEvent ? <LiveEventCard /> : canScan ? (
        <button onClick={() => router.push('/scan')} style={{ width: '100%', padding: '16px', backgroundColor: primary, color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📷</span>
            <div><div>Scan business card</div><div style={{ fontSize: '11px', opacity: 0.6, marginTop: '1px' }}>AI extracts all details instantly</div></div>
          </div>
          <span style={{ opacity: 0.6 }}>→</span>
        </button>
      ) : <ScanLocked />}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        {[
          { label: 'Cards Scanned', value: totalScans, icon: '📇', path: '/contacts', bg: 'white' },
          { label: 'Hot Leads', value: hotLeads, icon: '🔥', path: '/contacts', bg: '#FAECE7', color: '#D85A30' },
          { label: 'Manual Entry', value: '', icon: '✏️', path: '/manual', bg: 'white', action: true },
          { label: 'Exhibitions', value: '', icon: '🏪', path: '/events', bg: 'white', action: true },
        ].map((item, i) => (
          <button key={i} onClick={() => router.push(item.path)} style={{ padding: '14px', backgroundColor: item.bg || 'white', border: '1px solid #eee', borderRadius: '12px', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ fontSize: '20px', marginBottom: '6px' }}>{item.icon}</div>
            {item.value !== '' ? (
              <>
                <div style={{ fontSize: '22px', fontWeight: '600', color: (item as any).color || '#111' }}>{item.value}</div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{item.label}</div>
              </>
            ) : (
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#111' }}>{item.label}</div>
            )}
          </button>
        ))}
      </div>

      {isPaidUser && (
        <button onClick={() => router.push('/team')} style={{ width: '100%', padding: '14px', backgroundColor: 'white', border: '1px solid #eee', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>👥</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#111' }}>Team Members</div>
              <div style={{ fontSize: '11px', color: '#999' }}>{isEnterprise ? '5 users' : '2 users'} allowed</div>
            </div>
          </div>
          <span style={{ color: '#ccc' }}>→</span>
        </button>
      )}

      {recentScans && recentScans.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#111' }}>Recent Contacts</div>
            <button onClick={() => router.push('/contacts')} style={{ fontSize: '12px', color: primary, background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
          </div>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
            {recentScans.slice(0, isMobile ? 3 : 5).map((scan: any, i: number) => {
              const tagStyle = tagColors[scan.tag] || { bg: '#f0f0f0', color: '#666' }
              return (
                <div key={scan.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderBottom: i < recentScans.length - 1 ? '1px solid #f5f5f5' : 'none', cursor: 'pointer' }} onClick={() => router.push('/contacts')}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EAF3DE', color: primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
                    {initials(scan.company || 'UN')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scan.company || 'Unknown'}</div>
                    <div style={{ fontSize: '11px', color: '#999' }}>{[scan.city, scan.industry].filter(Boolean).join(' · ') || 'No details'}</div>
                  </div>
                  {scan.tag && <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '6px', fontWeight: '500', backgroundColor: tagStyle.bg, color: tagStyle.color, flexShrink: 0 }}>{scan.tag}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  if (!isMobile) {
    return (
      <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", display: 'flex', minHeight: '100vh', backgroundColor: '#F8F9FA' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:wght@600;700&display=swap');
          * { box-sizing: border-box; }
          .nav-item:hover { background-color: #F0F9F5 !important; color: #0F6E56 !important; }
          ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
          .stat-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important; transform: translateY(-1px); }
          .stat-card { transition: all 0.2s ease; }
        `}</style>

        <div style={{ width: '240px', backgroundColor: 'white', borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50 }}>
          <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #f5f5f5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', backgroundColor: primary, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📇</div>
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#111', fontFamily: "'Fraunces', serif" }}>ExhibitApp</span>
            </div>
          </div>

          <nav style={{ flex: 1, padding: '12px 8px' }}>
            <div style={{ fontSize: '10px', fontWeight: '600', color: '#bbb', letterSpacing: '0.08em', padding: '4px 8px 8px' }}>NAVIGATION</div>
            {[
              { label: 'Dashboard', icon: '🏠', tab: 'home' },
              { label: 'Contacts', icon: '📇', path: '/contacts' },
              { label: 'Exhibitions', icon: '🏪', path: '/events' },
              { label: 'Scan Card', icon: '📷', path: '/scan' },
              { label: 'Team', icon: '👥', path: '/team' },
              { label: 'Follow-ups', icon: '🔔', path: '/followups' },
              { label: 'Settings', icon: '⚙️', tab: 'settings' },
            ].map((item, i) => {
              const isCurrentTab = item.tab && activeTab === item.tab
              return (
                <button key={i} className="nav-item" onClick={() => item.path ? router.push(item.path) : setActiveTab(item.tab!)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px', border: 'none', backgroundColor: isCurrentTab ? '#E8F5F0' : 'transparent', cursor: 'pointer', textAlign: 'left', marginBottom: '2px' }}>
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  <span style={{ fontSize: '14px', fontWeight: isCurrentTab ? '500' : '400', color: isCurrentTab ? primary : '#444' }}>{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div style={{ padding: '12px', borderTop: '1px solid #f5f5f5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', borderRadius: '8px', backgroundColor: '#f9f9f9', marginBottom: '8px' }}>
              {profile.photo ? (
                <img src={profile.photo} alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#E8F5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', color: primary }}>
                  {initials(profile.name || 'U')}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.name || 'User'}</div>
                <div style={{ fontSize: '11px', color: '#999', textTransform: 'capitalize' }}>{accountType}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => router.push('/choose-mode')} style={{ flex: 1, padding: '7px', backgroundColor: 'transparent', color: '#666', border: '1px solid #eee', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>Change plan</button>
              <button onClick={handleSignOut} disabled={signingOut} style={{ flex: 1, padding: '7px', backgroundColor: 'transparent', color: '#cc0000', border: '1px solid #ffcccc', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>{signingOut ? '...' : 'Sign out'}</button>
            </div>
          </div>
        </div>

        <div style={{ marginLeft: '240px', flex: 1 }}>
          <div style={{ height: '56px', backgroundColor: 'white', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 40 }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#111', fontFamily: "'Fraunces', serif" }}>
                {activeTab === 'home' ? `Good day, ${(profile.name || 'there').split(' ')[0]} 👋` : 'Settings'}
              </div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '1px' }}>
                {eventActive ? `● ${activeEvent.name} is live` : `${accountType} account`}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {[
                { label: 'Free', type: 'free' },
                { label: 'Exhibitor', type: 'exhibitor' },
                { label: 'Enterprise', type: 'enterprise' },
              ].map(p => (
                <button key={p.type} onClick={() => p.type !== 'enterprise' && router.push('/choose-mode')} style={{ padding: '5px 12px', borderRadius: '20px', border: accountType === p.type ? '2px solid ' + primary : '1px solid #eee', backgroundColor: accountType === p.type ? '#EAF3DE' : 'white', color: accountType === p.type ? primary : p.type === 'enterprise' ? '#ccc' : '#666', fontSize: '12px', fontWeight: '500', cursor: p.type === 'enterprise' ? 'not-allowed' : 'pointer' }}>
                  {p.label}{p.type === 'enterprise' ? ' 🔒' : ''}
                </button>
              ))}
              <button onClick={() => router.push('/scan')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: primary, color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                📷 Scan Card
              </button>
            </div>
          </div>

          <div style={{ padding: '28px', maxWidth: '1100px' }}>
            {activeTab === 'home' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
                <div>
                  {eventActive && activeEvent && (
                    <div style={{ backgroundColor: 'white', border: '2px solid ' + primary, borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: primary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>● Live Event</div>
                          <div style={{ fontSize: '20px', fontWeight: '600', color: '#111', fontFamily: "'Fraunces', serif" }}>{activeEvent.name}</div>
                          {activeEvent.location && <div style={{ fontSize: '13px', color: '#999', marginTop: '2px' }}>📍 {activeEvent.location}</div>}
                        </div>
                        <button onClick={() => router.push('/events/' + activeEvent.id)} style={{ padding: '8px 16px', backgroundColor: '#EAF3DE', color: primary, border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                          View all leads →
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                        {[
                          { label: 'Scanned', value: totalScans, bg: '#f9f9f9', color: '#111' },
                          { label: '🔥 Hot', value: hotLeads, bg: '#FAECE7', color: '#D85A30' },
                          { label: '🤝 Warm', value: warmLeads, bg: '#FAEEDA', color: '#BA7517' },
                          { label: '✅ Deals', value: recentScans.filter((s: any) => s.lead_status === 'done').length, bg: '#EAF3DE', color: '#27500A' },
                        ].map(s => (
                          <div key={s.label} className="stat-card" style={{ backgroundColor: s.bg, borderRadius: '10px', padding: '14px', textAlign: 'center', border: '1px solid transparent' }}>
                            <div style={{ fontSize: '28px', fontWeight: '600', color: s.color, fontFamily: "'Fraunces', serif" }}>{s.value}</div>
                            <div style={{ fontSize: '11px', color: s.color, opacity: 0.8, marginTop: '2px' }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => router.push('/scan?event=' + activeEvent.id)} style={{ flex: 1, padding: '12px', backgroundColor: primary, color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                          📷 Scan new card at this event
                        </button>
                        <button onClick={() => router.push('/events/' + activeEvent.id)} style={{ padding: '12px 20px', backgroundColor: '#f5f5f5', color: '#444', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                          📊 ROI details
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                    {[
                      { label: 'Total Cards Scanned', value: totalScans, icon: '📇', bg: 'white', color: '#111', path: '/contacts' },
                      { label: 'Hot Leads', value: hotLeads, icon: '🔥', bg: '#FAECE7', color: '#D85A30', path: '/contacts' },
                      { label: 'People in Database', value: totalContacts, icon: '👤', bg: 'white', color: '#111', path: '/contacts' },
                    ].map((s, i) => (
                      <button key={i} className="stat-card" onClick={() => router.push(s.path)} style={{ backgroundColor: s.bg, borderRadius: '12px', padding: '20px', textAlign: 'left', border: '1px solid #eee', cursor: 'pointer' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>{s.icon}</div>
                        <div style={{ fontSize: '32px', fontWeight: '600', color: s.color, fontFamily: "'Fraunces', serif" }}>{s.value}</div>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{s.label}</div>
                      </button>
                    ))}
                  </div>

                  {!eventActive && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                      {canScan ? (
                        <button onClick={() => router.push('/scan')} style={{ padding: '20px', backgroundColor: primary, color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', textAlign: 'left' }}>
                          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
                          <div style={{ fontSize: '15px', fontWeight: '500' }}>Scan Business Card</div>
                          <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>AI extracts all details</div>
                        </button>
                      ) : (
                        <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '12px', textAlign: 'left' }}>
                          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷 🔒</div>
                          <div style={{ fontSize: '15px', fontWeight: '500', color: '#999' }}>Scan Card</div>
                          <div style={{ fontSize: '12px', color: '#bbb', marginTop: '4px' }}>
                            {isExhibitor ? 'Activate an event first' : 'Upgrade to scan'}
                          </div>
                          {isExhibitor && <button onClick={() => router.push('/events')} style={{ marginTop: '10px', padding: '6px 12px', backgroundColor: primary, color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Create Event</button>}
                        </div>
                      )}
                      <button onClick={() => router.push('/manual')} style={{ padding: '20px', backgroundColor: 'white', color: '#111', border: '1px solid #eee', borderRadius: '12px', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>✏️</div>
                        <div style={{ fontSize: '15px', fontWeight: '500' }}>Manual Entry</div>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Always free · Unlimited</div>
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden', marginBottom: '16px' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#111' }}>Recent contacts</div>
                      <button onClick={() => router.push('/contacts')} style={{ fontSize: '12px', color: primary, background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
                    </div>
                    {recentScans.length === 0 ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: '#999' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📇</div>
                        <div style={{ fontSize: '13px' }}>No contacts yet</div>
                      </div>
                    ) : recentScans.slice(0, 6).map((scan: any, i: number) => {
                      const tagStyle = tagColors[scan.tag] || { bg: '#f0f0f0', color: '#666' }
                      const initials2 = (name: string) => {
                        if (!name) return '?'
                        const p = name.trim().split(' ')
                        return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : p[0][0].toUpperCase()
                      }
                      return (
                        <div key={scan.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: i < recentScans.length - 1 ? '1px solid #f9f9f9' : 'none', cursor: 'pointer' }} onClick={() => router.push('/contacts')}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#EAF3DE', color: primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', flexShrink: 0 }}>
                            {initials2(scan.company || '?')}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: '500', color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scan.company || 'Unknown'}</div>
                            <div style={{ fontSize: '11px', color: '#999' }}>{scan.city || 'No location'}</div>
                          </div>
                          {scan.tag && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '6px', fontWeight: '500', backgroundColor: tagStyle.bg, color: tagStyle.color, flexShrink: 0 }}>{scan.tag}</span>}
                        </div>
                      )
                    })}
                  </div>

                  {isPaidUser && (
                    <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '14px 16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#111', marginBottom: '10px' }}>Quick links</div>
                      {[
                        { label: 'Manage Exhibitions', icon: '🏪', path: '/events' },
                        { label: 'Team Members', icon: '👥', path: '/team' },
                        { label: 'WhatsApp Template', icon: '💬', tab: 'settings' },
                      ].map((item, i) => (
                        <button key={i} onClick={() => item.path ? router.push(item.path) : setActiveTab(item.tab!)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left', borderBottom: i < 2 ? '1px solid #f5f5f5' : 'none' }}>
                          <span style={{ fontSize: '16px' }}>{item.icon}</span>
                          <span style={{ fontSize: '13px', color: '#444' }}>{item.label}</span>
                          <span style={{ marginLeft: 'auto', color: '#ccc', fontSize: '12px' }}>→</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div style={{ maxWidth: '600px' }}>
                <div style={{ backgroundColor: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '12px' }}>Account</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    {profile.photo ? (
                      <img src={profile.photo} alt="avatar" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '600', color: primary }}>
                        {initials(profile.name || 'U')}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '500', color: '#111' }}>{profile.name}</div>
                      <div style={{ fontSize: '13px', color: '#999' }}>{profile.email}</div>
                      <div style={{ fontSize: '12px', color: primary, fontWeight: '500', textTransform: 'capitalize', marginTop: '2px' }}>{accountType} plan</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => router.push('/choose-mode')} style={{ padding: '8px 16px', backgroundColor: '#f0f0f0', color: '#666', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Change plan</button>
                    <button onClick={handleSignOut} style={{ padding: '8px 16px', backgroundColor: '#fff0f0', color: '#cc0000', border: '1px solid #ffcccc', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Sign out</button>
                  </div>
                </div>
                <TemplateEditor userId={userId} currentTemplate={profile.whatsapp_template || ''} />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: '480px', margin: '0 auto', backgroundColor: '#f5f5f5', minHeight: '100dvh', paddingBottom: '64px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:wght@600;700&display=swap');`}</style>

      <div style={{ background: primary, padding: '16px 20px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {profile.photo ? (
              <img src={profile.photo} alt="profile" style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)' }} />
            ) : (
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600', color: 'white' }}>
                {initials(profile.name || 'U')}
              </div>
            )}
            <div>
              <div style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>{profile.name || 'User'}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', textTransform: 'capitalize' }}>{accountType}</div>
            </div>
          </div>
          <button onClick={handleSignOut} style={{ padding: '5px 10px', backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>

        <div style={{ display: 'flex', gap: '5px' }}>
          {[{ type: 'free', label: 'Free' }, { type: 'exhibitor', label: 'Exhibitor' }, { type: 'enterprise', label: 'Enterprise 🔒' }].map(p => (
            <button key={p.type} onClick={() => p.type !== 'enterprise' && router.push('/choose-mode')} style={{ padding: '4px 10px', borderRadius: '20px', border: accountType === p.type ? '2px solid white' : '1px solid rgba(255,255,255,0.2)', backgroundColor: accountType === p.type ? 'white' : 'transparent', color: accountType === p.type ? primary : p.type === 'enterprise' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '500', cursor: p.type === 'enterprise' ? 'not-allowed' : 'pointer' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', padding: '0 14px', marginTop: '-12px', marginBottom: '12px' }}>
        {[
          { value: totalScans, label: 'Scanned', bg: 'white', color: '#111' },
          { value: totalContacts, label: 'People', bg: 'white', color: '#111' },
          { value: hotLeads, label: 'Hot leads', bg: '#FAECE7', color: '#D85A30' },
        ].map((s, i) => (
          <div key={i} style={{ backgroundColor: s.bg, borderRadius: '10px', padding: '12px', textAlign: 'center', border: '0.5px solid #eee' }}>
            <div style={{ fontSize: '20px', fontWeight: '600', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '10px', color: s.color === '#111' ? '#999' : s.color, marginTop: '1px', opacity: s.color === '#111' ? 1 : 0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', backgroundColor: 'white', borderBottom: '1px solid #eee', borderTop: '1px solid #eee' }}>
        {[{ id: 'home', label: 'Home', icon: '🏠' }, { id: 'add', label: 'Add', icon: '📷' }, { id: 'settings', label: 'Settings', icon: '⚙️' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: '12px 8px', border: 'none', backgroundColor: 'transparent', fontSize: '12px', fontWeight: '500', cursor: 'pointer', color: activeTab === tab.id ? primary : '#999', borderBottom: activeTab === tab.id ? '2px solid ' + primary : '2px solid transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '16px' }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>
        {activeTab === 'home' && <HomeContent />}

        {activeTab === 'add' && (
          <div>
            <div style={{ fontSize: '16px', fontWeight: '500', color: '#111', marginBottom: '14px' }}>Add Contact</div>
            {canScan ? (
              <button onClick={() => router.push('/scan')} style={{ width: '100%', padding: '20px', backgroundColor: primary, color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div><div style={{ fontSize: '15px', fontWeight: '500' }}>📷 Scan business card</div><div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>AI extracts all details instantly</div></div>
                <span style={{ opacity: 0.6 }}>→</span>
              </button>
            ) : <ScanLocked />}
            <button onClick={() => router.push('/manual')} style={{ width: '100%', padding: '20px', backgroundColor: 'white', color: '#111', border: '1px solid #eee', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontSize: '15px', fontWeight: '500' }}>✏️ Manual entry</div><div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Always free · unlimited</div></div>
              <span style={{ color: '#ccc' }}>→</span>
            </button>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <div style={{ fontSize: '16px', fontWeight: '500', color: '#111', marginBottom: '14px' }}>Settings</div>
            <div style={{ backgroundColor: 'white', border: '0.5px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', color: '#999', marginBottom: '4px' }}>{profile.email}</div>
              <div style={{ fontSize: '12px', color: primary, fontWeight: '500', textTransform: 'capitalize', marginBottom: '12px' }}>{accountType} plan</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => router.push('/choose-mode')} style={{ flex: 1, padding: '8px', backgroundColor: '#f0f0f0', color: '#666', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>Change plan</button>
                <button onClick={handleSignOut} style={{ flex: 1, padding: '8px', backgroundColor: '#fff0f0', color: '#cc0000', border: '1px solid #ffcccc', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>Sign out</button>
              </div>
            </div>
            <TemplateEditor userId={userId} currentTemplate={profile.whatsapp_template || ''} />
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', backgroundColor: 'white', borderTop: '1px solid #eee', display: 'flex', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {[
          { label: 'Home', icon: '🏠', action: () => setActiveTab('home'), active: activeTab === 'home' },
          { label: 'Contacts', icon: '📇', action: () => router.push('/contacts'), active: false },
          { label: 'Scan', icon: '📷', action: () => router.push('/scan'), active: false, center: true },
          { label: 'Events', icon: '🏪', action: () => router.push('/events'), active: false },
          { label: 'Settings', icon: '⚙️', action: () => setActiveTab('settings'), active: activeTab === 'settings' },
        ].map((item: any, i) => (
          <button key={i} onClick={item.action} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', padding: item.center ? '0' : '8px 0 10px', position: 'relative' }}>
            {item.center ? (
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginTop: '-20px', boxShadow: '0 4px 12px rgba(15,110,86,0.4)', border: '3px solid white' }}>
                {item.icon}
              </div>
            ) : (
              <>
                <span style={{ fontSize: '20px', opacity: item.active ? 1 : 0.6 }}>{item.icon}</span>
                <span style={{ fontSize: '10px', fontWeight: item.active ? '600' : '400', color: item.active ? primary : '#999' }}>{item.label}</span>
                {item.active && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '20px', height: '2px', backgroundColor: primary, borderRadius: '1px' }} />}
              </>
            )}
          </button>
        ))}
      </div>
