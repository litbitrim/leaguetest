'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const TIER_COLORS: Record<string, string> = {
  IRON: '#7a7a8c', BRONZE: '#8c6a3f', SILVER: '#7a8c9e', GOLD: '#f0c040',
  PLATINUM: '#4fc3a1', EMERALD: '#2ecc71', DIAMOND: '#5b9bd5',
  MASTER: '#9b59b6', GRANDMASTER: '#e74c3c', CHALLENGER: '#f1c40f'
};

function WinRateRing({ pct, size = 64 }: { pct: number; size?: number }) {
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 60 ? '#3ecf8e' : pct >= 50 ? '#f0c040' : '#f75a5a';

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#232840"
        strokeWidth="6"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

function KdaBar({ k, d, a }: { k: number; d: number; a: number }) {
  const total = k + d + a || 1;
  return (
    <div className="h-1.5 bg-[#232840] rounded-full overflow-hidden mt-2 flex">
      <div className="h-full bg-[#3ecf8e]" style={{ width: `${(k / total) * 100}%` }} />
      <div className="h-full bg-[#f75a5a]" style={{ width: `${(d / total) * 100}%` }} />
      <div className="h-full bg-[#4f8ef7]" style={{ width: `${(a / total) * 100}%` }} />
    </div>
  );
}

export default function ProfilePage() {
  const { platform, name, tag } = useParams() as any;
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/summoner?name=${name}&tag=${tag}&platform=${platform}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setErr(data.error);
        else setD(data);
        setLoading(false);
      })
      .catch(() => {
        setErr('Fehler beim Laden der Daten');
        setLoading(false);
      });
  }, [name, tag, platform]);

  const solo = d?.ranked?.find((r: any) => r.queueType === 'RANKED_SOLO_5x5');
  const flex = d?.ranked?.find((r: any) => r.queueType === 'RANKED_FLEX_SR');

  const champStats = d?.matches?.reduce((acc: any, m: any) => {
    const me = m.info?.participants?.find((p: any) => p.puuid === d.account.puuid);
    if (!me) return acc;
    const c = me.championName;
    if (!acc[c]) acc[c] = { wins: 0, games: 0, kills: 0, deaths: 0, assists: 0 };
    acc[c].games++;
    if (me.win) acc[c].wins++;
    acc[c].kills += me.kills;
    acc[c].deaths += me.deaths;
    acc[c].assists += me.assists;
    return acc;
  }, {});

  const champList = champStats
    ? Object.entries(champStats)
        .map(([name, s]: any) => ({
          name,
          ...s,
          wr: Math.round((s.wins / s.games) * 100),
          kda: s.deaths === 0 ? '∞' : ((s.kills + s.assists) / s.deaths).toFixed(1),
        }))
        .sort((a: any, b: any) => b.games - a.games)
        .slice(0, 5)
    : [];

  const totalGames = d?.matches?.length || 0;
  const totalWins = d?.matches?.filter((m: any) =>
    m.info?.participants?.find((p: any) => p.puuid === d?.account?.puuid)?.win
  ).length || 0;

  const avgKills = totalGames
    ? (d.matches.reduce((s: number, m: any) => {
        const me = m.info?.participants?.find((p: any) => p.puuid === d.account.puuid);
        return s + (me?.kills || 0);
      }, 0) / totalGames).toFixed(1)
    : '0';

  const avgDeaths = totalGames
    ? (d.matches.reduce((s: number, m: any) => {
        const me = m.info?.participants?.find((p: any) => p.puuid === d.account.puuid);
        return s + (me?.deaths || 0);
      }, 0) / totalGames).toFixed(1)
    : '0';

  const avgAssists = totalGames
    ? (d.matches.reduce((s: number, m: any) => {
        const me = m.info?.participants?.find((p: any) => p.puuid === d.account.puuid);
        return s + (me?.assists || 0);
      }, 0) / totalGames).toFixed(1)
    : '0';

  if (err) {
    return (
      <main className="min-h-screen bg-[#0a0b0f] text-white flex items-center justify-center">
        <div className="text-red-500 text-xl">{err}</div>
      </main>
    );
  }

  if (loading || !d) {
    return (
      <main className="min-h-screen bg-[#0a0b0f] text-white flex items-center justify-center">
        <div className="text-gray-400">Loading profile...</div>
      </main>
    );
  }

  const tierColor = TIER_COLORS[solo?.tier || ''] || '#8b91a8';

  return (
    <main className="min-h-screen bg-[#0a0b0f] text-white pb-12">
      {/* NAVBAR */}
      <div className="bg-[#11131a] border-b border-[#1f2330] px-6 py-4 flex items-center gap-4">
        <a href="/" className="text-[#4f8ef7] font-semibold flex items-center gap-2 hover:text-blue-400 transition-colors">
          ← LoLStats
        </a>
        <div className="text-gray-500">/</div>
        <div className="font-medium">{name}#{tag}</div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 pt-8">
        {/* HEADER */}
        <div className="bg-[#11131a] rounded-3xl p-6 flex items-center gap-6 border border-[#1f2330]">
          <div className="relative w-20 h-20 flex-shrink-0">
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/14.8.1/img/profileicon/${d.summoner.profileIconId}.png`}
              className="w-full h-full rounded-2xl border-2 border-[#232840]"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#232840] text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#1f2330]">
              {d.summoner.summonerLevel}
            </div>
          </div>

          <div className="flex-1">
            <h1 className="text-4xl font-bold tracking-tighter">
              {d.account.gameName}
              <span className="text-gray-500 text-3xl">#{d.account.tagLine}</span>
            </h1>
            <div className="text-gray-400 font-medium">{platform.toUpperCase()}</div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="bg-[#4f8ef7] hover:bg-blue-600 px-8 py-3 rounded-2xl font-semibold transition-colors"
          >
            Update
          </button>
        </div>

        <div className="grid grid-cols-12 gap-6 mt-8">
          {/* SIDEBAR */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* RANKS */}
            <div className="bg-[#11131a] rounded-3xl p-6 border border-[#1f2330]">
              {[
                { q: solo, label: 'Ranked Solo/Duo' },
                { q: flex, label: 'Ranked Flex' },
              ].map(({ q, label }, i) => (
                <div key={i} className={i === 0 ? 'mb-8 pb-8 border-b border-[#232840]' : ''}>
                  <div className="text-xs font-bold tracking-widest text-gray-400 mb-4">{label}</div>
                  {q ? (
                    <div className="flex items-center gap-5">
                      <div className="relative">
                        <WinRateRing pct={Math.round((q.wins / (q.wins + q.losses)) * 100)} />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                          {Math.round((q.wins / (q.wins + q.losses)) * 100)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold" style={{ color: tierColor }}>
                          {q.tier} {q.rank}
                        </div>
                        <div className="text-gray-300 text-lg">{q.leaguePoints} LP</div>
                        <div className="mt-2 text-sm">
                          <span className="text-emerald-400">{q.wins}W</span>
                          <span className="text-gray-500 mx-1">/</span>
                          <span className="text-red-400">{q.losses}L</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-xl">Unranked</div>
                  )}
                </div>
              ))}
            </div>

            {/* LAST GAMES SUMMARY */}
            <div className="bg-[#11131a] rounded-3xl p-6 border border-[#1f2330]">
              <div className="text-xs font-bold tracking-widest text-gray-400 mb-4">LAST {totalGames} GAMES</div>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <WinRateRing pct={Math.round((totalWins / totalGames) * 100)} size={72} />
                  <div className="absolute inset-0 flex items-center justify-center text-base font-bold">
                    {Math.round((totalWins / totalGames) * 100)}%
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-3xl font-bold">
                    {avgKills} / <span className="text-red-400">{avgDeaths}</span> / {avgAssists}
                  </div>
                  <div className="text-sm text-gray-400">
                    {avgDeaths === '0' ? '∞' : ((Number(avgKills) + Number(avgAssists)) / Number(avgDeaths)).toFixed(2)} KDA
                  </div>
                  <KdaBar k={Number(avgKills)} d={Number(avgDeaths)} a={Number(avgAssists)} />
                </div>
              </div>
            </div>

            {/* MOST PLAYED */}
            <div className="bg-[#11131a] rounded-3xl p-6 border border-[#1f2330]">
              <div className="text-xs font-bold tracking-widest text-gray-400 mb-4">MOST PLAYED</div>
              {champList.map((c: any) => (
                <div key={c.name} className="flex items-center gap-4 py-4 border-b border-[#232840] last:border-0">
                  <div className="w-10 h-10 bg-[#232840] rounded-xl overflow-hidden flex-shrink-0">
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/14.8.1/img/champion/${c.name}.png`}
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-gray-400">
                      {c.kda} KDA • {c.games} games
                    </div>
                  </div>
                  <div className={`font-bold text-lg ${c.wr >= 60 ? 'text-emerald-400' : c.wr >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {c.wr}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MATCH HISTORY */}
          <div className="col-span-12 lg:col-span-8">
            <div className="text-xs font-bold tracking-widest text-gray-400 mb-4 px-2">MATCH HISTORY</div>
            <div className="space-y-3">
              {d.matches?.map((m: any) => {
                const me = m.info?.participants?.find((p: any) => p.puuid === d.account.puuid);
                if (!me) return null;

                const kda = me.deaths === 0 ? 'Perfect' : ((me.kills + me.assists) / me.deaths).toFixed(2);
                const cs = me.totalMinionsKilled + (me.neutralMinionsKilled || 0);
                const durationMin = Math.floor(m.info.gameDuration / 60);
                const cspm = (cs / (m.info.gameDuration / 60)).toFixed(1);

                const teamKills = m.info.participants
                  .filter((p: any) => p.teamId === me.teamId)
                  .reduce((sum: number, p: any) => sum + p.kills, 0);
                const kp = teamKills > 0 ? Math.round(((me.kills + me.assists) / teamKills) * 100) : 0;

                return (
                  <div
                    key={m.metadata?.matchId}
                    className={`bg-[#11131a] rounded-3xl p-6 flex items-center gap-6 border border-[#1f2330] hover:border-[#2a2f3f] transition-all ${
                      me.win ? 'border-l-4 border-l-emerald-400' : 'border-l-4 border-l-red-400'
                    }`}
                  >
                    <div className="w-14 text-center flex-shrink-0">
                      <div className={`font-bold text-xl ${me.win ? 'text-emerald-400' : 'text-red-400'}`}>
                        {me.win ? 'WIN' : 'LOSS'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{durationMin}m</div>
                    </div>

                    <div className="w-12 h-12 bg-[#232840] rounded-2xl overflow-hidden flex-shrink-0 border border-[#1f2330]">
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/14.8.1/img/champion/${me.championName}.png`}
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.style.opacity = '0')}
                      />
                    </div>

                    <div className="w-40 flex-shrink-0">
                      <div className="font-semibold text-lg">
                        {me.kills} / <span className="text-red-400">{me.deaths}</span> / {me.assists}
                      </div>
                      <div className="text-sm font-medium text-emerald-400">{kda} KDA</div>
                      <KdaBar k={me.kills} d={me.deaths} a={me.assists} />
                    </div>

                    <div className="flex-1 text-sm text-gray-400 space-y-1">
                      <div>
                        {cs} CS <span className="text-[#555d78]">({cspm}/m)</span>
                      </div>
                      <div>
                        KP <span className="text-white font-medium">{kp}%</span>
                      </div>
                      <div>{me.visionScore} vision</div>
                    </div>

                    <div className="flex-shrink-0">
                      <div className="flex gap-1.5">
                        {[me.item0, me.item1, me.item2, me.item3, me.item4, me.item5, me.item6].map((item: number, i: number) => (
                          <div
                            key={i}
                            className="w-7 h-7 bg-[#232840] rounded-lg overflow-hidden border border-[#1f2330]"
                          >
                            {item > 0 && (
                              <img
                                src={`https://ddragon.leagueoflegends.com/cdn/14.8.1/img/item/${item}.png`}
                                className="w-full h-full"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs font-bold flex flex-col items-end gap-1">
                      {me.pentaKills > 0 && <span className="text-yellow-400">PENTA!</span>}
                      {me.quadraKills > 0 && <span className="text-blue-400">Quadra</span>}
                      {me.tripleKills > 0 && <span className="text-blue-400">Triple</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
