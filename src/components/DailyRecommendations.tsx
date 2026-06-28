import { useEffect, useState } from "react";
import { getTodaysRecommendations, Match } from "../api";
import { MatchCard } from "./MatchCard.tsx";
import { MatchDetail } from "./MatchDetail.tsx";

export function DailyRecommendations() {
  const [recommendations, setRecommendations] = useState<null | Awaited<ReturnType<typeof getTodaysRecommendations>>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [detailMatch, setDetailMatch] = useState<Match | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(1);
  const pageSize = 10;

  const fetchTips = () => {
    setLoading(true);
    setError(null);
    getTodaysRecommendations(days)
      .then(setRecommendations)
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchTips();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchTips(); }, [days]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        {error}
      </div>
    );
  }

  if (!recommendations || recommendations.matches.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎯</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No recommendations available today
        </h3>
        <p className="text-gray-500">
          Check back later for AI-generated betting tips
        </p>
      </div>
    );
  }

  const safeMatches = recommendations.matches.filter(m => m.recommendationType === "safe");
  const valueMatches = recommendations.matches.filter(m => m.recommendationType === "value");
  const riskyMatches = recommendations.matches.filter(m => m.recommendationType === "risky");
  const all = [...safeMatches, ...valueMatches, ...riskyMatches];
  const total = all.length;
  const slice = all.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{recommendations.totalMatches}</div>
          <div className="text-sm text-green-700">Total Tips</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {recommendations.averageConfidence.toFixed(1)}%
          </div>
          <div className="text-sm text-blue-700">Avg Confidence</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            {new Date().toLocaleDateString()}
          </div>
          <div className="text-sm text-purple-700">Today's Date</div>
        </div>
      </div>

      {/* Refresh + Date Range */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">Show tips for:</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value={1}>Today</option>
            <option value={2}>Next 2 days</option>
            <option value={7}>Next week</option>
          </select>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-2"
        >
          <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? "Refreshing..." : "Refresh Tips"}
        </button>
      </div>

      {/* Paged Recommendations */}
      {(() => {
        const sections: { type: string; items: typeof slice }[] = [];
        slice.forEach((rec) => {
          const last = sections[sections.length - 1];
          if (last && last.type === rec.recommendationType) {
            last.items.push(rec);
          } else {
            sections.push({ type: rec.recommendationType, items: [rec] });
          }
        });
        return sections.map((section) => {
          const header =
            section.type === "safe"
              ? { icon: "🛡️", text: "Safe Bets (High Confidence)" }
              : section.type === "value"
              ? { icon: "💰", text: "Value Bets (Good Odds)" }
              : { icon: "🎲", text: "Risky Bets (Higher Reward)" };
          return (
            <div key={`${section.type}-${page}`} className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span>{header.icon}</span>
                {header.text}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {section.items.map((rec) => (
                  <MatchCard
                    key={rec.match.id}
                    match={rec.match}
                    prediction={rec.prediction}
                    recommendationType={rec.recommendationType}
                    onDetail={() => setDetailMatch(rec.match as Match)}
                  />
                ))}
              </div>
            </div>
          );
        });
      })()}
      <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-gray-600">
          Showing{" "}
          {Math.min((page - 1) * pageSize + 1, total)}-
          {Math.min(page * pageSize, total)} of {total}
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
              setPage((p) => (p * pageSize < total ? p + 1 : p))
            }
            disabled={page * pageSize >= total}
            className="px-3 py-1.5 rounded border text-sm disabled:opacity-50 bg-white hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
      {detailMatch && (
        <MatchDetail match={detailMatch} onClose={() => setDetailMatch(null)} />
      )}
    </div>
  );
}
