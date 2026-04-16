import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
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
        // Use service role for admin operations
        const adminSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: profile } = await supabase
          .from('users')
          .select('account_type, onboarding_complete, parent_user_id')
          .eq('id', user.id)
          .single()

        if (!profile) {
          // New user — check if invited as sub-user via team_members
          const { data: teamMember } = await adminSupabase
            .from('team_members')
            .select('owner_id')
            .eq('member_email', user.email?.toLowerCase() || '')
            .in('status', ['active', 'invited', 'pending'])
            .single()

          const ownerId = searchParams.get('owner') || teamMember?.owner_id || null
          const isInvite = searchParams.get('type') === 'invite' || !!teamMember

          if (isInvite && ownerId) {
            // Create sub-user profile linked to owner
            await adminSupabase.from('users').insert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
              photo: user.user_metadata?.avatar_url || '',
              account_type: 'member',
              parent_user_id: ownerId,
              onboarding_complete: true
            })

            // Link team_member record
            await adminSupabase
              .from('team_members')
              .update({ member_user_id: user.id, status: 'active' })
              .eq('owner_id', ownerId)
              .eq('member_email', user.email?.toLowerCase())

            return NextResponse.redirect(`${origin}/dashboard`)
          }

          // Normal new user — go to profile setup
          await supabase.from('users').insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || '',
            photo: user.user_metadata?.avatar_url || '',
          })
          return NextResponse.redirect(`${origin}/profile`)
        }

        // Existing user — check if they need to be linked as sub-user
        if (!profile.parent_user_id) {
          const { data: teamMember } = await adminSupabase
            .from('team_members')
            .select('owner_id')
            .eq('member_email', user.email?.toLowerCase() || '')
            .in('status', ['active', 'invited', 'pending'])
            .not('owner_id', 'is', null)
            .single()

          if (teamMember?.owner_id) {
            // Auto-link this user as sub-user
            await adminSupabase.from('users').update({
              account_type: 'member',
              parent_user_id: teamMember.owner_id,
              onboarding_complete: true
            }).eq('id', user.id)

            await adminSupabase
              .from('team_members')
              .update({ member_user_id: user.id, status: 'active' })
              .eq('owner_id', teamMember.owner_id)
              .eq('member_email', user.email?.toLowerCase())

            return NextResponse.redirect(`${origin}/dashboard`)
          }
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
