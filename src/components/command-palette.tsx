"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SoundscapeMode } from "@/lib/audio/soundscape";

export interface CommandItem {
  id: string;
  label: string;
  section: string;
  shortcut?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: CommandItem[];
  onQuickAddTask: (title: string) => void;
  soundMode: SoundscapeMode;
}

export function CommandPalette({
  open,
  onClose,
  commands,
  onQuickAddTask,
  soundMode,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [prevOpen, setPrevOpen] = useState(open);
  const inputRef = useRef<HTMLInputElement>(null);

  // Al abrir la paleta, la búsqueda arranca limpia (ajuste durante el render,
  // sin setState dentro de un efecto).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) || cmd.section.toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) =>
          filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0,
        );
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].run();
          onClose();
        } else if (query.trim().length > 0) {
          onQuickAddTask(query.trim());
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, selectedIndex, query, onClose, onQuickAddTask]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 px-4 pt-[14vh] backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos FlowCapy"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-[#0a0c11]/95 shadow-[0_32px_90px_rgba(0,0,0,0.75)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
          <span className="font-mono text-xs text-[#e8a94e]">⌘K</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Busca un comando o escribe una tarea urgente (Enter para crear)…"
            className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 px-2 py-0.5 font-mono text-[10px] text-white/60 hover:text-white"
          >
            ESC
          </button>
        </div>

        <ul className="max-h-80 overflow-y-auto p-2">
          {filtered.map((cmd, idx) => (
            <li key={cmd.id}>
              <button
                type="button"
                onClick={() => {
                  cmd.run();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm transition ${
                  idx === selectedIndex
                    ? "bg-white/10 text-white"
                    : "text-white/75 hover:bg-white/5"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#e8a94e]/85">
                    {cmd.section}
                  </span>
                  <span>{cmd.label}</span>
                </span>
                {cmd.shortcut && (
                  <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/55">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            </li>
          ))}

          {filtered.length === 0 && query.trim().length > 0 && (
            <li>
              <button
                type="button"
                onClick={() => {
                  onQuickAddTask(query.trim());
                  onClose();
                }}
                className="flex w-full items-center justify-between rounded-xl bg-[#e8a94e]/15 px-3.5 py-3 text-left text-sm text-[#f7d794]"
              >
                <span>Crear tarea P1 urgente: &ldquo;{query.trim()}&rdquo;</span>
                <kbd className="rounded border border-[#e8a94e]/35 px-2 py-0.5 font-mono text-[10px]">
                  ENTER
                </kbd>
              </button>
            </li>
          )}
        </ul>

        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 font-mono text-[11px] text-white/45">
          <span>↑↓ navegar · Enter ejecutar</span>
          <span>Audio: {soundMode === "off" ? "Silencio" : soundMode}</span>
        </div>
      </div>
    </div>
  );
}
