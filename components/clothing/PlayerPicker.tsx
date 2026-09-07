"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import {
  ClothingBottomSheet,
  ClothingSheetOption,
} from "@/components/clothing/ClothingBottomSheet";
import { Input } from "@/components/club/Input";
import { Label } from "@/components/club/Label";
import { cn } from "@/lib/utils";
import type { PlayerWithTeam } from "@/lib/types/db";

function playerMatches(player: PlayerWithTeam, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    player.full_name.toLowerCase().includes(q) ||
    (player.team?.name.toLowerCase().includes(q) ?? false)
  );
}

export function PlayerPicker({
  players,
  value,
  onChange,
  id = "player",
}: {
  players: PlayerWithTeam[];
  value: string;
  onChange: (playerId: string) => void;
  id?: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = players.find((player) => player.id === value);

  const groups = useMemo(() => {
    const filtered = players.filter((player) => playerMatches(player, query));
    const byTeam = new Map<string, PlayerWithTeam[]>();
    for (const player of filtered) {
      const key = player.team?.name ?? "Sin equipo";
      const list = byTeam.get(key) ?? [];
      list.push(player);
      byTeam.set(key, list);
    }
    return [...byTeam.entries()].sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [players, query]);

  const labelText = selected
    ? selected.team
      ? `${selected.full_name} · ${selected.team.name}`
      : selected.full_name
    : "Selecciona jugador…";

  function select(playerId: string) {
    onChange(playerId);
    setSheetOpen(false);
    setQuery("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label id={`${id}-label`}>Jugador</Label>

      <button
        type="button"
        aria-labelledby={`${id}-label`}
        onClick={() => setSheetOpen(true)}
        className={cn(
          "form-input flex min-h-11 items-center justify-between gap-2 text-left",
          !selected && "text-muted-foreground",
        )}
      >
        <span className="truncate">{labelText}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      <ClothingBottomSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setQuery("");
        }}
        title="Seleccionar jugador"
        secondaryAction={{
          label: "Cerrar",
          onClick: () => {
            setSheetOpen(false);
            setQuery("");
          },
        }}
      >
        <div className="flex flex-col gap-3">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o equipo"
            aria-label="Buscar jugador"
            className="min-h-11"
            autoFocus
          />
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ningún jugador coincide.</p>
          ) : (
            <div className="flex max-h-[50dvh] flex-col gap-4 overflow-y-auto">
              {groups.map(([team, members]) => (
                <div key={team} className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {team}
                  </p>
                  {members.map((player) => (
                    <ClothingSheetOption
                      key={player.id}
                      selected={value === player.id}
                      onSelect={() => select(player.id)}
                    >
                      <span className="font-medium">{player.full_name}</span>
                    </ClothingSheetOption>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </ClothingBottomSheet>
    </div>
  );
}
