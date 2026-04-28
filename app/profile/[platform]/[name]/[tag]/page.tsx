'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function ProfilePage() {
  const { platform, name, tag } = useParams() as any
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch(`/api/summoner?name=${name}&tag=${tag}&platform=${platform}`)
      .then(r => r.json()).then(d => d.error ? setErr(d.error) : setD(d))
  }, [name, tag, platform])

  const solo = d?.ranked?.find((r: any) => r.queueType === 'RANKED_SOLO_5x5')
  const flex = d?.ranked?.find((r: any) => r.queueType === 'RANKED_FLEX_SR')

  const s = { background:'#0d0f14', minHeight:'100vh', color:'#e8eaf2', fontFamily:'system-ui,sans-serif', padding:'24px' }
  const card = { background:'#1a1e28', border:'1px solid #232840', borderRadius:'10px', padding:'16px 20px' }
  const win = '#3ecf8e'; const loss = '#f75a5a'; const gold = '#f0c040'; const muted = '#8b91a8'

  if (err) return <main style={s}><a href="/" style={{color:'#4f8ef7',textDecoration:'none'}}>← Back</a><div style={{color:loss,marginTop:'20px'}}>{err}</div></main>
  if (!d) return <main style={s}><div style={{color:muted,marginTop:'40px',textAlign:'center'}}>Loading...</div></main>

  return (
    <main style={s}>
      <a href="/" style={{color:'#4f8ef7',fontSize:'13px',textDecoration:'none'}}>← Back</a>

      {/* HEADER */}
      <div style={{...card, marginTop:'16px', display:'flex', alignItems:'center', gap:'20px'}}>
        <div style={{width:'72px',height:'72px',borderRadius:'10px',background:'#232840',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',border:'2px solid #232840'}}>
          🎮
        </div>
        <div>
          <div style={{fontSize:'24px',fontWeight:800}}>{d.account.gameName}<span style={{color:muted,fontWeight:400}}>#{d.account.tagLine}</span></div>
          <div style={{color:muted,fontSize:'13px',marginTop:'4px'}}>{platform.toUpperCase()} · Level {d.summoner.summonerLevel}</div>
        </div>
      </div>

      {/* RANK CARDS */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginTop:'12px'}}>
        {[solo, flex].map((q, i) => (
          <div key={i} style={card}>
            <div style={{fontSize:'11px',fontWeight:700,color:muted,textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'8px'}}>
              {i === 0 ? 'Ranked Solo' : 'Ranked Flex'}
            </div>
            {q ? <>
              <div style={{fontSize:'18px',fontWeight:700,color:gold}}>{q.tier} {q.rank}</div>
              <div style={{fontSize:'13px',color:muted,marginTop:'2px'}}>{q.leaguePoints} LP</div>
              <div style={{fontSize:'13px',marginTop:'6px'}}>
                <span style={{color:win}}>{q.wins}W</span>
                <span style={{color:muted}}> / </span>
                <span style={{color:loss}}>{q.losses}L</span>
                <span style={{color:muted,marginLeft:'8px'}}>{Math.round(q.wins/(q.wins+q.losses)*100)}% WR</span>
              </div>
            </> : <div style={{color:muted,fontSize:'13px'}}>Unranked</div>}
          </div>
        ))}
      </div>

      {/* MATCHES */}
      <div style={{marginTop:'12px'}}>
        <div style={{fontSize:'13px',fontWeight:700,color:muted,textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'8px'}}>Recent Matches</div>
        {d.matches?.map((m: any) => {
          const me = m.info?.participants?.find((p: any) => p.puuid === d.account.puuid)
          if (!me) return null
          const kda = me.deaths === 0 ? '∞' : ((me.kills+me.assists)/me.deaths).toFixed(2)
          const cs = me.totalMinionsKilled + me.neutralMinionsKilled
          return (
            <div key={m.metadata?.matchId} style={{...card, marginBottom:'6px', display:'flex', alignItems:'center', gap:'12px', borderLeft:`3px solid ${me.win ? win : loss}`}}>
              <div style={{width:'40px',textAlign:'center',flexShrink:0}}>
                <div style={{fontWeight:700,color:me.win?win:loss,fontSize:'13px'}}>{me.win?'WIN':'LOSS'}</div>
                <div style={{fontSize:'10px',color:muted,marginTop:'2px'}}>{Math.floor(m.info.gameDuration/60)}m</div>
              </div>
              <div style={{width:'36px',height:'36px',borderRadius:'8px',background:'#232840',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0}}>⚔</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:'14px'}}>{me.championName}</div>
                <div style={{fontSize:'12px',color:muted}}>{me.kills}/{me.deaths}/{me.assists} · <span style={{color:Number(kda)>3?win:muted}}>{kda} KDA</span> · {cs} CS</div>
              </div>
              <div style={{fontSize:'11px',color:muted,textAlign:'right'}}>
                {me.pentaKills>0&&<div style={{color:'#f0c040',fontWeight:700}}>PENTA!</div>}
                {me.quadraKills>0&&<div style={{color:'#4f8ef7'}}>Quadra</div>}
                {me.tripleKills>0&&<div style={{color:'#4f8ef7'}}>Triple</div>}
                <div>{me.visionScore} vis</div>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
