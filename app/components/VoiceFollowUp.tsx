'use client'

import { useState, useRef } from 'react'
import { createClient } from '../../lib/supabase'

const primary = '#0F6E56'

const actionIcons: Record<string, string> = {
  call: '📞', whatsapp: '💬', email: '✉️',
  meeting: '🤝', send_quote: '📄', follow_up: '🔔'
}

const actionLabels: Record<string, string> = {
  call: 'Call', whatsapp: 'WhatsApp', email: 'Email',
  meeting: 'Meeting', send_quote: 'Send Quote', follow_up: 'Follow Up'
}

interface Props {
  scanId: string
  contactName?: string
  company?: string
  onSaved?: () => void
}

export default function VoiceFollowUp({ scanId, contactName, company, onSaved }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'voice' | 'manual'>('voice')
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState('')
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Extracted / manual fields
  const [action, setAction] = useState('call')
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [confidence, setConfidence] = useState('')

  const tomorrow = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }

  const startRecording = async () => {
  setError('')
  setTranscript('')
  setNote('')
  setDueDate('')
  setConfidence('')
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    
    // Pick best supported format
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : ''

    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {})
    chunksRef.current = []
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = async () => {
  stream.getTracks().forEach(t => t.stop())
  const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
  await processAudio(blob, mr.mimeType)
}
    mr.start(100) // collect data every 100ms
    mediaRef.current = mr
    setRecording(true)
  } catch (e) {
    setError('Microphone permission denied. Please allow microphone access and try again.')
  }
}

  const stopRecording = () => {
    mediaRef.current?.stop()
    setRecording(false)
    setProcessing(true)
  }

  const processAudio = async (blob: Blob, mimeType?: string) => {
  try {
    // Convert blob to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data:audio/webm;base64, prefix
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

    const res = await fetch('/api/voice-followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: base64, mimeType: mimeType || blob.type || 'audio/webm' })
    })

    const data = await res.json()
    if (data.success) {
      setTranscript(data.transcript)
      setAction(data.action || 'call')
      setDueDate(data.due_date || tomorrow())
      setNote(data.note || data.transcript)
      setConfidence(data.confidence || 'medium')
    } else {
      setError(data.error || 'Could not process voice')
      setDueDate(tomorrow())
    }
  } catch (e) {
    setError('Processing failed. Please try manual entry.')
    setDueDate(tomorrow())
  } finally {
    setProcessing(false)
  }
}

  const handleSave = async () => {
    if (!dueDate) { setError('Please select a date'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    await supabase.from('follow_ups').insert({
      scan_id: scanId,
      user_id: user.id,
      contact_name: contactName || '',
      company: company || '',
      action,
      due_date: dueDate,
      note,
      voice_transcript: transcript,
      status: 'pending'
    })

    setSaved(true)
    setSaving(false)
    setTimeout(() => {
      setOpen(false)
      setSaved(false)
      setTranscript('')
      setNote('')
      setDueDate('')
      setMode('voice')
      onSaved?.()
    }, 1500)
  }

  const reset = () => {
    setTranscript(''); setNote(''); setDueDate('')
    setAction('call'); setConfidence(''); setError('')
    setRecording(false); setProcessing(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#EAF3DE', color: primary, border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
        🔔 Add Follow-up
      </button>
    )
  }

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginTop: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#111' }}>🔔 Add Follow-up</div>
        <button onClick={() => { setOpen(false); reset() }} style={{ background: 'none', border: 'none', color: '#999', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', backgroundColor: '#f5f5f5', borderRadius: '8px', padding: '2px', marginBottom: '14px' }}>
        <button onClick={() => { setMode('voice'); reset() }} style={{ flex: 1, padding: '7px', borderRadius: '6px', border: 'none', backgroundColor: mode === 'voice' ? 'white' : 'transparent', color: mode === 'voice' ? primary : '#666', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          🎤 Voice
        </button>
        <button onClick={() => { setMode('manual'); reset() }} style={{ flex: 1, padding: '7px', borderRadius: '6px', border: 'none', backgroundColor: mode === 'manual' ? 'white' : 'transparent', color: mode === 'manual' ? primary : '#666', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          ✏️ Manual
        </button>
      </div>

      {/* VOICE MODE */}
      {mode === 'voice' && !transcript && !processing && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '16px', lineHeight: '1.5' }}>
            Press and speak your follow-up in Hindi or English<br />
            <span style={{ color: '#bbb' }}>"Isko kal call karna hai, quotation bhejna hai"</span>
          </div>
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            style={{
              width: '80px', height: '80px', borderRadius: '50%', border: 'none',
              backgroundColor: recording ? '#cc0000' : primary,
              color: 'white', fontSize: '28px', cursor: 'pointer',
              boxShadow: recording ? '0 0 0 12px rgba(204,0,0,0.15)' : '0 4px 16px rgba(15,110,86,0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            {recording ? '⏹' : '🎤'}
          </button>
          <div style={{ fontSize: '12px', color: recording ? '#cc0000' : '#999', marginTop: '10px', fontWeight: recording ? '500' : '400' }}>
            {recording ? '● Recording... release to stop' : 'Hold to record'}
          </div>
        </div>
      )}

      {processing && (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🤖</div>
          <div style={{ fontSize: '13px', color: '#666' }}>AI is extracting follow-up details...</div>
        </div>
      )}

      {error && (
        <div style={{ padding: '10px', backgroundColor: '#fff0f0', borderRadius: '8px', color: '#cc0000', fontSize: '12px', marginBottom: '12px' }}>
          {error}
          <button onClick={() => setMode('manual')} style={{ display: 'block', marginTop: '6px', color: primary, background: 'none', border: 'none', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
            Switch to manual entry →
          </button>
        </div>
      )}

      {/* RESULT / MANUAL FORM */}
      {(transcript || mode === 'manual') && !processing && (
        <div>
          {transcript && (
            <div style={{ padding: '8px 10px', backgroundColor: '#f9f9f9', borderRadius: '8px', fontSize: '12px', color: '#666', fontStyle: 'italic', marginBottom: '14px', borderLeft: '3px solid #ddd' }}>
              🎤 "{transcript}"
            </div>
          )}

          {confidence && (
            <div style={{ fontSize: '11px', color: confidence === 'high' ? primary : confidence === 'medium' ? '#BA7517' : '#999', marginBottom: '12px', fontWeight: '500' }}>
              {confidence === 'high' ? '✓ AI extracted with high confidence' : confidence === 'medium' ? '~ AI extracted — please verify' : '⚠ Low confidence — please check and edit'}
            </div>
          )}

          {/* Action */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: '#666', marginBottom: '6px' }}>ACTION</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {Object.keys(actionLabels).map(a => (
                <button key={a} onClick={() => setAction(a)} style={{ padding: '5px 12px', borderRadius: '20px', border: action === a ? '2px solid ' + primary : '1px solid #eee', backgroundColor: action === a ? '#EAF3DE' : 'white', color: action === a ? primary : '#666', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                  {actionIcons[a]} {actionLabels[a]}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: '#666', marginBottom: '6px' }}>FOLLOW-UP DATE</div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
              {[
                { label: 'Tomorrow', days: 1 },
                { label: '3 days', days: 3 },
                { label: '1 week', days: 7 },
                { label: '2 weeks', days: 14 },
              ].map(opt => {
                const d = new Date()
                d.setDate(d.getDate() + opt.days)
                const val = d.toISOString().split('T')[0]
                return (
                  <button key={opt.label} onClick={() => setDueDate(val)} style={{ padding: '5px 10px', borderRadius: '16px', border: dueDate === val ? '2px solid ' + primary : '1px solid #eee', backgroundColor: dueDate === val ? '#EAF3DE' : 'white', color: dueDate === val ? primary : '#666', fontSize: '12px', cursor: 'pointer' }}>
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} min={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', fontFamily: 'sans-serif', boxSizing: 'border-box' }} />
          </div>

          {/* Note */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: '#666', marginBottom: '6px' }}>NOTE</div>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="What needs to happen?" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', resize: 'none', minHeight: '70px', fontFamily: 'sans-serif', boxSizing: 'border-box' }} />
          </div>

          {mode === 'voice' && (
            <button onClick={reset} style={{ width: '100%', padding: '8px', backgroundColor: '#f5f5f5', color: '#666', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', marginBottom: '8px' }}>
              🎤 Record again
            </button>
          )}

          {saved ? (
            <div style={{ padding: '12px', backgroundColor: '#EAF3DE', borderRadius: '8px', color: primary, fontSize: '14px', textAlign: 'center', fontWeight: '500' }}>
              ✓ Follow-up saved!
            </div>
          ) : (
            <button onClick={handleSave} disabled={saving || !dueDate} style={{ width: '100%', padding: '12px', backgroundColor: !dueDate || saving ? '#ccc' : primary, color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: !dueDate || saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : `Save Follow-up — ${actionLabels[action] || 'Follow Up'}`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
