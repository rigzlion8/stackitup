import { useEffect, useState, useMemo } from "react";
import { getPlayers, getTeams, PlayerInfo, TeamInfo } from "../api";
import { PlayerDetail } from "./PlayerProfile";

const POSITIONS = ["Forward", "Midfielder", "Defender", "Goalkeeper"];
const LEAGUE_ORDER = ["epl", "laliga", "bundesliga", "seriea", "worldcup"];
const LEAGUE_NAMES: Record<string, string> = {
  epl: "Premier League", laliga: "La Liga", bundesliga: "Bundesliga",
  seriea: "Serie A", ucl: "Champions League", worldcup: "International",
};

export function PlayersTab() {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [posFilter, setPosFilter] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getTeams(), getPlayers()])
      .then(([t, p]) => { setTeams(t); setPlayers(p); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (search || teamFilter || posFilter) {
      setLoading(true);
      const t = setTimeout(() => {
        getPlayers({
          search: search || undefined,
          team: teamFilter || undefined,
          position: posFilter || undefined,
        })
          .then(setPlayers)
          .finally(() => setLoading(false));
      }, 300);
      return () => clearTimeout(t);
    }
  }, [search, teamFilter, posFilter]);

  const isFiltering = !!(search || teamFilter || posFilter);

  // Group by team (only when not filtering)
  const groupedByTeam = useMemo(() => {
    if (isFiltering) return null;
    const map: Record<string, PlayerInfo[]> = {};
    for (const p of players) {
      const key = p.teamName || "Unknown";
      if (!map[key]) map[key] = [];
      if (map[key].length < 6) map[key].push(p); // max 6 per team for compact view
    }
    return map;
  }, [players, isFiltering]);

  // Build team→league lookup
  const teamLeague = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of teams) m[t.name] = t.league;
    return m;
  }, [teams]);

  // Sort team names by league order then alphabetically
  const sortedTeams = useMemo(() => {
    if (!groupedByTeam) return [];
    return Object.keys(groupedByTeam).sort((a, b) => {
      const la = teamLeague[a] || "zzz";
      const lb = teamLeague[b] || "zzz";
      const oa = LEAGUE_ORDER.indexOf(la);
      const ob = LEAGUE_ORDER.indexOf(lb);
      if (oa !== ob) return (oa === -1 ? 999 : oa) - (ob === -1 ? 999 : ob);
      return a.localeCompare(b);
    });
  }, [groupedByTeam, teamLeague]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players..."
          className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-gray-400"
        />
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">All Teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setPosFilter("")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!posFilter ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>All</button>
          {POSITIONS.map((pos) => (
            <button key={pos} onClick={() => setPosFilter(pos)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${posFilter === pos ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>{pos}s</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : isFiltering ? (
        /* Filtered results view */
        players.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500">No players found</div>
        ) : (
          <div className="space-y-1.5">
            {players.map((p) => (
              <div key={p.id} onClick={() => setSelectedPlayerId(p.id)}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {p.number || p.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    {p.teamName} · {p.position} · {p.country}
                    {p.fifa_rating && <span className="ml-1 text-yellow-500 font-bold">{p.fifa_rating} EA</span>}
                  </div>
                </div>
                <div className="flex gap-3 text-xs text-gray-500 shrink-0">
                  <span title="Appearances">{p.stats.appearances} app</span>
                  <span title="Goals" className="text-green-600 font-medium">{p.stats.goals} G</span>
                  <span title="Assists" className="text-blue-600 font-medium">{p.stats.assists} A</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Default grouped view */
        <div className="space-y-6">
          {sortedTeams.map((teamName) => {
            const league = teamLeague[teamName];
            const teamPlayers = groupedByTeam![teamName];
            return (
              <div key={teamName}>
                {league && (
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {LEAGUE_NAMES[league] || league}
                  </h3>
                )}
                <div className="space-y-1.5">
                  <div className="text-[11px] text-gray-400 font-medium mb-1 ml-1">{teamName}</div>
                  {teamPlayers.map((p) => (
                    <div key={p.id} onClick={() => setSelectedPlayerId(p.id)}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {p.number || p.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          {p.position} · {p.country}
                          {p.fifa_rating && <span className="ml-1 text-yellow-500 font-bold">{p.fifa_rating} EA</span>}
                        </div>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500 shrink-0">
                        <span title="Appearances" className="tabular-nums">{p.stats.appearances} app</span>
                        <span title="Goals" className="text-green-600 font-medium tabular-nums">{p.stats.goals} G</span>
                        <span title="Assists" className="text-blue-600 font-medium tabular-nums">{p.stats.assists} A</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedPlayerId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center overflow-y-auto bg-black/40 backdrop-blur-sm">
          <div className="relative w-full sm:max-w-md mx-auto mt-14 sm:mt-0">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 max-h-[85vh] overflow-y-auto p-5">
              <PlayerDetail playerId={selectedPlayerId} onBack={() => setSelectedPlayerId(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
