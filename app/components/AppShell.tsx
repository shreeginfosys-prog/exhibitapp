'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../../lib/supabase'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞', path: '/dashboard' },
  { id: 'contacts', label: 'Contacts', icon: '◫', path: '/contacts' },
  { id: 'events', label: 'Exhibitions', icon: '◈', path: '/events' },
  { id: 'scan', label: 'Scan Card', icon: '⊕', path: '/scan' },
  { id: 'team', label: 'Team', icon: '◉', path: '/team' },
]

export default function AppShell({ children, profile }: { children: React.ReactNode, profile: any }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [isMobile, setIsMobile] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

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

  const primary = '#0F6E56'
  const accountType = profile?.account_type || 'free'

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  const initials = (name: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase()
  }

  if (isMobile) {
    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: '480px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '64px' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>
        {children}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', backgroundColor: 'white', borderTop: '1px solid #eee', display: 'flex', zIndex: 100, padding: '8px 0 12px' }}>
          {NAV_ITEMS.filter(n => n.id !== 'team').map(item => (
            <button key={item.id} onClick={() => router.push(item.path)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', padding: '4px 0' }}>
              <span style={{ fontSize: '18px', opacity: isActive(item.path) ? 1 : 0.4 }}>{item.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: '500', color: isActive(item.path) ? primary : '#999' }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', minHeight: '100vh', backgroundColor: '#F8F9FA' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:wght@600;700&display=swap');
        * { box-sizing: border-box; }
        .nav-item:hover { background-color: #F0F9F5 !important; }
        .nav-item.active { background-color: #E8F5F0 !important; }
        .content-card { transition: box-shadow 0.2s ease; }
        .content-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
      `}</style>

      <div style={{ width: '240px', backgroundColor: 'white', borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50 }}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #f5f5f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', backgroundColor: primary, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📇</div>
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#111', fontFamily: "'Fraunces', serif" }}>ExhibitApp</span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: '#bbb', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 8px 8px' }}>Main</div>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-item${isActive(item.path) ? ' active' : ''}`}
              onClick={() => router.push(item.path)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px', border: 'none', backgroundColor: isActive(item.path) ? '#E8F5F0' : 'transparent', cursor: 'pointer', textAlign: 'left', marginBottom: '2px' }}
            >
              <span style={{ fontSize: '16px', opacity: isActive(item.path) ? 1 : 0.5 }}>{item.icon}</span>
              <span style={{ fontSize: '14px', fontWeight: isActive(item.path) ? '500' : '400', color: isActive(item.path) ? primary : '#444' }}>{item.label}</span>
              {item.id === 'scan' && (
                <span style={{ marginLeft: 'auto', fontSize: '10px', backgroundColor: primary, color: 'white', padding: '1px 6px', borderRadius: '10px' }}>New</span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding: '12px', borderTop: '1px solid #f5f5f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', backgroundColor: '#f9f9f9', marginBottom: '8px' }}>
            {profile?.photo ? (
              <img src={profile.photo} alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#E8F5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', color: primary, flexShrink: 0 }}>
                {initials(profile?.name || 'U')}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.name || 'User'}</div>
              <div style={{ fontSize: '11px', color: '#999', textTransform: 'capitalize' }}>{accountType}</div>
            </div>
          </div>
          <button onClick={handleSignOut} disabled={signingOut} style={{ width: '100%', padding: '8px', backgroundColor: 'transparent', color: '#999', border: '1px solid #eee', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </div>

      <div style={{ marginLeft: '240px', flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: '56px', backgroundColor: 'white', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ fontSize: '16px', fontWeight: '500', color: '#111' }}>
            {NAV_ITEMS.find(n => isActive(n.path))?.label || 'Dashboard'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => router.push('/scan')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: primary, color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              <span>📷</span> Scan Card
            </button>
            <button onClick={() => router.push('/manual')} style={{ padding: '8px 14px', backgroundColor: 'white', color: '#444', border: '1px solid #eee', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
              ✏️ Manual
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: '28px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
