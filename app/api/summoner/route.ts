import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')
  const tag  = req.nextUrl.searchParams.get('tag')

  if (!name || !tag) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const res = await fetch(
    `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
    { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY! } }
  )

  if (!res.ok) return NextResponse.json({ error: 'Summoner not found' }, { status: 404 })
  const data = await res.json()
  return NextResponse.json(data)
}
