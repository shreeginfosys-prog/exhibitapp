import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { image, userId } = await request.json()
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

    const buffer = Buffer.from(image, 'base64')
    const fileName = userId + '/' + Date.now() + '.jpg'

    const { error } = await supabase.storage
      .from('cards')
      .upload(fileName, buffer, { contentType: 'image/jpeg' })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const { data } = supabase.storage.from('cards').getPublicUrl(fileName)
    return NextResponse.json({ success: true, url: data.publicUrl })

  } catch (error) {
    return NextResponse.json({ error: 'Upload failed: ' + error }, { status: 500 })
  }
}
