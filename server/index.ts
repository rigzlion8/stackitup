import "dotenv/config";
import express from "express";
import * as path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import Database from "better-sqlite3";
import { OpenAI } from "openai";
import cron from "node-cron";
import { MongoClient } from "mongodb";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5177";
const CALLBACK_URL = (() => {
  try {
    return new URL("/auth/google/callback", CLIENT_URL).toString();
  } catch {
    const base = CLIENT_URL.endsWith("/") ? CLIENT_URL.slice(0, -1) : CLIENT_URL;
    return `${base}/auth/google/callback`;
  }
})();
const SESSION_SECRET = process.env.SESSION_SECRET || "dev_secret";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const MONGODB_URI = process.env.MONGODB_URI || "";
const ODDS_API_KEY = process.env.ODDS_API_KEY || "";
const ODDS_API_SPORTS = (process.env.ODDS_API_SPORTS || "soccer_epl,soccer_spain_la_liga,soccer_germany_bundesliga,soccer_italy_serie_a,soccer_uefa_champs_league")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Database setup (SQLite)
const db = new Database("data.sqlite");
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT
);
CREATE TABLE IF NOT EXISTS leagues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  country TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  leagueId TEXT NOT NULL,
  matchDate INTEGER NOT NULL,
  homeTeamName TEXT NOT NULL,
  awayTeamName TEXT NOT NULL,
  homeWinOdds REAL,
  drawOdds REAL,
  awayWinOdds REAL,
  FOREIGN KEY (leagueId) REFERENCES leagues(id)
);
CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY,
  matchId TEXT NOT NULL UNIQUE,
  prediction TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  reasoning TEXT,
  FOREIGN KEY (matchId) REFERENCES matches(id)
);
CREATE TABLE IF NOT EXISTS user_preferences (
  userId TEXT PRIMARY KEY,
  preferredLeagues TEXT NOT NULL,
  emailNotifications INTEGER NOT NULL,
  riskTolerance TEXT NOT NULL,
  timezone TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id)
);
`);

// Seed a few leagues if empty
const leaguesCount = db.prepare("SELECT COUNT(*) as c FROM leagues").get() as { c: number };
if (leaguesCount.c === 0) {
  const insertLeague = db.prepare("INSERT INTO leagues (id, name, code, country) VALUES (?, ?, ?, ?)");
  insertLeague.run("epl", "Premier League", "EPL", "England");
  insertLeague.run("laliga", "La Liga", "LL", "Spain");
  insertLeague.run("bundesliga", "Bundesliga", "BL", "Germany");
  insertLeague.run("seriea", "Serie A", "SA", "Italy");
}
// Ensure UEFA Champions League exists
const uclExists = db.prepare("SELECT 1 FROM leagues WHERE id = ?").get("ucl");
if (!uclExists) {
  db.prepare("INSERT INTO leagues (id, name, code, country) VALUES (?, ?, ?, ?)").run(
    "ucl",
    "UEFA Champions League",
    "UCL",
    "UEFA"
  );
}

// Middlewares
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// MongoDB setup (optional, if MONGODB_URI configured)
let mongoClient: MongoClient | null = null;
async function getMongoDb() {
  if (!MONGODB_URI) return null;
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
  }
  return mongoClient.db();
}

// Passport Google OAuth
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});
passport.deserializeUser((id: string, done) => {
  const user = db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(id);
  done(null, user || null);
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: CALLBACK_URL,
        skipProfile: true,
      },
      async (accessToken, refreshToken, _profile, done) => {
        try {
          // Manually fetch user profile to avoid InternalOAuthError
          let userinfo: any | null = null;
          const endpoints = [
            "https://www.googleapis.com/oauth2/v3/userinfo",
            "https://www.googleapis.com/oauth2/v2/userinfo",
          ];
          for (const url of endpoints) {
            try {
              const r = await fetch(url, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (r.ok) {
                userinfo = await r.json();
                break;
              }
            } catch {
              // try next endpoint
            }
          }
          if (!userinfo) return done(new Error("Failed to fetch Google userinfo"));
          const email = userinfo.email;
          const id = userinfo.sub || userinfo.id;
          const name = userinfo.name || [userinfo.given_name, userinfo.family_name].filter(Boolean).join(" ");
          if (!email || !id) return done(new Error("Email or id missing from Google profile"));
          const upsert = db.prepare(`
            INSERT INTO users (id, email, name) VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET email=excluded.email, name=excluded.name
          `);
          upsert.run(id, email, name || null);
          const user = db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(id);
          return done(null, user);
        } catch (e) {
          return done(e as any);
        }
      }
    )
  );
}

// Auth routes
app.get("/auth/google", (req, res, next) => {
  if (!passport._strategy("google")) {
    return res.status(500).send("Google OAuth not configured");
  }
  return (passport.authenticate("google", { scope: ["openid", "email", "profile"] }) as any)(req, res, next);
});

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${CLIENT_URL}/?auth=failed`,
    session: true,
  }),
  (req, res) => {
    res.redirect(CLIENT_URL);
  }
);

app.post("/auth/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });
});

// Helpers
function requireUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// API routes
app.get("/api/me", (req, res) => {
  res.json(req.user || null);
});

app.get("/api/leagues", (req, res) => {
  const leagues = db.prepare("SELECT id, name, code, country FROM leagues").all();
  res.json(leagues);
});

app.get("/api/matches/upcoming", async (req, res) => {
  const { leagueId, days } = req.query as { leagueId?: string; days?: string };
  const now = Date.now();
  const until = now + (Number(days || 7) * 24 * 60 * 60 * 1000);
  // If Odds API configured, refresh data and clean placeholders
  if (ODDS_API_KEY) {
    try {
      // Remove placeholder seeded matches like "Team A" vs "Team B"
      db.prepare(`DELETE FROM matches WHERE homeTeamName LIKE 'Team %' AND awayTeamName LIKE 'Team %'`).run();
      await fetchAndUpsertLiveOdds({ days: Number(days || 7) });
    } catch {
      // ignore fetch/cleanup errors; fallback to existing data
    }
  }
  let rows: any[];
  if (leagueId) {
    rows = db.prepare(
      `SELECT m.*, l.name as leagueName, l.code as leagueCode, l.country as leagueCountry
       FROM matches m JOIN leagues l ON l.id = m.leagueId
       WHERE m.leagueId = ? AND m.matchDate BETWEEN ? AND ?
       ORDER BY m.matchDate ASC`
    ).all(leagueId, now, until);
  } else {
    rows = db.prepare(
      `SELECT m.*, l.name as leagueName, l.code as leagueCode, l.country as leagueCountry
       FROM matches m JOIN leagues l ON l.id = m.leagueId
       WHERE m.matchDate BETWEEN ? AND ?
       ORDER BY m.matchDate ASC`
    ).all(now, until);
  }
  // Filter out placeholder teams like "Team A", "Team B"
  const isPlaceholder = (name?: string) =>
    !name ||
    /^team\s+/i.test(name) ||
    name.toLowerCase() === "home team" ||
    name.toLowerCase() === "away team";
  const filtered = rows.filter((r) => !(isPlaceholder(r.homeTeamName) || isPlaceholder(r.awayTeamName)));
  const matches = filtered.map((r) => ({
    id: r.id,
    leagueId: r.leagueId,
    league: { id: r.leagueId, name: r.leagueName, code: r.leagueCode, country: r.leagueCountry },
    homeTeam: { id: `${r.id}:home`, name: r.homeTeamName },
    awayTeam: { id: `${r.id}:away`, name: r.awayTeamName },
    matchDate: r.matchDate,
    homeWinOdds: r.homeWinOdds,
    drawOdds: r.drawOdds,
    awayWinOdds: r.awayWinOdds,
    prediction: db.prepare("SELECT id, matchId, prediction, confidence, reasoning FROM predictions WHERE matchId = ?").get(r.id) || null,
  }));
  res.json(matches);
});

app.get("/api/predictions/high-confidence", (req, res) => {
  const minConfidence = Number((req.query.minConfidence as string) || 70);
  const limit = Number((req.query.limit as string) || 10);
  // Cleanup any predictions tied to placeholder teams
  db.prepare(
    `DELETE FROM predictions WHERE matchId IN (
      SELECT id FROM matches 
      WHERE LOWER(homeTeamName) LIKE 'team %' 
         OR LOWER(awayTeamName) LIKE 'team %'
         OR LOWER(homeTeamName) IN ('home team') 
         OR LOWER(awayTeamName) IN ('away team')
    )`
  ).run();
  const rows = db.prepare(
    `SELECT 
       p.id as pid, p.matchId, p.prediction as pred, p.confidence as conf, p.reasoning as reason,
       m.id as mid, m.leagueId, m.matchDate, m.homeTeamName, m.awayTeamName, m.homeWinOdds, m.drawOdds, m.awayWinOdds,
       l.name as leagueName, l.code as leagueCode, l.country as leagueCountry
     FROM predictions p
     JOIN matches m ON m.id = p.matchId
     JOIN leagues l ON l.id = m.leagueId
     WHERE p.confidence >= ?
     ORDER BY p.confidence DESC LIMIT ?`
  ).all(minConfidence, limit) as any[];
  const isPlaceholder = (name?: string) => {
    if (!name) return true;
    const n = String(name).toLowerCase();
    return /^team\s+/.test(n) || n === "home team" || n === "away team";
  };
  const result = rows
    .filter((r) => !(isPlaceholder(r.homeTeamName) || isPlaceholder(r.awayTeamName)))
    .map((r) => ({
    prediction: {
      id: r.pid,
      matchId: r.matchId,
      prediction: r.pred,
      confidence: r.conf,
      reasoning: r.reason,
    },
    match: {
      id: r.mid,
      leagueId: r.leagueId,
      league: { id: r.leagueId, name: r.leagueName, code: r.leagueCode, country: r.leagueCountry },
      homeTeam: { id: `${r.mid}:home`, name: r.homeTeamName },
      awayTeam: { id: `${r.mid}:away`, name: r.awayTeamName },
      matchDate: r.matchDate,
      homeWinOdds: r.homeWinOdds,
      drawOdds: r.drawOdds,
      awayWinOdds: r.awayWinOdds,
    },
    }));
  res.json(result);
});

app.post("/api/predictions/generate", requireUser, async (req, res) => {
  const { matchId } = req.body || {};
  if (!matchId || typeof matchId !== "string") {
    return res.status(400).json({ error: "matchId required" });
  }
  const m = db.prepare("SELECT id, homeTeamName, awayTeamName, homeWinOdds, drawOdds, awayWinOdds FROM matches WHERE id = ?").get(matchId);
  if (!m) {
    return res.status(404).json({ error: "Match not found" });
  }
  const isPlaceholder = (name?: string) => {
    if (!name) return true;
    const n = String(name).toLowerCase();
    return /^team\s+/.test(n) || n === "home team" || n === "away team";
  };
  if (isPlaceholder(m.homeTeamName) || isPlaceholder(m.awayTeamName)) {
    return res.status(400).json({ error: "Predictions disabled for placeholder teams" });
  }
  try {
    const { probs } = await generatePredictionForMatch(m);
    const prediction = db.prepare("SELECT id, matchId, prediction, confidence, reasoning FROM predictions WHERE matchId = ?").get(matchId);
    return res.json({ ok: true, prediction, probs });
  } catch (e) {
    return res.status(500).json({ error: "Failed to generate prediction" });
  }
});

app.post("/api/predictions/generate-bulk", requireUser, async (req, res) => {
  const { matchIds } = req.body || {};
  if (!Array.isArray(matchIds) || matchIds.length === 0) {
    return res.status(400).json({ error: "matchIds array required" });
  }
  const results: Record<string, { prediction?: any; probs?: any; error?: string }> = {};
  for (const id of matchIds.slice(0, 25)) {
    try {
      const m = db
        .prepare("SELECT id, homeTeamName, awayTeamName, homeWinOdds, drawOdds, awayWinOdds FROM matches WHERE id = ?")
        .get(id);
      if (!m) {
        results[id] = { error: "Match not found" };
        continue;
      }
      const isPlaceholder = (name?: string) => {
        if (!name) return true;
        const n = String(name).toLowerCase();
        return /^team\s+/.test(n) || n === "home team" || n === "away team";
      };
      if (isPlaceholder(m.homeTeamName) || isPlaceholder(m.awayTeamName)) {
        results[id] = { error: "Placeholder teams" };
        continue;
      }
      const { probs } = await generatePredictionForMatch(m);
      const prediction = db
        .prepare("SELECT id, matchId, prediction, confidence, reasoning FROM predictions WHERE matchId = ?")
        .get(id);
      results[id] = { prediction, probs };
    } catch {
      results[id] = { error: "Failed" };
    }
  }
  res.json({ ok: true, results });
});
app.get("/api/recommendations/today", (req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const rows = db.prepare(
    `SELECT m.*, l.name as leagueName, l.code as leagueCode, l.country as leagueCountry,
            p.id as predictionId, p.prediction as pred, p.confidence as conf, p.reasoning as reason
     FROM matches m
     JOIN leagues l ON l.id = m.leagueId
     LEFT JOIN predictions p ON p.matchId = m.id
     WHERE m.matchDate BETWEEN ? AND ?
     ORDER BY m.matchDate ASC`
  ).all(start.getTime(), end.getTime()) as any[];

  const isPlaceholder = (name?: string) =>
    !name ||
    /^team\s+/i.test(name) ||
    name.toLowerCase() === "home team" ||
    name.toLowerCase() === "away team";

  const matches = rows
    .filter((r) => r.predictionId)
    .filter((r) => !(isPlaceholder(r.homeTeamName) || isPlaceholder(r.awayTeamName)))
    .map((r) => {
      const recommendationType = r.conf >= 85 ? "safe" : r.conf >= 70 ? "value" : "risky";
      return {
        match: {
          id: r.id,
          leagueId: r.leagueId,
          league: { id: r.leagueId, name: r.leagueName, code: r.leagueCode, country: r.leagueCountry },
          homeTeam: { id: `${r.id}:home`, name: r.homeTeamName },
          awayTeam: { id: `${r.id}:away`, name: r.awayTeamName },
          matchDate: r.matchDate,
          homeWinOdds: r.homeWinOdds,
          drawOdds: r.drawOdds,
          awayWinOdds: r.awayWinOdds,
        },
        prediction: {
          id: r.predictionId,
          matchId: r.id,
          prediction: r.pred,
          confidence: r.conf,
          reasoning: r.reason,
        },
        recommendationType,
      };
    });
  const averageConfidence =
    matches.length > 0 ? matches.reduce((sum, x) => sum + x.prediction.confidence, 0) / matches.length : 0;

  res.json({
    totalMatches: matches.length,
    averageConfidence,
    matches,
  });
});

app.get("/api/user/preferences", requireUser, (req, res) => {
  const userId = (req.user as any).id as string;
  const row = db.prepare("SELECT preferredLeagues, emailNotifications, riskTolerance, timezone FROM user_preferences WHERE userId = ?").get(userId);
  if (!row) {
    return res.json({
      preferredLeagues: [],
      emailNotifications: true,
      riskTolerance: "medium",
      timezone: "UTC",
    });
  }
  res.json({
    preferredLeagues: JSON.parse(row.preferredLeagues),
    emailNotifications: !!row.emailNotifications,
    riskTolerance: row.riskTolerance,
    timezone: row.timezone,
  });
});

app.post("/api/user/preferences", requireUser, (req, res) => {
  const userId = (req.user as any).id as string;
  const { preferredLeagues = [], emailNotifications = true, riskTolerance = "medium", timezone = "UTC" } = req.body || {};
  const stmt = db.prepare(`
    INSERT INTO user_preferences (userId, preferredLeagues, emailNotifications, riskTolerance, timezone)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(userId) DO UPDATE SET preferredLeagues=excluded.preferredLeagues, emailNotifications=excluded.emailNotifications, riskTolerance=excluded.riskTolerance, timezone=excluded.timezone
  `);
  stmt.run(userId, JSON.stringify(preferredLeagues), emailNotifications ? 1 : 0, riskTolerance, timezone);
  res.json({ ok: true });
});

// OpenRouter client via OpenAI SDK
const openai = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

async function generatePredictionForMatch(match: {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeWinOdds?: number;
  drawOdds?: number;
  awayWinOdds?: number;
}): Promise<{ probs?: { home: number; draw: number; away: number } }> {
  // Blend historical priors from MongoDB if available
  const priors = await getHistoricalPriors(match.homeTeamName, match.awayTeamName);
  const prompt = `
You are an expert football betting analyst. Given the match and decimal odds, output a JSON with fields: prediction (home|draw|away), confidence (0-100), reasoning (short).
Match: ${match.homeTeamName} vs ${match.awayTeamName}
Odds: home=${match.homeWinOdds ?? "N/A"}, draw=${match.drawOdds ?? "N/A"}, away=${match.awayWinOdds ?? "N/A"}
 Also include 'probs' with keys home, draw, away as integers 0-100 that sum to ~100.
Return only JSON.`;

  try {
    const resp = await openai.chat.completions.create({
      model: "openrouter/auto",
      messages: [
        { role: "system", content: "Return valid strict JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    });
    const text = resp.choices[0]?.message?.content || "";
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const json = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    const prediction = (json.prediction || "home").toLowerCase();
    const confidence = Math.max(0, Math.min(100, Number(json.confidence || 70)));
    const reasoning = String(json.reasoning || "");
    let probs: { home: number; draw: number; away: number } | undefined;
    if (json.probs && typeof json.probs === "object") {
      const h = Math.max(0, Math.min(100, Number(json.probs.home ?? 0)));
      const d = Math.max(0, Math.min(100, Number(json.probs.draw ?? 0)));
      const a = Math.max(0, Math.min(100, Number(json.probs.away ?? 0)));
      const sum = h + d + a;
      if (sum > 0) {
        // normalize to sum to 100
        probs = {
          home: Math.round((h / sum) * 100),
          draw: Math.round((d / sum) * 100),
          away: Math.round((a / sum) * 100),
        };
      }
    }
    db.prepare(
      `INSERT INTO predictions (id, matchId, prediction, confidence, reasoning)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(matchId) DO UPDATE SET prediction=excluded.prediction, confidence=excluded.confidence, reasoning=excluded.reasoning`
    ).run(`pred_${match.id}`, match.id, prediction, confidence, reasoning);
    if (!probs) {
      // fallback distribution centered on top pick confidence
      const base = { home: 33, draw: 33, away: 34 };
      if (prediction === "home") base.home = confidence;
      else if (prediction === "draw") base.draw = confidence;
      else base.away = confidence;
      const rem = 100 - (prediction === "home" ? base.home : prediction === "draw" ? base.draw : base.away);
      const others = ["home", "draw", "away"].filter((k) => k !== prediction) as Array<"home" | "draw" | "away">;
      base[others[0]] = Math.round(rem * 0.5);
      base[others[1]] = rem - base[others[0]];
      probs = base as any;
    }
    // Blend with priors if available
    const blended = priors ? blendProbs(probs!, priors, 0.7) : probs!;
    return { probs: blended };
  } catch (e) {
    // Fallback to odds-based heuristic if model fails
    const outcomes: Array<{ key: "home" | "draw" | "away"; odds?: number; name: string }> = [
      { key: "home", odds: match.homeWinOdds, name: match.homeTeamName },
      { key: "draw", odds: match.drawOdds, name: "Draw" },
      { key: "away", odds: match.awayWinOdds, name: match.awayTeamName },
    ];
    const available = outcomes.filter((o) => typeof o.odds === "number" && o.odds! > 0);
    if (available.length > 0) {
      const implied = available.map((o) => ({ ...o, p: 1 / (o.odds as number) }));
      const sum = implied.reduce((s, o) => s + o.p, 0);
      const withConf = implied.map((o) => ({ ...o, conf: Math.round((o.p / sum) * 100) }));
      const best = withConf.sort((a, b) => b.conf - a.conf)[0];
      const reasoning = `Odds-based fallback: highest implied probability from odds.`;
      db.prepare(
        `INSERT INTO predictions (id, matchId, prediction, confidence, reasoning)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(matchId) DO UPDATE SET prediction=excluded.prediction, confidence=excluded.confidence, reasoning=excluded.reasoning`
      ).run(`pred_${match.id}`, match.id, best.key, best.conf, reasoning);
      let probs = {
        home: withConf.find((x) => x.key === "home")?.conf ?? 0,
        draw: withConf.find((x) => x.key === "draw")?.conf ?? 0,
        away: withConf.find((x) => x.key === "away")?.conf ?? 0,
      };
      if (priors) {
        probs = blendProbs(probs, priors, 0.7);
      }
      return { probs };
    }
    return {};
  }
}

function blendProbs(
  model: { home: number; draw: number; away: number },
  priors: { home: number; draw: number; away: number },
  modelWeight: number,
) {
  const priorWeight = 1 - modelWeight;
  const h = model.home * modelWeight + priors.home * priorWeight;
  const d = model.draw * modelWeight + priors.draw * priorWeight;
  const a = model.away * modelWeight + priors.away * priorWeight;
  const sum = h + d + a || 1;
  return { home: Math.round((h / sum) * 100), draw: Math.round((d / sum) * 100), away: Math.round((a / sum) * 100) };
}

async function getHistoricalPriors(homeTeamName: string, awayTeamName: string): Promise<{ home: number; draw: number; away: number } | null> {
  const dbm = await getMongoDb();
  if (!dbm) return null;
  const coll = dbm.collection("match_history");
  // Last 20 matches for each team
  const lastN = 20;
  const homeRecent = await coll
    .find({ $or: [{ homeTeamName }, { awayTeamName: homeTeamName }] })
    .sort({ date: -1 })
    .limit(lastN)
    .toArray();
  const awayRecent = await coll
    .find({ $or: [{ homeTeamName: awayTeamName }, { awayTeamName: awayTeamName }] })
    .sort({ date: -1 })
    .limit(lastN)
    .toArray();
  // Last 10 head-to-head
  const h2h = await coll
    .find({
      $or: [
        { homeTeamName, awayTeamName },
        { homeTeamName: awayTeamName, awayTeamName: homeTeamName },
      ],
    })
    .sort({ date: -1 })
    .limit(10)
    .toArray();

  const pct = (wins: number, draws: number, losses: number) => {
    const total = wins + draws + losses;
    if (!total) return { win: 0, draw: 0, loss: 0 };
    return {
      win: wins / total,
      draw: draws / total,
      loss: losses / total,
    };
  };

  const summarize = (games: any[], team: string) => {
    let wins = 0,
      draws = 0,
      losses = 0;
    for (const g of games) {
      const hg = Number(g.homeGoals ?? 0);
      const ag = Number(g.awayGoals ?? 0);
      const isHome = g.homeTeamName === team;
      if (hg === ag) draws++;
      else if ((isHome && hg > ag) || (!isHome && ag > hg)) wins++;
      else losses++;
    }
    return pct(wins, draws, losses);
  };

  const homeForm = summarize(homeRecent, homeTeamName);
  const awayForm = summarize(awayRecent, awayTeamName);

  let h2hHome = 0,
    h2hDraw = 0,
    h2hAway = 0;
  for (const g of h2h) {
    const hg = Number(g.homeGoals ?? 0);
    const ag = Number(g.awayGoals ?? 0);
    if (hg === ag) h2hDraw++;
    else if (g.homeTeamName === homeTeamName ? hg > ag : ag > hg) h2hHome++;
    else h2hAway++;
  }
  const h2hTotal = h2hHome + h2hDraw + h2hAway || 1;

  // Construct priors (0..100)
  const homePrior =
    100 *
    (0.5 * homeForm.win +
      0.3 * (1 - awayForm.win) +
      0.2 * (h2hHome / h2hTotal));
  const drawPrior =
    100 *
    (0.6 * ((homeForm.draw + awayForm.draw) / 2) + 0.4 * (h2hDraw / h2hTotal));
  const awayPrior =
    100 *
    (0.5 * awayForm.win +
      0.3 * (1 - homeForm.win) +
      0.2 * (h2hAway / h2hTotal));
  const sum = homePrior + drawPrior + awayPrior || 1;
  return {
    home: Math.round((homePrior / sum) * 100),
    draw: Math.round((drawPrior / sum) * 100),
    away: Math.round((awayPrior / sum) * 100),
  };
}

// Ingest historical results into MongoDB
app.post("/api/history/ingest", requireUser, async (req, res) => {
  try {
    const dbm = await getMongoDb();
    if (!dbm) return res.status(400).json({ error: "MongoDB not configured" });
    const coll = dbm.collection("match_history");
    const items = Array.isArray(req.body) ? req.body : [req.body];
    if (!items.length) return res.status(400).json({ error: "No items provided" });
    for (const it of items) {
      const key = `${it.date}-${it.homeTeamName}-${it.awayTeamName}`;
      await coll.updateOne(
        { _key: key },
        {
          $set: {
            _key: key,
            date: it.date,
            homeTeamName: it.homeTeamName,
            awayTeamName: it.awayTeamName,
            homeGoals: it.homeGoals,
            awayGoals: it.awayGoals,
            competition: it.competition ?? null,
          },
        },
        { upsert: true },
      );
    }
    res.json({ ok: true, inserted: items.length });
  } catch (e) {
    res.status(500).json({ error: "Failed to ingest history" });
  }
});

// Stub odds fetcher: generate upcoming matches for tomorrow if none
function ensureSampleMatches() {
  // If we have Odds API configured, skip seeding placeholders
  if (ODDS_API_KEY) return;
  // Seed a few realistic fixtures for today if none exist today
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const existing = db.prepare("SELECT COUNT(*) as c FROM matches WHERE matchDate BETWEEN ? AND ?").get(
    startOfDay.getTime(),
    endOfDay.getTime()
  ) as { c: number };
  if (existing.c > 0) return;

  const leagueIds = db.prepare("SELECT id FROM leagues").all() as { id: string }[];
  const leagueIdMap: Record<string, string> = {
    epl: "epl",
    laliga: "laliga",
    bundesliga: "bundesliga",
    seriea: "seriea",
  };
  // Choose available leagues in DB
  const hasLeague = (id: string) => leagueIds.some((l) => l.id === id);

  const fixtures: Array<{ leagueId: string; home: string; away: string; offsetHours: number; odds: [number, number, number] }> = [];
  if (hasLeague("epl")) {
    fixtures.push(
      { leagueId: leagueIdMap.epl, home: "Arsenal", away: "Chelsea", offsetHours: 3, odds: [1.95, 3.4, 4.1] },
      { leagueId: leagueIdMap.epl, home: "Liverpool", away: "Tottenham", offsetHours: 5, odds: [1.85, 3.6, 4.3] },
    );
  }
  if (hasLeague("laliga")) {
    fixtures.push({ leagueId: leagueIdMap.laliga, home: "Real Madrid", away: "Sevilla", offsetHours: 7, odds: [1.6, 3.8, 5.2] });
  }
  if (hasLeague("bundesliga")) {
    fixtures.push({ leagueId: leagueIdMap.bundesliga, home: "Bayern Munich", away: "Leipzig", offsetHours: 9, odds: [1.7, 4.0, 4.8] });
  }
  if (hasLeague("seriea")) {
    fixtures.push({ leagueId: leagueIdMap.seriea, home: "Inter", away: "Juventus", offsetHours: 11, odds: [2.2, 3.2, 3.3] });
  }
  if (fixtures.length === 0 && leagueIds.length) {
    // Fallback if custom leagues table changed
    fixtures.push({ leagueId: leagueIds[0].id, home: "Team A", away: "Team B", offsetHours: 3, odds: [2.0, 3.3, 3.8] });
  }

  const insert = db.prepare(`
    INSERT INTO matches (id, leagueId, matchDate, homeTeamName, awayTeamName, homeWinOdds, drawOdds, awayWinOdds)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  fixtures.forEach((f, idx) => {
    const kickoff = new Date(startOfDay.getTime());
    kickoff.setHours(12 + f.offsetHours, 0, 0, 0);
    const id = `m_${startOfDay.getTime()}_${idx}`;
    insert.run(id, f.leagueId, kickoff.getTime(), f.home, f.away, f.odds[0], f.odds[1], f.odds[2]);
  });
}

async function fetchAndUpsertLiveOdds({ days }: { days: number }) {
  const endTs = Date.now() + days * 24 * 60 * 60 * 1000;
  const leagueMap: Record<string, string> = {
    soccer_epl: "epl",
    soccer_spain_la_liga: "laliga",
    soccer_germany_bundesliga: "bundesliga",
    soccer_italy_serie_a: "seriea",
    soccer_uefa_champs_league: "ucl",
  };
  for (const sport of ODDS_API_SPORTS) {
    const leagueId = leagueMap[sport];
    if (!leagueId) continue;
    const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=${encodeURIComponent(
      ODDS_API_KEY,
    )}`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const events = (await resp.json()) as any[];
      const insert = db.prepare(`
        INSERT INTO matches (id, leagueId, matchDate, homeTeamName, awayTeamName, homeWinOdds, drawOdds, awayWinOdds)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          leagueId=excluded.leagueId,
          matchDate=excluded.matchDate,
          homeTeamName=excluded.homeTeamName,
          awayTeamName=excluded.awayTeamName,
          homeWinOdds=excluded.homeWinOdds,
          drawOdds=excluded.drawOdds,
          awayWinOdds=excluded.awayWinOdds
      `);
      for (const ev of events) {
        const commenceMs = new Date(ev.commence_time).getTime();
        if (commenceMs > endTs) continue;
        const home = ev.home_team as string;
        const away = ev.away_team as string;
        let homeOdds: number | undefined;
        let drawOdds: number | undefined;
        let awayOdds: number | undefined;
        const firstBook = (ev.bookmakers || [])[0];
        if (firstBook?.markets?.length) {
          const h2h = firstBook.markets.find((m: any) => m.key === "h2h");
          if (h2h?.outcomes?.length) {
            for (const o of h2h.outcomes) {
              if (o.name === home) homeOdds = Number(o.price);
              else if (o.name === away) awayOdds = Number(o.price);
              else if (String(o.name).toLowerCase() === "draw") drawOdds = Number(o.price);
            }
          }
        }
        const id = `odds_${sport}_${ev.id}`;
        insert.run(id, leagueId, commenceMs, home, away, homeOdds ?? null, drawOdds ?? null, awayOdds ?? null);
      }
    } catch {
      // ignore network errors
    }
  }
}

async function runDailyJobs() {
  ensureSampleMatches();
  const upcoming = db.prepare(
    `SELECT id, homeTeamName, awayTeamName, homeWinOdds, drawOdds, awayWinOdds FROM matches
     WHERE matchDate BETWEEN ? AND ?`
  ).all(Date.now(), Date.now() + 24 * 60 * 60 * 1000) as any[];
  for (const m of upcoming) {
    await generatePredictionForMatch(m);
  }

  // Send emails (best-effort) if RESEND_API_KEY provided
  if (RESEND_API_KEY) {
    try {
      const Resend = (await import("resend")).Resend;
      const resend = new Resend(RESEND_API_KEY);
      const users = db.prepare(
        `SELECT u.email FROM users u
         JOIN user_preferences p ON p.userId = u.id
         WHERE p.emailNotifications = 1`
      ).all() as { email: string }[];
      if (users.length) {
        const subject = "Today's Betting Tips";
        await Promise.all(
          users.map((u) =>
            resend.emails.send({
              from: "Tips <onboarding@resend.dev>",
              to: u.email,
              subject,
              text: "Your daily tips are ready. Visit the app to see recommendations.",
            })
          )
        );
      }
    } catch {
      // ignore email failures in dev
    }
  }
}

// Schedule daily email at 09:00 in configured timezone (default UTC)
const CRON_TZ = process.env.CRON_TZ || "UTC";
cron.schedule(
  "0 9 * * *",
  () => {
    runDailyJobs().catch(() => {});
    sendDailyEmails().catch(() => {});
  },
  { timezone: CRON_TZ },
);

// On startup, also generate once after short delay
setTimeout(() => {
  runDailyJobs().catch(() => {});
}, 1500);

// Serve built frontend (for production deploy)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/auth")) return next();
  try {
    return res.sendFile(path.join(distPath, "index.html"));
  } catch {
    return next();
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

async function sendDailyEmails() {
  if (!RESEND_API_KEY) return;
  try {
    const Resend = (await import("resend")).Resend;
    const resend = new Resend(RESEND_API_KEY);
    // Select today's high-confidence predictions (>= 85)
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const rows = db
      .prepare(
        `SELECT m.homeTeamName, m.awayTeamName, m.matchDate, l.name as leagueName, p.prediction, p.confidence
         FROM matches m
         JOIN leagues l ON l.id = m.leagueId
         JOIN predictions p ON p.matchId = m.id
         WHERE m.matchDate BETWEEN ? AND ? AND p.confidence >= ?
         ORDER BY p.confidence DESC, m.matchDate ASC`,
      )
      .all(start.getTime(), end.getTime(), 85) as any[];

    if (!rows.length) return;
    const lines = rows.map(
      (r: any) =>
        `${r.leagueName}: ${r.homeTeamName} vs ${r.awayTeamName} • ${new Date(r.matchDate).toLocaleString()} • ${String(
          r.prediction,
        ).toUpperCase()} (${r.confidence}%)`,
    );
    const users = db
      .prepare(
        `SELECT u.email FROM users u
         JOIN user_preferences p ON p.userId = u.id
         WHERE p.emailNotifications = 1`,
      )
      .all() as { email: string }[];
    await Promise.all(
      users.map((u) =>
        resend.emails.send({
          from: "Tips <onboarding@resend.dev>",
          to: u.email,
          subject: "Today’s High-Confidence Picks",
          text: lines.join("\n"),
        }),
      ),
    );
  } catch {
    // ignore
  }
}

