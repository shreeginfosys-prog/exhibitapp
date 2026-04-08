'use client'

import { useState } from 'react'
import { createClient } from '../../lib/supabase'

export default function TemplateEditor({ userId, currentTemplate }: { userId: string, currentTemplate: string }) {
  const supabase = createClient()
  const defaultTemplate = 'Hi, it was great meeting you at the exhibition! I would love to stay in touch and explore how we can work together.'
  const [template, setTemplate] = useState(currentTemplate || defaultTemplate)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    await supabase.from('users').update({ whatsapp_template: template }).eq('id', userId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{backgroundColor:'white',border:'1px solid #eee',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
        <div>
          <div style={{fontSize:'15px',fontWeight:'500',color:'#111'}}>WhatsApp Message Template</div>
          <div style={{fontSize:'12px',color:'#999',marginTop:'2px'}}>This message opens when you tap 💬 on any contact</div>
        </div>
        <span style={{fontSize:'20px'}}>💬</span>
      </div>

      <textarea
        value={template}
        onChange={(e) => { setTemplate(e.target.value); setSaved(false) }}
        placeholder="Type your WhatsApp follow-up message..."
        style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px',resize:'vertical',minHeight:'100px',fontFamily:'sans-serif',boxSizing:'border-box',lineHeight:'1.5'}}
      />

      <div style={{fontSize:'11px',color:'#999',marginTop:'4px',marginBottom:'12px'}}>
        {template.length} characters
      </div>

      <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
        <button onClick={handleSave} disabled={saving} style={{padding:'10px 20px',backgroundColor:saved?'#1D9E75':'#111',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',cursor:saving?'not-allowed':'pointer',fontWeight:'500'}}>
          {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Template'}
        </button>

        <a href={'https://wa.me/919999999999?text='+encodeURIComponent(template)} target="_blank" rel="noreferrer" style={{padding:'10px 20px',backgroundColor:'#E1F5EE',color:'#0F6E56',borderRadius:'8px',fontSize:'13px',textDecoration:'none',fontWeight:'500'}}>
          Preview on WhatsApp
        </a>

        <button onClick={() => { setTemplate(defaultTemplate); setSaved(false) }} style={{padding:'10px 20px',backgroundColor:'#f5f5f5',color:'#666',border:'none',borderRadius:'8px',fontSize:'13px',cursor:'pointer'}}>
          Reset
        </button>
      </div>
    </div>
  )
}
