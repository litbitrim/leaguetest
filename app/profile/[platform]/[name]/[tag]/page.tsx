'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function ProfilePage() {
  const { platform, name, tag } = useParams() as { platform: string, name: string, tag: string }
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/summoner?name=${name}&tag=${tag}&platform=${platform}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
  }, [name, tag, platform])

  return (
    <main style={{ background: '#0d0f14', minHeight: '100vh', color: '#e8eaf2', fontFamily: 'system-ui, sans-serif', padding: '40px 24px' }}>
      <a href="/" style={{ color: '#4f8ef7', fontSize: '13px', textDecoration: 'none' }}>← Back</a>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '16px' }}>{name}<span style={{ color: '#8b91a8' }}>#{tag}</span></h1>
      <div style={{ color: '#8b91a8', fontSize: '13px', marginBottom: '24px' }}>{platform.toUpperCase()}</div>
      {error && <div style={{ color: '#f75a5a' }}>{error}</div>}
      {!data && !error && <div style={{ color: '#8b91a8' }}>Loading...</div>}
      {data && (
        <pre style={{ background: '#1a1e28', padding: '20px', borderRadius: '8px', fontSize: '13px', overflow: 'auto' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </main>
  )
}
