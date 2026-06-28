import { useState, useMemo } from "react";
import { PlayerInfo } from "../api";

const FORMATION_OPTIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "3-4-3", "4-1-4-1", "3-4-2-1", "4-3-2-1", "5-3-2", "4-4-1-1"];

function parseFormation(f: string): number[] {
  return f.split("-").map(Number).filter((n) => !isNaN(n) && n > 0);
}

function byFoot(a: PlayerInfo | null, b: PlayerInfo | null): number {
  const fa = a?.preferred_foot ?? "";
  const fb = b?.preferred_foot ?? "";
  if (fa === "L" && fb !== "L") return -1;
  if (fa !== "L" && fb === "L") return 1;
  if (fa === "R" && fb !== "R") return 1;
  if (fa !== "R" && fb === "R") return -1;
  return 0;
}

function assignPositions(formation: string, players: PlayerInfo[], startingIds: Set<string>): (PlayerInfo | null)[][] {
  const rows = parseFormation(formation);
  const sortByApps = (arr: PlayerInfo[]) => [...arr].sort((a, b) => (b.stats.appearances || 0) - (a.stats.appearances || 0));

  const gkPool = sortByApps(players.filter(p => p.position === "Goalkeeper" && startingIds.has(p.id)));
  const defPool = sortByApps(players.filter(p => p.position === "Defender" && startingIds.has(p.id)));
  const midPool = sortByApps(players.filter(p => p.position === "Midfielder" && startingIds.has(p.id)));
  const fwdPool = sortByApps(players.filter(p => p.position === "Forward" && startingIds.has(p.id)));
  const allStarting = sortByApps(players.filter(p => startingIds.has(p.id)));

  const used = new Set<string>();

  const takeFrom = (pool: PlayerInfo[]): PlayerInfo | null => {
    for (const p of pool) {
      if (!used.has(p.id)) { used.add(p.id); return p; }
    }
    for (const p of allStarting) {
      if (!used.has(p.id)) { used.add(p.id); return p; }
    }
    return null;
  };

  const result: (PlayerInfo | null)[][] = [];

  result.push([takeFrom(gkPool)]);

  const outfieldRows = rows;
  if (outfieldRows.length === 0) return result;

  const defRow: (PlayerInfo | null)[] = [];
  for (let i = 0; i < outfieldRows[0]; i++) defRow.push(takeFrom(defPool));
  defRow.sort(byFoot);
  result.push(defRow);

  for (let i = 1; i < outfieldRows.length - 1; i++) {
    const midRow: (PlayerInfo | null)[] = [];
    for (let j = 0; j < outfieldRows[i]; j++) midRow.push(takeFrom(midPool));
    midRow.sort(byFoot);
    result.push(midRow);
  }

  if (outfieldRows.length > 1) {
    const fwdRow: (PlayerInfo | null)[] = [];
    for (let j = 0; j < outfieldRows[outfieldRows.length - 1]; j++) fwdRow.push(takeFrom(fwdPool));
    fwdRow.sort(byFoot);
    fwdRow.reverse();
    result.push(fwdRow);
  }

  return result;
}

function PlayerDot({ player, color, onClick, isSelected }: {
  player: PlayerInfo | null;
  color: string;
  onClick?: () => void;
  isSelected?: boolean;
}) {
  if (!player) return <div className="w-10 h-10" />;
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 cursor-pointer transition-transform hover:scale-110 ${isSelected ? "scale-110" : ""}`}
      title={`${player.name} · ${player.position}`}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-gray-900 text-[10px] font-bold shadow-lg ring-2 ${isSelected ? "ring-yellow-300 ring-4" : "ring-white/50"} ${color}`}>
        {player.number || player.name.charAt(0)}
      </div>
      <span className="text-[9px] text-white font-medium text-center leading-tight max-w-[64px] truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {player.name.split(" ").pop()}
      </span>
    </button>
  );
}

function SubCard({ player, selected, onClick }: { player: PlayerInfo; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
        selected ? "bg-yellow-100 dark:bg-yellow-900/30 ring-1 ring-yellow-400" : "hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-[9px] font-bold text-gray-700 dark:text-gray-300 shrink-0">
        {player.number || player.name.charAt(0)}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-gray-900 dark:text-gray-100 truncate">{player.name.split(" ").pop()}</div>
        <div className="text-[9px] text-gray-500">{player.position}</div>
      </div>
    </button>
  );
}

export function FormationPitch({ formation: initialFormation, players, onFormationChange }: {
  formation: string;
  players: PlayerInfo[];
  onFormationChange?: (f: string) => void;
}) {
  const [formation, setFormation] = useState(initialFormation);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [startingIds, setStartingIds] = useState<Set<string>>(() => {
    const parsed = parseFormation(formation);
    const slots = parsed.reduce((a, b) => a + b, 0) + 1;
    const sortByApps = (arr: PlayerInfo[]) => [...arr].sort((a, b) => (b.stats.appearances || 0) - (a.stats.appearances || 0));

    const gk = players.find(p => p.position === "Goalkeeper");
    const defs = sortByApps(players.filter(p => p.position === "Defender"));
    const mids = sortByApps(players.filter(p => p.position === "Midfielder"));
    const fwds = sortByApps(players.filter(p => p.position === "Forward"));

    const defNeeded = parsed[0] || 0;
    const midNeeded = parsed.length > 2 ? parsed.slice(1, -1).reduce((a, b) => a + b, 0) : (parsed.length === 2 ? parsed[1] : 0);
    const fwdNeeded = parsed.length > 1 ? parsed[parsed.length - 1] : 0;

    const starters: PlayerInfo[] = [];
    if (gk) starters.push(gk);
    starters.push(...defs.slice(0, defNeeded));
    starters.push(...mids.slice(0, midNeeded));
    starters.push(...fwds.slice(0, fwdNeeded));

    const used = new Set(starters.map(p => p.id));
    const remaining = sortByApps(players.filter(p => !used.has(p.id) && p.position !== "Goalkeeper"));
    for (const p of remaining) {
      if (starters.length >= slots) break;
      starters.push(p);
    }

    return new Set(starters.map(p => p.id));
  });

  const positions = useMemo(
    () => assignPositions(formation, players, startingIds),
    [formation, players, startingIds]
  );

  // Get all player IDs on the pitch
  const onPitchIds = useMemo(() => {
    const ids = new Set<string>();
    positions.flat().forEach(p => { if (p) ids.add(p.id); });
    return ids;
  }, [positions]);

  // Substitutes = players not on pitch
  const substitutes = useMemo(
    () => players.filter(p => !onPitchIds.has(p.id)).sort((a, b) => (b.stats.appearances || 0) - (a.stats.appearances || 0)),
    [players, onPitchIds]
  );

  const handlePitchPlayerClick = (playerId: string) => {
    if (selectedSub) {
      // Swap: move selected sub into XI, move clicked player to bench
      setStartingIds(prev => {
        const next = new Set(prev);
        next.delete(playerId);
        next.add(selectedSub);
        return next;
      });
      setSelectedSub(null);
    }
  };

  const handleSubClick = (playerId: string) => {
    setSelectedSub(prev => prev === playerId ? null : playerId);
  };

  return (
    <div className="space-y-3">
      {/* Formation selector */}
      <div className="flex gap-1 flex-wrap">
        {FORMATION_OPTIONS.map((f) => (
          <button
            key={f}
            onClick={() => { setFormation(f); setSelectedSub(null); }}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
              formation === f
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Pitch + Subs row */}
      <div className="flex gap-3 items-start">
        {/* Pitch */}
        <div className="flex-1 bg-gradient-to-b from-green-700 via-green-600 to-green-700 rounded-xl p-3 aspect-[3/4] max-w-md relative overflow-hidden border-2 border-white/10">
          {/* Pitch markings */}
          <div className="absolute inset-2 border border-white/25 rounded-lg" />
          <div className="absolute top-[15%] bottom-[15%] left-2 right-2 border border-white/20" />
          <div className="absolute top-1/2 left-2 right-2 border-t border-white/20" />
          <div className="absolute top-1/2 left-1/2 w-16 h-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
          <div className="absolute top-[42%] left-1/2 w-1.5 h-1.5 -translate-x-1/2 bg-white/40 rounded-full" />

          {selectedSub && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
              Tap a player to swap
            </div>
          )}

          {/* Players - positioned by tactical line: GK at bottom, forwards at top */}
          <div className="relative h-full">
            {positions.map((row, ri) => {
              const totalRows = positions.length;
              const outfieldIdx = ri - 1;
              const totalOutfield = totalRows - 1;
              const isGKRow = ri === 0;
              const isDefRow = ri === 1;
              const isFwdRow = ri === totalRows - 1;
              const bgColor = isGKRow ? "bg-yellow-400/90" : isDefRow ? "bg-blue-400/90" : isFwdRow ? "bg-red-400/90" : "bg-gray-300/90";

              let topPercent: number;
              if (isGKRow) topPercent = 89;
              else if (isDefRow) topPercent = 73;
              else if (isFwdRow) topPercent = 15;
              else {
                const midCount = totalOutfield - 2;
                const midIndex = outfieldIdx - 1;
                topPercent = 73 + (15 - 73) * (midIndex + 1) / (midCount + 1);
              }

              return (
                <div key={ri} className="absolute left-0 right-0 flex justify-around px-2" style={{ top: `${topPercent}%` }}>
                  {row.map((player, pi) => (
                    <PlayerDot
                      key={pi}
                      player={player}
                      color={bgColor}
                      isSelected={player ? selectedSub !== null && onPitchIds.has(player.id) : false}
                      onClick={player ? () => handlePitchPlayerClick(player.id) : undefined}
                    />
                  ))}
                </div>
              );
            })}
          </div>

          <div className="absolute bottom-2 right-3 text-white/50 text-[10px] font-medium">{formation}</div>
        </div>

        {/* Substitutes bench */}
        {substitutes.length > 0 && (
          <div className="w-32 shrink-0 space-y-1">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Subs</div>
            <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
              {substitutes.map((p) => (
                <SubCard
                  key={p.id}
                  player={p}
                  selected={selectedSub === p.id}
                  onClick={() => handleSubClick(p.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
