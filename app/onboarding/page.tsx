'use client'

import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Onboarding() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const selectType = async (type: 'exhibitor' | 'visitor') => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    await supabase.from('users').upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || '',
      photo: user.user_metadata?.avatar_url || '',
      type: type,
    })

    router.push('/dashboard')
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
        width: '340px'
      }}>
        <h1 style={{ fontSize: '22px', marginBottom: '8px', color: '#111' }}>
          How will you use ExhibitApp?
        </h1>
        <p style={{ color: '#666', marginBottom: '32px', fontSize: '14px' }}>
          Choose your role — you can only set this once
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => selectType('exhibitor')}
            disabled={loading}
            style={{
              padding: '16px',
              backgroundColor: '#111',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            I am an Exhibitor
            <div style={{ fontSize: '12px', fontWeight: '400', marginTop: '4px', opacity: 0.7 }}>
              I have a stall and collect visitor leads
            </div>
          </button>

          <button
            onClick={() => selectType('visitor')}
            disabled={loading}
            style={{
              padding: '16px',
              backgroundColor: '#4285F4',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            I am a Visitor
            <div style={{ fontSize: '12px', fontWeight: '400', marginTop: '4px', opacity: 0.7 }}>
              I visit exhibitions and collect exhibitor contacts
            </div>
          </button>
        </div>

        {loading && (
          <p style={{ marginTop: '20px', color: '#666', fontSize: '13px' }}>
            Saving your choice...
          </p>
        )}
      </div>
    </div>
  )
}