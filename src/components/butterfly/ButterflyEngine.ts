/**
 * ButterflyEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Physics-accurate 2-D butterfly animation for the Bluesky butterfly.
 *
 * Wing mechanics (from Rafael Araujo's structural studies + Lepidoptera docs):
 *   • Wing-beat: 7–10 Hz cruising, 12 Hz take-off, 1.5 Hz perch-fanning
 *   • Dorsal view: 0° (fully spread) → 140° (edge-on, nearly closed)
 *   • Perspective foreshortening: scaleX = cos(wingAngle) per wing half
 *   • Banking: body tilts ±32° into turns, inner wing foreshortens more
 *   • Pitch: nose tilts ±18° with vertical velocity
 *   • Glide phase: every ~3.2 s, flapFreq drops to 2.5 Hz for 0.7 s
 *   • Altitude undulation: ±14 px sinusoidal, phase-locked to wing beat
 *   • Landing: speed lerps 90→15 px/s over final 90 px, wings spread wide
 *   • Take-off: 3 rapid beats + upward burst before transition to cruise
 *   • Shadow: ellipse beneath the butterfly, squished by sin(wingAngle)
 */

// ─── SVG path (official Bluesky butterfly, viewBox 0 0 320 286) ──────────────
// We scale every coordinate by S = baseScale * userScale
// Wing is split at x=160 (body centre). Each half is transformed independently.

// Bluesky brand blue
const BLUE_HEX   = '10,122,255';
const BLUE       = `rgb(${BLUE_HEX})`;
const BLUE_WING  = (a: number) => `rgba(${BLUE_HEX},${a.toFixed(3)})`;
const BLUE_SHINE = (a: number) => `rgba(80,160,255,${a.toFixed(3)})`;
const SHADOW_CLR = (a: number) => `rgba(${BLUE_HEX},${a.toFixed(3)})`;

const TWO_PI = Math.PI * 2;
const DEG    = Math.PI / 180;

// ─── Types ────────────────────────────────────────────────────────────────────

export type BFState = 'flying' | 'landing' | 'perching' | 'taking-off';

export interface Perch {
  x: number;
  y: number;
  /** Surface normal direction (radians). −π/2 = horizontal top surface */
  normal: number;
  /** Source DOM element, kept so we can re-derive x/y live every frame
   *  instead of relying on a one-time snapshot (see refreshPerch). */
  el?: HTMLElement;
  /** Horizontal position along the element's width (0–1), preserved so a
   *  live re-derivation lands on the same relative spot even if the
   *  element's size changes (responsive layout, etc). */
  fracX?: number;
}

export interface ButterflyEngineOptions {
  scale?: number;
}

// ─── ButterflyEngine ──────────────────────────────────────────────────────────

export class ButterflyEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private lastT = 0;
  private running = false;

  // Position & velocity
  private x = 0;
  private y = 0;
  private vx = 0;
  private vy = 0;

  // Orientation
  private heading    = 0;   // direction butterfly faces (radians, 0=right)
  private bankAngle  = 0;   // lean into turns (radians)
  private pitchAngle = 0;   // nose tilt (radians)

  // Wing animation
  private flapPhase  = Math.random(); // 0..1
  private flapFreq   = 8.5;           // Hz
  private flapAngle  = 0;             // 0=open, 1=closed

  // State machine
  private state: BFState = 'flying';
  private perch: Perch | null = null;
  private perchTimer   = 0;
  private takeoffTimer = 0;
  private glideTimer   = 0;
  private harvestTimer = 0;

  // Perch wing-fan animation (naturalistic, randomized — see updatePerching)
  private perchFlapFrom   = 0.75;
  private perchFanTarget  = 0.75;
  private perchFanT       = 0;
  private perchFanDur     = 1;
  private perchFanHold    = 0;

  // Navigation
  private targetX = 0;
  private targetY = 0;

  // Perch list (harvested from DOM)
  private perches: Perch[] = [];

  // Logical (CSS-pixel) canvas size. NOTE: this.canvas.width/height are
  // device-pixel dimensions (canvas.width = cssWidth * devicePixelRatio,
  // see fitCanvas() in useButterfly.ts), while every position on the
  // butterfly (x/y, perch coords from getBoundingClientRect, etc.) lives in
  // CSS-pixel space because the 2-D context is pre-scaled by the DPR. Any
  // bounds/navigation math must use these, never this.canvas.width/height
  // directly, or targets end up far outside the visible viewport on any
  // non-1x display.
  private cssW = 0;
  private cssH = 0;

  // Config
  private scale: number;

  constructor(canvas: HTMLCanvasElement, options: ButterflyEngineOptions = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.scale = options.scale ?? 1.0;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  start() {
    this.running = true;
    this.harvestPerches();
    this.spawnFromEdge();
    this.lastT = performance.now();
    this.loop(this.lastT);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.ctx.clearRect(0, 0, this.cssW || this.canvas.width, this.cssH || this.canvas.height);
  }

  resize() {
    this.harvestPerches();
  }

  // ── Entry ───────────────────────────────────────────────────────────────────

  private spawnFromEdge() {
    // Spawn exactly on top of the butterfly mark inside the scan button
    // (falling back to the button itself, then the canvas centre) so the
    // big roaming butterfly looks like it hatches from the icon that's
    // still pulsing in place, instead of drifting in from off-screen.
    const canvasRect = this.canvas.getBoundingClientRect();
    const markEl =
      document.querySelector<HTMLElement>('.scan-btn-mark') ??
      document.querySelector<HTMLElement>('button.primary');
    const mRect = markEl?.getBoundingClientRect();

    if (mRect) {
      this.x = mRect.left - canvasRect.left + mRect.width / 2;
      this.y = mRect.top - canvasRect.top + mRect.height / 2;
    } else {
      this.x = this.cssW * 0.5;
      this.y = this.cssH * 0.5;
    }

    // Gentle upward lift-off from the icon rather than a horizontal cruise
    // straight through it.
    this.vx = 0;
    this.vy = -40;
    this.heading = -Math.PI / 2; // facing straight up on launch
    this.bankAngle = 0;
    this.pitchAngle = 0;
    this.state = 'flying';
    this.flapFreq = 10; // a couple of quick beats on launch
    this.pickNextTarget();
  }

  // ── Perch harvesting ────────────────────────────────────────────────────────

  harvestPerches() {
    const cr = this.canvas.getBoundingClientRect();
    // Cache logical (CSS-pixel) size for all navigation/bounds math — see
    // the note on cssW/cssH above.
    this.cssW = cr.width;
    this.cssH = cr.height;
    const list: Perch[] = [];

    const selectors = [
      'button.primary',
      'input[type="text"]',
      '.scan-panel',
      '.options-panel',
      '.progress-track',
      '.result-card',
      '.site-nav',
      '.app-bar',
      '.search-row',
    ];

    for (const sel of selectors) {
      for (const el of document.querySelectorAll<HTMLElement>(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width < 10 || r.height < 10) continue;
        const top    = r.top    - cr.top;
        const left   = r.left   - cr.left;
        const right  = left + r.width;
        const bottom = top + r.height;

        // Sample along top edge (most natural for butterfly to land on)
        const steps = Math.min(4, Math.floor(r.width / 80));
        for (let i = 0; i <= steps; i++) {
          const frac = steps === 0 ? 0.5 : i / steps;
          const fracX = 0.1 + frac * 0.8;
          const px = left + r.width * fracX;
          // only add if on canvas (compare against logical CSS-pixel size,
          // not this.canvas.width which is in device pixels)
          if (px > 0 && px < this.cssW && top > 20 && top < this.cssH - 20) {
            list.push({ x: px, y: top, normal: -Math.PI / 2, el, fracX });
          }
        }
        // Bottom edge occasionally
        if (bottom > 20 && bottom < this.cssH - 20) {
          list.push({ x: left + r.width * 0.5, y: bottom, normal: Math.PI / 2, el, fracX: 0.5 });
        }
        void right;
      }
    }

    this.perches = list;
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  private pickNextTarget() {
    // Logical (CSS-pixel) bounds — using this.canvas.width/height directly
    // here was the cause of the jumping/flickering bug: on any display
    // with devicePixelRatio !== 1, those are 2–3x larger than the visible
    // viewport, so targets landed far outside the screen and the butterfly
    // appeared to vanish, then snap/"reset" once a new (correctly-scaled)
    // perch target was picked.
    const W = this.cssW || this.canvas.width;
    const H = this.cssH || this.canvas.height;

    const wantPerch = this.perches.length > 0 && Math.random() < 0.38;

    if (wantPerch) {
      const p = this.perches[Math.floor(Math.random() * this.perches.length)];
      this.refreshPerch(p); // start from its live position, not a stale snapshot
      this.targetX = p.x;
      this.targetY = p.y;
      this.perch   = p;
    } else {
      this.targetX = clamp(this.x + (Math.random() - 0.48) * W * 0.52, 60, W - 60);
      this.targetY = clamp(this.y + (Math.random() - 0.5)  * H * 0.42, 50, H - 50);
      this.perch   = null;
    }
  }

  /**
   * Re-derive a perch's on-canvas x/y from its live source element instead
   * of the coordinates captured when it was harvested. Perch coordinates
   * are a one-time getBoundingClientRect() snapshot; if the page scrolls,
   * resizes, or the layout shifts after that snapshot — which happens
   * constantly, since results stream in during a scan — a butterfly that
   * flew to (or landed on) the stale coordinates visibly detaches from the
   * element it's supposed to be resting on ("floats in space"). Calling
   * this every frame while a perch is targeted or occupied keeps it glued
   * to the real element.
   */
  private refreshPerch(p: Perch) {
    if (!p.el || !p.el.isConnected) return;
    const cr = this.canvas.getBoundingClientRect();
    const r  = p.el.getBoundingClientRect();
    const fracX = p.fracX ?? 0.5;
    p.x = r.left - cr.left + r.width * fracX;
    p.y = p.normal < 0
      ? r.top - cr.top             // top-edge perch
      : r.top - cr.top + r.height; // bottom-edge perch
  }

  // ── Main loop ───────────────────────────────────────────────────────────────

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min((now - this.lastT) / 1000, 0.05);
    this.lastT = now;
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  // ── Physics ─────────────────────────────────────────────────────────────────

  private update(dt: number) {
    // Periodically re-scan the DOM for perch candidates. Perches were only
    // ever harvested once at start()/resize(), so elements that appear or
    // disappear afterward (e.g. .result-card rows streaming in during a
    // scan) were invisible to the engine — and a perch on a since-removed
    // element is part of what made a "resting" butterfly look stranded.
    this.harvestTimer += dt;
    if (this.harvestTimer > 4) {
      this.harvestTimer = 0;
      this.harvestPerches();
    }

    // Wing-beat phase always advances so the cycle stays continuous
    // across state changes.
    this.flapPhase = (this.flapPhase + this.flapFreq * dt) % 1;

    // The continuous wing-beat sine curve drives flapAngle in every state
    // EXCEPT 'landing' and 'perching'. Previously it was applied
    // unconditionally, which meant updateLanding()'s smooth lerp toward a
    // wide-open brace (0.04) got overwritten by this sine value at the
    // start of every single frame, then only nudged 10–20% back toward the
    // target before being overwritten again next frame — a fight that
    // showed up as jittery, flickering wings on approach instead of a
    // smooth spread. 'perching' has its own randomized, naturalistic fan
    // cycle (see updatePerching) instead of the regular flight wing-beat.
    // Both states now own flapAngle exclusively.
    if (this.state !== 'landing' && this.state !== 'perching') {
      // Asymmetric sine: quicker downstroke, slower upstroke
      const raw      = Math.sin(this.flapPhase * TWO_PI);
      const asymm    = raw > 0 ? Math.pow(raw, 0.7) : -Math.pow(-raw, 1.35);
      this.flapAngle = 0.5 + 0.5 * asymm; // 0=open, 1=closed
    }

    switch (this.state) {
      case 'flying':    this.updateFlying(dt);    break;
      case 'landing':   this.updateLanding(dt);   break;
      case 'perching':  this.updatePerching(dt);  break;
      case 'taking-off':this.updateTakingOff(dt); break;
    }
  }

  private updateFlying(dt: number) {
    // If we're beelining for a perch, keep re-deriving the target from the
    // live element every frame rather than the coordinates captured when
    // it was picked — otherwise a scroll or layout shift mid-flight sends
    // the butterfly toward a point that's no longer where the element is.
    if (this.perch) {
      this.refreshPerch(this.perch);
      this.targetX = this.perch.x;
      this.targetY = this.perch.y;
    }

    const dx   = this.targetX - this.x;
    const dy   = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);

    // Switch to landing state when close enough with a perch target
    if (dist < 90 && this.perch) {
      this.state = 'landing';
      this.flapFreq = 6.5;
      return;
    }

    if (dist < 28 && !this.perch) {
      this.pickNextTarget();
      return;
    }

    // Cruise speed — varies slightly for organic feel
    const speed = 140 + Math.sin(this.flapPhase * TWO_PI) * 12;

    // Desired velocity
    const dvx = (dx / dist) * speed;
    const dvy = (dy / dist) * speed;

    // Smooth acceleration
    const k = 3.6;
    this.vx += (dvx - this.vx) * k * dt;
    this.vy += (dvy - this.vy) * k * dt;

    // Altitude undulation (butterflies bob up/down with each wing beat)
    this.vy += Math.sin(this.flapPhase * TWO_PI) * 14 * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Heading follows velocity
    const movDir    = Math.atan2(this.vy, this.vx);
    const hdDiff    = angleDiff(movDir, this.heading);
    this.heading   += hdDiff * 5.5 * dt;

    // Bank into turns (feel from Rafael Araujo studies — inner wing dips)
    const targetBank    = clamp(-hdDiff * 1.3, -32 * DEG, 32 * DEG);
    this.bankAngle     += (targetBank - this.bankAngle) * 5 * dt;

    // Pitch with vertical velocity
    const targetPitch   = clamp(-this.vy / 280, -18 * DEG, 18 * DEG);
    this.pitchAngle    += (targetPitch - this.pitchAngle) * 4 * dt;

    // Glide phase
    this.glideTimer += dt;
    if (this.glideTimer > 3.2) {
      this.glideTimer = 0;
      this.flapFreq   = 2.5;
      setTimeout(() => {
        if (this.running && this.state === 'flying') this.flapFreq = 7.8 + Math.random() * 2;
      }, 650);
    }
  }

  private updateLanding(dt: number) {
    const p = this.perch!;
    // Keep tracking the element's live position all the way to touchdown
    // — without this, an approach that spans a scroll/resize event lands
    // on stale coordinates and the butterfly settles beside/above the
    // element instead of on it.
    this.refreshPerch(p);
    const dx   = p.x - this.x;
    const dy   = p.y - this.y;
    const dist = Math.hypot(dx, dy);

    // Decelerate smoothly
    const speed  = lerp(85, 16, 1 - Math.min(dist / 90, 1));
    if (dist > 1.5) {
      this.vx  = (dx / dist) * speed;
      this.vy  = (dy / dist) * speed;
      this.x  += this.vx * dt;
      this.y  += this.vy * dt;
    }

    // Level out
    this.bankAngle  *= 1 - 7 * dt;
    this.pitchAngle *= 1 - 5 * dt;

    // Align heading with surface
    const tgtH   = p.normal + Math.PI / 2;
    this.heading += angleDiff(tgtH, this.heading) * 4 * dt;

    // Wings spread wide on approach (aerodynamic braking)
    this.flapAngle = lerp(this.flapAngle, 0.04, 10 * dt);

    if (dist < 2.5) {
      this.x          = p.x;
      this.y          = p.y;
      this.vx         = 0;
      this.vy         = 0;
      this.state      = 'perching';
      this.perchTimer = 1400 + Math.random() * 2000;
      this.flapFreq   = 1.4; // base rate; actual perch fanning is randomized (see updatePerching)

      // Kick off the naturalistic wing-fan cycle: ease from the current
      // wide-open braking pose into a resting fold over the next
      // half-second or so, then updatePerching() takes over with random
      // fan/pause timing.
      this.perchFlapFrom  = this.flapAngle;
      this.perchFanTarget = 0.78 + Math.random() * 0.12;
      this.perchFanT      = 0;
      this.perchFanDur    = 0.45 + Math.random() * 0.35;
      this.perchFanHold   = 0;
    }
  }

  private updatePerching(dt: number) {
    this.perchTimer -= dt * 1000;
    // Slow lean-out while resting
    this.bankAngle  *= 1 - 8 * dt;
    this.pitchAngle  = 0;

    if (this.perch) {
      if (this.perch.el && !this.perch.el.isConnected) {
        // The element we're standing on disappeared from the page (e.g. a
        // result card removed on re-render) — don't linger floating on
        // nothing, cut the visit short instead.
        this.perchTimer = Math.min(this.perchTimer, 200);
      } else {
        // Stay glued to the live element every frame. Without this the
        // butterfly holds the pixel coordinates from the moment it landed,
        // so as soon as the page scrolls or the layout reflows it visibly
        // detaches — appearing to "float in space" while the real element
        // moves out from under it.
        this.refreshPerch(this.perch);
        this.x = this.perch.x;
        this.y = this.perch.y;
      }
    }

    // Naturalistic wing fanning: real butterflies at rest don't flap on a
    // metronome — they hold mostly-folded, then ease through an occasional
    // fan at a random moment and random speed, then pause again. Ease
    // between a "hold" target and a freshly-rolled random target using a
    // smoothstep curve so each motion is smooth, not linear/robotic.
    if (this.perchFanHold > 0) {
      this.perchFanHold -= dt;
    } else {
      this.perchFanT += dt / this.perchFanDur;
      if (this.perchFanT >= 1) {
        this.perchFanT = 0;
        this.perchFlapFrom = this.perchFanTarget;

        // Occasionally a fuller, slower open (a proper fan); mostly small
        // settling adjustments around a mostly-closed rest pose.
        const bigFan = Math.random() < 0.3;
        this.perchFanTarget = bigFan
          ? 0.12 + Math.random() * 0.25   // wings open wide
          : 0.62 + Math.random() * 0.28;  // mostly folded, slight variation

        this.perchFanDur  = bigFan ? 0.6 + Math.random() * 0.7 : 0.35 + Math.random() * 0.5;
        this.perchFanHold = bigFan ? 0.3 + Math.random() * 1.2 : 0.6 + Math.random() * 2.6;
      }
    }
    const eased = smoothstep(clamp(this.perchFanT, 0, 1));
    this.flapAngle = lerp(this.perchFlapFrom, this.perchFanTarget, eased);

    if (this.perchTimer <= 0) {
      this.state      = 'taking-off';
      this.takeoffTimer = 0;
      this.flapFreq   = 12; // rapid beat for liftoff
    }
  }

  private updateTakingOff(dt: number) {
    this.takeoffTimer += dt * 1000;

    // Strong upward + slight lateral burst
    this.vy -= 260 * dt;
    this.vx += (Math.random() - 0.5) * 80 * dt;
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;

    if (this.takeoffTimer > 380) {
      this.flapFreq  = 8 + Math.random() * 2;
      this.state     = 'flying';
      this.perch     = null;
      this.glideTimer = 0;
      this.pickNextTarget();
    }
  }

  // ── Rendering ────────────────────────────────────────────────────────────────

  private draw() {
    const ctx = this.ctx;
    // Clear using the logical (CSS-pixel) size the context actually draws
    // in — this.canvas.width/height are device pixels and clearing that
    // much every frame is wasted work (worse on high-DPI screens).
    ctx.clearRect(0, 0, this.cssW || this.canvas.width, this.cssH || this.canvas.height);

    const b = this;
    ctx.save();
    ctx.translate(b.x, b.y);

    // The traced artwork (see traceButterflyPath) is a symmetric top-down
    // view with the head pointing "up" (screen angle −π/2), while
    // `heading` follows the standard atan2(vy, vx) convention where 0 =
    // pointing right. Rotating by heading alone left the sprite pointing
    // up regardless of travel direction; the old left/right mirror
    // "fix" didn't help either since the artwork is symmetric about its
    // own long axis, so scale(-1, 1) is visually a no-op. Adding the π/2
    // offset aligns the drawn head with the true direction of travel for
    // every heading — no mirroring needed at all.
    ctx.rotate(b.heading + Math.PI / 2 + b.pitchAngle * 0.35);

    // Banking skew (3-D lean illusion)
    ctx.transform(1, 0, Math.sin(b.bankAngle) * 0.42, Math.cos(b.bankAngle * 0.55), 0, 0);

    this.drawButterfly(ctx, b.flapAngle, b.scale, b.state === 'perching', b.bankAngle);

    ctx.restore();
  }

  /**
   * drawButterfly — renders at origin.
   *
   * The official Bluesky butterfly (viewBox 320×286) is centred at (160, 143).
   * We scale to S px-per-unit. Each wing half is clipped, then independently
   * transformed:
   *   scaleX = cos(wingAngle)   ← foreshortening = the key visual in the refs
   *   The further the wing tilts back, the thinner it appears.
   *
   * Banking is handled in the outer transform, so inner wing vs outer wing
   * perspective difference is automatic.
   */
  private drawButterfly(
    ctx: CanvasRenderingContext2D,
    flapAngle: number,   // 0 (open) → 1 (closed)
    scale: number,
    perching: boolean,
    bankAngle: number,
  ) {
    // S: px per SVG unit (320 units → wingspan in pixels)
    const S  = scale * 0.088; // → ~28 px wingspan @ scale=1
    const cx = 160 * S;       // body centre X
    const cy = 143 * S;       // body centre Y

    // Wing angle is driven directly by flapAngle, which the engine now
    // computes appropriately for every state — including 'perching', which
    // runs its own randomized, naturalistic fan cycle (see updatePerching)
    // instead of being hard-pinned to a single constant angle here. That
    // pin used to make a "resting" butterfly render with completely static
    // wings no matter what updatePerching computed.
    const wingAngle = flapAngle * 138 * DEG; // 0 → 138°

    // Foreshortening factor per wing
    const forX = Math.cos(wingAngle);

    // Additional inner-wing compression during a bank (inner wing angles toward viewer)
    const bankFactor = Math.abs(Math.sin(bankAngle)) * 0.28;
    // forX for inner (right while facing right) vs outer (left)
    const forXRight = clamp(forX - bankFactor, -1, 1);
    const forXLeft  = clamp(forX + bankFactor * 0.5, -1, 1);

    // ── Drop shadow (ellipse, compressed by wing opening) ──────────────────
    if (perching) {
      ctx.save();
      ctx.translate(cx + 5 * S, cy + 90 * S);
      ctx.scale(Math.abs(forX) * 1.1, 0.22);
      ctx.beginPath();
      ctx.arc(0, 0, 85 * S, 0, TWO_PI);
      ctx.fillStyle = SHADOW_CLR(0.18);
      ctx.fill();
      ctx.restore();
    } else {
      // Subtle airborne shadow (fainter, trails slightly below)
      ctx.save();
      ctx.translate(cx + 3 * S, cy + 60 * S);
      ctx.scale(Math.abs(forX) * 0.9, 0.14);
      ctx.beginPath();
      ctx.arc(0, 0, 80 * S, 0, TWO_PI);
      ctx.fillStyle = SHADOW_CLR(0.09);
      ctx.fill();
      ctx.restore();
    }

    // ── Right wing ─────────────────────────────────────────────────────────
    ctx.save();
    // Pivot at body centre, scale X by foreshortening factor
    ctx.translate(cx, cy);
    ctx.scale(forXRight, 1);
    ctx.translate(-cx, -cy);

    ctx.save();
    ctx.beginPath();
    ctx.rect(cx, -10 * S, 200 * S, 310 * S);
    ctx.clip();
    this.fillWing(ctx, S, cx, cy, flapAngle, 'right');
    ctx.restore();

    ctx.restore();

    // ── Left wing ──────────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(-forXLeft, 1); // mirror + foreshorten
    ctx.translate(-cx, -cy);

    ctx.save();
    ctx.beginPath();
    ctx.rect(cx, -10 * S, 200 * S, 310 * S);
    ctx.clip();
    this.fillWing(ctx, S, cx, cy, flapAngle, 'left');
    ctx.restore();

    ctx.restore();

    // ── Body ───────────────────────────────────────────────────────────────
    this.drawBody(ctx, S, cx, cy);
  }

  /** Trace + fill one wing half with gradient and sheen */
  private fillWing(
    ctx: CanvasRenderingContext2D,
    S: number,
    cx: number,
    cy: number,
    flapAngle: number,
    _side: 'left' | 'right',
  ) {
    // Brightness: wings catch more light when open
    const lit  = 0.62 + 0.38 * (1 - flapAngle);
    const lit2 = 0.70 + 0.30 * (1 - flapAngle);

    // Wing gradient — blue deepens toward tips
    const grad = ctx.createLinearGradient(cx, 0, 310 * S, cy * 2);
    grad.addColorStop(0,   BLUE_WING(0.90 * lit));
    grad.addColorStop(0.45,BLUE_WING(0.97 * lit2));
    grad.addColorStop(1,   BLUE_WING(0.68 * lit));

    this.traceButterflyPath(ctx, S);
    ctx.fillStyle = grad;
    ctx.fill();

    // Radial sheen near body — simulates light catching the wing membrane
    const shine = ctx.createRadialGradient(cx, cy * 0.55, 0, cx, cy * 0.55, 34 * S);
    shine.addColorStop(0, BLUE_SHINE(0.25 * lit));
    shine.addColorStop(1, BLUE_SHINE(0));
    this.traceButterflyPath(ctx, S);
    ctx.fillStyle = shine;
    ctx.fill();
  }

  /**
   * Trace the official Bluesky butterfly Bézier path.
   * Source: https://github.com/bluesky-social/social-app/blob/main/bskyembed/assets/logo.svg
   * ViewBox 0 0 320 286 — all coordinates multiplied by S.
   */
  private traceButterflyPath(ctx: CanvasRenderingContext2D, S: number) {
    const p = (v: number) => v * S;
    ctx.beginPath();
    ctx.moveTo(p(69.364), p(19.146));
    // Right upper wing arc
    ctx.bezierCurveTo(p(106.051), p(46.952),  p(145.511), p(103.332), p(160),     p(133.585));
    ctx.bezierCurveTo(p(174.489), p(103.332), p(213.948), p(46.952),  p(250.636), p(19.146));
    // Right outer edge descending
    ctx.bezierCurveTo(p(277.107), p(-0.917),  p(320),     p(-16.44),  p(320),     p(32.957));
    ctx.bezierCurveTo(p(320),     p(42.822),  p(314.397), p(115.832), p(311.111), p(127.686));
    // Right lower wing
    ctx.bezierCurveTo(p(299.688), p(168.894), p(258.066), p(179.405), p(221.040), p(173.043));
    ctx.bezierCurveTo(p(285.759), p(184.163), p(302.222), p(221.0),   p(266.667), p(257.828));
    // Lower body curve right to centre
    ctx.bezierCurveTo(p(186.667), p(340.702), p(160),     p(213.495), p(160),     p(213.495));
    // Lower body curve centre to left
    ctx.bezierCurveTo(p(160),     p(213.495), p(133.333), p(340.702), p(53.333),  p(257.828));
    // Left lower wing
    ctx.bezierCurveTo(p(17.778),  p(220.996), p(34.241),  p(184.163), p(98.960),  p(173.043));
    ctx.bezierCurveTo(p(61.934),  p(179.405), p(20.312),  p(168.894), p(8.889),   p(127.686));
    // Left outer edge ascending
    ctx.bezierCurveTo(p(5.603),   p(115.832), p(0),       p(42.822),  p(0),       p(32.957));
    ctx.bezierCurveTo(p(0),       p(-16.44),  p(42.893),  p(-0.917),  p(69.364),  p(19.147));
    ctx.closePath();
  }

  /** Tapered capsule body: thorax + abdomen */
  private drawBody(ctx: CanvasRenderingContext2D, S: number, cx: number, cy: number) {
    const bw = 5.5 * S;
    const bh = 76 * S;
    const by = cy - bh * 0.38;

    // Body gradient
    const g = ctx.createLinearGradient(cx - bw, by, cx + bw, by);
    g.addColorStop(0,   `rgba(5,80,200,0.93)`);
    g.addColorStop(0.5, `rgba(50,140,255,0.90)`);
    g.addColorStop(1,   `rgba(5,80,200,0.93)`);

    ctx.beginPath();
    ctx.moveTo(cx, by - bh * 0.06);
    ctx.bezierCurveTo(cx + bw * 1.05, by + bh * 0.12, cx + bw * 0.65, by + bh * 0.68, cx, by + bh * 0.94);
    ctx.bezierCurveTo(cx - bw * 0.65, by + bh * 0.68, cx - bw * 1.05, by + bh * 0.12, cx, by - bh * 0.06);
    ctx.fillStyle = g;
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(cx, by - bh * 0.10, bw * 0.9, 0, TWO_PI);
    ctx.fillStyle = BLUE;
    ctx.fill();
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * clamp(t, 0, 1);
}

/** Ease-in/ease-out curve (0→1) — used for the perch wing-fan motion so
 *  it accelerates smoothly into and out of each pose instead of moving at
 *  a constant linear rate. */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function angleDiff(target: number, current: number): number {
  let d = target - current;
  while (d >  Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
