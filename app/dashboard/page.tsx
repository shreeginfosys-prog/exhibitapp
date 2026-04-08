import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardClient from '../components/DashboardClient'

export default async function Dashboard() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (!profile || !profile.type) redirect('/onboarding')

  const { data: scans } = await supabase
    .from('scans')
    .select('id, tag, created_at, company, city, industry')
    .eq('scanner_id', user.id)
    .order('created_at', { ascending: false })

  const { data: contacts } = await supabase
    .from('contacts')
    .select('id')
    .eq('scanner_id', user.id)

  const totalScans = scans?.length || 0
  const totalContacts = contacts?.length || 0
  const hotLeads = scans?.filter(s => s.tag === 'Hot' || s.tag === 'High').length || 0
  const recentScans = scans?.slice(0, 5) || []

  return (
    <DashboardClient
      profile={profile}
      userId={user.id}
      totalScans={totalScans}
      totalContacts={totalContacts}
      hotLeads={hotLeads}
      recentScans={recentScans}
    />
  )
}
