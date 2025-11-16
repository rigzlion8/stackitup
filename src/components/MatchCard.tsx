import { useState } from "react";
import { generatePrediction } from "../api";

interface MatchCardProps {
  match: any;
  prediction?: any;
  recommendationType?: "safe" | "value" | "risky";
}

export function MatchCard({ match, prediction, recommendationType }: MatchCardProps) {
  const [isPredicting, setIsPredicting] = useState(false);
  const [localPrediction, setLocalPrediction] = useState<any | undefined>(undefined);
  const [localProbs, setLocalProbs] = useState<{ home: number; draw: number; away: number } | undefined>(undefined);
  const effectivePrediction = localPrediction ?? prediction;

  const getRecommendationColor = (type?: string) => {
    switch (type) {
      case "safe": return "border-green-500 bg-green-50";
      case "value": return "border-yellow-500 bg-yellow-50";
      case "risky": return "border-red-500 bg-red-50";
      default: return "border-gray-200 bg-white";
    }
  };

  const getRecommendationIcon = (type?: string) => {
    switch (type) {
      case "safe": return "🛡️";
      case "value": return "💰";
      case "risky": return "🎲";
      default: return "⚽";
    }
  };

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

  return (
    <div className={`border-2 rounded-lg p-4 ${getRecommendationColor(recommendationType)}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getRecommendationIcon(recommendationType)}</span>
          <span className="text-sm font-medium text-gray-600">
            {match?.league?.name ?? "League"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePredict}
            disabled={isPredicting}
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {isPredicting ? "Predicting..." : effectivePrediction ? "Refresh Prediction" : "Predict"}
          </button>
        </div>
        {recommendationType && (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-white border">
            {recommendationType.toUpperCase()}
          </span>
        )}
      </div>

      <div className="text-center mb-4">
        <div className="flex items-center justify-between">
          <div className="text-right flex-1">
            <div className="font-semibold text-gray-900">
              {match?.homeTeam?.name || "Home Team"}
            </div>
          </div>
          <div className="px-4 text-gray-500 font-medium">vs</div>
          <div className="text-left flex-1">
            <div className="font-semibold text-gray-900">
              {match?.awayTeam?.name || "Away Team"}
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {match ? formatDate(match.matchDate) : ""}
        </div>
      </div>

      {/* Betting Odds */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="bg-white rounded p-2 border">
          <div className="text-xs text-gray-500">Home</div>
          <div className="font-semibold">{formatOdds(match.homeWinOdds)}</div>
        </div>
        <div className="bg-white rounded p-2 border">
          <div className="text-xs text-gray-500">Draw</div>
          <div className="font-semibold">{formatOdds(match.drawOdds)}</div>
        </div>
        <div className="bg-white rounded p-2 border">
          <div className="text-xs text-gray-500">Away</div>
          <div className="font-semibold">{formatOdds(match.awayWinOdds)}</div>
        </div>
      </div>

      {/* AI Prediction */}
      {effectivePrediction && (
        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">AI Prediction</span>
            <span className="text-sm font-bold text-green-600">
              {effectivePrediction.confidence}% win rate{predictedTeamName ? ` for ${predictedTeamName}` : ""}
            </span>
          </div>
          {localProbs && (
            <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
              <div className="bg-white rounded p-2 border text-center">
                <div className="text-gray-500">Home</div>
                <div className="font-semibold">{localProbs.home}%</div>
              </div>
              <div className="bg-white rounded p-2 border text-center">
                <div className="text-gray-500">Draw</div>
                <div className="font-semibold">{localProbs.draw}%</div>
              </div>
              <div className="bg-white rounded p-2 border text-center">
                <div className="text-gray-500">Away</div>
                <div className="font-semibold">{localProbs.away}%</div>
              </div>
            </div>
          )}
          <div className="text-sm">
            <div className="font-semibold text-gray-900 mb-1">
              Bet on: {predictedTeamName ?? effectivePrediction.prediction.toUpperCase()}
            </div>
            <div className="text-gray-600 text-xs">
              {effectivePrediction.reasoning}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
