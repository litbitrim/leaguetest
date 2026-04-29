'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const TIER_COLORS: Record<string,string> = {
  IRON:'#7a7a8c',BRONZE:'#8c6a3f',SILVER:'#7a8c9e',GOLD:'#f0c040',
  PLATINUM:'#4fc3a1',EMERALD:'#2ecc71',DIAMOND:'#5b9bd5',
  MASTER:'#9b59b6',GRANDMASTER:'#e74c3c',CHALLENGER:'#f1c40f'
}

const TIER_RANK: Record<string,number> = {
  IRON:1,BRONZE:5,SILVER:9,GOLD:13,PLATINUM:17,EMERALD:21,DIAMOND:25,MASTER:29,GRANDMASTER:30,CHALLENGER:31
}
const DIVISION_RANK: Record<string,number> = {IV:0,III:1,II:2,I:3}

function tierScore(tier: string, division: string) {
  return (TIER_RANK[tier]??0)*4 + (DIVISION_RANK[division]??0)
}

function scoreTier(score: number): string {
  const tiers = ['IRON IV','IRON III','IRON II','IRON I','BRONZE IV','BRONZE III','BRONZE II','BRONZE I','SILVER IV','SILVER III','SILVER II','SILVER I','GOLD IV','GOLD III','GOLD II','GOLD I','PLATINUM IV','PLATINUM III','PLATINUM II','PLATINUM I','EMERALD IV','EMERALD III','EMERALD II','EMERALD I','DIAMOND IV','DIAMOND III','DIAMOND II','DIAMOND I','MASTER','GRANDMASTER','CHALLENGER']
  return tiers[Math.max(0,Math.min(score,tiers.length-1))] ?? 'Unknown'
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

  const avgKda = meList.reduce((s,p) => {
    return s + (p.deaths===0 ? (p.kills+p.assists) : (p.kills+p.assists)/p.deaths)
  },0)/meList.length

  const teamKPs = meList.map((me,i) => {
    const match = matches[i]
    const teamKills = match.info.participants.filter((p:any) => p.teamId===me.teamId).reduce((s:number,p:any)=>s+p.kills,0)
    return teamKills > 0 ? (me.kills+me.assists)/teamKills : 0
  })
  const avgKP = teamKPs.reduce((s,v)=>s+v,0)/teamKPs.length

  const champCounts: Record<string,number> = {}
  meList.forEach(me => { champCounts[me.championName] = (champCounts[me.championName]||0)+1 })
  const uniqueChamps = Object.keys(champCounts).length

  if (avgKda >= 3) titles.push({ label:'Consistent Performer', type:'positive', reason:`${avgKda.toFixed(1)} avg KDA over ${meList.length} games` })
  if (avgKP >= 0.65) titles.push({ label:'Team Player', type:'positive', reason:`${Math.round(avgKP*100)}% avg kill participation` })
  if (wr >= 0.6) titles.push({ label:'Winning Streak', type:'positive', reason:`${Math.round(wr*100)}% winrate` })
  if (avgVision >= 30) titles.push({ label:'Good Starts', type:'positive', reason:'High early game awareness' })

  if (avgDeaths >= 7) titles.push({ label:'Death Heavy', type:'warning', reason:`${avgDeaths.toFixed(1)} deaths per game on average` })
  if (wr < 0.45 && avgKills >= 6) titles.push({ label:'Too Confident', type:'warning', reason:'High kills but still losing games' })
  if (avgVision < 15) titles.push({ label:'Low Vision', type:'warning', reason:`Only ${avgVision.toFixed(0)} vision score avg` })
  if (uniqueChamps >= 7 && meList.length >= 10) titles.push({ label:'Wide Champ Pool', type:'neutral', reason:`${uniqueChamps} different champions in ${meList.length} games` })

  return titles.slice(0,4)
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

function Scoreboard({match,myPuuid}:{match:any,myPuuid:string}) {
  const teams = [
    match.info.participants.filter((p:any)=>p.teamId===100),
    match.info.participants.filter((p:any)=>p.teamId===200),
  ]
  const teamWon = [teams[0][0]?.win, teams[1][0]?.win]

  return (
    <div style={{marginTop:'12px',borderTop:'1px solid #1f2335',paddingTop:'12px'}}>
      {teams.map((team,ti) => (
        <div key={ti} style={{marginBottom:'12px'}}>
          <div style={{fontSize:'11px',fontWeight:700,color:teamWon[ti]?'#3ecf8e':'#f75a5a',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.8px'}}>
            {teamWon[ti]?'Victory':'Defeat'} (Team {ti===0?'Blue':'Red'})
          </div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
            <thead>
              <tr style={{color:'#555d78'}}>
                <th style={{textAlign:'left',padding:'3px 6px',fontWeight:500}}>Player</th>
                <th style={{padding:'3px 6px',fontWeight:500}}>KDA</th>
                <th style={{padding:'3px 6px',fontWeight:500}}>Damage</th>
                <th style={{padding:'3px 6px',fontWeight:500}}>Gold</th>
                <th style={{padding:'3px 6px',fontWeight:500}}>CS</th>
                <th style={{padding:'3px 6px',fontWeight:500}}>Wards</th>
              </tr>
            </thead>
            <tbody>
              {team.map((p:any,i:number) => (
                <tr key={i} style={{background:p.puuid===myPuuid?'rgba(79,142,247,0.08)':'transparent',borderRadius:'4px'}}>
                  <td style={{padding:'4px 6px',display:'flex',alignItems:'center',gap:'6px'}}>
                    <div style={{width:'24px',height:'24px',borderRadius:'4px',overflow:'hidden',background:'#1f2335',flexShrink:0}}>
                      <img src={`https://ddragon.leagueoflegends.com/cdn/14.8.1/img/champion/${p.championName}.png`} style={{width:'100%',height:'100%'}} onError={(e:any)=>e.target.style.opacity='0'}/>
                    </div>
                    <span style={{color:p.puuid===myPuuid?'#4f8ef7':'#e8eaf2',fontWeight:p.puuid===myPuuid?600:400,maxWidth:'100px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {p.riotIdGameName||p.summonerName}
                    </span>
                  </td>
                  <td style={{padding:'4px 6px',textAlign:'center'}}>
                    {p.kills}/<span style={{color:'#f75a5a'}}>{p.deaths}</span>/{p.assists}
                  </td>
                  <td style={{padding:'4px 6px',textAlign:'center',color:'#8b91a8'}}>
                    {Math.round(p.totalDamageDealtToChampions/1000)}k
                  </td>
                  <td style={{padding:'4px 6px',textAlign:'center',color:'#f0c040'}}>
                    {Math.round(p.goldEarned/1000)}k
                  </td>
                  <td style={{padding:'4px 6px',textAlign:'center',color:'#8b91a8'}}>
                    {p.totalMinionsKilled+(p.neutralMinionsKilled||0)}
                  </td>
                  <td style={{padding:'4px 6px',textAlign:'center',color:'#8b91a8'}}>
                    {p.visionScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

export default function ProfilePage() {
  const { platform, name, tag } = useParams() as any
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [expanded, setExpanded] = useState<Record<string,boolean>>({})

  useEffect(() => {
    fetch(`/api/summoner?name=${name}&tag=${tag}&platform=${platform}`)
      .then(r=>r.json()).then(data=>data.error?setErr(data.error):setD(data))
  },[name,tag,platform])

  const solo = d?.ranked?.find((r:any)=>r.queueType==='RANKED_SOLO_5x5')
  const flex = d?.ranked?.find((r:any)=>r.queueType==='RANKED_FLEX_SR')
  const titles = d ? deriveTitles(d.matches||[], d.account.puuid) : []

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

  const meList = d?.matches?.map((m:any)=>m.info?.participants?.find((p:any)=>p.puuid===d.account.puuid)).filter(Boolean)||[]
  const totalGames = meList.length
  const totalWins = meList.filter((p:any)=>p.win).length
  const avgK = totalGames?(meList.reduce((s:number,p:any)=>s+p.kills,0)/totalGames).toFixed(1):'0'
  const avgD = totalGames?(meList.reduce((s:number,p:any)=>s+p.deaths,0)/totalGames).toFixed(1):'0'
  const avgA = totalGames?(meList.reduce((s:number,p:any)=>s+p.assists,0)/totalGames).toFixed(1):'0'
  const avgKda = Number(avgD)===0?'∞':((Number(avgK)+Number(avgA))/Number(avgD)).toFixed(2)

  const bg='#0a0b0f', bg2='#11131a', bg3='#161820', border='1px solid #1f2335'
  const muted='#8b91a8', win='#3ecf8e', loss='#f75a5a', gold='#f0c040'
  const card={background:bg2,border,borderRadius:'16px',padding:'20px'}
  const tierColor = TIER_COLORS[solo?.tier||'']||muted

  if(err) return <main style={{background:bg,minHeight:'100vh',color:'#e8eaf2',fontFamily:'system-ui,sans-serif',padding:'24px'}}><a href="/" style={{color:'#4f8ef7',textDecoration:'none'}}>← Back</a><div style={{color:loss,marginTop:'20px'}}>{err}</div></main>
  if(!d) return <main style={{background:bg,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}><div style={{color:muted}}>Loading...</div></main>

  return (
    <main style={{background:bg,minHeight:'100vh',color:'#e8eaf2',fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:bg2,borderBottom:border,padding:'12px 24px',display:'flex',alignItems:'center',gap:'12px'}}>
        <a href="/" style={{color:'#4f8ef7',fontSize:'13px',fontWeight:600,textDecoration:'none'}}>← LoLStats</a>
        <span style={{color:muted}}>/</span>
        <span style={{fontSize:'13px'}}>{name}#{tag}</span>
        {d.liveGame && <span style={{background:'rgba(247,90,90,0.15)',color:loss,fontSize:'11px',fontWeight:700,padding:'3px 10px',borderRadius:'20px',marginLeft:'8px'}}>🔴 IN GAME</span>}
      </div>

      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'24px 20px'}}>
        {/* HEADER */}
        <div style={{...card,display:'flex',alignItems:'center',gap:'20px',marginBottom:'16px',flexWrap:'wrap'}}>
          <div style={{position:'relative',flexShrink:0}}>
            <img src={`https://ddragon.leagueoflegends.com/cdn/14.8.1/img/profileicon/${d.summoner?.profileIconId}.png`}
              style={{width:'72px',height:'72px',borderRadius:'12px',border}} onError={(e:any)=>e.target.style.opacity='0'}/>
            <div style={{position:'absolute',bottom:'-8px',left:'50%',transform:'translateX(-50%)',background:bg3,border,borderRadius:'8px',padding:'2px 8px',fontSize:'10px',fontWeight:700,color:muted,whiteSpace:'nowrap'}}>
              {d.summoner?.summonerLevel}
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:'28px',fontWeight:800,letterSpacing:'-0.5px'}}>
              {d.account.gameName}<span style={{color:muted,fontWeight:400}}>#{d.account.tagLine}</span>
            </div>
            <div style={{color:muted,fontSize:'13px',marginTop:'4px'}}>{platform.toUpperCase()}</div>
            {titles.length>0 && (
              <div style={{display:'flex',gap:'6px',marginTop:'8px',flexWrap:'wrap'}}>
                {titles.map((t:any,i:number)=>(
                  <span key={i} style={{
                    padding:'4px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:600,
                    background:t.type==='positive'?'rgba(62,207,142,0.12)':t.type==='warning'?'rgba(247,90,90,0.12)':'rgba(139,145,168,0.12)',
                    color:t.type==='positive'?win:t.type==='warning'?loss:muted
                  }} title={t.reason}>
                    {t.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            {d.liveGame && (
              <button style={{background:'rgba(247,90,90,0.15)',border:'1px solid rgba(247,90,90,0.3)',borderRadius:'10px',padding:'8px 16px',color:loss,fontWeight:600,cursor:'pointer',fontSize:'13px'}}>
                🔴 Live Game
              </button>
            )}
            <button onClick={()=>window.location.reload()} style={{background:'#4f8ef7',border:'none',borderRadius:'10px',padding:'8px 20px',color:'#fff',fontWeight:600,cursor:'pointer',fontSize:'13px'}}>
              Update
            </button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:'16px'}}>
          <div>
            {/* RANK */}
            <div style={{...card,marginBottom:'12px'}}>
              {[{q:solo,label:'Ranked Solo/Duo'},{q:flex,label:'Ranked Flex'}].map(({q,label},i)=>(
                <div key={i} style={{marginBottom:i===0?20:0,paddingBottom:i===0?20:0,borderBottom:i===0?border:'none'}}>
                  <div style={{fontSize:'10px',fontWeight:700,color:muted,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'10px'}}>{label}</div>
                  {q ? (
                    <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
                      <div style={{position:'relative',flexShrink:0}}>
                        <WinRing pct={Math.round(q.wins/(q.wins+q.losses)*100)} size={60}/>
                        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:700,color:Math.round(q.wins/(q.wins+q.losses)*100)>=50?win:loss}}>
                          {Math.round(q.wins/(q.wins+q.losses)*100)}%
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:'18px',fontWeight:700,color:tierColor}}>{q.tier} {q.rank}</div>
                        <div style={{fontSize:'13px',color:muted}}>{q.leaguePoints} LP</div>
                        <div style={{fontSize:'12px',marginTop:'4px'}}>
                          <span style={{color:win}}>{q.wins}W</span><span style={{color:muted}}> / </span><span style={{color:loss}}>{q.losses}L</span>
                        </div>
                      </div>
                    </div>
                  ) : <div style={{color:muted,fontSize:'14px'}}>Unranked</div>}
                </div>
              ))}
            </div>

            {/* LAST N GAMES */}
            <div style={{...card,marginBottom:'12px'}}>
              <div style={{fontSize:'10px',fontWeight:700,color:muted,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'14px'}}>Last {totalGames} Ranked Games</div>
              <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
                <div style={{position:'relative',flexShrink:0}}>
                  <WinRing pct={Math.round(totalWins/totalGames*100)} size={72}/>
                  <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:700,color:totalWins/totalGames>=0.5?win:loss}}>
                    {Math.round(totalWins/totalGames*100)}%
                  </div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:'20px',fontWeight:700}}>
                    {avgK} / <span style={{color:loss}}>{avgD}</span> / {avgA}
                  </div>
                  <div style={{fontSize:'12px',color:muted,marginTop:'2px'}}>{avgKda} KDA</div>
                  <KdaBar k={Number(avgK)} d={Number(avgD)} a={Number(avgA)}/>
                </div>
              </div>
            </div>

            {/* CHAMPION STATS */}
            <div style={card}>
              <div style={{fontSize:'10px',fontWeight:700,color:muted,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'14px'}}>Champion Stats</div>
              {champList.map((c:any)=>(
                <div key={c.name} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom:border}}>
                  <div style={{width:'36px',height:'36px',borderRadius:'50%',overflow:'hidden',background:bg3,flexShrink:0}}>
                    <img src={`https://ddragon.leagueoflegends.com/cdn/14.8.1/img/champion/${c.name}.png`} style={{width:'100%',height:'100%'}} onError={(e:any)=>e.target.style.opacity='0'}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'13px',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</div>
                    <div style={{fontSize:'11px',color:muted}}>{c.kda} KDA · {c.games}g</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:'14px',fontWeight:700,color:c.wr>=60?win:c.wr>=50?gold:loss}}>{c.wr}%</div>
                    <div style={{fontSize:'10px',color:muted}}>{c.wins}W {c.games-c.wins}L</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MATCH HISTORY */}
          <div>
            <div style={{fontSize:'10px',fontWeight:700,color:muted,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'10px',padding:'0 2px'}}>
              Match History ({d.matches?.length} Ranked Solo)
            </div>
            {d.matches?.map((m:any)=>{
              const me=m.info?.participants?.find((p:any)=>p.puuid===d.account.puuid)
              if(!me) return null
              const matchId=m.metadata?.matchId
              const isOpen=expanded[matchId]
              const kda=me.deaths===0?'∞':((me.kills+me.assists)/me.deaths).toFixed(2)
              const cs=me.totalMinionsKilled+(me.neutralMinionsKilled||0)
              const cspm=(cs/(m.info.gameDuration/60)).toFixed(1)
              const teamKills=m.info.participants.filter((p:any)=>p.teamId===me.teamId).reduce((s:number,p:any)=>s+p.kills,0)
              const kp=teamKills>0?Math.round((me.kills+me.assists)/teamKills*100):0
              const durationStr=`${Math.floor(m.info.gameDuration/60)}:${String(m.info.gameDuration%60).padStart(2,'0')}`

              return (
                <div key={matchId} style={{
                  ...card, marginBottom:'6px',
                  borderLeft:`3px solid ${me.win?win:loss}`,
                  background:me.win?'rgba(62,207,142,0.03)':'rgba(247,90,90,0.03)',
                  borderRadius:'12px', cursor:'pointer',
                  transition:'border-color 0.15s'
                }} onClick={()=>setExpanded(e=>({...e,[matchId]:!e[matchId]}))}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
                    {/* RESULT */}
                    <div style={{width:'50px',flexShrink:0,textAlign:'center'}}>
                      <div style={{fontWeight:700,fontSize:'14px',color:me.win?win:loss}}>{me.win?'WIN':'LOSS'}</div>
                      <div style={{fontSize:'10px',color:muted,marginTop:'2px'}}>{durationStr}</div>
                      <div style={{fontSize:'10px',color:muted}}>Ranked</div>
                    </div>

                    {/* CHAMP */}
                    <div style={{width:'44px',height:'44px',borderRadius:'10px',overflow:'hidden',background:bg3,flexShrink:0,border}}>
                      <img src={`https://ddragon.leagueoflegends.com/cdn/14.8.1/img/champion/${me.championName}.png`} style={{width:'100%',height:'100%'}} onError={(e:any)=>e.target.style.opacity='0'}/>
                    </div>

                    {/* KDA */}
                    <div style={{minWidth:'130px',flexShrink:0}}>
                      <div style={{fontSize:'16px',fontWeight:700}}>
                        {me.kills} / <span style={{color:loss}}>{me.deaths}</span> / {me.assists}
                      </div>
                      <div style={{fontSize:'12px',marginTop:'2px',color:Number(kda)>=4?win:Number(kda)>=2?gold:muted}}>{kda} KDA</div>
                      <KdaBar k={me.kills} d={me.deaths} a={me.assists}/>
                    </div>

                    {/* STATS */}
                    <div style={{flex:1,fontSize:'12px',color:muted,minWidth:'120px'}}>
                      <div>{cs} CS <span style={{color:'#444d60'}}>({cspm}/m)</span></div>
                      <div>KP <span style={{color:'#e8eaf2',fontWeight:500}}>{kp}%</span></div>
                      <div>{me.visionScore} vision</div>
                    </div>

                    {/* ITEMS */}
                    <div style={{flexShrink:0}}>
                      <div style={{display:'flex',gap:'3px',flexWrap:'wrap',maxWidth:'180px'}}>
                        {[me.item0,me.item1,me.item2,me.item3,me.item4,me.item5,me.item6].map((item:number,i:number)=>(
                          <div key={i} style={{width:'26px',height:'26px',borderRadius:'5px',background:bg3,border,overflow:'hidden'}}>
                            {item>0&&<img src={`https://ddragon.leagueoflegends.com/cdn/14.8.1/img/item/${item}.png`} style={{width:'100%',height:'100%'}} onError={(e:any)=>e.target.style.display='none'}/>}
                          </div>
                        ))}
                      </div>
                      <div style={{display:'flex',gap:'4px',marginTop:'5px',flexWrap:'wrap'}}>
                        {me.pentaKills>0&&<span style={{background:'rgba(240,192,64,0.15)',color:gold,fontSize:'10px',fontWeight:700,padding:'2px 7px',borderRadius:'10px'}}>PENTA!</span>}
                        {me.quadraKills>0&&<span style={{background:'rgba(79,142,247,0.12)',color:'#4f8ef7',fontSize:'10px',fontWeight:600,padding:'2px 7px',borderRadius:'10px'}}>Quadra</span>}
                        {me.tripleKills>0&&<span style={{background:'rgba(79,142,247,0.12)',color:'#4f8ef7',fontSize:'10px',fontWeight:600,padding:'2px 7px',borderRadius:'10px'}}>Triple</span>}
                        {me.individualPosition&&<span style={{background:bg3,color:muted,fontSize:'10px',padding:'2px 7px',borderRadius:'10px'}}>{me.individualPosition}</span>}
                      </div>
                    </div>

                    {/* EXPAND */}
                    <div style={{marginLeft:'auto',color:muted,fontSize:'12px',flexShrink:0}}>
                      {isOpen?'▲':'▼'}
                    </div>
                  </div>

                  {isOpen && <Scoreboard match={m} myPuuid={d.account.puuid}/>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}
