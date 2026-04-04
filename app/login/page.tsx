'use client'

import { createClient } from '../../lib/supabase'

export default function LoginPage() {
  const supabase = createClient()

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center',
        width: '320px'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '8px', color: '#111' }}>
          ExhibitApp
        </h1>
        <p style={{ color: '#666', marginBottom: '32px', fontSize: '14px' }}>
          Smart lead capture for exhibitions
        </p>
        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            padding: '12px 20px',
            backgroundColor: '#4285F4',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}
        >
          Continue with Google
        </button>
      </div>
    </div>
  )
}