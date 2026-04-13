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
  const recognitionRef = useRef<any>(null)
  const primary = '#0F6E56'

  // Check if browser supports Web Speech API
  const hasSpeechAPI = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const startBrowserSpeech = () => {
    setError('')
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'hi-IN' // Hindi + English
    recognition.maxAlternatives = 1

    recognition.onstart = () => setRecording(true)
    recognition.onend = () => { setRecording(false); setProcessing(false) }
    recognition.onerror = (e: any) => {
      setRecording(false)
      setProcessing(false)
      if (e.error === 'no-speech') setError('No speech detected')
      else if (e.error === 'not-allowed') setError('Mic blocked')
      else setError('Try again')
      setTimeout(() => setError(''), 3000)
    }
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript
      if (text) onTranscript(text)
    }

    recognition.start()
    recognitionRef.current = recognition
  }

  const stopBrowserSpeech = () => {
    recognitionRef.current?.stop()
    setRecording(false)
  }

  const startWhisper = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm'

      const mr = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mr.mimeType })
        await transcribeWhisper(blob, mr.mimeType)
      }
      mr.start(100)
      mediaRef.current = mr
      setRecording(true)
    } catch (e: any) {
      if (e.name === 'NotAllowedError') setError('Allow mic in browser settings')
      else setError('Mic not available')
      setTimeout(() => setError(''), 4000)
    }
  }

  const stopWhisper = () => {
    if (mediaRef.current && recording) {
      mediaRef.current.stop()
      setRecording(false)
      setProcessing(true)
    }
  }

  const transcribeWhisper = async (blob: Blob, mimeType: string) => {
    try {
      console.log('Blob size:', blob.size, 'type:', blob.type, 'mimeType:', mimeType)
      
      if (blob.size < 500) {
        setError('Too short — hold and speak')
        setTimeout(() => setError(''), 3000)
        setProcessing(false)
        return
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

      console.log('Base64 length:', base64.length)

      const res = await fetch('/api/voice-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64, mimeType: mimeType || blob.type || 'audio/webm', textOnly: true })
      })

      const data = await res.json()
      console.log('API response:', data)
      
      if (data.success && data.transcript) {
        onTranscript(data.transcript)
      } else {
        setError(data.error || 'Try again')
        setTimeout(() => setError(''), 3000)
      }
    } catch (e: any) {
      console.error('Transcribe error:', e)
      setError('Failed — try again')
      setTimeout(() => setError(''), 3000)
    } finally {
      setProcessing(false)
    }
  }

  // Use browser speech API on mobile (faster, no API cost)
  // Use Whisper on desktop (more accurate)
  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const useBrowserSpeech = isMobile && hasSpeechAPI

  const handleStart = () => {
    if (useBrowserSpeech) startBrowserSpeech()
    else startWhisper()
  }

  const handleStop = () => {
    if (useBrowserSpeech) stopBrowserSpeech()
    else stopWhisper()
  }

  if (processing) {
    return (
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
        ⏳
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <button
        onMouseDown={!isMobile ? handleStart : undefined}
        onMouseUp={!isMobile ? handleStop : undefined}
        onClick={isMobile ? (recording ? handleStop : handleStart) : undefined}
        onTouchStart={isMobile ? (e) => { e.preventDefault(); handleStart() } : undefined}
        onTouchEnd={isMobile ? (e) => { e.preventDefault(); handleStop() } : undefined}
        disabled={disabled}
        title={isMobile ? 'Tap to record' : 'Hold to record'}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: recording ? '#cc0000' : '#EAF3DE',
          color: recording ? 'white' : primary,
          fontSize: '16px',
          cursor: 'pointer',
          flexShrink: 0,
          boxShadow: recording ? '0 0 0 8px rgba(204,0,0,0.15)' : 'none',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {recording ? '⏹' : '🎤'}
      </button>
      {error && (
        <div style={{ fontSize: '9px', color: '#cc0000', marginTop: '3px', whiteSpace: 'nowrap', maxWidth: '60px', textAlign: 'center' }}>
          {error}
        </div>
      )}
      {!error && (
        <div style={{ fontSize: '9px', color: '#bbb', marginTop: '3px' }}>
          {isMobile ? 'tap' : 'hold'}
        </div>
      )}
    </div>
  )
}