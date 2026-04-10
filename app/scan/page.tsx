'use client'

import { Suspense } from 'react'
import ScanPageContent from './ScanContent'

export default function ScanPage() {
  return (
    <Suspense fallback={<div style={{padding:'24px',textAlign:'center',color:'#999',fontFamily:'sans-serif'}}>Loading...</div>}>
      <ScanPageContent />
    </Suspense>
  )
}
