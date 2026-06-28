import { useState, useMemo } from "react";
import { PlayerInfo } from "../api";

const FORMATION_OPTIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "3-4-3", "4-1-4-1", "3-4-2-1", "4-3-2-1", "5-3-2", "4-4-1-1"];

function parseFormation(f: string): number[] {
  return f.split("-").map(Number).filter((n) => !isNaN(n) && n > 0);
}

function assignPositions(formation: string, players: PlayerInfo[], startingIds: Set<string>): (PlayerInfo | null)[][] {
  const rows = parseFormation(formation); // e.g. 4-3-3 => [4,3,3]
  const sortByApps = (arr: PlayerInfo[]) => [...arr].sort((a, b) => (b.stats.appearances || 0) - (a.stats.appearances || 0));
  
  const gk = sortByApps(players.filter(p => p.position === "Goalkeeper" && startingIds.has(p.id)));
  const def = sortByApps(players.filter(p => p.position === "Defender" && startingIds.has(p.id)));
  const mid = sortByApps(players.filter(p => p.position === "Midfielder" && startingIds.has(p.id)));
  const fwd = sortByApps(players.filter(p => p.position === "Forward" && startingIds.has(p.id)));

  const result: (PlayerInfo | null)[][] = [];

  // Row 0: Goalkeeper (always the one GK slot in rows[0])
  result.push([gk[0] || null]);

  const outfieldRows = rows.slice(1); // e.g. [4, 3, 3]
  if (outfieldRows.length === 0) return result;

  // Row 1: Defenders (first outfield row)
  const defCount = outfieldRows[0];
  const defRow: (PlayerInfo | null)[] = [];
  for (let i = 0; i < defCount; i++) {
    defRow.push(def[i] || null);
  }
  result.push(defRow);

  // Middle rows: Midfielders
  for (let i = 1; i < outfieldRows.length - 1; i++) {
    const midCount = outfieldRows[i];
    const midRow: (PlayerInfo | null)[] = [];
    const offset = outfieldRows.slice(1, i).reduce((a, b) => a + b, 0);
    for (let j = 0; j < midCount; j++) {
      midRow.push(mid[offset + j] || null);
    }
    result.push(midRow);
  }

  // Last row: Forwards
  if (outfieldRows.length > 1) {
    const fwdCount = outfieldRows[outfieldRows.length - 1];
    const fwdRow: (PlayerInfo | null)[] = [];
    for (let i = 0; i < fwdCount; i++) {
      fwdRow.push(fwd[i] || null);
    }
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
    // Auto-pick starting XI: top players by appearances, GK always
    const sorted = [...players].sort((a, b) => (b.stats.appearances || 0) - (a.stats.appearances || 0));
    const slots = parseFormation(formation).reduce((a, b) => a + b, 0);
    const gk = sorted.find(p => p.position === "Goalkeeper");
    const outfield = sorted.filter(p => p.position !== "Goalkeeper").slice(0, slots - 1);
    const starting = new Set([gk, ...outfield].filter(Boolean).map(p => p!.id));
    return starting;
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

          {/* Players - rendered bottom-to-top: GK at bottom, forwards at top */}
          <div className="relative h-full flex flex-col justify-around py-4">
            {[...positions].reverse().map((row, ri) => {
              const reversedIdx = positions.length - 1 - ri;
              const isGKRow = reversedIdx === 0;
              const outfieldIdx = reversedIdx - 1;
              const totalOutfield = positions.length - 1;
              const isDefRow = outfieldIdx === 0;
              const isFwdRow = outfieldIdx === totalOutfield - 1 || totalOutfield === 0;
              const bgColor = isGKRow ? "bg-yellow-400/90" : isDefRow ? "bg-blue-400/90" : isFwdRow ? "bg-red-400/90" : "bg-gray-300/90";

              return (
                <div key={ri} className="flex justify-around px-2">
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
