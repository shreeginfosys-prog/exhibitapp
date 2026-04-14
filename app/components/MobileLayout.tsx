'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const primary = '#0F6E56'

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
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      minHeight: '100dvh',
      backgroundColor: '#f5f5f5',
      fontFamily: "'DM Sans', sans-serif",
      position: 'relative',
      paddingBottom: '64px'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body { background: #e8e8e8; }
        input, textarea, select { font-family: 'DM Sans', sans-serif; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{ flex: 1 }}>
        {children}
      </div>

      {/* Bottom nav bar */}
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
        {NAV.map(item => {
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
                  <span style={{ fontSize: '20px', opacity: active ? 1 : 0.35 }}>{item.icon}</span>
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
