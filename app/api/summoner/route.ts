import { NextRequest, NextResponse } from 'next/server'

const PLATFORMS: Record<string, string> = {
  euw: 'euw1', na: 'na1', kr: 'kr', eune: 'eun1', br: 'br1'
}
const REGIONS: Record<string, string> = {
  euw: 'europe', na: 'americas', kr: 'asia', eune: 'europe', br: 'americas'
}

export async function GET(req: NextRequest) {
  const name     = req.nextUrl.searchParams.get('name')
  const tag      = req.nextUrl.searchParams.get('tag')
  const platform = req.nextUrl.searchParams.get('platform') ?? 'euw'
  const KEY      = process.env.RIOT_API_KEY!
  const region   = REGIONS[platform] ?? 'europe'
  const plat     = PLATFORMS[platform] ?? 'euw1'

  const accountRes = await fetch(
    `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name!)}/${encodeURIComponent(tag!)}`,
    { headers: { 'X-Riot-Token': KEY } }
  )
  if (!accountRes.ok) return NextResponse.json({ error: 'Summoner not found' }, { status: 404 })
  const account = await accountRes.json()

  const summonerRes = await fetch(
    `https://${plat}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}`,
    { headers: { 'X-Riot-Token': KEY } }
  )
  const summoner = await summonerRes.json()

  const rankedRes = await fetch(
    `https://${plat}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.id}`,
    { headers: { 'X-Riot-Token': KEY } }
  )
  const ranked = await rankedRes.json()

  const matchIdsRes = await fetch(
    `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${account.puuid}/ids?count=10`,
    { headers: { 'X-Riot-Token': KEY } }
  )
  const matchIds = await matchIdsRes.json()

  const matches = await Promise.all(
    matchIds.map((id: string) =>
      fetch(`https://${region}.api.riotgames.com/lol/match/v5/matches/${id}`, { headers: { 'X-Riot-Token': KEY } }).then(r => r.json())
    )
  )

  return NextResponse.json({ account, summoner, ranked, matches })
}
