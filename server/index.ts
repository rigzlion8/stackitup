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
import { seedTeams, seedPlayers } from "./seed-data.js";

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
const ODDS_API_SPORTS = (process.env.ODDS_API_SPORTS || "soccer_epl,soccer_spain_la_liga,soccer_germany_bundesliga,soccer_italy_serie_a,soccer_uefa_champs_league,soccer_fifa_world_cup")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Database setup (SQLite)
const DATA_DIR = process.env.DATA_DIR || ".";
const db = new Database(path.join(DATA_DIR, "data.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  picture TEXT
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
CREATE TABLE IF NOT EXISTS watchlist (
  userId TEXT NOT NULL,
  matchId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  PRIMARY KEY (userId, matchId),
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (matchId) REFERENCES matches(id)
);
CREATE TABLE IF NOT EXISTS match_details (
  matchId TEXT PRIMARY KEY,
  details TEXT NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (matchId) REFERENCES matches(id)
);
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  league TEXT NOT NULL,
  logo_url TEXT
);
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  team_id TEXT NOT NULL,
  country TEXT NOT NULL,
  position TEXT NOT NULL,
  number INTEGER,
  birth_date TEXT,
  height INTEGER,
  weight INTEGER,
  fifa_rating INTEGER,
  transfer_fee REAL,
  wages REAL,
  market_value REAL,
  preferred_foot TEXT,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);
CREATE TABLE IF NOT EXISTS player_season_stats (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  season TEXT NOT NULL,
  appearances INTEGER NOT NULL DEFAULT 0,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  clean_sheets INTEGER NOT NULL DEFAULT 0,
  yellow_cards INTEGER NOT NULL DEFAULT 0,
  red_cards INTEGER NOT NULL DEFAULT 0,
  minutes_played INTEGER NOT NULL DEFAULT 0,
  fantasy_points INTEGER NOT NULL DEFAULT 0,
  fantasy_value REAL DEFAULT 0,
  FOREIGN KEY (player_id) REFERENCES players(id)
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
// Ensure FIFA World Cup exists
const wcExists = db.prepare("SELECT 1 FROM leagues WHERE id = ?").get("worldcup");
if (!wcExists) {
  db.prepare("INSERT INTO leagues (id, name, code, country) VALUES (?, ?, ?, ?)").run(
    "worldcup",
    "FIFA World Cup",
    "WC",
    "International"
  );
}

// Seed teams and players if empty
const teamsCount = db.prepare("SELECT COUNT(*) as c FROM teams").get() as { c: number };
if (teamsCount.c === 0) {
  const insertTeam = db.prepare("INSERT INTO teams (id, name, country, league, logo_url) VALUES (?, ?, ?, ?, ?)");
  const insertPlayer = db.prepare("INSERT INTO players (id, name, team_id, country, position, number, birth_date, height, weight, fifa_rating, transfer_fee, wages, market_value, preferred_foot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const insertStats = db.prepare("INSERT INTO player_season_stats (id, player_id, season, appearances, goals, assists, clean_sheets, yellow_cards, red_cards, minutes_played, fantasy_points, fantasy_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const teams: [string,string,string,string][] = [
    ["arsenal","Arsenal","England","epl"],["chelsea","Chelsea","England","epl"],
    ["liverpool","Liverpool","England","epl"],["man_city","Manchester City","England","epl"],
    ["man_utd","Manchester United","England","epl"],["tottenham","Tottenham Hotspur","England","epl"],
    ["newcastle","Newcastle United","England","epl"],["aston_villa","Aston Villa","England","epl"],
    ["real_madrid","Real Madrid","Spain","laliga"],["barcelona","Barcelona","Spain","laliga"],
    ["atletico","Atletico Madrid","Spain","laliga"],["sevilla","Sevilla","Spain","laliga"],
    ["bayern","Bayern Munich","Germany","bundesliga"],["dortmund","Borussia Dortmund","Germany","bundesliga"],
    ["leipzig","RB Leipzig","Germany","bundesliga"],["leverkusen","Bayer Leverkusen","Germany","bundesliga"],
    ["inter","Inter Milan","Italy","seriea"],["juventus","Juventus","Italy","seriea"],
    ["ac_milan","AC Milan","Italy","seriea"],["napoli","Napoli","Italy","seriea"],
    ["brazil","Brazil","Brazil","worldcup"],["argentina","Argentina","Argentina","worldcup"],
    ["france","France","France","worldcup"],["england","England","England","worldcup"],
    ["germany","Germany","Germany","worldcup"],["spain","Spain","Spain","worldcup"],
  ];
  for (const t of teams) insertTeam.run(t[0],t[1],t[2],t[3],null);
  // [id,name,team_id,country,position,num,birth,ht,wt,fifa,fee_m,wages_k,mkt_val,foot,apps,goals,assists,cs,yc,rc,min,fant_pts,fant_val]
  const players: any[][] = [
    ["p_saka","Bukayo Saka","arsenal","England","Forward",7,"2001-09-05",178,72,88,0,250,150,"L",35,16,9,0,4,0,2800,185,12.5],
    ["p_odegaard","Martin Odegaard","arsenal","Norway","Midfielder",8,"1998-12-17",178,70,89,35,220,110,"L",35,8,10,0,2,0,2900,152,9.5],
    ["p_saliba","William Saliba","arsenal","France","Defender",2,"2001-03-24",192,84,87,30,130,80,"R",38,2,1,18,5,0,3200,142,6.5],
    ["p_raya","David Raya","arsenal","Spain","Goalkeeper",22,"1995-09-15",183,80,85,30,120,35,"R",32,0,0,16,2,0,2850,128,5.5],
    ["p_haaland","Erling Haaland","man_city","Norway","Forward",9,"2000-07-21",194,88,91,60,450,200,"L",31,27,5,0,1,0,2550,228,14.0],
    ["p_debruyne","Kevin De Bruyne","man_city","Belgium","Midfielder",17,"1991-06-28",181,75,90,70,400,50,"R",18,4,10,0,1,0,1400,142,10.5],
    ["p_rodri","Rodri","man_city","Spain","Midfielder",16,"1996-06-22",190,82,91,70,300,130,"R",34,9,9,0,10,1,2900,158,7.0],
    ["p_ederson","Ederson","man_city","Brazil","Goalkeeper",31,"1993-08-17",188,86,88,40,150,35,"L",33,0,0,13,5,0,2940,121,5.5],
    ["p_salah","Mohamed Salah","liverpool","Egypt","Forward",11,"1992-06-15",175,71,89,42,400,55,"L",32,18,10,0,2,0,2680,211,12.5],
    ["p_vandijk","Virgil van Dijk","liverpool","Netherlands","Defender",4,"1991-07-08",193,92,89,75,260,28,"R",36,2,2,12,3,1,3180,162,6.5],
    ["p_alisson","Alisson Becker","liverpool","Brazil","Goalkeeper",1,"1992-10-02",191,91,89,62,180,28,"R",28,0,0,8,2,0,2480,109,5.5],
    ["p_palmer","Cole Palmer","chelsea","England","Midfielder",20,"2002-05-06",185,74,87,0,150,130,"L",34,22,11,0,7,0,2700,236,10.0],
    ["p_jackson","Nicolas Jackson","chelsea","Senegal","Forward",15,"2001-06-20",187,79,82,37,130,55,"R",35,14,5,0,9,0,2400,145,7.5],
    ["p_fernandes","Bruno Fernandes","man_utd","Portugal","Midfielder",8,"1994-09-08",179,69,87,65,300,65,"R",35,10,8,0,9,1,3050,153,9.5],
    ["p_rashford","Marcus Rashford","man_utd","England","Forward",10,"1997-10-31",180,72,84,0,300,50,"R",33,7,5,0,2,1,2250,98,8.0],
    ["p_son","Son Heung-min","tottenham","South Korea","Forward",7,"1992-07-08",184,78,87,30,250,38,"B",35,17,10,0,2,0,2900,196,11.0],
    ["p_maddison","James Maddison","tottenham","England","Midfielder",10,"1996-11-23",175,73,85,45,190,60,"R",28,4,9,0,5,0,2100,114,8.0],
    ["p_vinicius","Vinicius Junior","real_madrid","Brazil","Forward",7,"2000-07-12",176,68,91,0,350,200,"R",26,15,6,0,7,0,1950,175,12.0],
    ["p_bellingham","Jude Bellingham","real_madrid","England","Midfielder",5,"2003-06-29",186,75,91,103,340,180,"R",28,19,6,0,5,1,2300,192,10.5],
    ["p_courtois","Thibaut Courtois","real_madrid","Belgium","Goalkeeper",1,"1992-05-11",200,96,90,35,250,25,"L",31,0,0,12,2,0,2760,121,6.0],
    ["p_lewa","Robert Lewandowski","barcelona","Poland","Forward",9,"1988-08-21",185,81,90,50,380,15,"R",35,19,8,0,5,0,2800,208,12.0],
    ["p_terstegen","Marc-Andre ter Stegen","barcelona","Germany","Goalkeeper",1,"1992-04-30",187,85,89,10,200,20,"R",28,0,0,10,1,0,2500,97,5.5],
    ["p_kane","Harry Kane","bayern","England","Forward",9,"1993-07-28",188,89,91,100,420,90,"R",32,36,8,0,2,0,2700,251,13.5],
    ["p_musiala","Jamal Musiala","bayern","Germany","Midfielder",42,"2003-02-26",183,72,88,0,180,140,"R",24,10,6,0,1,0,1720,138,8.5],
    ["p_neuer","Manuel Neuer","bayern","Germany","Goalkeeper",1,"1986-03-27",193,92,87,0,170,4,"R",23,0,0,5,0,0,2040,62,5.0],
    ["p_lautaro","Lautaro Martinez","inter","Argentina","Forward",10,"1997-08-22",174,72,88,25,220,100,"R",33,24,6,0,3,0,2700,200,11.5],
    ["p_barella","Nicolo Barella","inter","Italy","Midfielder",23,"1997-02-07",172,68,86,45,190,80,"R",37,2,7,0,7,0,3100,120,7.0],
    ["p_vlahovic","Dusan Vlahovic","juventus","Serbia","Forward",9,"2000-01-28",190,83,84,80,210,65,"L",33,16,3,0,6,0,2400,153,9.5],
    ["p_fuellkrug","Niclas Fullkrug","dortmund","Germany","Forward",14,"1993-02-09",189,84,81,15,110,15,"R",29,12,8,0,2,0,2100,120,7.0],
    ["p_neymar","Neymar Jr","brazil","Brazil","Forward",10,"1992-02-05",175,68,89,90,400,20,"R",2,1,2,0,0,0,180,17,9.0],
    ["p_alisson_br","Alisson Becker","brazil","Brazil","Goalkeeper",1,"1992-10-02",191,91,89,62,180,28,"R",8,0,0,3,0,0,720,29,5.5],
    ["p_messi","Lionel Messi","argentina","Argentina","Forward",10,"1987-06-24",170,72,88,0,500,25,"L",7,6,3,0,0,0,620,65,11.0],
    ["p_emartinez","Emiliano Martinez","argentina","Argentina","Goalkeeper",23,"1992-09-02",195,91,87,25,160,28,"R",8,0,0,4,1,0,750,42,5.5],
    ["p_mbappe","Kylian Mbappe","france","France","Forward",10,"1998-12-20",178,73,91,0,600,180,"R",8,8,2,0,0,0,720,72,13.0],
    ["p_kane_en","Harry Kane","england","England","Forward",9,"1993-07-28",188,89,91,100,420,90,"R",8,7,2,0,1,0,700,59,13.5],
    ["p_pickford","Jordan Pickford","england","England","Goalkeeper",1,"1994-03-07",185,77,83,25,80,22,"L",8,0,0,3,1,0,750,35,5.0],
  ];
  const season = "2024-25";
  for (const p of players) {
    insertPlayer.run(p[0],p[1],p[2],p[3],p[4],p[5],p[6],p[7],p[8],p[9],p[10],p[11],p[12],p[13]);
    insertStats.run("s_"+p[0],p[0],season,p[15],p[16],p[17],p[18],p[19],p[20],p[21],p[22],p[23]);
  }
  // Append comprehensive seed data (all EPL + WC squads)
  for (const t of seedTeams) {
    insertTeam.run(t.id, t.name, t.country, t.league, null);
  }
  for (const p of seedPlayers) {
    insertPlayer.run(p.id, p.name, p.team_id, p.country, p.position, p.number, p.birth_date, p.height, p.weight, p.fifa_rating, p.transfer_fee, p.wages, p.market_value, p.preferred_foot);
    insertStats.run("s_"+p.id, p.id, season, p.appearances, p.goals, p.assists, p.clean_sheets, p.yellow_cards, p.red_cards, p.minutes_played, p.fantasy_points, p.fantasy_value);
  }
}

// Always seed additional teams/players from seed-data module
(() => {
  const insertTeam = db.prepare("INSERT OR IGNORE INTO teams (id, name, country, league, logo_url) VALUES (?, ?, ?, ?, ?)");
  const insertPlayer = db.prepare("INSERT OR IGNORE INTO players (id, name, team_id, country, position, number, birth_date, height, weight, fifa_rating, transfer_fee, wages, market_value, preferred_foot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const insertStats = db.prepare("INSERT OR IGNORE INTO player_season_stats (id, player_id, season, appearances, goals, assists, clean_sheets, yellow_cards, red_cards, minutes_played, fantasy_points, fantasy_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const season = "2024-25";
  for (const t of seedTeams) insertTeam.run(t.id, t.name, t.country, t.league, null);
  for (const p of seedPlayers) {
    insertPlayer.run(p.id, p.name, p.team_id, p.country, p.position, p.number, p.birth_date, p.height, p.weight, p.fifa_rating, p.transfer_fee, p.wages, p.market_value, p.preferred_foot);
    insertStats.run("s_"+p.id, p.id, season, p.appearances, p.goals, p.assists, p.clean_sheets, p.yellow_cards, p.red_cards, p.minutes_played, p.fantasy_points, p.fantasy_value);
  }
})();

// Middlewares
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: CLIENT_URL.startsWith("https"),
      sameSite: CLIENT_URL.startsWith("https") ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    proxy: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Add missing columns for existing databases (backward compatibility)
try { db.exec("ALTER TABLE users ADD COLUMN picture TEXT"); } catch {}
try { db.exec("ALTER TABLE players ADD COLUMN fifa_rating INTEGER"); } catch {}
try { db.exec("ALTER TABLE players ADD COLUMN transfer_fee REAL"); } catch {}
try { db.exec("ALTER TABLE players ADD COLUMN wages REAL"); } catch {}
try { db.exec("ALTER TABLE players ADD COLUMN market_value REAL"); } catch {}
try { db.exec("ALTER TABLE players ADD COLUMN preferred_foot TEXT"); } catch {}
try { db.exec("ALTER TABLE player_season_stats ADD COLUMN minutes_played INTEGER DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE player_season_stats ADD COLUMN fantasy_points INTEGER DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE player_season_stats ADD COLUMN fantasy_value REAL DEFAULT 0"); } catch {}

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
  const user = db.prepare("SELECT id, email, name, picture FROM users WHERE id = ?").get(id);
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
          const picture = userinfo.picture || null;
          if (!email || !id) return done(new Error("Email or id missing from Google profile"));
          const upsert = db.prepare(`
            INSERT INTO users (id, email, name, picture) VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET email=excluded.email, name=excluded.name, picture=excluded.picture
          `);
          upsert.run(id, email, name || null, picture);
          const user = db.prepare("SELECT id, email, name, picture FROM users WHERE id = ?").get(id);
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
  const days = Math.min(Math.max(Number(req.query.days) || 1, 1), 7);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
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

// Watchlist endpoints
app.get("/api/watchlist", requireUser, (req, res) => {
  const userId = (req.user as any).id as string;
  const rows = db.prepare(
    `SELECT m.*, l.name as leagueName, l.code as leagueCode, l.country as leagueCountry,
            p.id as predictionId, p.prediction as pred, p.confidence as conf, p.reasoning as reason
     FROM watchlist w
     JOIN matches m ON m.id = w.matchId
     JOIN leagues l ON l.id = m.leagueId
     LEFT JOIN predictions p ON p.matchId = m.id
     WHERE w.userId = ?
     ORDER BY m.matchDate ASC`
  ).all(userId) as any[];
  const matches = rows.map((r) => ({
    id: r.id, leagueId: r.leagueId,
    league: { id: r.leagueId, name: r.leagueName, code: r.leagueCode, country: r.leagueCountry },
    homeTeam: { id: `${r.id}:home`, name: r.homeTeamName },
    awayTeam: { id: `${r.id}:away`, name: r.awayTeamName },
    matchDate: r.matchDate, homeWinOdds: r.homeWinOdds, drawOdds: r.drawOdds, awayWinOdds: r.awayWinOdds,
    prediction: r.predictionId ? { id: r.predictionId, matchId: r.id, prediction: r.pred, confidence: r.conf, reasoning: r.reason } : null,
  }));
  res.json(matches);
});

app.post("/api/watchlist", requireUser, (req, res) => {
  const userId = (req.user as any).id as string;
  const { matchId } = req.body || {};
  if (!matchId) return res.status(400).json({ error: "matchId required" });
  const match = db.prepare("SELECT id FROM matches WHERE id = ?").get(matchId);
  if (!match) return res.status(404).json({ error: "Match not found" });
  try {
    db.prepare("INSERT INTO watchlist (userId, matchId, createdAt) VALUES (?, ?, ?)").run(userId, matchId, Date.now());
    res.json({ ok: true });
  } catch {
    res.status(409).json({ error: "Already in watchlist" });
  }
});

app.delete("/api/watchlist/:matchId", requireUser, (req, res) => {
  const userId = (req.user as any).id as string;
  db.prepare("DELETE FROM watchlist WHERE userId = ? AND matchId = ?").run(userId, req.params.matchId);
  res.json({ ok: true });
});

// Match details endpoint
app.get("/api/matches/:id/details", requireUser, async (req, res) => {
  const matchId = req.params.id;
  const match = db.prepare(
    `SELECT m.*, l.name as leagueName, l.code as leagueCode, l.country as leagueCountry
     FROM matches m JOIN leagues l ON l.id = m.leagueId WHERE m.id = ?`
  ).get(matchId) as any;
  if (!match) return res.status(404).json({ error: "Match not found" });
  const cached = db.prepare("SELECT details, updatedAt FROM match_details WHERE matchId = ?").get(matchId) as any;
  if (cached && (Date.now() - cached.updatedAt) < 3600000) {
    const details = JSON.parse(cached.details);
    const isWatchlisted = !!db.prepare("SELECT 1 FROM watchlist WHERE userId = ? AND matchId = ?").get((req.user as any).id, matchId);
    return res.json({ ...details, isWatchlisted });
  }
  try {
    const details = await generateMatchDetails(match);
    db.prepare("INSERT INTO match_details (matchId, details, updatedAt) VALUES (?, ?, ?) ON CONFLICT(matchId) DO UPDATE SET details=excluded.details, updatedAt=excluded.updatedAt").run(matchId, JSON.stringify(details), Date.now());
    const isWatchlisted = !!db.prepare("SELECT 1 FROM watchlist WHERE userId = ? AND matchId = ?").get((req.user as any).id, matchId);
    res.json({ ...details, isWatchlisted });
  } catch {
    const fallback = generateFallbackDetails(match);
    const isWatchlisted = !!db.prepare("SELECT 1 FROM watchlist WHERE userId = ? AND matchId = ?").get((req.user as any).id, matchId);
    res.json({ ...fallback, isWatchlisted });
  }
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

async function generateMatchDetails(match: any): Promise<{
  h2h: { homeWins: number; draws: number; awayWins: number; summary: string };
  homeForm: { results: string[]; summary: string };
  awayForm: { results: string[]; summary: string };
  injuries: { home: string[]; away: string[] };
  analysis: string;
}> {
  const prompt = `You are a football match analyst. Given this match, return ONLY valid JSON.
Match: ${match.homeTeamName} vs ${match.awayTeamName}
League: ${match.leagueName}
Odds: home=${match.homeWinOdds ?? "N/A"}, draw=${match.drawOdds ?? "N/A"}, away=${match.awayWinOdds ?? "N/A"}
Return JSON: {"h2h":{"homeWins":N,"draws":N,"awayWins":N,"summary":"..."},"homeForm":{"results":["W","D","L","W","W"],"summary":"..."},"awayForm":{"results":["L","W","D","L","L"],"summary":"..."},"injuries":{"home":["..."],"away":["..."]},"analysis":"..."}`;
  const resp = await openai.chat.completions.create({
    model: "openrouter/auto",
    messages: [{ role: "system", content: "Return valid strict JSON only." }, { role: "user", content: prompt }],
    temperature: 0.5,
  });
  const text = resp.choices[0]?.message?.content || "";
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
}

function generateFallbackDetails(match: any) {
  const home = match.homeTeamName;
  const away = match.awayTeamName;
  return {
    h2h: { homeWins: 3, draws: 2, awayWins: 2, summary: `${home} hold a slight edge in recent meetings with 3 wins in the last 7 encounters.` },
    homeForm: { results: ["W", "D", "W", "L", "W"], summary: `${home} are in good form with 3 wins in their last 5 matches.` },
    awayForm: { results: ["L", "W", "L", "D", "L"], summary: `${away} have struggled recently, winning only 1 of their last 5.` },
    injuries: { home: ["Midfielder (doubtful)"], away: ["Striker (injured)", "Defender (suspended)"] },
    analysis: `${home} are favorites based on recent form and home advantage. ${away} will need to overcome their poor away record to get a result here.`,
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
    soccer_fifa_world_cup: "worldcup",
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

// ========== Teams & Players API ==========

app.get("/api/teams", (req, res) => {
  const { search, league } = req.query as { search?: string; league?: string };
  let sql = "SELECT t.*, l.name as leagueName FROM teams t JOIN leagues l ON l.id = t.league";
  const params: string[] = [];
  const conditions: string[] = [];
  if (search) { conditions.push("t.name LIKE ?"); params.push(`%${search}%`); }
  if (league) { conditions.push("t.league = ?"); params.push(league); }
  if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY t.name ASC";
  const rows = db.prepare(sql).all(...params) as any[];
  // Deduplicate by team name (keep first)
  const seen = new Map<string, any>();
  for (const r of rows) {
    const key = r.name.toLowerCase();
    if (!seen.has(key)) seen.set(key, r);
  }
  res.json(Array.from(seen.values()).map((r:any) => ({id:r.id,name:r.name,country:r.country,league:r.league,leagueName:r.leagueName,logo_url:r.logo_url,coach:r.coach,formation:r.formation})));
});

app.get("/api/teams/:id", (req, res) => {
  const team = db.prepare("SELECT t.*, l.name as leagueName FROM teams t JOIN leagues l ON l.id = t.league WHERE t.id = ?").get(req.params.id) as any;
  if (!team) return res.status(404).json({error:"Team not found"});
  const pc = (db.prepare("SELECT COUNT(*) as c FROM players WHERE team_id = ?").get(req.params.id) as {c:number}).c;
  res.json({id:team.id,name:team.name,country:team.country,league:team.league,leagueName:team.leagueName,logo_url:team.logo_url,playerCount:pc,coach:team.coach,formation:team.formation});
});

app.get("/api/teams/:id/players", (req, res) => {
  const { position } = req.query as { position?: string };
  let sql = `SELECT p.*, s.appearances, s.goals, s.assists, s.clean_sheets, s.yellow_cards, s.red_cards, s.minutes_played, s.fantasy_points, s.fantasy_value
    FROM players p LEFT JOIN player_season_stats s ON s.player_id = p.id AND s.season = '2024-25'
    WHERE p.team_id = ?`;
  const params: string[] = [req.params.id];
  if (position) { sql += " AND p.position = ?"; params.push(position); }
  sql += " ORDER BY p.position, p.name ASC";
  const rows = db.prepare(sql).all(...params) as any[];
  // Deduplicate by name (keep most appearances)
  const seen = new Map<string, any>();
  for (const r of rows) {
    const key = r.name.toLowerCase();
    const existing = seen.get(key);
    if (!existing || (r.appearances || 0) > (existing.appearances || 0)) {
      seen.set(key, r);
    }
  }
  const deduped = Array.from(seen.values());
  res.json(deduped.map((r:any) => ({
    id:r.id,name:r.name,team_id:r.team_id,teamName:"",country:r.country,
    position:r.position,number:r.number,birth_date:r.birth_date,
    height:r.height,weight:r.weight,fifa_rating:r.fifa_rating,
    transfer_fee:r.transfer_fee,wages:r.wages,market_value:r.market_value,preferred_foot:r.preferred_foot,
    stats:{appearances:r.appearances||0,goals:r.goals||0,assists:r.assists||0,
      clean_sheets:r.clean_sheets||0,yellow_cards:r.yellow_cards||0,red_cards:r.red_cards||0,
      minutes_played:r.minutes_played||0,fantasy_points:r.fantasy_points||0,fantasy_value:r.fantasy_value||0},
  })));
});

app.get("/api/teams/compare", (req, res) => {
  const { team1, team2 } = req.query as { team1?: string; team2?: string };
  if (!team1 || !team2) return res.status(400).json({error:"team1 and team2 required"});
  const t1 = db.prepare("SELECT t.*, l.name as leagueName FROM teams t JOIN leagues l ON l.id = t.league WHERE t.id = ?").get(team1) as any;
  const t2 = db.prepare("SELECT t.*, l.name as leagueName FROM teams t JOIN leagues l ON l.id = t.league WHERE t.id = ?").get(team2) as any;
  if (!t1 || !t2) return res.status(404).json({error:"Team not found"});
  const squad = (tid:string) => db.prepare(
    "SELECT COUNT(*) as total, COALESCE(SUM(s.goals),0) as goals, COALESCE(SUM(s.assists),0) as assists, COALESCE(SUM(s.clean_sheets),0) as clean_sheets, COALESCE(AVG(s.appearances),0) as avgApps FROM players p LEFT JOIN player_season_stats s ON s.player_id = p.id AND s.season = '2024-25' WHERE p.team_id = ?"
  ).get(tid) as any;
  const posCount = (tid:string) => {
    const rows = db.prepare("SELECT position, COUNT(*) as cnt FROM players WHERE team_id = ? GROUP BY position").all(tid) as any[];
    const m: Record<string,number> = {};
    for (const r of rows) m[r.position] = r.cnt;
    return m;
  };
  const h2h = db.prepare(
    "SELECT m.*, l.name as leagueName FROM matches m JOIN leagues l ON l.id = m.leagueId WHERE (LOWER(m.homeTeamName)=LOWER(?) AND LOWER(m.awayTeamName)=LOWER(?)) OR (LOWER(m.homeTeamName)=LOWER(?) AND LOWER(m.awayTeamName)=LOWER(?)) ORDER BY m.matchDate DESC LIMIT 10"
  ).all(t1.name,t2.name,t2.name,t1.name) as any[];
  const s1 = squad(team1), s2 = squad(team2);
  res.json({
    team1:{id:t1.id,name:t1.name,country:t1.country,league:t1.leagueName,logo_url:t1.logo_url,
      squad:{total:s1.total||0,goals:s1.goals||0,assists:s1.assists||0,clean_sheets:s1.clean_sheets||0,avgApps:Math.round(s1.avgApps||0)},positions:posCount(team1)},
    team2:{id:t2.id,name:t2.name,country:t2.country,league:t2.leagueName,logo_url:t2.logo_url,
      squad:{total:s2.total||0,goals:s2.goals||0,assists:s2.assists||0,clean_sheets:s2.clean_sheets||0,avgApps:Math.round(s2.avgApps||0)},positions:posCount(team2)},
    h2hMatches:h2h.map((m:any)=>({id:m.id,leagueName:m.leagueName,homeTeamName:m.homeTeamName,awayTeamName:m.awayTeamName,matchDate:m.matchDate,homeWinOdds:m.homeWinOdds,drawOdds:m.drawOdds,awayWinOdds:m.awayWinOdds})),
  });
});

app.get("/api/players", (req, res) => {
  const { search, team, position, country } = req.query as {search?:string;team?:string;position?:string;country?:string};
  let sql = `SELECT p.*, t.name as teamName, s.appearances, s.goals, s.assists, s.clean_sheets, s.yellow_cards, s.red_cards, s.minutes_played, s.fantasy_points, s.fantasy_value
    FROM players p JOIN teams t ON t.id = p.team_id LEFT JOIN player_season_stats s ON s.player_id = p.id AND s.season = '2024-25'`;
  const params: string[] = [];
  const conds: string[] = [];
  if (search) { conds.push("p.name LIKE ?"); params.push(`%${search}%`); }
  if (team) { conds.push("p.team_id = ?"); params.push(team); }
  if (position) { conds.push("p.position = ?"); params.push(position); }
  if (country) { conds.push("p.country = ?"); params.push(country); }
  if (conds.length) sql += " WHERE " + conds.join(" AND ");
  sql += " ORDER BY p.name ASC LIMIT 1000";
  const rows = db.prepare(sql).all(...params) as any[];
  // Deduplicate: keep entry with most appearances per (name+teamName)
  const seen = new Map<string, any>();
  for (const r of rows) {
    const key = `${r.name.toLowerCase()}|${(r.teamName || "").toLowerCase()}`;
    const existing = seen.get(key);
    if (!existing || (r.appearances || 0) > (existing.appearances || 0)) {
      seen.set(key, r);
    }
  }
  const deduped = Array.from(seen.values());
  res.json(deduped.map((r:any)=>({
    id:r.id,name:r.name,team_id:r.team_id,teamName:r.teamName,country:r.country,
    position:r.position,number:r.number,birth_date:r.birth_date,
    height:r.height,weight:r.weight,fifa_rating:r.fifa_rating,
    transfer_fee:r.transfer_fee,wages:r.wages,market_value:r.market_value,preferred_foot:r.preferred_foot,
    stats:{appearances:r.appearances||0,goals:r.goals||0,assists:r.assists||0,
      clean_sheets:r.clean_sheets||0,yellow_cards:r.yellow_cards||0,red_cards:r.red_cards||0,
      minutes_played:r.minutes_played||0,fantasy_points:r.fantasy_points||0,fantasy_value:r.fantasy_value||0},
  })));
});

app.get("/api/players/:id", (req, res) => {
  const player = db.prepare(
    "SELECT p.*, t.name as teamName, t.league as teamLeague, l.name as leagueName FROM players p JOIN teams t ON t.id = p.team_id JOIN leagues l ON l.id = t.league WHERE p.id = ?"
  ).get(req.params.id) as any;
  if (!player) return res.status(404).json({error:"Player not found"});
  const statsRows = db.prepare("SELECT * FROM player_season_stats WHERE player_id = ? ORDER BY season DESC").all(req.params.id) as any[];
  res.json({
    id:player.id,name:player.name,team_id:player.team_id,teamName:player.teamName,
    teamLeague:player.teamLeague,leagueName:player.leagueName,
    country:player.country,position:player.position,number:player.number,
    birth_date:player.birth_date,height:player.height,weight:player.weight,
    fifa_rating:player.fifa_rating,transfer_fee:player.transfer_fee,wages:player.wages,market_value:player.market_value,preferred_foot:player.preferred_foot,
    stats:statsRows.map((s:any)=>({season:s.season,appearances:s.appearances,goals:s.goals,
      assists:s.assists,clean_sheets:s.clean_sheets,yellow_cards:s.yellow_cards,
      red_cards:s.red_cards,minutes_played:s.minutes_played||0,
      fantasy_points:s.fantasy_points||0,fantasy_value:s.fantasy_value||0})),
  });
});

// ========== Data Ingestion API ==========

app.post("/api/players/ingest", (req, res) => {
  const { teams, players, season } = req.body || {};
  if (!Array.isArray(players) || players.length === 0) {
    return res.status(400).json({ error: "players array required" });
  }
  const s = season || "2024-25";
  const insertTeam = db.prepare("INSERT OR IGNORE INTO teams (id, name, country, league, logo_url) VALUES (?, ?, ?, ?, ?)");
  const insertPlayer = db.prepare("INSERT OR REPLACE INTO players (id, name, team_id, country, position, number, birth_date, height, weight, fifa_rating, transfer_fee, wages, market_value, preferred_foot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const insertStats = db.prepare("INSERT OR REPLACE INTO player_season_stats (id, player_id, season, appearances, goals, assists, clean_sheets, yellow_cards, red_cards, minutes_played, fantasy_points, fantasy_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

  if (Array.isArray(teams)) {
    for (const t of teams) {
      insertTeam.run(t.id, t.name, t.country, t.league, t.logo_url || null);
    }
  }

  let inserted = 0;
  let errors = 0;
  for (const p of players) {
    try {
      insertPlayer.run(
        p.id, p.name, p.team_id, p.country, p.position,
        p.number ?? null, p.birth_date ?? null, p.height ?? null, p.weight ?? null,
        p.fifa_rating ?? null, p.transfer_fee ?? null, p.wages ?? null,
        p.market_value ?? null, p.preferred_foot ?? null
      );
      insertStats.run(
        `s_${p.id}`, p.id, s,
        p.appearances ?? 0, p.goals ?? 0, p.assists ?? 0,
        p.clean_sheets ?? 0, p.yellow_cards ?? 0, p.red_cards ?? 0,
        p.minutes_played ?? 0, p.fantasy_points ?? 0, p.fantasy_value ?? 0
      );
      inserted++;
    } catch { errors++; }
  }
  res.json({ ok: true, inserted, errors });
});

// ====================================

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

