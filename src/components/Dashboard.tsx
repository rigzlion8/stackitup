import { MatchList } from "./MatchList.tsx";
import { PredictionsList } from "./PredictionList.tsx";
import { UserPreferences } from "./UserPreferences.tsx";
import { DailyRecommendations } from "./DailyRecommendations.tsx";
import { useState } from "react";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<"matches" | "predictions" | "recommendations" | "settings">("matches");

  const tabs = [
    { id: "matches", label: "Upcoming Matches", icon: "⚽" },
    { id: "recommendations", label: "Today's Tips", icon: "🎯" },
    { id: "predictions", label: "AI Predictions", icon: "🤖" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, Bettor! 👋
        </h2>
        <p className="text-gray-600">
          Get AI-powered betting insights from top European football leagues
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "recommendations" && <DailyRecommendations />}
          {activeTab === "matches" && <MatchList />}
          {activeTab === "predictions" && <PredictionsList />}
          {activeTab === "settings" && <UserPreferences />}
        </div>
      </div>
    </div>
  );
}
