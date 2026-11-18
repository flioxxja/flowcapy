# FlowCapy — Tu día en una sola pantalla

Centro de comando diario de productividad, **local-first**: sin backend, sin cuentas, sin claves. Todo se guarda en `localStorage` y funciona offline.

**En vivo:** https://flowcapy.vercel.app/
**Repo:** https://github.com/flioxxja/flowcapy

**Estado:** ciclos 1–3 terminados y en vivo — tareas con prioridad automática, Pomodoro 25/5, rachas reales y capibara escondido. Verificado: tsc 0 errores, lint limpio, build OK, suite 22/22 en verde.

## Qué hace

- Lista de tareas con **prioridad automática (Eisenhower)**: urgencia + importancia ordenan el día solas (P1 → P4).
- **Temporizador Pomodoro** (25/5) con contador de sesiones completadas y persistencia: si recargas a mitad de sesión, se retoma.
- **Rachas reales**: días seguidos completando al menos una tarea, guardados en tu dispositivo, con texto honesto (0 si hoy aún no completaste nada).
- **Capibara escondido**: 3 clics en el logo y aparece.
- Una sola página, responsive (320px → escritorio), oscura, sin datos falsos.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS 4
- Sin backend, sin variables de entorno, sin secretos. Tus datos nunca salen de tu dispositivo.

## Cómo correrlo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de producción
npm run lint     # ESLint
npm test         # motor determinista + regresiones E2E (22/22)
```

## Hackatón

Teens Hack Houston Hackathon (Triple H), Tech Track — tema: productividad.
Fecha límite: **sábado 21 de noviembre de 2026, 19:00 GMT-4**.

## Divulgación de IA

FlowCapy se construyó con asistencia de IA: el código fue implementado por un agente de programación (Cline, con el modelo Minimax M3.1 Flash vía la API de NVIDIA) bajo la dirección y revisión humana del Jefe de Proyecto, que verificó cada entrega contra el SPEC del hackatón (tsc, lint, build, tests E2E y verificación en vivo) antes de publicarla. La idea, las decisiones de producto y la revisión final son humanas.
