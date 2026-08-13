/**
 * useButterfly.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * React hook that manages a full-viewport canvas overlay with the butterfly.
 *
 * Usage:
 *   const { startButterfly, stopButterfly } = useButterfly();
 *
 *   // When scan starts:
 *   startButterfly();
 *
 *   // When scan finishes:
 *   stopButterfly();   // butterfly exits gracefully
 */

import { useRef, useCallback, useEffect } from 'react';
import { ButterflyEngine } from './ButterflyEngine';

export function useButterfly() {
  const canvasRef       = useRef<HTMLCanvasElement | null>(null);
  const engineRef       = useRef<ButterflyEngine | null>(null);
  const activeRef       = useRef(false);
  const stopTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create canvas once, append to body
  const ensureCanvas = useCallback((): HTMLCanvasElement => {
    if (canvasRef.current) return canvasRef.current;

    const canvas           = document.createElement('canvas');
    canvas.id              = 'butterfly-canvas';
    canvas.style.cssText   = [
      'position:fixed',
      'inset:0',
      'width:100%',
      'height:100%',
      'pointer-events:none',
      'z-index:9999',
    ].join(';');

    fitCanvas(canvas);
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    return canvas;
  }, []);

  // Keep canvas sized to viewport
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    fitCanvas(canvas);
    engineRef.current?.resize();
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // ── Public API ─────────────────────────────────────────────────────────────

  const startButterfly = useCallback(() => {
    // Cancel any pending graceful-exit from a previous run. Without this,
    // a quick stop→start (e.g. a failed scan immediately retried) let the
    // old engine's delayed stop() fire up to 600ms after a brand-new
    // engine had already started drawing to the SAME canvas — two RAF
    // loops racing on one canvas, which is exactly what shows up as
    // flickering/jumping/"reset" glitches.
    if (stopTimeoutRef.current !== null) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }

    if (activeRef.current) return;
    activeRef.current = true;

    const canvas = ensureCanvas();
    fitCanvas(canvas);

    // Reduced-motion check
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return; // respect accessibility preference

    // Belt-and-braces: make sure no previous engine is still animating on
    // this canvas before handing it to a new one.
    engineRef.current?.stop();

    const engine = new ButterflyEngine(canvas, { scale: 1.05 });
    engineRef.current = engine;
    engine.start();
  }, [ensureCanvas]);

  const stopButterfly = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;

    // Small delay so the butterfly finishes its current beat before vanishing
    stopTimeoutRef.current = setTimeout(() => {
      engineRef.current?.stop();
      engineRef.current = null;
      stopTimeoutRef.current = null;
    }, 600);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stopTimeoutRef.current !== null) clearTimeout(stopTimeoutRef.current);
      engineRef.current?.stop();
      canvasRef.current?.remove();
    };
  }, []);

  return { startButterfly, stopButterfly };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fitCanvas(canvas: HTMLCanvasElement) {
  const dpr      = window.devicePixelRatio || 1;
  const w        = window.innerWidth;
  const h        = window.innerHeight;
  canvas.width   = w * dpr;
  canvas.height  = h * dpr;
  canvas.style.width  = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.scale(dpr, dpr);
}
