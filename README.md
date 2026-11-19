# FlowCapy

Centro de enfoque personal **local-first** construido con Next.js App Router, React 19, TypeScript y Tailwind CSS 4. Sin cuentas, sin backend y con persistencia segura en `localStorage`.

**En vivo:** https://flowcapy.vercel.app/
**Repo:** https://github.com/flioxxja/flowcapy

## Capacidades principales

- **Plan del día con prioridad Eisenhower automática** (`P1` a `P4`) + búsqueda en vivo + **Matriz Eisenhower 2×2 interactiva**.
- **Pomodoro 25/5 con vinculación de tarea activa** ("Enfocar"), **Modo Zen pantalla completa** y persistencia atómica ante recargas o cuotas llenas.
- **Paisajes sonoros generativos (Web Audio API)** sin archivos externos: ruido marrón profundo, lluvia cálida, binaural 40Hz Focus y campana armónica al cambiar de fase.
- **Paleta de comandos (`⌘K` / `Ctrl+K`)** para crear tareas urgentes P1, controlar el temporizador, alternar vistas o exportar datos sin tocar el ratón.
- **Rachas + Mapa de calor de consistencia (28 días)** + mejor racha histórica + **Capibara secreto** (3 clics/Enter en el logo).
- **Portabilidad total**: copia el resumen del día en Markdown o descarga tu respaldo completo en `.json`.

## Desarrollo y verificación

```bash
npm install
npm run dev
npm run lint
npx tsc --noEmit
npm run build
npm test
```

## Divulgación de IA

FlowCapy se construyó con asistencia de IA: el código fue implementado por un agente de programación (Cline, con el modelo Minimax M3.1 Flash vía la API de NVIDIA) bajo la dirección y revisión humana del Jefe de Proyecto, que verificó cada entrega contra el SPEC del hackatón (tsc, lint, build, tests E2E y verificación en vivo) antes de publicarla. La idea, las decisiones de producto y la revisión final son humanas.
