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

  // Continuous 0 (airborne) → 1 (grounded) blend used purely for rendering
  // (shadow shape/position/opacity). The old code picked between two very
  // different hard-coded shadow poses based on a boolean the instant
  // `state === 'perching'` flipped true — a same-frame jump in shadow
  // size, offset, and alpha that read as a small pop/flicker right at
  // touchdown. Easing this value instead of switching it removes that.
  private groundedness = 0;

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

    // Corner inset: how far in from each true corner the perch sits, so the
    // sprite reads as balanced on the corner rather than clipping over the
    // edge. Capped as a fraction of the element's own width so tiny
    // elements still get a sensible (not oversized) inset.
    const CORNER_INSET = 10;

    for (const sel of selectors) {
      for (const el of document.querySelectorAll<HTMLElement>(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width < 24 || r.height < 10) continue;
        const top    = r.top    - cr.top;
        const left   = r.left   - cr.left;
        const right  = left + r.width;
        const bottom = top + r.height;
        const inset  = Math.min(CORNER_INSET, r.width * 0.18);

        // Land on the actual corners — where two edges of the box meet —
        // instead of an arbitrary point drifting along an edge. This is
        // what makes the butterfly read as perching *on* the site's own
        // geometry (a button's corner, a panel's rim) rather than just
        // floating somewhere near it.
        const topLeftX  = left + inset;
        const topRightX = right - inset;
        if (top > 20 && top < this.cssH - 20) {
          if (topLeftX > 0 && topLeftX < this.cssW) {
            list.push({ x: topLeftX, y: top, normal: -Math.PI / 2, el, fracX: inset / r.width });
          }
          if (topRightX > 0 && topRightX < this.cssW) {
            list.push({ x: topRightX, y: top, normal: -Math.PI / 2, el, fracX: 1 - inset / r.width });
          }
        }
        // Bottom corners occasionally, for variety
        if (bottom > 20 && bottom < this.cssH - 20) {
          const botLeftX  = left + inset;
          const botRightX = right - inset;
          if (botLeftX > 0 && botLeftX < this.cssW) {
            list.push({ x: botLeftX, y: bottom, normal: Math.PI / 2, el, fracX: inset / r.width });
          }
          if (botRightX > 0 && botRightX < this.cssW) {
            list.push({ x: botRightX, y: bottom, normal: Math.PI / 2, el, fracX: 1 - inset / r.width });
          }
        }
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

    // Land on real page geometry most of the time so the butterfly reads
    // as interacting with the site rather than wandering empty space.
    const wantPerch = this.perches.length > 0 && Math.random() < 0.62;

    if (wantPerch) {
      const p = this.perches[Math.floor(Math.random() * this.perches.length)];
      this.refreshPerch(p); // start from its live position, not a stale snapshot
      this.targetX = p.x;
      this.targetY = p.y;
      this.perch   = p;
    } else if (this.perches.length > 0 && Math.random() < 0.7) {
      // Even a non-landing "wander" leg mostly flies BY a real element
      // rather than into open air — a fly-past near a corner still reads
      // as tracing the page's own layout instead of drifting randomly.
      const p = this.perches[Math.floor(Math.random() * this.perches.length)];
      this.refreshPerch(p);
      this.targetX = clamp(p.x + (Math.random() - 0.5) * 140, 60, W - 60);
      this.targetY = clamp(p.y + (Math.random() - 0.5) * 100, 50, H - 50);
      this.perch   = null;
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

    // Ease groundedness toward 1 while landing/perched, toward 0 otherwise
    // — drives a continuous shadow blend in draw() instead of a hard
    // per-state switch (see the field comment above).
    const groundedTarget = (this.state === 'perching' || this.state === 'landing') ? 1 : 0;
    this.groundedness += (groundedTarget - this.groundedness) * 10 * dt;
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

    // ── Heading-first steering ──────────────────────────────────────────
    // A real flying creature can't slide sideways: it turns to face where
    // it wants to go, THEN moves along the direction it's facing. The old
    // model did the opposite — it computed velocity straight toward the
    // target and let heading play catch-up on a separate, slower timer.
    // For a beat or two mid-turn, the velocity vector (where the body was
    // actually travelling) and the drawn orientation (where it was
    // pointing) disagreed — which reads as an unphysical skid/slide
    // instead of a bank. Turning the heading first, at a capped turn
    // rate, and driving velocity from that heading afterward removes the
    // mismatch: the body only ever moves exactly where it's pointed.
    const desiredHeading = Math.atan2(dy, dx);
    const hdDiff = angleDiff(desiredHeading, this.heading);

    // How sharp a correction this is: 0 = already pointed the right way,
    // 1 = a full reversal (target is roughly behind it).
    const turnSeverity = clamp(Math.abs(hdDiff) / Math.PI, 0, 1);

    // Sharper reversals turn faster — up to a point. This matters most
    // for near-180° retargets (e.g. it was cruising left and the newly
    // picked target is off to the right): a fixed, moderate turn rate
    // meant heading was still mostly pointed the OLD way for a good
    // fraction of a second while a nearly-unthrottled body kept sailing
    // further in the old direction — reading as if it were flying
    // backward relative to where its nose had started turning.
    const maxTurnRate = lerp(2.2, 5.4, turnSeverity); // rad/s
    const turnStep = clamp(hdDiff * 6, -maxTurnRate, maxTurnRate);
    this.heading += turnStep * dt;

    // Speed drops hard — not just eases — for a sharp turn. A real insect
    // essentially stops forward progress and flutters in place while
    // reversing course rather than carving a wide, fast loop; the old
    // formula only ever cut speed by 45% even at a full reversal, which
    // wasn't enough to stop the "still sailing the old way" look above.
    const baseSpeed = 140 + Math.sin(this.flapPhase * TWO_PI) * 12;
    const speed = baseSpeed * (1 - Math.pow(turnSeverity, 1.6) * 0.85);

    // Velocity is derived DIRECTLY from heading every frame — no separate
    // smoothing/lag here. Heading itself already has the turn-rate cap
    // above, which is where all the "smoothness" should live. The
    // previous version additionally low-pass-filtered velocity toward the
    // heading-derived target (k=6.5), which meant that for a brief window
    // after any heading change, the body kept MOVING in the old direction
    // for a beat while it was already visually POINTING the new way —
    // orientation leading motion is exactly what reads as a car drifting
    // through a turn instead of a bird/insect banking cleanly into one.
    this.vx = Math.cos(this.heading) * speed;
    this.vy = Math.sin(this.heading) * speed;

    // Altitude undulation (butterflies bob up/down with each wing beat) —
    // a small perpendicular wobble layered on top of true heading-aligned
    // travel, not a competing steering signal, so it doesn't reintroduce
    // the mismatch above.
    this.vy += Math.sin(this.flapPhase * TWO_PI) * 14 * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bank into turns (feel from Rafael Araujo studies — inner wing dips),
    // now driven directly by turn rate instead of a second, independently
    // lagging estimate of heading error.
    const targetBank    = clamp(-turnStep / maxTurnRate * 32 * DEG, -32 * DEG, 32 * DEG);
    this.bankAngle     += (targetBank - this.bankAngle) * 6 * dt;

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

    // Ease-in deceleration: stay brisk through most of the approach and
    // only bleed speed off sharply right at the end. The old linear decel
    // (85→16 px/s starting the instant `dist` crossed 90) spent a full
    // second or more crawling at ~15-20px/s — and with the wings pinned
    // wide open the whole time (see below), that slow crawl read as
    // hovering/floating in place rather than flying in, exactly like a
    // person "walking" without moving their feet.
    const closeness = 1 - clamp(dist / 90, 0, 1); // 0 = far, 1 = at the perch
    const eased      = smoothstep(closeness);
    const speed       = lerp(130, 22, eased);
    if (dist > 1.5) {
      this.vx  = (dx / dist) * speed;
      this.vy  = (dy / dist) * speed;
      this.x  += this.vx * dt;
      this.y  += this.vy * dt;
    }

    // Level out
    this.bankAngle  *= 1 - 7 * dt;
    this.pitchAngle *= 1 - 5 * dt;

    // Heading tracks the actual direction of travel (toward the perch)
    // for almost the whole approach, and only blends into the perch's
    // final resting angle in the last stretch — a "flare" right before
    // touchdown, the way a plane levels its wheels only at the very end
    // of a landing instead of banking to that angle the moment it enters
    // the approach. The previous version pulled heading toward the
    // resting angle from the instant landing began, with zero connection
    // to (dx, dy) — so the drawn orientation and the actual translation
    // could point in completely different directions for the whole
    // approach (e.g. still visually facing/rotating toward "up" while
    // translating toward a perch that's up-and-to-the-right). That
    // mismatch is exactly what reads as still sliding the old way after
    // the nose has already turned.
    const travelHeading = dist > 1.5 ? Math.atan2(dy, dx) : this.heading;
    const restHeading   = p.normal + Math.PI / 2;
    const flareFrac      = smoothstep(clamp((closeness - 0.75) / 0.25, 0, 1));
    const targetHeading  = travelHeading + angleDiff(restHeading, travelHeading) * flareFrac;

    // ── Anchor-point / "towed by a rope" fix ────────────────────────────
    // updateFlying() steers heading-first: velocity is derived FROM heading,
    // so the two can never disagree there. Landing breaks that link —
    // (vx, vy) below is set straight at the perch, independent of
    // `heading` — and re-links them only through this proportional
    // correction. That's fine as long as the correction is fast relative
    // to how far the body has already committed to moving, but the rate
    // used to be keyed ONLY to `eased` (closeness/distance to the perch),
    // which is ~0 for the first frames of landing regardless of how big
    // the heading error actually is. A perch trigger that interrupts a
    // hard bank (heading still sweeping through a turn — "turning toward
    // sides") hands landing a large heading/travel mismatch at exactly
    // the moment `eased` was smallest, so for a third of a second the
    // body already flew a straight beeline for the perch while the drawn
    // sprite was still rotating through its old turn — visibly detached
    // from its own motion, like the perch was reeling it in on a line
    // rather than the butterfly flying there under its own power. A flat,
    // always-brisk floor (instead of one that ramps up only as distance
    // closes) fixes this regardless of how the mismatch arose, and
    // regardless of its size — moderate 30-50° errors are just as visible
    // as large ones over that ~0.3s window, so the floor has to cover the
    // whole range, not just extreme reversals.
    const headingRate = lerp(16, 30, eased);
    this.heading += angleDiff(targetHeading, this.heading) * headingRate * dt;

    // Wings keep actively beating almost the entire way in — the brace
    // (wide-open, near-static pose used for aerodynamic braking) only
    // takes over in the last sliver before contact, and even then it's
    // blended with the ongoing beat rather than replacing it outright, so
    // there's no stretch where the wings just sit open while the body
    // keeps sliding in. The old 65%-of-the-approach brace window is what
    // produced that "still open, still drifting" feeling — real insects
    // don't glide in stiff-winged for the better part of a second.
    const braceFrac = smoothstep(clamp((closeness - 0.88) / 0.12, 0, 1)); // 0 until final ~11px, ramps in fast
    const raw     = Math.sin(this.flapPhase * TWO_PI);
    const asymm   = raw > 0 ? Math.pow(raw, 0.7) : -Math.pow(-raw, 1.35);
    const flapVal = 0.5 + 0.5 * asymm;
    const flapTarget = lerp(flapVal, 0.04, braceFrac);
    this.flapAngle = lerp(this.flapAngle, flapTarget, 14 * dt);

    if (dist < 2.5) {
      this.x          = p.x;
      this.y          = p.y;
      this.vx         = 0;
      this.vy         = 0;
      // Snap heading fully level with the surface at the instant of
      // touchdown. Perching never corrects heading on its own, so any
      // leftover misalignment from the approach would otherwise sit there
      // as a permanently crooked landing — read as a glitch rather than a
      // clean stop.
      this.heading    = restHeading;
      this.state      = 'perching';
      this.perchTimer = 1400 + Math.random() * 2000;
      this.flapFreq   = 1.4; // base rate; actual perch fanning is randomized (see updatePerching)

      // Kick off the naturalistic wing-fan cycle: ease from wherever the
      // wings actually were at touchdown (now much closer to folded
      // already, thanks to the tightened brace window above) into a
      // resting fold quickly, then updatePerching() takes over with random
      // fan/pause timing. Shortened from ~0.5-0.8s to ~0.2-0.35s — the
      // old duration meant the wings stayed visibly spread for the better
      // part of a second AFTER touchdown too, compounding the "still
      // drifting" look with a second, separate open-wing stretch.
      this.perchFlapFrom  = this.flapAngle;
      this.perchFanTarget = 0.78 + Math.random() * 0.12;
      this.perchFanT      = 0;
      this.perchFanDur    = 0.2 + Math.random() * 0.15;
      this.perchFanHold   = 0;
    }
  }

  private updatePerching(dt: number) {
    this.perchTimer -= dt * 1000;
    // Slow lean-out while resting. pitchAngle decays smoothly rather than
    // being hard-set to 0 — a residual few degrees of nose-tilt snapping
    // to exactly level in a single frame is a small but visible pop right
    // at the moment it's supposed to be settling, not stopping abruptly.
    this.bankAngle  *= 1 - 8 * dt;
    this.pitchAngle *= 1 - 10 * dt;

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

    this.drawButterfly(ctx, b.flapAngle, b.scale, b.groundedness, b.bankAngle);

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
    groundedness: number, // 0 (airborne) → 1 (perched) — continuous, see field comment
    bankAngle: number,
  ) {
    // S: px per SVG unit (320 units → wingspan in pixels)
    const S  = scale * 0.088; // → ~28 px wingspan @ scale=1
    const cx = 160 * S;       // body centre X
    const cy = 143 * S;       // body centre Y

    // ── Anchor-point fix ─────────────────────────────────────────────────
    // draw() translates to (b.x, b.y) and rotates around THAT point — (b.x,
    // b.y) is also the point every physics/navigation calc in this file
    // treats as "the butterfly". But the raw Bluesky artwork's own visual
    // centre in its local coordinate space is (cx, cy), not (0, 0) — the
    // viewBox's origin sits up near a wingtip, not the body. Every draw
    // call below was positioned relative to that off-centre (cx, cy)
    // without correcting for it, so the sprite was never actually rotating
    // around its own body — it was rotating around a point ~15px away,
    // near one wing root. That's what produced the arcing "swing"/slide on
    // every heading change, no matter how correct the steering physics
    // were: a correct rotation around the wrong point still looks wrong.
    // Shifting the local origin by (-cx, -cy) here makes the body's true
    // centre coincide with the canvas's actual rotation pivot.
    ctx.translate(-cx, -cy);

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
    // Blended continuously between the airborne and perched shadow poses
    // by `groundedness`, instead of hard-switching the instant the state
    // flips. Interpolating position, squash, radius, and alpha together
    // is what removes the pop — jumping any single one of those on its
    // own frame still reads as a flicker.
    const shOffX   = lerp(3 * S, 5 * S, groundedness);
    const shOffY   = lerp(60 * S, 90 * S, groundedness);
    const shScaleX = lerp(0.9, 1.1, groundedness);
    const shScaleY = lerp(0.14, 0.22, groundedness);
    const shRadius = lerp(80 * S, 85 * S, groundedness);
    const shAlpha  = lerp(0.09, 0.18, groundedness);

    ctx.save();
    ctx.translate(cx + shOffX, cy + shOffY);
    ctx.scale(Math.abs(forX) * shScaleX, shScaleY);
    ctx.beginPath();
    ctx.arc(0, 0, shRadius, 0, TWO_PI);
    ctx.fillStyle = SHADOW_CLR(shAlpha);
    ctx.fill();
    ctx.restore();

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
