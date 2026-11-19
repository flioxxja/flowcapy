"use client";

import { useEffect, useRef } from "react";
import type { PomodoroPhase, PomodoroStatus } from "@/lib/pomodoro";

interface AmbientFlowCanvasProps {
  phase: PomodoroPhase;
  status: PomodoroStatus;
}

interface FlowParticle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  alpha: number;
  hue: "amber" | "cream" | "emerald";
}

export function AmbientFlowCanvas({ phase, status }: AmbientFlowCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ phase, status });

  useEffect(() => {
    stateRef.current = { phase, status };
  }, [phase, status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    let rafId = 0;
    let width = 0;
    let height = 0;
    let pointerX = 0;
    let pointerY = 0;
    let smoothX = 0;
    let smoothY = 0;

    const particles: FlowParticle[] = Array.from({ length: 110 }, (_, idx) => ({
      angle: (idx / 110) * Math.PI * 2 + (idx % 7) * 0.13,
      radius: 0.16 + ((idx * 37) % 100) / 170,
      speed: 0.00018 + ((idx % 11) + 1) * 0.000028,
      size: 1 + (idx % 3) * 0.75,
      alpha: 0.22 + ((idx * 19) % 60) / 100,
      hue: idx % 7 === 0 ? "emerald" : idx % 3 === 0 ? "cream" : "amber",
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawFrame = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      smoothX += (pointerX - smoothX) * 0.04;
      smoothY += (pointerY - smoothY) * 0.04;

      const cx = width * 0.72 + smoothX * 26;
      const cy = height * 0.48 + smoothY * 18;
      const baseScale = Math.min(width, height) * 0.68;
      const { phase: activePhase, status: activeStatus } = stateRef.current;

      const isFocusRunning = activeStatus === "running" && activePhase === "focus";
      const isBreakRunning = activeStatus === "running" && activePhase === "break";
      const speedMult = isFocusRunning ? 1.85 : isBreakRunning ? 0.75 : 1;
      const breath = Math.sin(now * 0.0009) * 0.045;

      // Soft central luminous aura
      const auraGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseScale * 0.65);
      if (isBreakRunning) {
        auraGrad.addColorStop(0, "rgba(74, 222, 128, 0.16)");
        auraGrad.addColorStop(0.5, "rgba(232, 169, 78, 0.06)");
      } else {
        auraGrad.addColorStop(0, "rgba(232, 169, 78, 0.2)");
        auraGrad.addColorStop(0.45, "rgba(247, 215, 148, 0.06)");
      }
      auraGrad.addColorStop(1, "rgba(6, 7, 10, 0)");
      ctx.fillStyle = auraGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle concentric orbital hairlines
      ctx.strokeStyle = isBreakRunning
        ? "rgba(74, 222, 128, 0.1)"
        : "rgba(232, 169, 78, 0.11)";
      ctx.lineWidth = 1;
      for (const ringFactor of [0.28, 0.44, 0.62]) {
        ctx.beginPath();
        ctx.ellipse(
          cx,
          cy,
          baseScale * (ringFactor + breath * 0.4),
          baseScale * (ringFactor * 0.78 + breath * 0.4),
          -0.24,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }

      // Luminous constellation particles
      for (const p of particles) {
        if (!reducedMotion) {
          p.angle += p.speed * speedMult * 16;
        }
        const orbitR = baseScale * (p.radius + breath * (p.hue === "amber" ? 0.6 : -0.4));
        const x = cx + Math.cos(p.angle) * orbitR;
        const y = cy + Math.sin(p.angle) * orbitR * 0.78;

        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        if (isBreakRunning && p.hue === "emerald") {
          ctx.fillStyle = `rgba(110, 231, 183, ${p.alpha})`;
        } else if (p.hue === "cream") {
          ctx.fillStyle = `rgba(255, 244, 222, ${p.alpha * 0.85})`;
        } else {
          ctx.fillStyle = `rgba(232, 169, 78, ${p.alpha})`;
        }
        ctx.fill();
      }

      if (!reducedMotion && !document.hidden) {
        rafId = window.requestAnimationFrame(drawFrame);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX / window.innerWidth - 0.5;
      pointerY = event.clientY / window.innerHeight - 0.5;
    };

    const onVisibilityChange = () => {
      window.cancelAnimationFrame(rafId);
      if (!document.hidden && !reducedMotion) {
        rafId = window.requestAnimationFrame(drawFrame);
      }
    };

    const onMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      window.cancelAnimationFrame(rafId);
      drawFrame(performance.now());
    };

    resize();
    drawFrame(performance.now());

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    motionQuery.addEventListener("change", onMotionChange);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      motionQuery.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
