import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function Dashboard() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.type) redirect('/onboarding')

  const isExhibitor = profile.type === 'exhibitor'

  return (
    <div style={{
      padding: '32px',
      fontFamily: 'sans-serif',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '32px'
      }}>
        {profile.photo && (
          <img
            src={profile.photo}
            alt="profile"
            style={{ width: '44px', height: '44px', borderRadius: '50%' }}
          />
        )}
        <div>
          <div style={{ fontWeight: '500', fontSize: '16px', color: '#111' }}>
            {profile.name || user.email}
          </div>
          <div style={{
            fontSize: '12px',
            color: isExhibitor ? '#111' : '#4285F4',
            backgroundColor: isExhibitor ? '#f0f0f0' : '#e8f0fe',
            padding: '2px 8px',
            borderRadius: '4px',
            display: 'inline-block',
            marginTop: '4px'
          }}>
            {isExhibitor ? 'Exhibitor' : 'Visitor'}
          </div>
        </div>
      </div>

      {isExhibitor ? (
        <div>
          <h2 style={{ fontSize: '20px', color: '#111', marginBottom: '16px' }}>
            Exhibitor Dashboard
          </h2>
          <div style={{
            padding: '24px',
            backgroundColor: '#f9f9f9',
            borderRadius: '12px',
            textAlign: 'center',
            color: '#666',
            fontSize: '14px'
          }}>
            Scan visitor cards, manage leads, send WhatsApp — coming next!
          </div>
        </div>
      ) : (
        <div>
          <h2 style={{ fontSize: '20px', color: '#111', marginBottom: '16px' }}>
            Visitor Dashboard
          </h2>
          <div style={{
            padding: '24px',
            backgroundColor: '#f9f9f9',
            borderRadius: '12px',
            textAlign: 'center',
            color: '#666',
            fontSize: '14px'
          }}>
            Scan exhibitor cards, add notes, mark interest — coming next!
          </div>
        </div>
      )}
    </div>
  )
}