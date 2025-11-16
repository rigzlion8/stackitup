import { MatchCard } from "./MatchCard";
import { useEffect, useState } from "react";
import { getHighConfidencePredictions } from "../api";

export function PredictionsList() {
  const [minConfidence, setMinConfidence] = useState(70);
  const [limit, setLimit] = useState(10);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getHighConfidencePredictions({ minConfidence, limit })
      .then((ps) => !cancelled && setPredictions(ps as any[]))
      .catch((e) => !cancelled && setError(e.message || "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [minConfidence, limit]);

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
            Minimum Confidence
          </label>
          <select
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white"
          >
            <option value={50}>50%+</option>
            <option value={60}>60%+</option>
            <option value={70}>70%+</option>
            <option value={80}>80%+</option>
            <option value={90}>90%+</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Results
          </label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Predictions */}
      {predictions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No predictions found
          </h3>
          <p className="text-gray-500">
            Try lowering the confidence threshold or check back later
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {predictions.map((prediction) => (
            <MatchCard
              key={prediction.id}
              match={(prediction as any).match}
              prediction={prediction as any}
            />
          ))}
        </div>
      )}
    </div>
  );
}
