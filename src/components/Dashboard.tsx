import { MatchList } from "./MatchList.tsx";
import { PredictionsList } from "./PredictionList.tsx";
import { UserPreferences } from "./UserPreferences.tsx";
import { DailyRecommendations } from "./DailyRecommendations.tsx";
import { WatchlistTab } from "./WatchlistTab.tsx";
import { TeamsTab } from "./TeamsTab.tsx";
import { PlayersTab } from "./PlayersTab.tsx";
import { HeadToHead } from "./HeadToHead.tsx";
import { useState, useEffect, useCallback } from "react";
import { User, getWatchlist, addToWatchlist, removeFromWatchlist } from "../api";

function Avatar({ user }: { user: User }) {
  const [imgError, setImgError] = useState(false);
  const initial = (user.name || user.email || "U").charAt(0).toUpperCase();

  if (user.picture && !imgError) {
    return (
      <img
        src={user.picture}
        alt={user.name || "User"}
        className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-100 dark:ring-blue-900"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold text-lg ring-2 ring-blue-100 dark:ring-blue-900">
      {initial}
    </div>
  );
}

export function Dashboard({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<"matches" | "recommendations" | "predictions" | "watchlist" | "teams" | "headtohead" | "players" | "settings">("matches");
  const [watchlistedIds, setWatchlistedIds] = useState<Set<string>>(new Set());

  const loadWatchlist = useCallback(() => {
    getWatchlist()
      .then((matches) => setWatchlistedIds(new Set(matches.map((m: any) => m.id))))
      .catch(() => {});
  }, []);

  useEffect(() => { loadWatchlist(); }, [loadWatchlist]);

  const handleToggleWatchlist = useCallback(async (matchId: string) => {
    if (watchlistedIds.has(matchId)) {
      await removeFromWatchlist(matchId);
      setWatchlistedIds((prev) => { const next = new Set(prev); next.delete(matchId); return next; });
    } else {
      await addToWatchlist(matchId);
      setWatchlistedIds((prev) => new Set(prev).add(matchId));
    }
  }, [watchlistedIds]);

  const tabs = [
    { id: "matches", label: "Upcoming Matches" },
    { id: "recommendations", label: "Today's Tips" },
    { id: "predictions", label: "AI Predictions" },
    { id: "watchlist", label: "Watchlist" },
    { id: "teams", label: "Teams" },
    { id: "headtohead", label: "Head to Head" },
    { id: "players", label: "Players" },
    { id: "settings", label: "Settings" },
  ];

  const displayName = user.name || user.email?.split("@")[0] || "there";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-6 flex items-center gap-4">
        <Avatar user={user} />
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
            Welcome back, {displayName}!
          </h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            AI-powered betting insights from top European football leagues
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="border-b border-gray-200 dark:border-gray-800">
          <nav className="flex overflow-x-auto scrollbar-hide px-4 sm:px-6 gap-0" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`shrink-0 py-4 px-3 sm:px-5 border-b-2 font-medium text-sm transition-all duration-200 ease-out ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6">
          {activeTab === "recommendations" && <DailyRecommendations />}
          {activeTab === "matches" && (
            <MatchList
              watchlistedIds={watchlistedIds}
              onToggleWatchlist={handleToggleWatchlist}
              onWatchlistChange={loadWatchlist}
            />
          )}
          {activeTab === "predictions" && <PredictionsList />}
          {activeTab === "watchlist" && (
            <WatchlistTab
              watchlistedIds={watchlistedIds}
              onToggleWatchlist={handleToggleWatchlist}
              onWatchlistChange={loadWatchlist}
            />
          )}
          {activeTab === "teams" && <TeamsTab />}
          {activeTab === "headtohead" && <HeadToHead />}
          {activeTab === "players" && <PlayersTab />}
          {activeTab === "settings" && <UserPreferences />}
        </div>
      </div>
    </div>
  );
}
