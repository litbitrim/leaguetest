'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

const TIER_COLORS: Record<string,string> = {
  IRON:'#7a7a8c',BRONZE:'#8c6a3f',SILVER:'#7a8c9e',GOLD:'#f0c040',
  PLATINUM:'#4fc3a1',EMERALD:'#2ecc71',DIAMOND:'#5b9bd5',
  MASTER:'#9b59b6',GRANDMASTER:'#e74c3c',CHALLENGER:'#f1c40f'
}

function deriveTitles(matches: any[], puuid: string) {
  if (!matches.length) return []
  const titles: any[] = []
  const meList = matches.map(m => m.info?.participants?.find((p:any) => p.puuid === puuid)).filter(Boolean)
  if (!meList.length) return []
  const avgDeaths = meList.reduce((s,p) => s+p.deaths,0)/meList.length
  const avgKills = meList.reduce((s,p) => s+p.kills,0)/meList.length
  const avgVision = meList.reduce((s,p) => s+p.visionScore,0)/meList.length
  const wins = meList.filter(p => p.win).length
  const wr = wins/meList.length
  const avgKda = meList.reduce((s,p) => s+(p.deaths===0?(p.kills+p.assists):(p.kills+p.assists)/p.deaths),0)/meList.length
  const teamKPs = meList.map((me,i) => {
    const match = matches[i]
    const teamKills = match?.info?.participants?.filter((p:any)=>p.teamId===me.teamId).reduce((s:number,p:any)=>s+p.kills,0)||0
    return teamKills > 0 ? (me.kills+me.assists)/teamKills : 0
  })
  const avgKP = teamKPs.reduce((s,v)=>s+v,0)/teamKPs.length
  const uniqueChamps = new Set(meList.map(p=>p.championName)).size
  if (avgKda >= 3) titles.push({ label:'Consistent Performer', type:'positive', reason:`${avgKda.toFixed(1)} avg KDA` })
  if (avgKP >= 0.65) titles.push({ label:'Team Player', type:'positive', reason:`${Math.round(avgKP*100)}% avg KP` })
  if (wr >= 0.6) titles.push({ label:'On Fire', type:'positive', reason:`${Math.round(wr*100)}% WR` })
  if (avgVision >= 30) titles.push({ label:'Good Starts', type:'positive', reason:'High vision awareness' })
  if (avgDeaths >= 7) titles.push({ label:'Death Heavy', type:'warning', reason:`${avgDeaths.toFixed(1)} deaths/game` })
  if (wr < 0.45 && avgKills >= 6) titles.push({ label:'Too Confident', type:'warning', reason:'High kills but losing' })
  if (avgVision < 15) titles.push({ label:'Low Vision', type:'warning', reason:`Only ${avgVision.toFixed(0)} vision avg` })
  if (uniqueChamps >= 7 && meList.length >= 10) titles.push({ label:'Coinflip Pool', type:'neutral', reason:`${uniqueChamps} champs in ${meList.length} games` })
  return titles.slice(0,5)
}

function WinRing({pct,size=64}:{pct:number,size?:number}) {
  const r=size/2-5, c=2*Math.PI*r, fill=(pct/100)*c
  const color=pct>=60?'#3ecf8e':pct>=50?'#f0c040':'#f75a5a'
  return (
    <svg width={size} height={size} style={{transform:'rotate(-90deg)',flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1f2335" strokeWidth="6"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${fill} ${c}`} strokeLinecap="round"/>
    </svg>
  )
}

function KdaBar({k,d,a}:{k:number,d:number,a:number}) {
  const t=k+d+a||1
  return <div style={{display:'flex',height:'4px',borderRadius:'2px',overflow:'hidden',marginTop:'6px'}}>
    <div style={{width:`${k/t*100}%`,background:'#3ecf8e'}}/>
    <div style={{width:`${d/t*100}%`,background:'#f75a5a'}}/>
    <div style={{width:`${a/t*100}%`,background:'#4f8ef7'}}/>
  </div>
}

function DamageBar({val,max,color='#f75a5a'}:{val:number,max:number,color?:string}) {
  return <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
    <div style={{flex:1,height:'4px',background:'#1f2335',borderRadius:'2px'}}>
      <div style={{width:`${Math.round(val/max*100)}%`,height:'100%',background:color,borderRadius:'2px'}}/>
    </div>
    <span style={{fontSize:'10px',color:'#8b91a8',minWidth:'36px',textAlign:'right'}}>{Math.round(val/1000)}k</span>
  </div>
}

function PlayerLink({platform,gameName,tagLine,isMe}:{platform:string,gameName:string,tagLine:string,isMe:boolean}) {
  if(!gameName||!tagLine) return <span style={{color:'#555d78',fontSize:'11px'}}>Unknown</span>
  return (
    <a href={`/profile/${platform}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`}
      onClick={e=>e.stopPropagation()}
      style={{color:isMe?'#4f8ef7':'#e8eaf2',fontWeight:isMe?700:400,fontSize:'11px',textDecoration:'none',
        maxWidth:'90px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block'}}
      onMouseOver={e=>(e.currentTarget.style.textDecoration='underline')}
      onMouseOut={e=>(e.currentTarget.style.textDecoration='none')}>
      {gameName}
    </a>
  )
}

function Scoreboard({match,myPuuid,platform}:{match:any,myPuuid:string,platform:string}) {
  const teams=[
    match.info.participants.filter((p:any)=>p.teamId===100),
    match.info.participants.filter((p:any)=>p.teamId===200),
  ]
  const maxDmg=Math.max(...match.info.participants.map((p:any)=>p.totalDamageDealtToChampions||0))
  return (
    <div style={{marginTop:'12px',borderTop:'1px solid #1f2335',paddingTop:'14px'}}>
      {teams.map((team,ti)=>{
        const won=team[0]?.win
        return (
          <div key={ti} style={{marginBottom:'16px'}}>
            <div style={{fontSize:'11px',fontWeight:700,color:won?'#3ecf8e':'#f75a5a',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.8px'}}>
              {won?'Victory':'Defeat'} · {ti===0?'Blue':'Red'} Team
            </div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
              <thead>
                <tr style={{color:'#555d78',borderBottom:'1px solid #1f2335'}}>
                  <th style={{textAlign:'left',padding:'4px 6px',fontWeight:500,width:'140px'}}>Player</th>
                  <th style={{padding:'4px 6px',fontWeight:500}}>KDA</th>
                  <th style={{padding:'4px 6px',fontWeight:500,width:'100px'}}>Damage</th>
                  <th style={{padding:'4px 6px',fontWeight:500}}>Gold</th>
                  <th style={{padding:'4px 6px',fontWeight:500}}>CS</th>
                  <th style={{padding:'4px 6px',fontWeight:500}}>Vision</th>
                  <th style={{padding:'4px 6px',fontWeight:500,width:'130px'}}>Items</th>
                </tr>
              </thead>
              <tbody>
                {team.map((p:any,i:number)=>(
                  <tr key={i} style={{background:p.puuid===myPuuid?'rgba(79,142,247,0.07)':'transparent'}}>
                    <td style={{padding:'5px 6px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                        <div style={{width:'24px',height:'24px',borderRadius:'4px',overflow:'hidden',background:'#1f2335',flexShrink:0}}>
                          <img src={`https://ddragon.leagueoflegends.com/cdn/14.8.1/img/champion/${p.championName}.png`}
                            style={{width:'100%',height:'100%'}} onError={(e:any)=>e.target.style.opacity='0'}/>
                        </div>
                        <PlayerLink platform={platform} gameName={p.riotIdGameName||p.summonerName} tagLine={p.riotIdTagline||'EUW'} isMe={p.puuid===myPuuid}/>
                      </div>
                    </td>
                    <td style={{padding:'5px 6px',textAlign:'center',whiteSpace:'nowrap'}}>
                      <span style={{color:'#3ecf8e'}}>{p.kills}</span>/<span style={{color:'#f75a5a'}}>{p.deaths}</span>/<span style={{color:'#4f8ef7'}}>{p.assists}</span>
                    </td>
                    <td style={{padding:'5px 6px'}}>
                      <DamageBar val={p.totalDamageDealtToChampions||0} max={maxDmg}/>
                    </td>
                    <td style={{padding:'5px 6px',textAlign:'center',color:'#f0c040',whiteSpace:'nowrap'}}>
                      {(p.goldEarned/1000).toFixed(1)}k
                    </td>
                    <td style={{padding:'5px 6px',textAlign:'center',color:'#8b91a8'}}>
                      {(p.totalMinionsKilled||0)+(p.neutralMinionsKilled||0)}
                    </td>
                    <td style={{padding:'5px 6px',textAlign:'center',color:'#8b91a8'}}>
                      {p.visionScore}
                    </td>
                    <td style={{padding:'5px 6px'}}>
                      <div style={{display:'flex',gap:'2px'}}>
                        {[p.item0,p.item1,p.item2,p.item3,p.item4,p.item5,p.item6].map((item:number,i:number)=>(
                          <div key={i} style={{width:'20px',height:'20px',borderRadius:'3px',background:'#1f2335',overflow:'hidden'}}>
                            {item>0&&<img src={`https://ddragon.leagueoflegends.com/cdn/14.8.1/img/item/${item}.png`}
                              style={{width:'100%',height:'100%'}} onError={(e:any)=>e.target.style.display='none'}/>}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

function ChampionStatsTab({matches,puuid}:{matches:any[],puuid:string}) {
  const [queue,setQueue]=useState('all')
  const QUEUE_IDS: Record<string,number[]>={solo:[420],flex:[440],aram:[450],normal:[400,430],all:[]}

  const filtered = queue==='all' ? matches : matches.filter(m=>{
    const ids=QUEUE_IDS[queue]||[]
    return ids.includes(m.info?.queueId)
  })

  const stats: Record<string,any> = {}
  filtered.forEach(m=>{
    const me=m.info?.participants?.find((p:any)=>p.puuid===puuid)
    if(!me) return
    const c=me.championName
    if(!stats[c]) stats[c]={wins:0,games:0,kills:0,deaths:0,assists:0,cs:0,damage:0,gold:0,vision:0,maxKills:0,maxDeaths:0,lpChange:0}
    stats[c].games++
    if(me.win) stats[c].wins++
    stats[c].kills+=me.kills; stats[c].deaths+=me.deaths; stats[c].assists+=me.assists
    stats[c].cs+=(me.totalMinionsKilled||0)+(me.neutralMinionsKilled||0)
    stats[c].damage+=me.totalDamageDealtToChampions||0
    stats[c].gold+=me.goldEarned||0
    stats[c].vision+=me.visionScore||0
    stats[c].maxKills=Math.max(stats[c].maxKills,me.kills)
    stats[c].maxDeaths=Math.max(stats[c].maxDeaths,me.deaths)
  })

  const list = Object.entries(stats)
    .map(([name,s]:any)=>({
      name,...s,
      wr:Math.round(s.wins/s.games*100),
      kda:s.deaths===0?'∞':((s.kills+s.assists)/s.deaths).toFixed(2),
      avgKills:(s.kills/s.games).toFixed(1),
      avgDeaths:(s.deaths/s.games).toFixed(1),
      avgAssists:(s.assists/s.games).toFixed(1),
      avgCs:Math.round(s.cs/s.games),
      avgDmg:Math.round(s.damage/s.games),
      avgGold:Math.round(s.gold/s.games),
      avgVision:Math.round(s.vision/s.games),
    }))
    .sort((a:any,b:any)=>b.games-a.games)

  const bg='#0a0b0f',bg2='#11131a',bg3='#161820',border='1px solid #1f2335'
  const muted='#8b91a8',win='#3ecf8e',loss='#f75a5a',gold='#f0c040'

  const queues=['all','solo','flex','aram','normal']
  const qLabels:Record<string,string>={all:'All Ranked',solo:'Solo/Duo',flex:'Flex',aram:'ARAM',normal:'Normal'}

  return (
    <div>
      <div style={{display:'flex',gap:'6px',marginBottom:'16px',flexWrap:'wrap'}}>
        {queues.map(q=>(
          <button key={q} onClick={()=>setQueue(q)} style={{
            padding:'6px 14px',borderRadius:'8px',fontSize:'12px',fontWeight:600,cursor:'pointer',border,
            background:queue===q?'#4f8ef7':'transparent',color:queue===q?'#fff':muted
          }}>{qLabels[q]}</button>
        ))}
      </div>
      <div style={{background:bg2,border,borderRadius:'12px',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
          <thead>
            <tr style={{borderBottom:border,color:muted}}>
              <th style={{textAlign:'left',padding:'10px 14px',fontWeight:500}}>Champion</th>
              <th style={{padding:'10px',fontWeight:500}}>Win Rate</th>
              <th style={{padding:'10px',fontWeight:500}}>KDA</th>
              <th style={{padding:'10px',fontWeight:500}}>Avg CS</th>
              <th style={{padding:'10px',fontWeight:500}}>Avg Dmg</th>
              <th style={{padding:'10px',fontWeight:500}}>Avg Gold</th>
              <th style={{padding:'10px',fontWeight:500}}>Max K</th>
              <th style={{padding:'10px',fontWeight:500}}>Max D</th>
              <th style={{padding:'10px',fontWeight:500}}>Vision</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c:any,i:number)=>(
              <tr key={c.name} style={{borderBottom:border,background:i%2===0?'transparent':'rgba(255,255,255,0.01)'}}>
                <td style={{padding:'10px 14px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <div style={{width:'32px',height:'32px',borderRadius:'50%',overflow:'hidden',background:bg3,flexShrink:0}}>
                      <img src={`https://ddragon.leagueoflegends.com/cdn/14.8.1/img/champion/${c.name}.png`}
                        style={{width:'100%',height:'100%'}} onError={(e:any)=>e.target.style.opacity='0'}/>
                    </div>
                    <div>
                      <div style={{fontWeight:500,color:'#e8eaf2'}}>{c.name}</div>
                      <div style={{fontSize:'11px',color:muted}}>{c.wins}W {c.games-c.wins}L</div>
                    </div>
                  </div>
                </td>
                <td style={{padding:'10px',textAlign:'center'}}>
                  <div style={{fontWeight:700,fontSize:'14px',color:c.wr>=60?win:c.wr>=50?gold:loss}}>{c.wr}%</div>
                  <div style={{fontSize:'10px',color:muted}}>{c.games} games</div>
                </td>
                <td style={{padding:'10px',textAlign:'center'}}>
                  <div style={{fontWeight:600,color:Number(c.kda)>=4?win:Number(c.kda)>=2?gold:muted}}>{c.kda}</div>
                  <div style={{fontSize:'10px',color:muted}}>{c.avgKills}/{c.avgDeaths}/{c.avgAssists}</div>
                </td>
                <td style={{padding:'10px',textAlign:'center',color:'#e8eaf2'}}>{c.avgCs}</td>
                <td style={{padding:'10px',textAlign:'center',color:loss}}>{Math.round(c.avgDmg/1000)}k</td>
                <td style={{padding:'10px',textAlign:'center',color:gold}}>{Math.round(c.avgGold/1000)}k</td>
                <td style={{padding:'10px',textAlign:'center',color:win}}>{c.maxKills}</td>
                <td style={{padding:'10px',textAlign:'center',color:loss}}>{c.maxDeaths}</td>
                <td style={{padding:'10px',textAlign:'center',color:muted}}>{c.avgVision}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length===0&&<div style={{padding:'40px',textAlign:'center',color:muted}}>No games found for this queue</div>}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { platform, name, tag } = useParams() as any
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [expanded, setExpanded] = useState<Record<string,boolean>>({})
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetch(`/api/summoner?name=${name}&tag=${tag}&platform=${platform}`)
      .then(r=>r.json()).then(data=>data.error?setErr(data.error):setD(data))
  },[name,tag,platform])

  const solo = d?.ranked?.find((r:any)=>r.queueType==='RANKED_SOLO_5x5')
  const flex = d?.ranked?.find((r:any)=>r.queueType==='RANKED_FLEX_SR')
  const titles = d ? deriveTitles(d.matches||[], d.account.puuid) : []

  const meList = d?.matches?.map((m:any)=>m.info?.participants?.find((p:any)=>p.puuid===d.account.puuid)).filter(Boolean)||[]
  const totalGames = meList.length
  const totalWins = meList.filter((p:any)=>p.win).length
  const avgK = totalGames?(meList.reduce((s:number,p:any)=>s+p.kills,0)/totalGames).toFixed(1):'0'
  const avgD = totalGames?(meList.reduce((s:number,p:any)=>s+p.deaths,0)/totalGames).toFixed(1):'0'
  const avgA = totalGames?(meList.reduce((s:number,p:any)=>s+p.assists,0)/totalGames).toFixed(1):'0'
  const avgKda = Number(avgD)===0?'∞':((Number(avgK)+Number(avgA))/Number(avgD)).toFixed(2)

  const champStats = d?.matches?.reduce((acc:any,m:any)=>{
    const me=m.info?.participants?.find((p:any)=>p.puuid===d.account.puuid)
    if(!me) return acc
    if(!acc[me.championName]) acc[me.championName]={wins:0,games:0,kills:0,deaths:0,assists:0}
    acc[me.championName].games++
    if(me.win) acc[me.championName].wins++
    acc[me.championName].kills+=me.kills; acc[me.championName].deaths+=me.deaths; acc[me.championName].assists+=me.assists
    return acc
  },{})

  const champList = champStats ? Object.entries(champStats)
    .map(([n,s]:any)=>({name:n,...s,wr:Math.round(s.wins/s.games*100),kda:s.deaths===0?'∞':((s.kills+s.assists)/s.deaths).toFixed(1)}))
    .sort((a:any,b:any)=>b.games-a.games).slice(0,7) : []

  const bg='#0a0b0f',bg2='#11131a',bg3='#161820',border='1px solid #1f2335'
  const muted='#8b91a8',win='#3ecf8e',loss='#f75a5a',gold='#f0c040'
  const card={background:bg2,border,borderRadius:'14px',padding:'20px'}
  const tierColor = TIER_COLORS[solo?.tier||'']||muted

  if(err) return <main style={{background:bg,minHeight:'100vh',color:'#e8eaf2',fontFamily:'system-ui,sans-serif',padding:'24px'}}>
    <a href="/" style={{color:'#4f8ef7',textDecoration:'none'}}>← Back</a>
    <div style={{color:loss,marginTop:'20px'}}>{err}</div>
  </main>

  if(!d) return <main style={{background:bg,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
    <div style={{color:muted}}>Loading...</div>
  </main>

  return (
    <main style={{background:bg,minHeight:'100vh',color:'#e8eaf2',fontFamily:'system-ui,sans-serif'}}>
      {/* NAVBAR */}
      <div style={{background:bg2,borderBottom:border,padding:'0 24px',display:'flex',alignItems:'center',gap:'12px',height:'52px'}}>
        <a href="/" style={{color:'#4f8ef7',fontSize:'13px',fontWeight:700,textDecoration:'none'}}>LoLStats</a>
        <span style={{color:'#333a50'}}>/</span>
        <span style={{fontSize:'13px',color:muted}}>{name}#{tag}</span>
        {d.liveGame&&<span style={{background:'rgba(247,90,90,0.15)',color:loss,fontSize:'11px',fontWeight:700,padding:'3px 10px',borderRadius:'20px',marginLeft:'4px'}}>🔴 IN GAME</span>}
      </div>

      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'20px'}}>
        {/* HEADER */}
        <div style={{...card,display:'flex',alignItems:'center',gap:'20px',marginBottom:'12px',flexWrap:'wrap'}}>
          <div style={{position:'relative',flexShrink:0}}>
            <img src={`https://ddragon.leagueoflegends.com/cdn/14.8.1/img/profileicon/${d.summoner?.profileIconId}.png`}
              style={{width:'72px',height:'72px',borderRadius:'12px',border}} onError={(e:any)=>e.target.style.opacity='0'}/>
            <div style={{position:'absolute',bottom:'-8px',left:'50%',transform:'translateX(-50%)',background:bg3,border,borderRadius:'8px',padding:'2px 8px',fontSize:'10px',fontWeight:700,color:muted,whiteSpace:'nowrap'}}>
              {d.summoner?.summonerLevel}
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:'26px',fontWeight:800,letterSpacing:'-0.5px'}}>
              {d.account.gameName}<span style={{color:muted,fontWeight:400}}>#{d.account.tagLine}</span>
            </div>
            <div style={{color:muted,fontSize:'13px',marginTop:'2px'}}>{platform.toUpperCase()}</div>
            {titles.length>0&&(
              <div style={{display:'flex',gap:'6px',marginTop:'8px',flexWrap:'wrap'}}>
                {titles.map((t:any,i:number)=>(
                  <span key={i} title={t.reason} style={{
                    padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:600,
                    background:t.type==='positive'?'rgba(62,207,142,0.12)':t.type==='warning'?'rgba(247,90,90,0.12)':'rgba(139,145,168,0.12)',
                    color:t.type==='positive'?win:t.type==='warning'?loss:muted
                  }}>{t.label}</span>
                ))}
              </div>
            )}
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            {d.liveGame&&<button style={{background:'rgba(247,90,90,0.12)',border:'1px solid rgba(247,90,90,0.25)',borderRadius:'10px',padding:'8px 16px',color:loss,fontWeight:600,cursor:'pointer',fontSize:'13px'}}>🔴 Live</button>}
            <button onClick={()=>window.location.reload()} style={{background:'#4f8ef7',border:'none',borderRadius:'10px',padding:'8px 20px',color:'#fff',fontWeight:600,cursor:'pointer',fontSize:'13px'}}>Update</button>
          </div>
        </div>

        {/* TABS */}
        <div style={{display:'flex',gap:'2px',borderBottom:border,marginBottom:'16px'}}>
          {['overview','champions'].map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)} style={{
              padding:'10px 20px',background:'transparent',border:'none',cursor:'pointer',
              fontSize:'14px',fontWeight:500,color:activeTab===tab?'#e8eaf2':muted,
              borderBottom:activeTab===tab?'2px solid #4f8ef7':'2px solid transparent',
              marginBottom:'-1px',textTransform:'capitalize'
            }}>{tab==='overview'?'Overview':'Champion Stats'}</button>
          ))}
        </div>

        {activeTab==='champions' ? (
          <ChampionStatsTab matches={d.matches||[]} puuid={d.account.puuid}/>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:'14px'}}>
            {/* SIDEBAR */}
            <div>
              {/* RANK CARD */}
              <div style={{...card,marginBottom:'12px'}}>
                {[{q:solo,label:'Ranked Solo/Duo'},{q:flex,label:'Ranked Flex'}].map(({q,label},i)=>(
                  <div key={i} style={{marginBottom:i===0?18:0,paddingBottom:i===0?18:0,borderBottom:i===0?border:'none'}}>
                    <div style={{fontSize:'10px',fontWeight:700,color:muted,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'10px'}}>{label}</div>
                    {q ? (
                      <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                        <div style={{position:'relative',flexShrink:0}}>
                          <WinRing pct={Math.round(q.wins/(q.wins+q.losses)*100)} size={56}/>
                          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:700,color:Math.round(q.wins/(q.wins+q.losses)*100)>=50?win:loss}}>
                            {Math.round(q.wins/(q.wins+q.losses)*100)}%
                          </div>
                        </div>
                        <div>
                          <div style={{fontSize:'16px',fontWeight:700,color:tierColor}}>{q.tier} {q.rank}</div>
                          <div style={{fontSize:'12px',color:muted}}>{q.leaguePoints} LP</div>
                          <div style={{fontSize:'12px',marginTop:'3px'}}>
                            <span style={{color:win}}>{q.wins}W</span><span style={{color:muted}}> / </span><span style={{color:loss}}>{q.losses}L</span>
                          </div>
                        </div>
                      </div>
                    ) : <div style={{color:muted,fontSize:'13px'}}>Unranked</div>}
                  </div>
                ))}
              </div>

              {/* LAST N GAMES */}
              <div style={{...card,marginBottom:'12px'}}>
                <div style={{fontSize:'10px',fontWeight:700,color:muted,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'12px'}}>Last {totalGames} Games</div>
                <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
                  <div style={{position:'relative',flexShrink:0}}>
                    <WinRing pct={totalGames?Math.round(totalWins/totalGames*100):0} size={68}/>
                    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:700,color:(totalWins/totalGames)>=0.5?win:loss}}>
                      {totalGames?Math.round(totalWins/totalGames*100):0}%
                    </div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'18px',fontWeight:700}}>
                      {avgK} / <span style={{color:loss}}>{avgD}</span> / {avgA}
                    </div>
                    <div style={{fontSize:'12px',color:muted,marginTop:'2px'}}>{avgKda} KDA</div>
                    <KdaBar k={Number(avgK)} d={Number(avgD)} a={Number(avgA)}/>
                  </div>
                </div>
              </div>

              {/* CHAMPION STATS */}
              <div style={card}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
                  <div style={{fontSize:'10px',fontWeight:700,color:muted,textTransform:'uppercase',letterSpacing:'1px'}}>Most Played</div>
                  <button onClick={()=>setActiveTab('champions')} style={{fontSize:'11px',color:'#4f8ef7',background:'transparent',border:'none',cursor:'pointer',fontWeight:600}}>See All →</button>
                </div>
                {champList.map((c:any)=>(
                  <div key={c.name} style={{display:'flex',alignItems:'center',gap:'10px',padding:'7px 0',borderBottom:border}}>
                    <div style={{width:'34px',height:'34px',borderRadius:'50%',overflow:'hidden',background:bg3,flexShrink:0}}>
                      <img src={`https://ddragon.leagueoflegends.com/cdn/14.8.1/img/champion/${c.name}.png`} style={{width:'100%',height:'100%'}} onError={(e:any)=>e.target.style.opacity='0'}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'13px',fontWeight:500}}>{c.name}</div>
                      <div style={{fontSize:'11px',color:muted}}>{c.kda} KDA · {c.games}g</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontSize:'13px',fontWeight:700,color:c.wr>=60?win:c.wr>=50?gold:loss}}>{c.wr}%</div>
                      <div style={{fontSize:'10px',color:muted}}>{c.wins}W {c.games-c.wins}L</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MATCH HISTORY */}
            <div>
              <div style={{fontSize:'10px',fontWeight:700,color:muted,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'10px',padding:'0 2px'}}>
                Match History · {d.matches?.length} Ranked Solo
              </div>
              {d.matches?.map((m:any)=>{
                const me=m.info?.participants?.find((p:any)=>p.puuid===d.account.puuid)
                if(!me) return null
                const matchId=m.metadata?.matchId
                const isOpen=expanded[matchId]
                const kda=me.deaths===0?'∞':((me.kills+me.assists)/me.deaths).toFixed(2)
                const cs=(me.totalMinionsKilled||0)+(me.neutralMinionsKilled||0)
                const cspm=(cs/(m.info.gameDuration/60)).toFixed(1)
                const teamKills=m.info.participants.filter((p:any)=>p.teamId===me.teamId).reduce((s:number,p:any)=>s+p.kills,0)
                const kp=teamKills>0?Math.round((me.kills+me.assists)/teamKills*100):0
                const durStr=`${Math.floor(m.info.gameDuration/60)}:${String(m.info.gameDuration%60).padStart(2,'0')}`
                const allies=m.info.participants.filter((p:any)=>p.teamId===me.teamId&&p.puuid!==d.account.puuid)
                const enemies=m.info.participants.filter((p:any)=>p.teamId!==me.teamId)

                return (
                  <div key={matchId} style={{
                    ...card,marginBottom:'6px',borderRadius:'12px',cursor:'pointer',
                    borderLeft:`3px solid ${me.win?win:loss}`,
                    background:me.win?'rgba(62,207,142,0.02)':'rgba(247,90,90,0.02)',
                  }} onClick={()=>setExpanded(e=>({...e,[matchId]:!e[matchId]}))}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                      {/* RESULT */}
                      <div style={{width:'48px',textAlign:'center',flexShrink:0}}>
                        <div style={{fontWeight:700,fontSize:'13px',color:me.win?win:loss}}>{me.win?'WIN':'LOSS'}</div>
                        <div style={{fontSize:'10px',color:muted,marginTop:'1px'}}>{durStr}</div>
                      </div>

                      {/* CHAMP */}
                      <div style={{position:'relative',flexShrink:0}}>
                        <div style={{width:'44px',height:'44px',borderRadius:'10px',overflow:'hidden',background:bg3,border}}>
                          <img src={`https://ddragon.leagueoflegends.com/cdn/14.8.1/img/champion/${me.championName}.png`}
                            style={{width:'100%',height:'100%'}} onError={(e:any)=>e.target.style.opacity='0'}/>
                        </div>
                        <div style={{position:'absolute',bottom:'-4px',right:'-4px',background:bg3,border,borderRadius:'4px',padding:'1px 4px',fontSize:'9px',fontWeight:700}}>
                          {me.champLevel}
                        </div>
                      </div>

                      {/* KDA */}
                      <div style={{minWidth:'120px',flexShrink:0}}>
                        <div style={{fontSize:'15px',fontWeight:700}}>
                          {me.kills} / <span style={{color:loss}}>{me.deaths}</span> / {me.assists}
                        </div>
                        <div style={{fontSize:'11px',marginTop:'2px',color:Number(kda)>=4?win:Number(kda)>=2?gold:muted}}>{kda} KDA</div>
                        <KdaBar k={me.kills} d={me.deaths} a={me.assists}/>
                      </div>

                      {/* STATS */}
                      <div style={{fontSize:'11px',color:muted,minWidth:'100px',flexShrink:0}}>
                        <div>{cs} CS <span style={{color:'#3a4060'}}>({cspm}/m)</span></div>
                        <div>KP <span style={{color:'#e8eaf2',fontWeight:500}}>{kp}%</span></div>
                        <div>{me.visionScore} vision</div>
                      </div>

                      {/* ITEMS */}
                      <div style={{flexShrink:0}}>
                        <div style={{display:'flex',gap:'3px'}}>
                          {[me.item0,me.item1,me.item2,me.item3,me.item4,me.item5,me.item6].map((item:number,i:number)=>(
                            <div key={i} style={{width:'26px',height:'26px',borderRadius:'5px',background:bg3,border,overflow:'hidden'}}>
                              {item>0&&<img src={`https://ddragon.leagueoflegends.com/cdn/14.8.1/img/item/${item}.png`}
                                style={{width:'100%',height:'100%'}} onError={(e:any)=>e.target.style.display='none'}/>}
                            </div>
                          ))}
                        </div>
                        <div style={{display:'flex',gap:'4px',marginTop:'4px'}}>
                          {me.pentaKills>0&&<span style={{background:'rgba(240,192,64,0.15)',color:gold,fontSize:'10px',fontWeight:700,padding:'2px 6px',borderRadius:'8px'}}>PENTA!</span>}
                          {me.quadraKills>0&&<span style={{background:'rgba(79,142,247,0.1)',color:'#4f8ef7',fontSize:'10px',fontWeight:600,padding:'2px 6px',borderRadius:'8px'}}>Quadra</span>}
                          {me.tripleKills>0&&<span style={{background:'rgba(79,142,247,0.1)',color:'#4f8ef7',fontSize:'10px',fontWeight:600,padding:'2px 6px',borderRadius:'8px'}}>Triple</span>}
                          {me.individualPosition&&<span style={{background:bg3,color:muted,fontSize:'10px',padding:'2px 6px',borderRadius:'8px'}}>{me.individualPosition}</span>}
                        </div>
                      </div>

                      {/* PLAYERS MINI */}
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px 16px',marginLeft:'auto',flexShrink:0}}>
                        {[...allies,...enemies.slice(0,5-allies.length)].slice(0,5).map((p:any,i:number)=>(
                          <PlayerLink key={i} platform={platform} gameName={p.riotIdGameName||p.summonerName} tagLine={p.riotIdTagline||tag} isMe={p.puuid===d.account.puuid}/>
                        ))}
                      </div>

                      <div style={{color:muted,fontSize:'11px',flexShrink:0}}>{isOpen?'▲':'▼'}</div>
                    </div>

                    {isOpen&&<Scoreboard match={m} myPuuid={d.account.puuid} platform={platform}/>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
