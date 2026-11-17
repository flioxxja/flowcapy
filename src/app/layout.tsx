import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowCapy — Tu día en una sola pantalla",
  description:
    "Centro de comando diario de productividad, local-first: tareas con prioridad automática, Pomodoro y rachas. Sin cuentas, sin backend.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
