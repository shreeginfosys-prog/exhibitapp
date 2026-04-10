'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const primary = '#0F6E56'

const actionIcons: Record<string, string> = {
  call: '📞', whatsapp: '💬', email: '✉️',
  meeting: '🤝', send_quote: '📄', follow_up: '🔔'
}

const actionLabels: Record<string, string> = {
  call: 'Call', whatsapp: 'WhatsApp', email: 'Email',
  meeting: 'Meeting', send_quote: 'Send Quote', follow_up: 'Follow Up'
}

export default function FollowUpsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [followups, setFollowups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'done'>('today')

  useEffect(() => { load() }, [filter])

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const today = new Date().toISOString().split('T')[0]

    let query = supabase.from('follow_ups').select('*').eq('user_id', user.id).order('due_date', { ascending: true })

    if (filter === 'today') query = query.lte('due_date', today).eq('status', 'pending')
    else if (filter === 'upcoming') query = query.gt('due_date', today).eq('status', 'pending')
    else query = query.eq('status', 'done')

    const { data } = await query
    setFollowups(data || [])
    setLoading(false)
  }

  const markDone = async (id: string) => {
    await supabase.from('follow_ups').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id)
    setFollowups(prev => prev.filter(f => f.id !== id))
  }

  const snooze = async (id: string, days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    await supabase.from('follow_ups').update({
      snoozed_until: d.toISOString().split('T')[0],
      due_date: d.toISOString().split('T')[0]
    }).eq('id', id)
    setFollowups(prev => prev.filter(f => f.id !== id))
  }

  const today = new Date().toISOString().split('T')[0]
  const overdueCount = followups.filter(f => f.due_date < today).length

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    const todayD = new Date()
    todayD.setHours(0, 0, 0, 0)
    const diff = Math.round((d.getTime() - todayD.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) > 1 ? 's' : ''} overdue`
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  const isOverdue = (dateStr: string) => dateStr < today

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '80px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>

      <div style={{ backgroundColor: primary, padding: '16px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '14px', cursor: 'pointer', padding: 0 }}>← Back</button>
          <div style={{ fontSize: '18px', fontWeight: '500', color: 'white' }}>Follow-ups</div>
        </div>

        <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '3px' }}>
          {[
            { key: 'today', label: `Due${overdueCount > 0 && filter === 'today' ? ` (${overdueCount} late)` : ''}` },
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'done', label: 'Done' }
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as any)} style={{ flex: 1, padding: '7px', borderRadius: '9px', border: 'none', backgroundColor: filter === f.key ? 'white' : 'transparent', color: filter === f.key ? primary : 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading...</div>
        ) : followups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {filter === 'today' ? '🎉' : filter === 'upcoming' ? '📅' : '✅'}
            </div>
            <div style={{ fontSize: '16px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>
              {filter === 'today' ? 'All caught up!' : filter === 'upcoming' ? 'No upcoming follow-ups' : 'No completed follow-ups'}
            </div>
            <div style={{ fontSize: '13px' }}>
              {filter === 'today' ? 'No follow-ups due today' : 'Add follow-ups from contact notes'}
            </div>
          </div>
        ) : followups.map(f => (
          <div key={f.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', marginBottom: '10px', border: isOverdue(f.due_date) && filter === 'today' ? '2px solid #FFCCCC' : '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                  <span style={{ fontSize: '18px' }}>{actionIcons[f.action] || '🔔'}</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#111' }}>{f.company || 'Contact'}</span>
                </div>
                {f.contact_name && <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>👤 {f.contact_name}</div>}
                <div style={{ fontSize: '12px', color: isOverdue(f.due_date) && filter !== 'done' ? '#cc0000' : primary, fontWeight: '500' }}>
                  {actionLabels[f.action] || 'Follow up'} · {formatDate(f.due_date)}
                </div>
              </div>
              {filter !== 'done' && (
                <button onClick={() => markDone(f.id)} style={{ padding: '6px 12px', backgroundColor: '#EAF3DE', color: primary, border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', flexShrink: 0 }}>
                  ✓ Done
                </button>
              )}
            </div>

            {f.note && (
              <div style={{ padding: '8px 10px', backgroundColor: '#fafafa', borderRadius: '8px', fontSize: '13px', color: '#444', borderLeft: '3px solid ' + primary, marginBottom: '10px' }}>
                {f.note}
              </div>
            )}

            {f.voice_transcript && f.voice_transcript !== f.note && (
              <div style={{ fontSize: '11px', color: '#bbb', fontStyle: 'italic', marginBottom: '10px' }}>
                🎤 "{f.voice_transcript}"
              </div>
            )}

            {filter !== 'done' && (
              <div style={{ display: 'flex', gap: '6px' }}>
                {f.action === 'call' && f.contact_name && (
                  <button style={{ flex: 1, padding: '8px', backgroundColor: '#EAF3DE', color: primary, border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                    📞 Call now
                  </button>
                )}
                {f.action === 'whatsapp' && (
                  <button style={{ flex: 1, padding: '8px', backgroundColor: '#E7F7EE', color: '#128C7E', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                    �� WhatsApp
                  </button>
                )}
                <button onClick={() => snooze(f.id, 1)} style={{ padding: '8px 12px', backgroundColor: '#f5f5f5', color: '#666', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  +1 day
                </button>
                <button onClick={() => snooze(f.id, 3)} style={{ padding: '8px 12px', backgroundColor: '#f5f5f5', color: '#666', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  +3 days
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
