export default function Home() {
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
      <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '8px' }}>
        LoLStats
      </h1>
      <p style={{ color: '#8b91a8', marginBottom: '32px' }}>
        The best LoL stats platform — coming soon
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          placeholder="Summoner#EUW"
          style={{
            background: '#1a1e28',
            border: '1px solid #232840',
            borderRadius: '8px',
            padding: '12px 20px',
            color: '#e8eaf2',
            fontSize: '15px',
            width: '300px',
            outline: 'none'
          }}
        />
        <button style={{
          background: '#4f8ef7',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 24px',
          color: '#fff',
          fontWeight: 600,
          cursor: 'pointer'
        }}>
          Search
        </button>
      </div>
    </main>
  )
}
