import { useEffect, useState } from "react";
import { getTeams, TeamInfo, PlayerInfo } from "../api";
import { TeamSearch } from "./TeamSearch";
import { TeamDetail } from "./TeamDetail";
import { PlayerDetail } from "./PlayerProfile";

const LEAGUE_NAMES: Record<string, string> = {
  epl: "Premier League", laliga: "La Liga", bundesliga: "Bundesliga",
  seriea: "Serie A", ucl: "Champions League", worldcup: "International",
};

export function TeamsTab() {
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamInfo | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null);

  useEffect(() => {
    getTeams().then(setTeams).finally(() => setLoading(false));
  }, []);

  // Group by league
  const grouped = teams.reduce((acc, t) => {
    const league = t.league;
    if (!acc[league]) acc[league] = [];
    acc[league].push(t);
    return acc;
  }, {} as Record<string, TeamInfo[]>);

  // Sort leagues: EPL first, then by name
  const leagueOrder = Object.keys(grouped).sort((a, b) => {
    if (a === "epl") return -1;
    if (b === "epl") return 1;
    return (LEAGUE_NAMES[a] || a).localeCompare(LEAGUE_NAMES[b] || b);
  });

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <TeamSearch onSelectTeam={setSelectedTeam} placeholder="Search teams..." />

      {!selectedTeam && (
        <div className="space-y-6">
          {leagueOrder.map((league) => (
            <div key={league}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {LEAGUE_NAMES[league] || league}
                <span className="text-gray-400 font-normal normal-case">({grouped[league].length})</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {grouped[league].map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-200 dark:hover:border-blue-800 border border-transparent transition-all cursor-pointer text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {team.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{team.name}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">{team.country}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTeam && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm">{selectedTeam.name.charAt(0)}</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedTeam.name}</h2>
                <p className="text-xs text-gray-500">{selectedTeam.leagueName} · {selectedTeam.country}</p>
              </div>
            </div>
            <button onClick={() => { setSelectedTeam(null); setSelectedPlayer(null); }} className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer">✕ Clear</button>
          </div>

          <TeamDetail teamId={selectedTeam.id} teamName={selectedTeam.name} onPlayerClick={setSelectedPlayer} />

          {selectedPlayer && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <PlayerDetail playerId={selectedPlayer.id} onBack={() => setSelectedPlayer(null)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
