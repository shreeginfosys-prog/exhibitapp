'use client'

import { useRef, useState } from 'react'

interface MicButtonProps {
  onTranscript: (text: string) => void
  size?: number
}

export default function MicButton({ onTranscript, size = 44 }: MicButtonProps) {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const primary = '#0F6E56'

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setProcessing(true)

        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          const reader = new FileReader()
          reader.onload = async () => {
            try {
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
            } catch (e) {
              console.error('Transcription error:', e)
            } finally {
              setProcessing(false)
            }
          }
          reader.readAsDataURL(blob)
        } catch (e) {
          console.error('Recording error:', e)
          setProcessing(false)
        }
      }

      recorder.start()
      setRecording(true)
    } catch (e) {
      alert('Microphone access denied. Please allow microphone in browser settings.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  const handleTap = () => {
    if (processing) return
    if (recording) stopRecording()
    else startRecording()
  }

  const bgColor = recording ? '#E53E3E' : processing ? '#BA7517' : primary
  const icon = recording ? '⏹' : processing ? '⏳' : '🎤'

  return (
    <button
      onClick={handleTap}
      disabled={processing}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        borderRadius: '50%',
        backgroundColor: bgColor,
        border: 'none',
        cursor: processing ? 'wait' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${size * 0.42}px`,
        flexShrink: 0,
        boxShadow: recording
          ? '0 0 0 6px rgba(229,62,62,0.2), 0 2px 8px rgba(229,62,62,0.4)'
          : '0 2px 8px rgba(15,110,86,0.3)',
        transition: 'all 0.2s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {icon}
    </button>
  )
}
