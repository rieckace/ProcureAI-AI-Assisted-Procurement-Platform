/**
 * Lightweight canvas confetti burst — zero dependencies.
 *
 * Usage:
 *   import { fireConfetti } from '../utils/confetti';
 *   fireConfetti();                          // burst from top-center
 *   fireConfetti({ origin: { x, y } });      // burst from a point
 *
 * Creates a fixed full-screen canvas, animates ~130 particles with gravity,
 * and removes the canvas once finished. Safe to call repeatedly.
 */

const COLORS = [
  '#1a73e8', '#34a853', '#f9ab00', '#ea4335',
  '#8ab4f8', '#81c995', '#fdd663', '#c58af9', '#ff6e7f',
];

let canvas = null;
let ctx = null;
let particles = [];
let rafId = null;

function ensureCanvas() {
  if (canvas && document.body.contains(canvas)) return;
  canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:99999;';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
}

function createParticle(origin) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 5 + Math.random() * 9;
  const life = 2 + Math.random() * 1.6;
  return {
    x: origin.x,
    y: origin.y,
    vx: Math.cos(angle) * speed * (0.55 + Math.random() * 0.6),
    vy: Math.sin(angle) * speed - 6.5,
    size: 5 + Math.random() * 6,
    color: COLORS[(Math.random() * COLORS.length) | 0],
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.3,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
    drag: 0.985,
    life,
    age: 0,
  };
}

function step() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter((p) => p.age < p.life && p.y < canvas.height + 40);

  for (const p of particles) {
    p.age += 1 / 60;
    p.vx *= p.drag;
    p.vy = p.vy * p.drag + 0.22; // gravity
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.rotSpeed;

    const alpha = Math.max(0, 1 - p.age / p.life);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    if (p.shape === 'rect') {
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (particles.length === 0) {
    cancelAnimationFrame(rafId);
    rafId = null;
    if (canvas) {
      canvas.remove();
      canvas = null;
      ctx = null;
    }
    return;
  }
  rafId = requestAnimationFrame(step);
}

/**
 * Fire a confetti burst.
 * @param {{ origin?: {x:number,y:number}, count?: number }} [opts]
 */
export function fireConfetti({ origin, count = 130 } = {}) {
  ensureCanvas();
  const o = origin || { x: window.innerWidth / 2, y: window.innerHeight * 0.35 };
  for (let i = 0; i < count; i++) particles.push(createParticle(o));
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(step);
}

/** Alias — easier to read at call sites. */
export const celebrate = fireConfetti;
