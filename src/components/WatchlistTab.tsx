import { useEffect, useState } from "react";
import { getWatchlist, Match } from "../api";
import { MatchCard } from "./MatchCard";
import { MatchDetail } from "./MatchDetail";

export function WatchlistTab({ watchlistedIds, onToggleWatchlist, onWatchlistChange }: {
  watchlistedIds?: Set<string>;
  onToggleWatchlist?: (matchId: string) => void;
  onWatchlistChange?: () => void;
}) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailMatch, setDetailMatch] = useState<Match | null>(null);

  const fetchWatchlist = () => {
    setLoading(true);
    getWatchlist()
      .then(setMatches)
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-sm">{error}</div>;
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </div>
        <h3 className="text-base font-medium text-gray-900 mb-1">No matches in your watchlist</h3>
        <p className="text-sm text-gray-500">
          Click the star icon on any match card to add it here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        {matches.length} match{matches.length !== 1 ? "es" : ""} in your watchlist
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            prediction={match.prediction}
            onDetail={() => setDetailMatch(match)}
            isWatchlisted={watchlistedIds?.has(match.id)}
            onToggleWatchlist={onToggleWatchlist}
          />
        ))}
      </div>
      {detailMatch && (
        <MatchDetail match={detailMatch} onClose={() => { setDetailMatch(null); fetchWatchlist(); if (onWatchlistChange) onWatchlistChange(); }} />
      )}
    </div>
  );
}
