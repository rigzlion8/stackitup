export interface League {
  id: string;
  name: string;
  code: string;
  country: string;
}

export interface Team {
  id: string;
  name: string;
}

export interface Match {
  id: string;
  leagueId: string;
  league?: League;
  homeTeam: Team;
  awayTeam: Team;
  matchDate: number;
  homeWinOdds?: number;
  drawOdds?: number;
  awayWinOdds?: number;
  prediction?: Prediction;
}

export interface Prediction {
  id: string;
  matchId: string;
  prediction: "home" | "draw" | "away";
  confidence: number;
  reasoning?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface UserPreferences {
  preferredLeagues: string[];
  emailNotifications: boolean;
  riskTolerance: "low" | "medium" | "high";
  timezone: string;
}

const API_BASE = import.meta.env.VITE_API_BASE || "";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export function getMe(): Promise<User | null> {
  return http<User | null>("/api/me");
}

export function getLeagues(): Promise<League[]> {
  return http<League[]>("/api/leagues");
}

export function getUpcomingMatches(params: { leagueId?: string; days?: number } = {}): Promise<Match[]> {
  const query = new URLSearchParams();
  if (params.leagueId) query.set("leagueId", params.leagueId);
  if (params.days != null) query.set("days", String(params.days));
  const qs = query.toString();
  return http<Match[]>(`/api/matches/upcoming${qs ? `?${qs}` : ""}`);
}

export function getHighConfidencePredictions(params: { minConfidence?: number; limit?: number } = {}): Promise<Array<{ match: Match; prediction: Prediction }>> {
  const query = new URLSearchParams();
  if (params.minConfidence != null) query.set("minConfidence", String(params.minConfidence));
  if (params.limit != null) query.set("limit", String(params.limit));
  const qs = query.toString();
  return http<Array<{ match: Match; prediction: Prediction }>>(`/api/predictions/high-confidence${qs ? `?${qs}` : ""}`);
}

export function getTodaysRecommendations(): Promise<{
  totalMatches: number;
  averageConfidence: number;
  matches: Array<{ match: Match; prediction: Prediction; recommendationType: "safe" | "value" | "risky" }>;
}> {
  return http(`/api/recommendations/today`);
}

export function getUserPreferences(): Promise<UserPreferences> {
  return http<UserPreferences>("/api/user/preferences");
}

export function updateUserPreferences(prefs: UserPreferences): Promise<{ ok: true }> {
  return http<{ ok: true }>("/api/user/preferences", {
    method: "POST",
    body: JSON.stringify(prefs),
  });
}

export function generatePrediction(matchId: string): Promise<{ ok: true; prediction?: Prediction; probs?: { home: number; draw: number; away: number } }> {
  return http<{ ok: true; prediction?: Prediction; probs?: { home: number; draw: number; away: number } }>("/api/predictions/generate", {
    method: "POST",
    body: JSON.stringify({ matchId }),
  });
}


