'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../../lib/supabase'

const primary = '#0F6E56'
const supabase = createClient()

const NAV = [
  { label: 'Home', icon: '🏠', path: '/dashboard' },
  { label: 'Contacts', icon: '📇', path: '/contacts' },
  { label: 'Scan', icon: '📷', path: '/scan' },
  { label: 'Follow-ups', icon: '🔔', path: '/followups' },
  { label: 'Events', icon: '🏪', path: '/events' },
]

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isSubUser, setIsSubUser] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('parent_user_id')
            .eq('id', session.user.id)
            .single()
          if (profile?.parent_user_id) setIsSubUser(true)
        }
      } catch {}
    }
    checkUser()
  }, [])

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')
  const visibleNav = NAV.filter(item => item.path !== '/team' || !isSubUser)

  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      minHeight: '100dvh',
      backgroundColor: '#f5f5f5',
      fontFamily: "'DM Sans', sans-serif",
      position: 'relative',
      paddingBottom: '68px'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body { background: #e8e8e8; }
        input, textarea, select { font-family: 'DM Sans', sans-serif; color: #111 !important; background-color: white !important; }
        input[type="date"] { color: #111 !important; background-color: white !important; }
        input::placeholder, textarea::placeholder { color: #aaa !important; }
        ::-webkit-scrollbar { display: none; }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.6; }
      `}</style>

      <div style={{ flex: 1 }}>
        {children}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        backgroundColor: 'white',
        borderTop: '1px solid #eee',
        display: 'flex',
        zIndex: 1000,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {visibleNav.map(item => {
          const active = isActive(item.path)
          const isCenter = item.label === 'Scan'
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                padding: isCenter ? '0' : '8px 0 10px',
                position: 'relative',
              }}
            >
              {isCenter ? (
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  marginTop: '-20px',
                  boxShadow: '0 4px 12px rgba(15,110,86,0.4)',
                  border: '3px solid white'
                }}>
                  {item.icon}
                </div>
              ) : (
                <>
                  <span style={{ fontSize: '20px', opacity: active ? 1 : 0.6 }}>{item.icon}</span>
                  <span style={{ fontSize: '10px', fontWeight: active ? '600' : '400', color: active ? primary : '#999' }}>
                    {item.label}
                  </span>
                  {active && (
                    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '20px', height: '2px', backgroundColor: primary, borderRadius: '1px' }} />
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
