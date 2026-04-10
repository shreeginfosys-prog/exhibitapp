'use client'

import { useState, useRef } from 'react'

interface Props {
  onTranscript: (text: string) => void
  disabled?: boolean
}

export default function MicButton({ onTranscript, disabled }: Props) {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const primary = '#0F6E56'

  const startRecording = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
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
        await transcribe(blob, mr.mimeType)
      }
      mr.start(100)
      mediaRef.current = mr
      setRecording(true)
    } catch (e) {
      setError('Mic blocked')
    }
  }

  const stopRecording = () => {
    if (mediaRef.current && recording) {
      mediaRef.current.stop()
      setRecording(false)
      setProcessing(true)
    }
  }

  const transcribe = async (blob: Blob, mimeType?: string) => {
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

      const res = await fetch('/api/voice-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64, mimeType: mimeType || 'audio/webm', textOnly: true })
      })

      const data = await res.json()
      if (data.success && data.transcript) {
        onTranscript(data.transcript)
      } else {
        setError('Try again')
        setTimeout(() => setError(''), 3000)
      }
    } catch (e) {
      setError('Failed')
      setTimeout(() => setError(''), 3000)
    } finally {
      setProcessing(false)
    }
  }

  if (processing) {
    return (
      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
        ⏳
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <button
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onTouchStart={(e) => { e.preventDefault(); startRecording() }}
        onTouchEnd={(e) => { e.preventDefault(); stopRecording() }}
        disabled={disabled}
        title="Hold to record voice note"
        style={{
          width: '32px', height: '32px', borderRadius: '50%', border: 'none',
          backgroundColor: recording ? '#cc0000' : '#EAF3DE',
          color: recording ? 'white' : primary,
          fontSize: '14px', cursor: 'pointer', flexShrink: 0,
          boxShadow: recording ? '0 0 0 6px rgba(204,0,0,0.15)' : 'none',
          transition: 'all 0.2s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        {recording ? '⏹' : '🎤'}
      </button>
      {error && <div style={{ fontSize: '9px', color: '#cc0000', marginTop: '2px', whiteSpace: 'nowrap' }}>{error}</div>}
    </div>
  )
}
