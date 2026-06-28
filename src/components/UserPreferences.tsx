import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getLeagues, getUserPreferences, updateUserPreferences } from "../api";

export function UserPreferences() {
  const [leagues, setLeagues] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    preferredLeagues: [] as string[],
    emailNotifications: true,
    riskTolerance: "medium" as "low" | "medium" | "high",
    timezone: "UTC",
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([getUserPreferences().catch(() => null), getLeagues()])
      .then(([prefs, leagues]) => {
        if (cancelled) return;
        if (prefs) {
          setFormData({
            preferredLeagues: prefs.preferredLeagues || [],
            emailNotifications: prefs.emailNotifications ?? true,
            riskTolerance: prefs.riskTolerance || "medium",
            timezone: prefs.timezone || "UTC",
          });
        }
        setLeagues(leagues);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUserPreferences(formData);
      toast.success("Preferences updated successfully!");
    } catch (error) {
      toast.error("Failed to update preferences");
    }
  };

  const handleLeagueToggle = (leagueCode: string) => {
    setFormData(prev => ({
      ...prev,
      preferredLeagues: prev.preferredLeagues.includes(leagueCode)
        ? prev.preferredLeagues.filter(code => code !== leagueCode)
        : [...prev.preferredLeagues, leagueCode]
    }));
  };

  if (loading || leagues === null) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Preferred Leagues */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Preferred Leagues
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {leagues.map((league) => (
            <label
              key={league.id}
              className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={formData.preferredLeagues.includes(league.code)}
                onChange={() => handleLeagueToggle(league.code)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">{league.name}</div>
                <div className="text-sm text-gray-500">{league.country}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Email Notifications */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Notifications
        </h3>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={formData.emailNotifications}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              emailNotifications: e.target.checked
            }))}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-gray-900">
            Receive daily email notifications with betting tips
          </span>
        </label>
      </div>

      {/* Risk Tolerance */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Risk Tolerance
        </h3>
        <div className="space-y-2">
          {[
            { value: "low", label: "Low Risk", desc: "Conservative bets with higher confidence" },
            { value: "medium", label: "Medium Risk", desc: "Balanced approach with good value" },
            { value: "high", label: "High Risk", desc: "Higher potential returns with more risk" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <input
                type="radio"
                name="riskTolerance"
                value={option.value}
                checked={formData.riskTolerance === option.value}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  riskTolerance: e.target.value as "low" | "medium" | "high"
                }))}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-1"
              />
              <div>
                <div className="font-medium text-gray-900">{option.label}</div>
                <div className="text-sm text-gray-500">{option.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Timezone */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Timezone
        </h3>
          <select
            value={formData.timezone}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              timezone: e.target.value
            }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
          >
          <option value="UTC">UTC</option>
          <option value="Europe/London">London (GMT/BST)</option>
          <option value="Europe/Paris">Paris (CET/CEST)</option>
          <option value="Europe/Berlin">Berlin (CET/CEST)</option>
          <option value="Europe/Madrid">Madrid (CET/CEST)</option>
          <option value="Europe/Rome">Rome (CET/CEST)</option>
          <option value="America/New_York">New York (EST/EDT)</option>
          <option value="America/Los_Angeles">Los Angeles (PST/PDT)</option>
        </select>
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Save Preferences
        </button>
      </div>
    </form>
  );
}
