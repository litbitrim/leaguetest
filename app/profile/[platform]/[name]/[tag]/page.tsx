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
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#232840" strokeWidth="6" />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

export default function ProfilePage() {
  const { platform, name, tag } = useParams() as any;
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/summoner?name=${name}&tag=${tag}&platform=${platform}&count=30`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setErr(data.error);
        else setD(data);
        setLoading(false);
      })
      .catch(() => { setErr('Fehler beim Laden'); setLoading(false); });
  }, [name, tag, platform]);

  if (loading) return <main className="min-h-screen bg-[#0a0b0f] flex items-center justify-center text-gray-400">Loading profile...</main>;
  if (err) return <main className="min-h-screen bg-[#0a0b0f] flex items-center justify-center text-red-500">{err}</main>;
  if (!d) return <main className="min-h-screen bg-[#0a0b0f] flex items-center justify-center text-gray-400">No data</main>;

  const solo = d.ranked?.find((r: any) => r.queueType === 'RANKED_SOLO_5x5');
  const tierColor = TIER_COLORS[solo?.tier || ''] || '#8b91a8';

  return (
    <main className="min-h-screen bg-[#0a0b0f] text-white pb-12">
      {/* HEADER */}
      <div className="bg-[#11131a] border-b border-[#1f2330] px-6 py-4 flex items-center gap-4">
        <a href="/" className="text-[#4f8ef7] font-semibold">← LoLStats</a>
        <div className="text-gray-500">/</div>
        <div className="font-medium">{d.account.gameName}#{d.account.tagLine}</div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 pt-8">
        {/* MATCH HISTORY */}
        <div className="text-xs font-bold tracking-widest text-gray-400 mb-4 px-2">MATCH HISTORY • LAST 30 GAMES</div>
        
        <div className="space-y-3">
          {d.matches?.map((m: any) => {
            const me = m.info?.participants?.find((p: any) => p.puuid === d.account.puuid);
            if (!me) return null;

            const kda = me.deaths === 0 ? '∞' : ((me.kills + me.assists) / me.deaths).toFixed(2);
            const cs = me.totalMinionsKilled + (me.neutralMinionsKilled || 0);
            const duration = Math.floor(m.info.gameDuration / 60);
            const isExpanded = expanded === m.metadata?.matchId;

            return (
              <div key={m.metadata?.matchId} className="bg-[#11131a] rounded-3xl border border-[#1f2330] overflow-hidden">
                {/* COLLAPSED CARD */}
                <div 
                  onClick={() => setExpanded(isExpanded ? null : m.metadata?.matchId)}
                  className="p-6 flex items-center gap-6 cursor-pointer hover:bg-[#1a1e28] transition-colors"
                >
                  <div className="w-14 text-center">
                    <div className={`font-bold text-xl ${me.win ? 'text-emerald-400' : 'text-red-400'}`}>
                      {me.win ? 'WIN' : 'LOSS'}
                    </div>
                    <div className="text-xs text-gray-500">{duration}m</div>
                  </div>

                  <div className="w-12 h-12 bg-[#232840] rounded-2xl overflow-hidden border border-[#1f2330]">
                    <img 
                      src={`https://ddragon.leagueoflegends.com/cdn/14.8.1/img/champion/${me.championName}.png`}
                      className="w-full h-full object-cover"
                      onError={e => (e.currentTarget.style.opacity = '0')}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="font-semibold">{me.championName}</div>
                    <div className="text-sm text-gray-400">
                      {me.kills}/{me.deaths}/{me.assists} • {kda} KDA • {cs} CS
                    </div>
                  </div>

                  <div className="text-right text-sm text-gray-400">
                    {me.visionScore} vis
                  </div>
                </div>

                {/* EXPANDED SCOREBOARD (wird später noch schöner) */}
                {isExpanded && (
                  <div className="border-t border-[#1f2330] p-6 bg-[#0a0b0f]">
                    <div className="text-sm text-gray-400">Match ID: {m.metadata?.matchId}</div>
                    <div className="mt-4 text-xs text-gray-500">Full scoreboard kommt im nächsten Schritt...</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
