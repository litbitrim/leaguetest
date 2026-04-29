import { NextRequest, NextResponse } from 'next/server'

const PLATFORMS: Record<string,string> = { euw:'euw1',na:'na1',kr:'kr',eune:'eun1',br:'br1' }
const REGIONS: Record<string,string> = { euw:'europe',na:'americas',kr:'asia',eune:'europe',br:'americas' }

async function riotFetch(url: string, key: string) {
  const r = await fetch(url, { headers: { 'X-Riot-Token': key }, next: { revalidate: 0 } })
  if (!r.ok) return null
  return r.json()
}

export const maxDuration = 60 // Vercel Pro timeout, ignored on free but shows intent

export async function GET(req: NextRequest) {
  const name     = req.nextUrl.searchParams.get('name')
  const tag      = req.nextUrl.searchParams.get('tag')
  const platform = req.nextUrl.searchParams.get('platform') ?? 'euw'
  const KEY      = process.env.RIOT_API_KEY!
  const region   = REGIONS[platform] ?? 'europe'
  const plat     = PLATFORMS[platform] ?? 'euw1'

  const account = await riotFetch(
    `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name!)}/${encodeURIComponent(tag!)}`, KEY)
  if (!account?.puuid) return NextResponse.json({ error: 'Summoner not found' }, { status: 404 })

  const puuid = account.puuid

  // Parallel: summoner + ranked + live
  const [summoner, ranked, liveGame] = await Promise.all([
    riotFetch(`https://${plat}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`, KEY),
    riotFetch(`https://${plat}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`, KEY),
    riotFetch(`https://${plat}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}`, KEY),
  ])

  // Fetch ALL match IDs from current season (up to 2500 via pagination)
  const allIds: string[] = []
  let start = 0
  while (allIds.length < 2500) {
    const batch: string[] | null = await riotFetch(
      `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=100&start=${start}`, KEY)
    if (!batch || batch.length === 0) break
    allIds.push(...batch)
    if (batch.length < 100) break
    start += 100
    await new Promise(r => setTimeout(r, 50))
  }

  console.log(`Fetched ${allIds.length} match IDs for ${name}`)

  // Recent 20 for match history display (full data)
  const recentIds = allIds.slice(0, 20)
  const recentMatches = (await Promise.all(
    recentIds.map((id: string) => riotFetch(`https://${region}.api.riotgames.com/lol/match/v5/matches/${id}`, KEY))
  )).filter(Boolean)

  // ALL matches for champion stats (fetch in parallel batches of 20)
  const allMatchData: any[] = [...recentMatches]
  const remainingIds = allIds.slice(20)
  
  for (let i = 0; i < remainingIds.length; i += 20) {
    const batch = await Promise.all(
      remainingIds.slice(i, i+20).map((id: string) =>
        riotFetch(`https://${region}.api.riotgames.com/lol/match/v5/matches/${id}`, KEY)
      )
    )
    allMatchData.push(...batch.filter(Boolean))
    await new Promise(r => setTimeout(r, 50))
  }

  return NextResponse.json({
    account,
    summoner,
    ranked: ranked ?? [],
    liveGame,
    matches: recentMatches,        // 20 recent for match history
    allMatches: allMatchData,      // ALL for champion stats
    totalFetched: allMatchData.length,
  })
}
