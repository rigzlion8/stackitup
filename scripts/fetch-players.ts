#!/usr/bin/env tsx
/**
 * Football Player Data Fetcher — SportAPI7 (RapidAPI)
 *
 * Fetches Premier League lineups from scheduled events and ingests
 * player/team data into the stackitup database.
 *
 * Usage:  npx tsx scripts/fetch-players.ts [--date YYYY-MM-DD]
 * Cron:   every 6 hours — cd /home/app/stackitup && npx tsx scripts/fetch-players.ts
 *
 * Env:    RAPIDAPI_KEY  — SportAPI7 key from RapidAPI
 *         INGEST_URL    — server URL (default http://127.0.0.1:3100)
 */

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
const INGEST_URL = process.env.INGEST_URL || "http://127.0.0.1:3100";
const HOST = "sportapi7.p.rapidapi.com";
const BASE = `https://${HOST}/api/v1`;

const POS_MAP: Record<string, string> = {
  G: "Goalkeeper", D: "Defender", M: "Midfielder", F: "Forward",
};

interface ApiPlayer {
  id: string; name: string; team_id: string; country: string;
  position: string; number?: number; height?: number;
  birth_date?: null; weight?: null; fifa_rating?: null;
  transfer_fee?: null; wages?: null; market_value?: null; preferred_foot?: null;
  appearances: number; goals: number; assists: number; clean_sheets: number;
  yellow_cards: number; red_cards: number; minutes_played: number;
  fantasy_points: number; fantasy_value: number;
}

interface ApiTeam {
  id: string; name: string; country: string; league: string;
}

async function apiGet(path: string): Promise<any> {
  const url = `${BASE}${path}`;
  const resp = await fetch(url, {
    headers: {
      "x-rapidapi-key": RAPIDAPI_KEY,
      "x-rapidapi-host": HOST,
    },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`API ${resp.status}: ${text.slice(0, 200)}`);
  }
  return resp.json();
}

async function fetchDates(): Promise<string[]> {
  const args = process.argv.slice(2);
  const dateArg = args.find((a) => a.startsWith("--date="));
  if (dateArg) {
    return [dateArg.split("=")[1]];
  }
  // Fetch last 3 Saturdays (recent matchdays, since season runs Aug-May)
  const dates: string[] = [];
  const now = new Date();
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i * 7);
    // Find the Saturday of that week
    const day = d.getDay();
    d.setDate(d.getDate() - ((day + 1) % 7));
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

async function ingest(teams: ApiTeam[], players: ApiPlayer[]): Promise<void> {
  const BATCH = 50;
  for (let i = 0; i < players.length; i += BATCH) {
    const batch = players.slice(i, i + BATCH);
    const payload: any = { players: batch, season: "2025-26" };
    if (i === 0 && teams.length) payload.teams = teams;

    const resp = await fetch(`${INGEST_URL}/api/players/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await resp.json();
    console.log(`  Batch ${Math.floor(i / BATCH) + 1}: ${result.inserted} inserted, ${result.errors} errors`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

async function main() {
  if (!RAPIDAPI_KEY) {
    console.error("RAPIDAPI_KEY not set in environment");
    process.exit(1);
  }

  const dates = await fetchDates();
  console.log(`Fetching PL lineups for: ${dates.join(", ")}`);

  const allPlayers: Map<string, ApiPlayer> = new Map();
  const allTeams: Map<string, ApiTeam> = new Map();

  for (const date of dates) {
    console.log(`\n📅 ${date}`);
    const data = await apiGet(`/category/1/scheduled-events/${date}`);
    const events = data?.events || [];
    const plEvents = events.filter(
      (e: any) => e.tournament?.name?.includes("Premier League")
    );
    console.log(`  ${plEvents.length} PL matches`);

    for (const ev of plEvents) {
      const homeName = ev.homeTeam?.name || "?";
      const awayName = ev.awayTeam?.name || "?";
      console.log(`  ⚽ ${homeName} vs ${awayName}`);

      // Track teams
      for (const side of ["homeTeam", "awayTeam"] as const) {
        const t = ev[side];
        if (t?.id && !allTeams.has(String(t.id))) {
          allTeams.set(String(t.id), {
            id: String(t.id),
            name: t.name,
            country: t.country?.name || "England",
            league: "epl",
          });
        }
      }

      // Get lineups
      try {
        const lu = await apiGet(`/event/${ev.id}/lineups`);
        if (!lu?.confirmed) continue;

        for (const sideKey of ["home", "away"] as const) {
          const teamSide = sideKey === "home" ? ev.homeTeam : ev.awayTeam;
          const players = lu[sideKey]?.players || [];
          const tid = String(teamSide?.id || "");

          for (const pdata of players) {
            const p = pdata.player || {};
            const pid = String(p.id || "");
            if (!allPlayers.has(pid)) {
              allPlayers.set(pid, {
                id: `api_${pid}`,
                name: p.name || p.shortName || "?",
                team_id: tid,
                country: p.country?.name || "?",
                position: POS_MAP[p.position] || "Midfielder",
                number: p.jerseyNumber ? Number(p.jerseyNumber) : undefined,
                height: p.height || undefined,
                birth_date: null, weight: null,
                fifa_rating: null, transfer_fee: null, wages: null,
                market_value: null, preferred_foot: null,
                appearances: 0, goals: 0, assists: 0, clean_sheets: 0,
                yellow_cards: 0, red_cards: 0, minutes_played: 0,
                fantasy_points: 0, fantasy_value: 0,
              });
            }
          }
        }
      } catch (e: any) {
        console.log(`    Skipped: ${e.message.slice(0, 80)}`);
      }

      await new Promise((r) => setTimeout(r, 600)); // rate limit
    }
  }

  const teams = Array.from(allTeams.values());
  const players = Array.from(allPlayers.values());
  console.log(`\n📊 ${teams.length} teams, ${players.length} new players to ingest`);

  if (players.length > 0) {
    await ingest(teams, players);
    console.log("Done.");
  } else {
    console.log("No new players found.");
  }
}

main().catch((e) => {
  console.error("Fetcher failed:", e.message);
  process.exit(1);
});
