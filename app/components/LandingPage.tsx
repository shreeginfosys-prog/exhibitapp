'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function LandingPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const features = [
    { icon: '📷', title: 'Scan any card instantly', desc: 'AI reads the card — name, phone, company, city. All extracted in seconds.' },
    { icon: '🔥', title: 'Hot / Warm / Cold leads', desc: 'Tag every contact the moment you scan. Never lose track of a promising lead.' },
    { icon: '💬', title: 'WhatsApp in one tap', desc: 'Send your follow-up message instantly. No typing numbers manually.' },
    { icon: '📊', title: 'Exhibition ROI dashboard', desc: 'See exactly how many leads, deals and revenue each exhibition brought.' },
    { icon: '🔄', title: 'Lead journey log', desc: 'Track every conversation. Who said what, when, and what changed.' },
    { icon: '👥', title: 'Team scanning', desc: 'Your whole team scans under one account. All data in one place.' },
  ]

  const testimonials = [
    { name: 'Rajesh Gupta', company: 'Gupta Plastics, Delhi', text: 'Scanned 200 cards at Plastindia. Found 12 hot leads. Closed 3 deals worth ₹4.5 lakh in the first month.' },
    { name: 'Priya Sharma', company: 'Sharma Textiles, Surat', text: 'Used to lose half my cards after exhibitions. Now everything is organised. My follow-up rate went from 20% to 80%.' },
    { name: 'Amit Joshi', company: 'Joshi Hardware, Mumbai', text: 'The WhatsApp button alone saved me 2 hours at every show. Sent 150 messages in 20 minutes.' },
  ]

  return (
    <div style={{fontFamily:"'DM Sans', 'Segoe UI', sans-serif",backgroundColor:'#FAFAF8',minHeight:'100vh',overflowX:'hidden'}}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .hero-title { font-family: 'Fraunces', serif; }
        .fade-up { animation: fadeUp 0.6s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.4s; }
        .cta-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(15,110,86,0.3); }
        .cta-btn { transition: all 0.2s ease; }
        .feature-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
        .feature-card { transition: all 0.2s ease; }
        @media (max-width: 640px) {
          .hero-title { font-size: 36px !important; }
          .hero-sub { font-size: 16px !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .testimonials-grid { grid-template-columns: 1fr !important; }
          .nav-cta { display: none !important; }
        }
      `}</style>

      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,backgroundColor:scrolled?'rgba(250,250,248,0.95)':'transparent',backdropFilter:scrolled?'blur(10px)':'none',borderBottom:scrolled?'1px solid #eee':'none',transition:'all 0.3s ease',padding:'16px 24px'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <div style={{width:'32px',height:'32px',backgroundColor:'#0F6E56',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>📇</div>
            <span style={{fontSize:'16px',fontWeight:'600',color:'#111'}}>ExhibitApp</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <button className="nav-cta" onClick={()=>router.push('/login')} style={{padding:'8px 16px',backgroundColor:'transparent',color:'#0F6E56',border:'1px solid #0F6E56',borderRadius:'8px',fontSize:'14px',fontWeight:'500',cursor:'pointer'}}>
              Sign in
            </button>
            <button onClick={()=>router.push('/login')} style={{padding:'8px 20px',backgroundColor:'#0F6E56',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:'500',cursor:'pointer'}}>
              Get started
            </button>
          </div>
        </div>
      </nav>

      <section style={{paddingTop:'120px',paddingBottom:'80px',paddingLeft:'24px',paddingRight:'24px',textAlign:'center',background:'linear-gradient(180deg, #E8F5F0 0%, #FAFAF8 100%)'}}>
        <div style={{maxWidth:'760px',margin:'0 auto'}}>
          <div className="fade-up" style={{display:'inline-flex',alignItems:'center',gap:'6px',backgroundColor:'white',border:'1px solid #C0DD97',borderRadius:'20px',padding:'6px 14px',fontSize:'13px',color:'#27500A',fontWeight:'500',marginBottom:'24px'}}>
            <span>🇮🇳</span> Built for Indian exhibition market
          </div>
          <h1 className="hero-title fade-up delay-1" style={{fontSize:'52px',fontWeight:'700',color:'#111',lineHeight:'1.1',marginBottom:'20px',letterSpacing:'-0.5px'}}>
            Turn exhibition<br/>cards into <span style={{color:'#0F6E56',fontStyle:'italic'}}>closed deals</span>
          </h1>
          <p className="hero-sub fade-up delay-2" style={{fontSize:'18px',color:'#555',lineHeight:'1.6',marginBottom:'32px',fontWeight:'300'}}>
            Scan business cards instantly. Tag leads as Hot, Warm or Cold. Follow up on WhatsApp in one tap. Track every deal from exhibition to revenue.
          </p>
          <div className="fade-up delay-3" style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
            <button className="cta-btn" onClick={()=>router.push('/login')} style={{padding:'14px 32px',backgroundColor:'#0F6E56',color:'white',border:'none',borderRadius:'10px',fontSize:'16px',fontWeight:'500',cursor:'pointer'}}>
              Start free — no card needed
            </button>
            <button onClick={()=>document.getElementById('features')?.scrollIntoView({behavior:'smooth'})} style={{padding:'14px 24px',backgroundColor:'white',color:'#0F6E56',border:'1px solid #C0DD97',borderRadius:'10px',fontSize:'16px',fontWeight:'400',cursor:'pointer'}}>
              See how it works →
            </button>
          </div>
          <p className="fade-up delay-4" style={{fontSize:'13px',color:'#999',marginTop:'16px'}}>
            20 free scans · No credit card · Setup in 2 minutes
          </p>
        </div>

        <div className="fade-up delay-4" style={{maxWidth:'480px',margin:'48px auto 0',backgroundColor:'white',borderRadius:'20px',padding:'24px',boxShadow:'0 24px 64px rgba(0,0,0,0.08)',border:'1px solid #eee',textAlign:'left'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
            <div style={{width:'36px',height:'36px',backgroundColor:'#EAF3DE',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>🏪</div>
            <div>
              <div style={{fontSize:'13px',fontWeight:'600',color:'#111'}}>Auto Tech Asia 2026</div>
              <div style={{fontSize:'11px',color:'#27500A',fontWeight:'500'}}>● Live now</div>
            </div>
            <div style={{marginLeft:'auto',display:'flex',gap:'8px'}}>
              <div style={{textAlign:'center',padding:'6px 10px',backgroundColor:'#FAECE7',borderRadius:'6px'}}>
                <div style={{fontSize:'16px',fontWeight:'600',color:'#D85A30'}}>24</div>
                <div style={{fontSize:'9px',color:'#993C1D'}}>Hot 🔥</div>
              </div>
              <div style={{textAlign:'center',padding:'6px 10px',backgroundColor:'#EAF3DE',borderRadius:'6px'}}>
                <div style={{fontSize:'16px',fontWeight:'600',color:'#27500A'}}>7</div>
                <div style={{fontSize:'9px',color:'#27500A'}}>Deals ✓</div>
              </div>
            </div>
          </div>

          {[
            {company:'Sharma Plastics',city:'Delhi',tag:'Hot',status:'Interested',time:'2 min ago'},
            {company:'Kumar Enterprises',city:'Surat',tag:'Warm',status:'Contacted',time:'15 min ago'},
            {company:'Mehta Industries',city:'Mumbai',tag:'Cold',status:'New',time:'1 hr ago'},
          ].map((lead,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 0',borderTop:'1px solid #f5f5f5'}}>
              <div style={{width:'32px',height:'32px',backgroundColor:lead.tag==='Hot'?'#FAECE7':lead.tag==='Warm'?'#FAEEDA':'#E6F1FB',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'600',color:lead.tag==='Hot'?'#D85A30':lead.tag==='Warm'?'#BA7517':'#185FA5',flexShrink:0}}>
                {lead.company[0]}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:'13px',fontWeight:'500',color:'#111'}}>{lead.company}</div>
                <div style={{fontSize:'11px',color:'#999'}}>📍 {lead.city}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'3px'}}>
                <span style={{fontSize:'10px',fontWeight:'500',padding:'1px 7px',borderRadius:'8px',backgroundColor:lead.tag==='Hot'?'#FAECE7':lead.tag==='Warm'?'#FAEEDA':'#E6F1FB',color:lead.tag==='Hot'?'#D85A30':lead.tag==='Warm'?'#BA7517':'#185FA5'}}>{lead.tag}</span>
                <span style={{fontSize:'10px',color:'#bbb'}}>{lead.time}</span>
              </div>
            </div>
          ))}

          <button style={{width:'100%',marginTop:'12px',padding:'10px',backgroundColor:'#0F6E56',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'500',cursor:'pointer'}}>
            📷 Scan new card
          </button>
        </div>
      </section>

      <section style={{padding:'24px',backgroundColor:'#111',textAlign:'center'}}>
        <div className="stats-grid" style={{maxWidth:'900px',margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'24px'}}>
          {[
            {num:'550+',label:'Exhibitions yearly in India'},
            {num:'2 sec',label:'To scan a business card'},
            {num:'80%',label:'Better follow-up rate'},
            {num:'₹0',label:'To get started today'},
          ].map((s,i) => (
            <div key={i} style={{textAlign:'center'}}>
              <div style={{fontSize:'28px',fontWeight:'700',color:'#0F6E56',fontFamily:"'Fraunces', serif"}}>{s.num}</div>
              <div style={{fontSize:'12px',color:'#888',marginTop:'4px'}}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" style={{padding:'80px 24px'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'48px'}}>
            <h2 style={{fontFamily:"'Fraunces', serif",fontSize:'36px',fontWeight:'700',color:'#111',marginBottom:'12px'}}>Everything you need at an exhibition</h2>
            <p style={{fontSize:'16px',color:'#666',fontWeight:'300'}}>Built specifically for Indian trade shows — not a generic CRM</p>
          </div>
          <div className="features-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
            {features.map((f,i) => (
              <div key={i} className="feature-card" style={{backgroundColor:'white',borderRadius:'16px',padding:'24px',border:'1px solid #eee'}}>
                <div style={{fontSize:'28px',marginBottom:'12px'}}>{f.icon}</div>
                <div style={{fontSize:'15px',fontWeight:'600',color:'#111',marginBottom:'6px'}}>{f.title}</div>
                <div style={{fontSize:'13px',color:'#666',lineHeight:'1.6',fontWeight:'300'}}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{padding:'80px 24px',backgroundColor:'#F0F9F5'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'48px'}}>
            <h2 style={{fontFamily:"'Fraunces', serif",fontSize:'36px',fontWeight:'700',color:'#111',marginBottom:'12px'}}>Pricing that makes sense</h2>
            <p style={{fontSize:'16px',color:'#666',fontWeight:'300'}}>Pay per exhibition — not per month</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:'16px',maxWidth:'720px',margin:'0 auto'}}>
            {[
              {name:'Free',price:'₹0',period:'forever',color:'#666',features:['20 free scans','Seller & Buyer mode','Manual entry unlimited','WhatsApp follow-up'],cta:'Start free',primary:false},
              {name:'Exhibitor',price:'₹2,000',period:'per event',color:'#0F6E56',features:['Unlimited scans during event','Hot/Warm/Cold tags','Lead journey tracking','Invite 2 team members','Exhibition ROI dashboard'],cta:'Get Exhibitor',primary:true},
            ].map((plan,i) => (
              <div key={i} style={{backgroundColor:'white',borderRadius:'20px',padding:'28px',border:plan.primary?'2px solid #0F6E56':'1px solid #eee',position:'relative'}}>
                {plan.primary && <div style={{position:'absolute',top:'-12px',left:'50%',transform:'translateX(-50%)',backgroundColor:'#0F6E56',color:'white',fontSize:'11px',fontWeight:'600',padding:'3px 12px',borderRadius:'10px'}}>MOST POPULAR</div>}
                <div style={{fontSize:'14px',fontWeight:'600',color:plan.color,marginBottom:'8px'}}>{plan.name}</div>
                <div style={{fontSize:'32px',fontWeight:'700',color:'#111',fontFamily:"'Fraunces', serif"}}>{plan.price}</div>
                <div style={{fontSize:'13px',color:'#999',marginBottom:'20px'}}>{plan.period}</div>
                {plan.features.map((f,j) => (
                  <div key={j} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                    <span style={{color:'#0F6E56',fontSize:'14px'}}>✓</span>
                    <span style={{fontSize:'13px',color:'#444'}}>{f}</span>
                  </div>
                ))}
                <button onClick={()=>router.push('/login')} style={{width:'100%',marginTop:'20px',padding:'12px',backgroundColor:plan.primary?'#0F6E56':'white',color:plan.primary?'white':'#0F6E56',border:plan.primary?'none':'1px solid #0F6E56',borderRadius:'10px',fontSize:'14px',fontWeight:'500',cursor:'pointer'}}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{padding:'80px 24px'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'48px'}}>
            <h2 style={{fontFamily:"'Fraunces', serif",fontSize:'36px',fontWeight:'700',color:'#111',marginBottom:'12px'}}>What exhibitors say</h2>
          </div>
          <div className="testimonials-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
            {testimonials.map((t,i) => (
              <div key={i} style={{backgroundColor:'white',borderRadius:'16px',padding:'24px',border:'1px solid #eee'}}>
                <div style={{fontSize:'24px',marginBottom:'12px',color:'#0F6E56'}}>❝</div>
                <p style={{fontSize:'14px',color:'#333',lineHeight:'1.7',marginBottom:'16px',fontWeight:'300'}}>{t.text}</p>
                <div style={{borderTop:'1px solid #f0f0f0',paddingTop:'12px'}}>
                  <div style={{fontSize:'13px',fontWeight:'600',color:'#111'}}>{t.name}</div>
                  <div style={{fontSize:'12px',color:'#999'}}>{t.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{padding:'80px 24px',backgroundColor:'#0F6E56',textAlign:'center'}}>
        <div style={{maxWidth:'600px',margin:'0 auto'}}>
          <h2 style={{fontFamily:"'Fraunces', serif",fontSize:'40px',fontWeight:'700',color:'white',marginBottom:'16px',lineHeight:'1.2'}}>
            Your next exhibition is an opportunity. Don't waste it.
          </h2>
          <p style={{fontSize:'16px',color:'rgba(255,255,255,0.75)',marginBottom:'32px',fontWeight:'300'}}>
            Start scanning cards in 2 minutes. First 20 scans are completely free.
          </p>
          <button className="cta-btn" onClick={()=>router.push('/login')} style={{padding:'16px 40px',backgroundColor:'white',color:'#0F6E56',border:'none',borderRadius:'12px',fontSize:'16px',fontWeight:'600',cursor:'pointer'}}>
            Start for free — Sign in with Google
          </button>
          <p style={{fontSize:'12px',color:'rgba(255,255,255,0.5)',marginTop:'16px'}}>No credit card required</p>
        </div>
      </section>

      <footer style={{padding:'32px 24px',backgroundColor:'#111',textAlign:'center'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',marginBottom:'12px'}}>
          <div style={{width:'28px',height:'28px',backgroundColor:'#0F6E56',borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px'}}>📇</div>
          <span style={{fontSize:'14px',fontWeight:'600',color:'white'}}>ExhibitApp</span>
        </div>
        <p style={{fontSize:'12px',color:'#555'}}>Built for Indian exhibitors · Made with ♥ in Delhi</p>
      </footer>
    </div>
  )
}
