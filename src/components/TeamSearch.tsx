import { useState, useEffect, useRef } from "react";
import { getTeams, TeamInfo } from "../api";

interface TeamSearchProps {
  onSelectTeam: (team: TeamInfo) => void;
  placeholder?: string;
}

export function TeamSearch({ onSelectTeam, placeholder }: TeamSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TeamInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (query.length < 1) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const teams = await getTeams({ search: query });
        setResults(teams.slice(0, 8));
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder || "Search teams..."}
        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow placeholder:text-gray-400"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
        </div>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((team) => (
            <button
              key={team.id}
              onClick={() => { onSelectTeam(team); setQuery(""); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {team.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{team.name}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">{team.leagueName} · {team.country}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
