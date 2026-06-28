import { useState } from "react";
import { generatePrediction } from "../api";

interface MatchCardProps {
  match: any;
  prediction?: any;
  recommendationType?: "safe" | "value" | "risky";
  onDetail?: () => void;
  isWatchlisted?: boolean;
  onToggleWatchlist?: (matchId: string) => void;
}

function getRecommendationStyle(type?: string) {
  switch (type) {
    case "safe": return { border: "border-green-500/30", bg: "bg-green-50/50 dark:bg-green-950/30", badge: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800" };
    case "value": return { border: "border-yellow-500/30", bg: "bg-yellow-50/50 dark:bg-yellow-950/30", badge: "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800" };
    case "risky": return { border: "border-red-500/30", bg: "bg-red-50/50 dark:bg-red-950/30", badge: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" };
    default: return { border: "border-gray-200 dark:border-gray-700", bg: "bg-white dark:bg-gray-900", badge: "" };
  }
}

function ProbBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 text-gray-500 dark:text-gray-400 text-right">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 font-semibold text-gray-700 dark:text-gray-300">{pct}%</span>
    </div>
  );
}

export function MatchCard({ match, prediction, recommendationType, onDetail, isWatchlisted, onToggleWatchlist }: MatchCardProps) {
  const [isPredicting, setIsPredicting] = useState(false);
  const [localPrediction, setLocalPrediction] = useState<any | undefined>(undefined);
  const [localProbs, setLocalProbs] = useState<{ home: number; draw: number; away: number } | undefined>(undefined);
  const effectivePrediction = localPrediction ?? prediction;

  const recStyle = getRecommendationStyle(recommendationType);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatOdds = (odds?: number) => {
    return odds ? odds.toFixed(2) : "N/A";
  };

  const handlePredict = async () => {
    setIsPredicting(true);
    try {
      const res = await generatePrediction(match.id);
      if (res?.prediction) {
        setLocalPrediction(res.prediction);
      }
      if (res?.probs) {
        setLocalProbs(res.probs);
      }
    } finally {
      setIsPredicting(false);
    }
  };

  const predictedTeamName =
    effectivePrediction?.prediction === "home"
      ? match?.homeTeam?.name
      : effectivePrediction?.prediction === "away"
      ? match?.awayTeam?.name
      : effectivePrediction?.prediction === "draw"
      ? "Draw"
      : undefined;

  const probs = localProbs;

  return (
    <div
      onClick={onDetail}
      className={`border rounded-xl p-4 sm:p-5 transition-all duration-200 ease-out hover:shadow-md dark:hover:shadow-gray-900/50 cursor-pointer ${recStyle.border} ${recStyle.bg}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs shrink-0">
            <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
            {match?.league?.name ?? "League"}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); handlePredict(); }}
            disabled={isPredicting}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors duration-150 cursor-pointer"
          >
            {isPredicting ? "Predicting..." : effectivePrediction ? "Refresh" : "Predict"}
          </button>
          {onToggleWatchlist && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleWatchlist(match.id); }}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150 cursor-pointer ${
                isWatchlisted
                  ? "text-yellow-500 hover:text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30"
                  : "text-gray-300 dark:text-gray-600 hover:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              title={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
            >
              <svg className="w-4 h-4" fill={isWatchlisted ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </button>
          )}
          {recommendationType && (
            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${recStyle.badge}`}>
              {recommendationType.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 text-right">
          <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base truncate">
            {match?.homeTeam?.name || "Home"}
          </div>
        </div>
        <div className="px-3 flex items-center gap-2">
          <div className="w-6 h-[1px] bg-gray-300 dark:bg-gray-600" />
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">VS</span>
          <div className="w-6 h-[1px] bg-gray-300 dark:bg-gray-600" />
        </div>
        <div className="flex-1 text-left">
          <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base truncate">
            {match?.awayTeam?.name || "Away"}
          </div>
        </div>
      </div>
      <div className="text-[11px] text-gray-400 dark:text-gray-500 text-center mb-4">
        {match ? formatDate(match.matchDate) : ""}
      </div>

      {/* Odds */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {[
          { label: "1", value: formatOdds(match.homeWinOdds), active: effectivePrediction?.prediction === "home" },
          { label: "X", value: formatOdds(match.drawOdds), active: effectivePrediction?.prediction === "draw" },
          { label: "2", value: formatOdds(match.awayWinOdds), active: effectivePrediction?.prediction === "away" },
        ].map((odds) => (
          <div
            key={odds.label}
            className={`rounded-lg p-2 text-center border transition-colors duration-150 ${
              odds.active
                ? "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            }`}
          >
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{odds.label}</div>
            <div className={`text-sm font-bold ${odds.active ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-gray-100"}`}>
              {odds.value}
            </div>
          </div>
        ))}
      </div>

      {/* AI Prediction */}
      {effectivePrediction && (
        <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">AI Pick</span>
            </div>
            <span className="text-xs font-bold text-green-600 dark:text-green-400">
              {effectivePrediction.confidence}% confidence
            </span>
          </div>

          {probs && (
            <div className="space-y-1">
              <ProbBar label="1" pct={probs.home} color="bg-blue-500" />
              <ProbBar label="X" pct={probs.draw} color="bg-gray-400" />
              <ProbBar label="2" pct={probs.away} color="bg-red-500" />
            </div>
          )}

          <div>
            <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
              Bet on: {predictedTeamName ?? effectivePrediction.prediction.toUpperCase()}
            </div>
            {effectivePrediction.reasoning && (
              <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                {effectivePrediction.reasoning}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
