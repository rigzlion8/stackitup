import { useEffect, useState } from "react";
import { getTeamPlayers, PlayerInfo, getTeam, TeamInfo } from "../api";
import { FormationPitch } from "./FormationPitch";

const POSITION_ORDER = ["Goalkeeper", "Defender", "Midfielder", "Forward"];

function StatBadge({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center px-2">
      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{value}</div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</div>
    </div>
  );
}

export function TeamDetail({ teamId, teamName, onPlayerClick }: {
  teamId: string;
  teamName: string;
  onPlayerClick?: (player: PlayerInfo) => void;
}) {
  const [allPlayers, setAllPlayers] = useState<PlayerInfo[]>([]);
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [posFilter, setPosFilter] = useState("");
  const [viewMode, setViewMode] = useState<"squad" | "formation">("squad");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getTeamPlayers(teamId), // always fetch all players for formation
      getTeam(teamId),
    ])
      .then(([p, t]) => { setAllPlayers(p); setTeam(t); })
      .finally(() => setLoading(false));
  }, [teamId]);

  // Filter for squad view only
  const players = posFilter
    ? allPlayers.filter(p => p.position === posFilter)
    : allPlayers;

  const grouped = POSITION_ORDER.map((pos) => ({
    position: pos,
    players: players.filter((p) => p.position === pos),
  })).filter((g) => g.players.length > 0);

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-4">
      {/* Coach + Formation info */}
      {team && (team.coach || team.formation) && (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/30">
          {team.coach && (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Head Coach</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{team.coach}</div>
              </div>
            </div>
          )}
          {team.formation && (
            <div className="flex items-center gap-2 ml-auto">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Formation</div>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded">{team.formation}</span>
            </div>
          )}
        </div>
      )}

      {/* View toggle: Squad / Formation */}
      <div className="flex gap-2">
        <button onClick={() => setViewMode("squad")} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === "squad" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>Squad</button>
        <button onClick={() => setViewMode("formation")} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === "formation" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>Formation</button>
      </div>

      {viewMode === "formation" ? (
        <FormationPitch formation={team?.formation || "4-3-3"} players={allPlayers} />
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setPosFilter("")} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!posFilter ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>All</button>
            {POSITION_ORDER.map((pos) => (
              <button key={pos} onClick={() => setPosFilter(pos)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${posFilter === pos ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>{pos}s</button>
            ))}
          </div>

          {grouped.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No players found</p>
          ) : (
            grouped.map((group) => (
              <div key={group.position}>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{group.position}s ({group.players.length})</h4>
                <div className="space-y-1.5">
                  {group.players.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => onPlayerClick?.(p)}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {p.number || p.name.charAt(0)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          {p.country} {p.fifa_rating && <span className="ml-1 text-yellow-500 font-bold">{p.fifa_rating} EA</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <StatBadge label="G" value={p.stats.goals} />
                        <StatBadge label="A" value={p.stats.assists} />
                        {p.position === "Goalkeeper" && <StatBadge label="CS" value={p.stats.clean_sheets} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
