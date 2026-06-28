import { useEffect, useState } from "react";
import { Match, MatchDetails, getMatchDetails, addToWatchlist, removeFromWatchlist } from "../api";

function FormBadge({ result }: { result: string }) {
  const colors: Record<string, string> = {
    W: "bg-green-100 text-green-700",
    D: "bg-gray-100 text-gray-600",
    L: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${colors[result] || "bg-gray-100 text-gray-600"}`}>
      {result}
    </span>
  );
}

export function MatchDetail({
  match,
  onClose,
}: {
  match: Match;
  onClose: () => void;
}) {
  const [details, setDetails] = useState<MatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchlisting, setWatchlisting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setDetails(null);
    getMatchDetails(match.id)
      .then(setDetails)
      .catch(() => setDetails(null))
      .finally(() => setLoading(false));
  }, [match.id]);

  const toggleWatchlist = async () => {
    if (!details) return;
    setWatchlisting(true);
    try {
      if (details.isWatchlisted) {
        await removeFromWatchlist(match.id);
        setDetails({ ...details, isWatchlisted: false });
      } else {
        await addToWatchlist(match.id);
        setDetails({ ...details, isWatchlisted: true });
      }
    } finally {
      setWatchlisting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center overflow-y-auto bg-black/40 backdrop-blur-sm">
      <div className="relative w-full sm:max-w-lg mx-auto mt-14 sm:mt-0 mb-0 sm:mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between z-10">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{match.league?.name}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {match.homeTeam.name} vs {match.awayTeam.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : !details ? (
            <div className="text-center py-16 text-gray-500 text-sm">Failed to load details</div>
          ) : (
            <div className="p-4 space-y-5">
              {/* Teams & Odds */}
              <div className="text-center">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex-1 text-right">
                    <div className="font-semibold text-gray-900">{match.homeTeam.name}</div>
                  </div>
                  <div className="text-xs font-medium text-gray-400 shrink-0">VS</div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-gray-900">{match.awayTeam.name}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto">
                  {[
                    { label: "1", value: match.homeWinOdds?.toFixed(2) },
                    { label: "X", value: match.drawOdds?.toFixed(2) },
                    { label: "2", value: match.awayWinOdds?.toFixed(2) },
                  ].map((o) => (
                    <div key={o.label} className="bg-gray-50 rounded-lg p-1.5 text-center border border-gray-100">
                      <div className="text-[10px] text-gray-400">{o.label}</div>
                      <div className="text-sm font-bold text-gray-900">{o.value || "N/A"}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Watchlist button */}
              <button
                onClick={toggleWatchlist}
                disabled={watchlisting}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                  details.isWatchlisted
                    ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                <svg className="w-4 h-4" fill={details.isWatchlisted ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {watchlisting
                  ? "Please wait..."
                  : details.isWatchlisted
                  ? "Remove from Watchlist"
                  : "Add to Watchlist"}
              </button>

              {/* Head to Head */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Head to Head</h4>
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="flex-1 text-center">
                    <div className="text-lg font-bold text-gray-900">{details.h2h.homeWins}</div>
                    <div className="text-[10px] text-gray-500">{match.homeTeam.name}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-400">{details.h2h.draws}</div>
                    <div className="text-[10px] text-gray-500">Draws</div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="text-lg font-bold text-gray-900">{details.h2h.awayWins}</div>
                    <div className="text-[10px] text-gray-500">{match.awayTeam.name}</div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">{details.h2h.summary}</p>
              </div>

              {/* Recent Form */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{match.homeTeam.name}</h4>
                  <div className="flex gap-1 mb-1">
                    {details.homeForm.results.map((r, i) => (
                      <FormBadge key={i} result={r} />
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-500">{details.homeForm.summary}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{match.awayTeam.name}</h4>
                  <div className="flex gap-1 mb-1">
                    {details.awayForm.results.map((r, i) => (
                      <FormBadge key={i} result={r} />
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-500">{details.awayForm.summary}</p>
                </div>
              </div>

              {/* Injuries */}
              {(details.injuries.home.length > 0 || details.injuries.away.length > 0) && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Injuries & Suspensions</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      {details.injuries.home.length > 0 ? (
                        <ul className="space-y-1">
                          {details.injuries.home.map((p, i) => (
                            <li key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-400">No reported injuries</p>
                      )}
                    </div>
                    <div>
                      {details.injuries.away.length > 0 ? (
                        <ul className="space-y-1">
                          {details.injuries.away.map((p, i) => (
                            <li key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-400">No reported injuries</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Analysis */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Match Analysis</h4>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                    </svg>
                    <p className="text-xs text-gray-700 leading-relaxed">{details.analysis}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
