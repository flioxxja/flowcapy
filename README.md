# FlowCapy — Tu día en una sola pantalla

Centro de comando diario de productividad, **local-first**: sin backend, sin cuentas, sin claves. Todo se guarda en `localStorage` y funciona offline.

**Estado:** gestor de tareas y Pomodoro funcionales, con persistencia local versionada y validación automática. Las rachas en vivo se construyen en el ciclo siguiente.

## Qué hace (MVP, según SPEC)

- Lista de tareas con **prioridad automática (Eisenhower)**: urgencia + importancia ordenan el día solas.
- **Temporizador Pomodoro** (25/5) con contador de sesiones completadas.
- **Rachas**: días seguidos completando al menos una tarea.
- **Capibara escondido** (easter egg).
- Una sola página, responsive, oscura.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS 4
- Sin backend, sin variables de entorno, sin secretos.

## Cómo correrlo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de producción
npm run lint     # ESLint
npm test         # motor determinista + regresiones E2E
```

## Hackatón

Teens Hack Houston Hackathon (Triple H), Tech Track — tema: productividad.
Fecha límite: **21 de noviembre de 2026, 19:00 GMT-4**.
