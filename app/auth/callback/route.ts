import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
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

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('type, onboarding_complete')
          .eq('id', user.id)
          .single()

        if (!profile) {
  // Check if this is an invited sub-user
  const ownerId = new URL(request.url).searchParams.get('owner')
  const inviteType = new URL(request.url).searchParams.get('type')

  if (inviteType === 'invite' && ownerId) {
    // Create sub-user profile linked to owner
    await supabase.from('users').insert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
      photo: user.user_metadata?.avatar_url || '',
      account_type: 'member',
      parent_user_id: ownerId,
      onboarding_complete: true
    })

    // Link team_member record with this user's ID
    await supabase
      .from('team_members')
      .update({ member_user_id: user.id, status: 'active' })
      .eq('owner_id', ownerId)
      .eq('member_email', user.email?.toLowerCase())

    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // Normal new user
  await supabase.from('users').insert({
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || '',
    photo: user.user_metadata?.avatar_url || '',
  })
  return NextResponse.redirect(`${origin}/profile`)
}

        if (!profile.onboarding_complete) {
          return NextResponse.redirect(`${origin}/profile`)
        }

        return NextResponse.redirect(`${origin}/dashboard`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}