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
  picture?: string;
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

export function getTodaysRecommendations(days = 1): Promise<{
  totalMatches: number;
  averageConfidence: number;
  matches: Array<{ match: Match; prediction: Prediction; recommendationType: "safe" | "value" | "risky" }>;
}> {
  return http(`/api/recommendations/today?days=${days}`);
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

export function generateBulkPredictions(matchIds: string[]): Promise<{ ok: true; results: Record<string, { prediction?: Prediction; probs?: { home: number; draw: number; away: number } }> }> {
  return http<{ ok: true; results: Record<string, { prediction?: Prediction; probs?: { home: number; draw: number; away: number } }> }>("/api/predictions/generate-bulk", {
    method: "POST",
    body: JSON.stringify({ matchIds }),
  });
}

export interface MatchDetails {
  h2h: { homeWins: number; draws: number; awayWins: number; summary: string };
  homeForm: { results: string[]; summary: string };
  awayForm: { results: string[]; summary: string };
  injuries: { home: string[]; away: string[] };
  analysis: string;
  isWatchlisted: boolean;
}

export function getMatchDetails(matchId: string): Promise<MatchDetails> {
  return http<MatchDetails>(`/api/matches/${matchId}/details`);
}

export function getWatchlist(): Promise<Match[]> {
  return http<Match[]>("/api/watchlist");
}

export function addToWatchlist(matchId: string): Promise<{ ok: true }> {
  return http<{ ok: true }>("/api/watchlist", {
    method: "POST",
    body: JSON.stringify({ matchId }),
  });
}

export function removeFromWatchlist(matchId: string): Promise<{ ok: true }> {
  return http<{ ok: true }>(`/api/watchlist/${matchId}`, {
    method: "DELETE",
  });
}

// ========== Teams API ==========

export interface TeamInfo {
  id: string;
  name: string;
  country: string;
  league: string;
  leagueName: string;
  logo_url: string | null;
  playerCount?: number;
  coach?: string | null;
  formation?: string | null;
}

export interface PlayerSeasonStats {
  appearances: number;
  goals: number;
  assists: number;
  clean_sheets: number;
  yellow_cards: number;
  red_cards: number;
  minutes_played: number;
  fantasy_points: number;
  fantasy_value: number;
}

export interface PlayerInfo {
  id: string;
  name: string;
  team_id: string;
  teamName: string;
  country: string;
  position: string;
  number: number | null;
  birth_date: string | null;
  height: number | null;
  weight: number | null;
  fifa_rating: number | null;
  transfer_fee: number | null;
  wages: number | null;
  market_value: number | null;
  preferred_foot: string | null;
  stats: PlayerSeasonStats;
}

export interface PlayerProfile {
  id: string;
  name: string;
  team_id: string;
  teamName: string;
  teamLeague: string;
  leagueName: string;
  country: string;
  position: string;
  number: number | null;
  birth_date: string | null;
  height: number | null;
  weight: number | null;
  fifa_rating: number | null;
  transfer_fee: number | null;
  wages: number | null;
  market_value: number | null;
  preferred_foot: string | null;
  stats: Array<PlayerSeasonStats & { season: string }>;
}

export interface HeadToHeadComparison {
  team1: {
    id: string; name: string; country: string; league: string; logo_url: string | null;
    squad: { total: number; goals: number; assists: number; clean_sheets: number; avgApps: number };
    positions: Record<string, number>;
  };
  team2: {
    id: string; name: string; country: string; league: string; logo_url: string | null;
    squad: { total: number; goals: number; assists: number; clean_sheets: number; avgApps: number };
    positions: Record<string, number>;
  };
  h2hMatches: Array<{
    id: string; leagueName: string; homeTeamName: string; awayTeamName: string;
    matchDate: number; homeWinOdds: number; drawOdds: number; awayWinOdds: number;
    homeScore: number | null; awayScore: number | null;
  }>;
  h2hStats: { team1Wins: number; team2Wins: number; draws: number };
}

export function getTeams(params: { search?: string; league?: string } = {}): Promise<TeamInfo[]> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.league) query.set("league", params.league);
  const qs = query.toString();
  return http<TeamInfo[]>(`/api/teams${qs ? `?${qs}` : ""}`);
}

export function getTeam(teamId: string): Promise<TeamInfo> {
  return http<TeamInfo>(`/api/teams/${teamId}`);
}

export function getTeamPlayers(teamId: string, position?: string): Promise<PlayerInfo[]> {
  const query = position ? `?position=${encodeURIComponent(position)}` : "";
  return http<PlayerInfo[]>(`/api/teams/${teamId}/players${query}`);
}

export function compareTeams(team1: string, team2: string): Promise<HeadToHeadComparison> {
  return http<HeadToHeadComparison>(`/api/teams/compare?team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`);
}

export function getPlayers(params: { search?: string; team?: string; position?: string; country?: string } = {}): Promise<PlayerInfo[]> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.team) query.set("team", params.team);
  if (params.position) query.set("position", params.position);
  if (params.country) query.set("country", params.country);
  const qs = query.toString();
  return http<PlayerInfo[]>(`/api/players${qs ? `?${qs}` : ""}`);
}

export function getPlayer(playerId: string): Promise<PlayerProfile> {
  return http<PlayerProfile>(`/api/players/${playerId}`);
}

