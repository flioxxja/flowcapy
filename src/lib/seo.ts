const DEFAULT_SITE_URL = "https://flowcapy.vercel.app";

export function getSiteUrl(): URL {
  const candidate = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!candidate) return new URL(DEFAULT_SITE_URL);
  try {
    return new URL(candidate);
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

export const FLOWCAPY_META = {
  name: "FlowCapy",
  title: "FlowCapy — Tu día en una sola pantalla",
  description:
    "Sistema de enfoque local-first: tareas con matriz Eisenhower automática, temporizador Pomodoro con modo Zen, paisajes sonoros generativos y mapa de rachas. Sin cuentas ni backend.",
  locale: "es_ES",
  keywords: [
    "FlowCapy",
    "productividad",
    "Pomodoro",
    "matriz Eisenhower",
    "local-first",
    "rachas",
    "enfoque profundo",
    "gestor de tareas",
  ],
} as const;
