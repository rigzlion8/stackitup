import { useState, useEffect } from "react";
import { compareTeams, HeadToHeadComparison, getTeams, TeamInfo } from "../api";

export function HeadToHead() {
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [team1Query, setTeam1Query] = useState("");
  const [team2Query, setTeam2Query] = useState("");
  const [selected1, setSelected1] = useState<TeamInfo | null>(null);
  const [selected2, setSelected2] = useState<TeamInfo | null>(null);
  const [comparison, setComparison] = useState<HeadToHeadComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(true);

  useEffect(() => {
    getTeams().then(setTeams).finally(() => setTeamsLoading(false));
  }, []);

  const filtered1 = team1Query.length > 0
    ? teams.filter((t) => t.name.toLowerCase().includes(team1Query.toLowerCase()) && t.id !== selected2?.id)
    : [];
  const filtered2 = team2Query.length > 0
    ? teams.filter((t) => t.name.toLowerCase().includes(team2Query.toLowerCase()) && t.id !== selected1?.id)
    : [];

  const handleCompare = async () => {
    if (!selected1 || !selected2) return;
    setLoading(true);
    try {
      const result = await compareTeams(selected1.id, selected2.id);
      setComparison(result);
    } finally {
      setLoading(false);
    }
  };

  const StatBar = ({ left, right, label, max }: { left: number; right: number; label: string; max: number }) => {
    const leftPct = max > 0 ? (left / max) * 100 : 50;
    const rightPct = max > 0 ? (right / max) * 100 : 50;
    return (
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 w-12 text-right">{left}</span>
        <div className="flex-1 flex gap-0.5">
          <div className="flex-1 flex justify-end">
            <div className="h-2 rounded-l bg-blue-500 transition-all" style={{ width: `${leftPct}%` }} />
          </div>
          <div className="flex-1">
            <div className="h-2 rounded-r bg-red-500 transition-all" style={{ width: `${rightPct}%` }} />
          </div>
        </div>
        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 w-12 text-left">{right}</span>
      </div>
    );
  };

  if (teamsLoading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Team 1</label>
          {selected1 ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">{selected1.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{selected1.name}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">{selected1.leagueName}</div>
              </div>
              <button onClick={() => { setSelected1(null); setComparison(null); }} className="text-gray-400 hover:text-red-500 cursor-pointer">✕</button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text" value={team1Query}
                onChange={(e) => setTeam1Query(e.target.value)}
                placeholder="Search team..."
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-gray-400"
              />
              {filtered1.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filtered1.slice(0, 6).map((t) => (
                    <button key={t.id} onClick={() => { setSelected1(t); setTeam1Query(""); }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-900 dark:text-gray-100">{t.name} ({t.leagueName})</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Team 2</label>
          {selected2 ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-950/30">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-xs font-bold shrink-0">{selected2.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{selected2.name}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">{selected2.leagueName}</div>
              </div>
              <button onClick={() => { setSelected2(null); setComparison(null); }} className="text-gray-400 hover:text-red-500 cursor-pointer">✕</button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text" value={team2Query}
                onChange={(e) => setTeam2Query(e.target.value)}
                placeholder="Search team..."
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-gray-400"
              />
              {filtered2.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filtered2.slice(0, 6).map((t) => (
                    <button key={t.id} onClick={() => { setSelected2(t); setTeam2Query(""); }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-900 dark:text-gray-100">{t.name} ({t.leagueName})</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleCompare}
        disabled={!selected1 || !selected2 || loading}
        className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        {loading ? "Comparing..." : "Compare Teams"}
      </button>

      {comparison && (
        <div className="space-y-6">
          {/* Squad Stats */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Squad Comparison</h4>
            <StatBar left={comparison.team1.squad.total} right={comparison.team2.squad.total} label="Players" max={Math.max(comparison.team1.squad.total, comparison.team2.squad.total)} />
            <StatBar left={comparison.team1.squad.goals} right={comparison.team2.squad.goals} label="Goals" max={Math.max(comparison.team1.squad.goals, comparison.team2.squad.goals)} />
            <StatBar left={comparison.team1.squad.assists} right={comparison.team2.squad.assists} label="Assists" max={Math.max(comparison.team1.squad.assists, comparison.team2.squad.assists)} />
            <StatBar left={comparison.team1.squad.clean_sheets} right={comparison.team2.squad.clean_sheets} label="Clean Sheets" max={Math.max(comparison.team1.squad.clean_sheets, comparison.team2.squad.clean_sheets)} />
          </div>

          {/* Position Breakdown */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Position Breakdown</h4>
            {["Goalkeeper", "Defender", "Midfielder", "Forward"].map((pos) => {
              const l = comparison.team1.positions[pos] || 0;
              const r = comparison.team2.positions[pos] || 0;
              return <StatBar key={pos} left={l} right={r} label={pos + "s"} max={Math.max(l, r)} />;
            })}
          </div>

          {/* Head to Head Matches */}
          {comparison.h2hMatches.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Encounters</h4>
              <div className="space-y-2">
                {comparison.h2hMatches.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-900 text-sm">
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{m.homeTeamName}</span>
                    <span className="text-xs text-gray-400">vs</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{m.awayTeamName}</span>
                    <span className="text-[11px] text-gray-500">{new Date(m.matchDate).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
