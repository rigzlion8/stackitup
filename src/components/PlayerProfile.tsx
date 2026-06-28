import { useEffect, useState } from "react";
import { getPlayer, PlayerProfile } from "../api";

function StatCell({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{value}</div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</div>
    </div>
  );
}

export function PlayerDetail({ playerId, onBack }: { playerId: string; onBack: () => void }) {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPlayer(playerId)
      .then(setPlayer)
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (!player) return <div className="text-center py-12 text-sm text-gray-500">Player not found</div>;

  const latestStats = player.stats?.[0] || { appearances: 0, goals: 0, assists: 0, clean_sheets: 0, yellow_cards: 0, red_cards: 0, minutes_played: 0, fantasy_points: 0, fantasy_value: 0, season: "" };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Back
      </button>

      {/* Player Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-5 text-white">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {player.number || player.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold truncate">{player.name}</h2>
            <p className="text-blue-200 text-sm">{player.teamName} · #{player.number}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-blue-200">
              <span>{player.country}</span>
              <span>·</span>
              <span>{player.position}</span>
              {player.fifa_rating && <><span>·</span><span className="text-yellow-300 font-bold">EA {player.fifa_rating}</span></>}
              {player.preferred_foot && <><span>·</span><span className="text-blue-200">{player.preferred_foot === "R" ? "Right" : player.preferred_foot === "L" ? "Left" : "Both"} foot</span></>}
            </div>
          </div>
        </div>
      </div>

      {/* Season Stats (latest) */}
      {latestStats.season && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{latestStats.season} Season</h4>
          <div className="grid grid-cols-4 gap-3">
            <StatCell label="Apps" value={latestStats.appearances} />
            <StatCell label="Goals" value={latestStats.goals} />
            <StatCell label="Assists" value={latestStats.assists} />
            <StatCell label="Mins" value={latestStats.minutes_played} />
          </div>
          <div className="grid grid-cols-4 gap-3 mt-3">
            <StatCell label="CS" value={latestStats.clean_sheets} />
            <StatCell label="YC" value={latestStats.yellow_cards} />
            <StatCell label="RC" value={latestStats.red_cards} />
            <StatCell label="Fantasy" value={latestStats.fantasy_points} />
          </div>
        </div>
      )}

      {/* Player Info */}
      <div className="grid grid-cols-2 gap-3">
        {player.birth_date && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Birth Date</div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{player.birth_date}</div>
          </div>
        )}
        {player.height && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Height</div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{player.height} cm</div>
          </div>
        )}
        {player.weight && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Weight</div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{player.weight} kg</div>
          </div>
        )}
        {player.transfer_fee != null && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Transfer Fee</div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">€{player.transfer_fee}M</div>
          </div>
        )}
        {player.preferred_foot && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Preferred Foot</div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{player.preferred_foot === "R" ? "Right" : player.preferred_foot === "L" ? "Left" : "Both"}</div>
          </div>
        )}
        {player.market_value != null && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 col-span-2 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800">
            <div className="text-[10px] text-green-600 dark:text-green-400 uppercase tracking-wider font-semibold">Estimated Market Value</div>
            <div className="text-lg font-bold text-green-700 dark:text-green-300">€{player.market_value}M</div>
          </div>
        )}
        {player.wages != null && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Wages</div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">€{player.wages}K/wk</div>
          </div>
        )}
        {latestStats.fantasy_value > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Fantasy Value</div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">€{latestStats.fantasy_value}M</div>
          </div>
        )}
      </div>
    </div>
  );
}
