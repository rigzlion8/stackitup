import { MatchCard } from "./MatchCard";
import { useEffect, useState } from "react";
import { getLeagues, getUpcomingMatches, generateBulkPredictions } from "../api";

export function MatchList() {
  const [selectedLeague, setSelectedLeague] = useState<string>("");
  const [daysAhead, setDaysAhead] = useState(7);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [predicting, setPredicting] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getLeagues(),
      getUpcomingMatches({ leagueId: selectedLeague || undefined, days: daysAhead }),
    ])
      .then(([ls, ms]) => {
        if (cancelled) return;
        setLeagues(ls);
        setMatches(ms);
      })
      .catch((e) => !cancelled && setError(e.message || "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selectedLeague, daysAhead]);
  
  useEffect(() => {
    setPage(1);
  }, [selectedLeague, daysAhead, matches.length]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            League
          </label>
          <select
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white"
          >
            <option value="">All Leagues</option>
            {leagues.map((league) => (
              <option key={league.id} value={league.id}>
                {league.name} ({league.country})
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Days Ahead
          </label>
          <select
            value={daysAhead}
            onChange={(e) => setDaysAhead(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white"
          >
            <option value={1}>Today</option>
            <option value={3}>Next 3 days</option>
            <option value={7}>Next week</option>
            <option value={14}>Next 2 weeks</option>
          </select>
        </div>
      </div>

      {/* Matches */}
      {matches.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⚽</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No matches found
          </h3>
          <p className="text-gray-500">
            Try adjusting your filters or check back later
          </p>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <button
              onClick={async () => {
                setBulkLoading(true);
                try {
                  const ids = matches.map((m) => m.id);
                  const res = await generateBulkPredictions(ids);
                  if (res?.results) {
                    setMatches((ms) =>
                      ms.map((m) => {
                        const r = (res.results as any)[m.id];
                        if (r?.prediction) {
                          return { ...m, prediction: r.prediction };
                        }
                        return m;
                      }),
                    );
                  }
                } finally {
                  setBulkLoading(false);
                }
              }}
              disabled={bulkLoading}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {bulkLoading ? "Predicting all..." : "Predict All"}
            </button>
          </div>
          <div className="grid gap-4">
            {matches
              .slice((page - 1) * pageSize, page * pageSize)
              .map((match) => (
              <MatchCard key={match.id} match={match} prediction={match.prediction} />
            ))}
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-gray-600">
              Showing{" "}
              {Math.min((page - 1) * pageSize + 1, matches.length)}-
              {Math.min(page * pageSize, matches.length)} of {matches.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded border text-sm disabled:opacity-50 bg-white hover:bg-gray-50"
              >
                Prev
              </button>
              <button
                onClick={() =>
                  setPage((p) => (p * pageSize < matches.length ? p + 1 : p))
                }
                disabled={page * pageSize >= matches.length}
                className="px-3 py-1.5 rounded border text-sm disabled:opacity-50 bg-white hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
