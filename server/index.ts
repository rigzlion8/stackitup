import "dotenv/config";
import express from "express";
import session from "express-session";
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import Database from "better-sqlite3";
import { OpenAI } from "openai";
import cron from "node-cron";

const app = express();
const PORT = Number(process.env.PORT) || 4040;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev_secret";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

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
        callbackURL: "/auth/google/callback",
      },
      (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("Email is required"));
          const id = profile.id;
          const name = profile.displayName;
          const upsert = db.prepare(`
            INSERT INTO users (id, email, name) VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET email=excluded.email, name=excluded.name
          `);
          upsert.run(id, email, name);
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
  return (passport.authenticate("google", { scope: ["profile", "email"] }) as any)(req, res, next);
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

app.get("/api/matches/upcoming", (req, res) => {
  const { leagueId, days } = req.query as { leagueId?: string; days?: string };
  const now = Date.now();
  const until = now + (Number(days || 7) * 24 * 60 * 60 * 1000);
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
  const matches = rows.map((r) => ({
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
  const preds = db.prepare(
    `SELECT p.id, p.matchId, p.prediction, p.confidence, p.reasoning
     FROM predictions p WHERE p.confidence >= ?
     ORDER BY p.confidence DESC LIMIT ?`
  ).all(minConfidence, limit) as any[];
  res.json(preds);
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

  const matches = rows
    .filter((r) => r.predictionId)
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
}) {
  const prompt = `
You are an expert football betting analyst. Given the match and decimal odds, output a JSON with fields: prediction (home|draw|away), confidence (0-100), reasoning (short).
Match: ${match.homeTeamName} vs ${match.awayTeamName}
Odds: home=${match.homeWinOdds ?? "N/A"}, draw=${match.drawOdds ?? "N/A"}, away=${match.awayWinOdds ?? "N/A"}
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
    db.prepare(
      `INSERT INTO predictions (id, matchId, prediction, confidence, reasoning)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(matchId) DO UPDATE SET prediction=excluded.prediction, confidence=excluded.confidence, reasoning=excluded.reasoning`
    ).run(`pred_${match.id}`, match.id, prediction, confidence, reasoning);
  } catch (e) {
    // ignore failures for now
  }
}

// Stub odds fetcher: generate upcoming matches for tomorrow if none
function ensureSampleMatches() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(15, 0, 0, 0);
  const existing = db.prepare("SELECT COUNT(*) as c FROM matches WHERE matchDate BETWEEN ? AND ?").get(
    new Date().setHours(0, 0, 0, 0),
    new Date().setHours(23, 59, 59, 999)
  ) as { c: number };
  if (existing.c > 0) return;

  const leagues = db.prepare("SELECT id FROM leagues").all() as { id: string }[];
  const insert = db.prepare(`
    INSERT INTO matches (id, leagueId, matchDate, homeTeamName, awayTeamName, homeWinOdds, drawOdds, awayWinOdds)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const id1 = `m_${Date.now()}`;
  insert.run(id1, leagues[0].id, tomorrow.getTime(), "Team A", "Team B", 2.0, 3.3, 3.8);
  const id2 = `m_${Date.now() + 1}`;
  insert.run(id2, leagues[1].id, tomorrow.getTime() + 2 * 60 * 60 * 1000, "Team C", "Team D", 1.8, 3.5, 4.2);
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

// Schedule daily at 07:00 UTC
cron.schedule("0 7 * * *", () => {
  runDailyJobs().catch(() => {});
});

// On startup, also generate once after short delay
setTimeout(() => {
  runDailyJobs().catch(() => {});
}, 1500);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


