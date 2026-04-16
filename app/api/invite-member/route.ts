import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { email, ownerId } = await req.json()
    if (!email || !ownerId) return NextResponse.json({ success: false, error: 'Missing fields' })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://exhibitapp.vercel.app'

    // Check if user already exists in auth
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const existingUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (existingUser) {
      // User exists — update their profile to link to owner
      await supabase.from('users').upsert({
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.user_metadata?.full_name || existingUser.email?.split('@')[0] || '',
        photo: existingUser.user_metadata?.avatar_url || '',
        account_type: 'member',
        parent_user_id: ownerId,
        onboarding_complete: true
      }, { onConflict: 'id' })

      await supabase
        .from('team_members')
        .update({ member_user_id: existingUser.id, status: 'active' })
        .eq('owner_id', ownerId)
        .eq('member_email', email.toLowerCase())

      // Send magic link to let them log in
      const { error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: `${appUrl}/auth/callback?type=invite&owner=${ownerId}`
        }
      })

      if (linkError) {
        console.error('Magic link error:', linkError)
        // Still success — account is linked, just email failed
        return NextResponse.json({ success: true, note: 'Account linked. Email could not be sent — ask member to log in manually.' })
      }

      return NextResponse.json({ success: true })

    } else {
      // New user — create them first then send invite
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: false,
        user_metadata: {
          invited_by: ownerId,
          account_type: 'member'
        }
      })

      if (createError || !newUser?.user) {
        console.error('Create user error:', createError)
        return NextResponse.json({ success: false, error: createError?.message || 'Could not create user' })
      }

      // Create their profile
      await supabase.from('users').insert({
        id: newUser.user.id,
        email: email,
        name: email.split('@')[0],
        photo: '',
        account_type: 'member',
        parent_user_id: ownerId,
        onboarding_complete: true
      })

      // Link team member
      await supabase
        .from('team_members')
        .update({ member_user_id: newUser.user.id, status: 'active' })
        .eq('owner_id', ownerId)
        .eq('member_email', email.toLowerCase())

      // Send magic link to let them log in
      const { error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: `${appUrl}/auth/callback?type=invite&owner=${ownerId}`
        }
      })

      if (linkError) {
        console.error('Magic link error after create:', linkError)
        return NextResponse.json({ success: true, note: 'Account created. Email could not be sent — ask member to log in at ' + appUrl })
      }

      return NextResponse.json({ success: true })
    }

  } catch (e: any) {
    console.error('Invite route error:', e)
    return NextResponse.json({ success: false, error: e.message })
  }
}