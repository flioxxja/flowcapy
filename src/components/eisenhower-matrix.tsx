"use client";

import { priorityBadge, type Task } from "@/lib/tasks";

interface EisenhowerMatrixProps {
  tasks: Task[];
  focusedTaskId: string | null;
  onFocusTask: (id: string) => void;
  onToggleTask: (id: string) => void;
}

const QUADRANTS = [
  {
    level: 1,
    code: "Q1 · P1",
    title: "Hacer ahora",
    subtitle: "Urgente e importante",
    accent: "text-[#ff9d92]",
    border: "border-[#ff6b5e]/25",
  },
  {
    level: 2,
    code: "Q2 · P2",
    title: "Planificar",
    subtitle: "Alto impacto estratégico",
    accent: "text-[#f7d794]",
    border: "border-[#e8a94e]/25",
  },
  {
    level: 3,
    code: "Q3 · P3",
    title: "Acotar",
    subtitle: "Prioridad media",
    accent: "text-[#7cc7e8]",
    border: "border-[#7cc7e8]/25",
  },
  {
    level: 4,
    code: "Q4 · P4",
    title: "Posponer",
    subtitle: "Baja urgencia e importancia",
    accent: "text-white/60",
    border: "border-white/10",
  },
] as const;

export function EisenhowerMatrix({
  tasks,
  focusedTaskId,
  onFocusTask,
  onToggleTask,
}: EisenhowerMatrixProps) {
  const pending = tasks.filter((task) => !task.completed);

  return (
    <div className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
      {QUADRANTS.map((quadrant) => {
        const items = pending.filter((task) => priorityBadge(task).level === quadrant.level);
        return (
          <div key={quadrant.code} className="bg-[#080a0f] p-4">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div>
                <span className={`font-mono text-[10px] uppercase tracking-[0.18em] ${quadrant.accent}`}>
                  {quadrant.code}
                </span>
                <h3 className="text-sm font-semibold text-white">{quadrant.title}</h3>
              </div>
              <span className="font-mono text-xs text-white/45">{items.length}</span>
            </div>

            {items.length === 0 ? (
              <p className="mt-3 text-xs text-white/35">{quadrant.subtitle} · vacío</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {items.map((task) => {
                  const isFocused = focusedTaskId === task.id;
                  return (
                    <li
                      key={task.id}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                        isFocused
                          ? "border-[#e8a94e]/50 bg-[#e8a94e]/10 text-white"
                          : `${quadrant.border} bg-white/[0.02] text-white/85`
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onToggleTask(task.id)}
                        className="truncate text-left hover:text-white"
                        title="Completar tarea"
                      >
                        {task.title}
                      </button>
                      <button
                        type="button"
                        onClick={() => onFocusTask(task.id)}
                        className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] ${
                          isFocused
                            ? "bg-[#e8a94e] font-semibold text-[#06070a]"
                            : "border border-white/15 text-white/60 hover:text-white"
                        }`}
                      >
                        {isFocused ? "Activa" : "Enfocar"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
