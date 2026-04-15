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
  { label: 'Events', icon: '🏪', path: '/events' },
  { label: 'Team', icon: '👥', path: '/team' },
]

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isSubUser, setIsSubUser] = useState(false)
  const [pendingFollowups, setPendingFollowups] = useState(0)

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

          // Count pending follow-ups due today or overdue
          const today = new Date().toISOString().split('T')[0]
          const { count } = await supabase
            .from('follow_ups')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .eq('status', 'pending')
            .lte('due_date', today)
          setPendingFollowups(count || 0)
        }
      } catch (e) {
        // silently fail
      }
    }
    checkUser()
  }, [])

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')
  const visibleNav = NAV.filter(item => !(item.path === '/team' && isSubUser))

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
        input, textarea, select { font-family: 'DM Sans', sans-serif; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 30px white inset !important; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{ flex: 1 }}>
        {children}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0,
        left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '480px',
        backgroundColor: 'white',
        borderTop: '1px solid #eee',
        display: 'flex', zIndex: 1000,
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
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '2px', border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                padding: isCenter ? '0' : '8px 0 10px',
                position: 'relative',
              }}
            >
              {isCenter ? (
                <div style={{
                  width: '50px', height: '50px', borderRadius: '50%',
                  backgroundColor: primary, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', marginTop: '-22px',
                  boxShadow: '0 4px 14px rgba(15,110,86,0.45)',
                  border: '3px solid white'
                }}>
                  {item.icon}
                </div>
              ) : (
                <>
                  <div style={{ position: 'relative' }}>
                    <span style={{ fontSize: '20px', opacity: active ? 1 : 0.55 }}>{item.icon}</span>
                    {item.path === '/contacts' && pendingFollowups > 0 && (
                      <div style={{
                        position: 'absolute', top: '-4px', right: '-6px',
                        width: '14px', height: '14px', borderRadius: '50%',
                        backgroundColor: '#cc0000', color: 'white',
                        fontSize: '8px', fontWeight: '700',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1.5px solid white'
                      }}>
                        {pendingFollowups > 9 ? '9+' : pendingFollowups}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: active ? '600' : '400', color: active ? primary : '#999' }}>
                    {item.label}
                  </span>
                  {active && (
                    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '20px', height: '2.5px', backgroundColor: primary, borderRadius: '2px' }} />
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
