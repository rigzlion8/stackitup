import { useEffect, useState } from "react";
import { getTodaysRecommendations } from "../api";
import { MatchCard } from "./MatchCard.tsx";

export function DailyRecommendations() {
  const [recommendations, setRecommendations] = useState<null | Awaited<ReturnType<typeof getTodaysRecommendations>>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    getTodaysRecommendations()
      .then(setRecommendations)
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

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

      {/* Paged Recommendations */}
      <div className="grid gap-4">
        {slice.map((rec, idx) => {
          const prev = slice[idx - 1];
          const showHeader =
            !prev || prev.recommendationType !== rec.recommendationType;
          const header =
            rec.recommendationType === "safe"
              ? { icon: "🛡️", text: "Safe Bets (High Confidence)" }
              : rec.recommendationType === "value"
              ? { icon: "💰", text: "Value Bets (Good Odds)" }
              : { icon: "🎲", text: "Risky Bets (Higher Reward)" };
          return (
            <div key={rec.match.id}>
              {showHeader && (
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">{header.icon}</span>
                  {header.text}
                </h3>
              )}
              <MatchCard
                match={rec.match}
                prediction={rec.prediction}
                recommendationType={rec.recommendationType}
              />
            </div>
          );
        })}
      </div>
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
    </div>
  );
}
