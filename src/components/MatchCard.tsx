interface MatchCardProps {
  match: any;
  prediction?: any;
  recommendationType?: "safe" | "value" | "risky";
}

export function MatchCard({ match, prediction, recommendationType }: MatchCardProps) {
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

  return (
    <div className={`border-2 rounded-lg p-4 ${getRecommendationColor(recommendationType)}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getRecommendationIcon(recommendationType)}</span>
          <span className="text-sm font-medium text-gray-600">
            {match.league?.name}
          </span>
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
              {match.homeTeam?.name || "Home Team"}
            </div>
          </div>
          <div className="px-4 text-gray-500 font-medium">vs</div>
          <div className="text-left flex-1">
            <div className="font-semibold text-gray-900">
              {match.awayTeam?.name || "Away Team"}
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {formatDate(match.matchDate)}
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
      {prediction && (
        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">AI Prediction</span>
            <span className="text-sm font-bold text-green-600">
              {prediction.confidence}% confidence
            </span>
          </div>
          <div className="text-sm">
            <div className="font-semibold text-gray-900 mb-1">
              Bet on: {prediction.prediction.toUpperCase()}
            </div>
            <div className="text-gray-600 text-xs">
              {prediction.reasoning}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
