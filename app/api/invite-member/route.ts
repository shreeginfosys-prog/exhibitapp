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

    const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        invited_by: ownerId,
        account_type: 'member',
        parent_user_id: ownerId
      },
      redirectTo: `${appUrl}/auth/callback?type=invite&owner=${ownerId}`
    })

    if (error) {
      console.error('Invite error:', error)
      return NextResponse.json({ success: false, error: error.message })
    }

    await supabase
      .from('team_members')
      .update({ status: 'invited' })
      .eq('owner_id', ownerId)
      .eq('member_email', email.toLowerCase())

    return NextResponse.json({ success: true })

  } catch (e: any) {
    console.error('Invite route error:', e)
    return NextResponse.json({ success: false, error: e.message })
  }
}
