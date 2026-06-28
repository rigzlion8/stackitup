import { MatchCard } from "./MatchCard";
import { MatchDetail } from "./MatchDetail";
import { useEffect, useState } from "react";
import { getHighConfidencePredictions, Match } from "../api";

export function PredictionsList() {
  const [minConfidence, setMinConfidence] = useState(10);
  const [limit, setLimit] = useState(50);
  const [pairs, setPairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [detailMatch, setDetailMatch] = useState<Match | null>(null);
  const pageSize = 10;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getHighConfidencePredictions({ minConfidence, limit })
      .then((ps) => !cancelled && setPairs(ps as any[]))
      .catch((e) => !cancelled && setError(e.message || "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [minConfidence, limit]);
  
  useEffect(() => {
    setPage(1);
  }, [minConfidence, limit, pairs.length]);

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
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Minimum Confidence
          </label>
          <select
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
          >
            <option value={10}>10%+</option>
            <option value={50}>50%+</option>
            <option value={60}>60%+</option>
            <option value={70}>70%+</option>
            <option value={80}>80%+</option>
            <option value={90}>90%+</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Results
          </label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Predictions */}
      {pairs.length === 0 ? (
          <div className="text-center py-12">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No predictions found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try lowering the confidence threshold or check back later
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pairs
              .slice((page - 1) * pageSize, page * pageSize)
              .map((p) => (
                <MatchCard
                  key={p.prediction.id}
                  match={p.match}
                  prediction={p.prediction}
                  onDetail={() => setDetailMatch(p.match as Match)}
                />
              ))}
          </div>
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-gray-600">
              Showing{" "}
              {Math.min((page - 1) * pageSize + 1, pairs.length)}-
              {Math.min(page * pageSize, pairs.length)} of {pairs.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded border text-sm disabled:opacity-50 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              >
                Prev
              </button>
              <button
                onClick={() =>
                  setPage((p) => (p * pageSize < pairs.length ? p + 1 : p))
                }
                disabled={page * pageSize >= pairs.length}
                className="px-3 py-1.5 rounded border text-sm disabled:opacity-50 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
      {detailMatch && (
        <MatchDetail match={detailMatch} onClose={() => setDetailMatch(null)} />
      )}
    </div>
  );
}
