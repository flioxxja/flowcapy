"use client";

import type { SoundscapeMode } from "@/lib/audio/soundscape";

interface SoundscapeBarProps {
  mode: SoundscapeMode;
  volume: number;
  chimeEnabled: boolean;
  onModeChange: (mode: SoundscapeMode) => void;
  onVolumeChange: (volume: number) => void;
  onToggleChime: () => void;
}

const MODES: { id: SoundscapeMode; label: string }[] = [
  { id: "off", label: "Silencio" },
  { id: "brown", label: "Ruido marrón" },
  { id: "rain", label: "Lluvia cálida" },
  { id: "binaural", label: "40Hz Focus" },
];

export function SoundscapeBar({
  mode,
  volume,
  chimeEnabled,
  onModeChange,
  onVolumeChange,
  onToggleChime,
}: SoundscapeBarProps) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-3">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Paisaje sonoro ambiental">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
          Audio Web
        </span>
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={mode === item.id}
            onClick={() => onModeChange(item.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              mode === item.id
                ? "bg-[#e8a94e] text-[#06070a] font-semibold"
                : "border border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {mode !== "off" && (
          <label className="flex items-center gap-2 text-xs text-white/60">
            <span className="sr-only">Volumen de paisaje sonoro</span>
            <input
              type="range"
              min={0.05}
              max={0.75}
              step={0.05}
              value={volume}
              onChange={(event) => onVolumeChange(Number(event.target.value))}
              className="h-1.5 w-20 cursor-pointer accent-[#e8a94e]"
            />
          </label>
        )}

        <button
          type="button"
          aria-pressed={chimeEnabled}
          onClick={onToggleChime}
          className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition ${
            chimeEnabled
              ? "border-[#e8a94e]/40 bg-[#e8a94e]/12 text-[#f7d794]"
              : "border-white/10 text-white/45 hover:text-white/75"
          }`}
        >
          Campana: {chimeEnabled ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}
