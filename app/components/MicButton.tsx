'use client'

import { useRef, useState } from 'react'

interface MicButtonProps {
  onTranscript: (text: string) => void
  size?: number
}

export default function MicButton({ onTranscript, size = 40 }: MicButtonProps) {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const primary = '#0F6E56'

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setProcessing(true)

        // Try browser SpeechRecognition first (free, instant on mobile)
        // If not available, use Gemini API
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })

        try {
          const reader = new FileReader()
          reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1]
            const res = await fetch('/api/voice-followup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64, textOnly: false })
            })
            const data = await res.json()
            if (data.success && data.transcript) {
              onTranscript(data.transcript)
            }
            setProcessing(false)
          }
          reader.readAsDataURL(blob)
        } catch (e) {
          console.error('Transcription error:', e)
          setProcessing(false)
        }
      }

      recorder.start()
      setRecording(true)
    } catch (e) {
      alert('Microphone access denied. Please allow microphone access in browser settings.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  const handlePress = () => {
    if (recording) stopRecording()
    else startRecording()
  }

  const bgColor = recording ? '#E53E3E' : processing ? '#BA7517' : primary
  const icon = recording ? '⏹' : processing ? '⏳' : '🎤'
  const title = recording ? 'Tap to stop recording' : processing ? 'Processing...' : 'Tap to record voice note'

  return (
    <button
      onMouseDown={startRecording}
      onMouseUp={stopRecording}
      onMouseLeave={recording ? stopRecording : undefined}
      onTouchStart={(e) => { e.preventDefault(); startRecording() }}
      onTouchEnd={(e) => { e.preventDefault(); stopRecording() }}
      onClick={undefined}
      disabled={processing}
      title={title}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: bgColor,
        border: 'none',
        cursor: processing ? 'wait' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${size * 0.45}px`,
        flexShrink: 0,
        boxShadow: recording ? '0 0 0 4px rgba(229,62,62,0.25)' : 'none',
        transition: 'all 0.15s ease',
      }}
    >
      {icon}
    </button>
  )
}
