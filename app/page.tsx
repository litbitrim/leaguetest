'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [input, setValue] = useState('')
  const [region, setRegion] = useState('EUW')
  const router = useRouter()

  function handleSearch() {
    const [name, tag] = input.split('#')
    if (!name || !tag) return alert('Format: Name#TAG')
    router.push(`/profile/${region.toLowerCase()}/${name}/${tag}`)
  }

  return (
    <main style={{
      background: '#0d0f14',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      color: '#e8eaf2'
    }}>
      <div style={{ marginBottom: '16px', fontSize: '13px', color: '#4f8ef7', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
        Alpha
      </div>
      <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-1px' }}>
        LoLStats
      </h1>
      <p style={{ color: '#8b91a8', marginBottom: '40px', fontSize: '15px' }}>
        op.gg + u.gg + League of Graphs — in one place
      </p>
      <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '520px', padding: '0 16px' }}>
        <select value={region} onChange={e => setRegion(e.target.value)} style={{ background: '#1a1e28', border: '1px solid #232840', borderRadius: '8px', padding: '12px', color: '#e8eaf2', fontSize: '13px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
          <option>EUW</option>
          <option>NA</option>
          <option>KR</option>
          <option>EUNE</option>
          <option>BR</option>
        </select>
        <input value={input} onChange={e => setValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="stacksmaxxing#69420" style={{ background: '#1a1e28', border: '1px solid #232840', borderRadius: '8px', padding: '12px 20px', color: '#e8eaf2', fontSize: '15px', flex: 1, outline: 'none' }} />
        <button onClick={handleSearch} style={{ background: '#4f8ef7', border: 'none', borderRadius: '8px', padding: '12px 24px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}>Search</button>
      </div>
      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        {['stacksmaxxing#69420', 'Faker#T1', 'Caps#EUW'].map(s => (
          <button key={s} onClick={() => setValue(s)} style={{ background: '#1a1e28', border: '1px solid #232840', borderRadius: '6px', padding: '6px 12px', color: '#8b91a8', fontSize: '12px', cursor: 'pointer' }}>{s}</button>
        ))}
      </div>
    </main>
  )
}
