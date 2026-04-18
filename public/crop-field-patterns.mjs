/**
 * Formation generators for Cropsy — aligned with crop-catelog.md (run scripts/build-crop-catalog.mjs).
 * Shapes: { type: "circle"|"line"|"polygon"|"arc", ... , flatten }
 */
import { CROP_CATALOG_SECTIONS } from "./crop-catalog-sections.mjs";

function kochSegXZ(shapes, x0, z0, x1, z1, depth, flatten) {
  if (depth <= 0) {
    shapes.push({ type: "line", x1: x0, z1: z0, x2: x1, z2: z1, flatten });
    return;
  }
  const dx = x1 - x0;
  const dz = z1 - z0;
  const xa = x0 + dx / 3;
  const za = z0 + dz / 3;
  const xc = x0 + (2 * dx) / 3;
  const zc = z0 + (2 * dz) / 3;
  const len = Math.hypot(dx, dz) || 1e-6;
  const px = -dz / len;
  const pz = dx / len;
  const h = (Math.sqrt(3) / 6) * len;
  const xb = (x0 + x1) / 2 + px * h;
  const zb = (z0 + z1) / 2 + pz * h;
  kochSegXZ(shapes, x0, z0, xa, za, depth - 1, flatten);
  kochSegXZ(shapes, xa, za, xb, zb, depth - 1, flatten);
  kochSegXZ(shapes, xb, zb, xc, zc, depth - 1, flatten);
  kochSegXZ(shapes, xc, zc, x1, z1, depth - 1, flatten);
}

/** Simplified hex close-packed circle centres up to `rings` steps from origin */
function hexPackCentres(rings, spacing) {
  const out = [[0, 0]];
  for (let q = -rings; q <= rings; q++) {
    for (let r = -rings; r <= rings; r++) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) > rings) continue;
      const x = spacing * (q + r / 2);
      const z = spacing * (r * (Math.sqrt(3) / 2));
      if (x === 0 && z === 0) continue;
      out.push([x, z]);
    }
  }
  return out;
}

const ALL_PATTERNS_RAW = [
  {
    id: "concentric-rings",
    name: "Concentric rings",
    generate(flatten) {
      const shapes = [];
      for (let k = 1; k <= 7; k++) shapes.push({ type: "circle", cx: 0, cz: 0, r: k * 1.05, flatten });
      return shapes;
    },
  },
  {
    id: "flower-of-life",
    name: "Flower of Life",
    generate(flatten) {
      const shapes = [];
      const r = 3.5;
      shapes.push({ type: "circle", cx: 0, cz: 0, r, flatten });
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        shapes.push({ type: "circle", cx: r * Math.cos(a), cz: r * Math.sin(a), r, flatten });
      }
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + Math.PI / 6;
        shapes.push({ type: "circle", cx: r * 1.73 * Math.cos(a), cz: r * 1.73 * Math.sin(a), r, flatten });
      }
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        shapes.push({ type: "circle", cx: r * 2 * Math.cos(a), cz: r * 2 * Math.sin(a), r, flatten });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: r * 2.5, flatten: flatten * 0.3 });
      return shapes;
    },
  },
  {
    id: "seed-of-life",
    name: "Seed of Life",
    generate(flatten) {
      const shapes = [];
      const r = 4.5;
      shapes.push({ type: "circle", cx: 0, cz: 0, r, flatten });
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        shapes.push({ type: "circle", cx: r * Math.cos(a), cz: r * Math.sin(a), r, flatten });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: r * 1.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "hexagram",
    name: "Hexagram",
    generate(flatten) {
      const shapes = [];
      const r = 7;
      shapes.push({ type: "polygon", sides: 3, r, offset: -Math.PI / 2, flatten });
      shapes.push({ type: "polygon", sides: 3, r, offset: Math.PI / 2, flatten });
      shapes.push({ type: "polygon", sides: 6, r: r * 0.58, offset: 0, flatten: flatten * 0.8 });
      shapes.push({ type: "circle", cx: 0, cz: 0, r: r * 1.15, flatten: flatten * 0.4 });
      shapes.push({ type: "circle", cx: 0, cz: 0, r: r * 0.35, flatten: flatten * 0.9 });
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 0.5, flatten: flatten * 1.2 });
      return shapes;
    },
  },
  {
    id: "fibonacci-spiral",
    name: "Fibonacci spiral",
    generate(flatten) {
      const shapes = [];
      const phi = 1.618;
      let r = 0.8;
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 2;
        const cx = r * 0.3 * Math.cos(angle + Math.PI);
        const cz = r * 0.3 * Math.sin(angle + Math.PI);
        shapes.push({ type: "arc", cx, cz, r, startAngle: angle, endAngle: angle + Math.PI / 2, flatten });
        r *= phi * 0.6;
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8, flatten: flatten * 0.3 });
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 0.4, flatten: flatten * 1.2 });
      return shapes;
    },
  },
  {
    id: "vesica-piscis",
    name: "Vesica Piscis",
    generate(flatten) {
      const shapes = [];
      const r = 5;
      const offset = r * 0.5;
      shapes.push({ type: "circle", cx: -offset, cz: 0, r, flatten });
      shapes.push({ type: "circle", cx: offset, cz: 0, r, flatten });
      shapes.push({ type: "circle", cx: 0, cz: 0, r: r * 0.45, flatten: flatten * 0.7 });
      shapes.push({ type: "circle", cx: 0, cz: 0, r: r * 1.6, flatten: flatten * 0.2 });
      shapes.push({ type: "line", x1: 0, z1: -r * 0.87, x2: 0, z2: r * 0.87, flatten: flatten * 0.6 });
      return shapes;
    },
  },
  {
    id: "metatron",
    name: "Metatron's Cube",
    generate(flatten) {
      const shapes = [];
      const innerR = 3.5;
      const outerR = 7;
      const circR = 1.8;
      shapes.push({ type: "circle", cx: 0, cz: 0, r: circR, flatten });
      const allCentres = [[0, 0]];
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const ix = innerR * Math.cos(a);
        const iz = innerR * Math.sin(a);
        const ox = outerR * Math.cos(a);
        const oz = outerR * Math.sin(a);
        shapes.push({ type: "circle", cx: ix, cz: iz, r: circR, flatten });
        shapes.push({ type: "circle", cx: ox, cz: oz, r: circR, flatten });
        allCentres.push([ix, iz], [ox, oz]);
      }
      for (let i = 0; i < allCentres.length; i++) {
        for (let j = i + 1; j < allCentres.length; j++) {
          const dx = allCentres[i][0] - allCentres[j][0];
          const dz = allCentres[i][1] - allCentres[j][1];
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < outerR * 1.2) {
            shapes.push({
              type: "line",
              x1: allCentres[i][0],
              z1: allCentres[i][1],
              x2: allCentres[j][0],
              z2: allCentres[j][1],
              flatten: flatten * 0.5,
            });
          }
        }
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: outerR + circR + 1, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "orthogonal-grid",
    name: "Orthogonal grid",
    generate(flatten) {
      const shapes = [];
      const span = 10;
      const n = 14;
      const step = (2 * span) / n;
      for (let k = -n; k <= n; k++) {
        const o = k * step;
        shapes.push({ type: "line", x1: -span, z1: o, x2: span, z2: o, flatten });
        shapes.push({ type: "line", x1: o, z1: -span, x2: o, z2: span, flatten });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.4, flatten: flatten * 0.28 });
      return shapes;
    },
  },
  {
    id: "eightfold-rosette",
    name: "Eight-fold rosette",
    generate(flatten) {
      const shapes = [];
      for (let k = 1; k <= 6; k++) {
        shapes.push({
          type: "circle",
          cx: 0,
          cz: 0,
          r: k * 0.98,
          flatten: flatten * (0.88 + (k % 2) * 0.1),
        });
      }
      const R = 9.2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        shapes.push({
          type: "line",
          x1: 0,
          z1: 0,
          x2: R * Math.cos(a),
          z2: R * Math.sin(a),
          flatten: flatten * 0.92,
        });
      }
      return shapes;
    },
  },
  {
    id: "archimedean-spiral",
    name: "Archimedean spiral",
    generate(flatten) {
      const shapes = [];
      const dr = 0.22;
      let px = 0;
      let pz = 0;
      for (let s = 0; s < 240; s++) {
        const ang = s * 0.168;
        const r = dr * ang;
        const x = r * Math.cos(ang);
        const z = r * Math.sin(ang);
        if (s > 0) {
          shapes.push({
            type: "line",
            x1: px,
            z1: pz,
            x2: x,
            z2: z,
            flatten: flatten * 0.94,
          });
        }
        px = x;
        pz = z;
        if (r > 10.2) break;
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 9.6, flatten: flatten * 0.24 });
      return shapes;
    },
  },
  {
    id: "sunflower-lattice",
    name: "Sunflower lattice",
    generate(flatten) {
      const shapes = [];
      const n = 96;
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const rad = 0.14 + Math.sqrt(i / n) * 8.9;
        const a = i * golden;
        const x = rad * Math.cos(a);
        const z = rad * Math.sin(a);
        shapes.push({ type: "circle", cx: x, cz: z, r: 0.36, flatten: flatten * 0.88 });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 9.3, flatten: flatten * 0.26 });
      return shapes;
    },
  },
  {
    id: "pentagram",
    name: "Pentagram",
    generate(flatten) {
      const shapes = [];
      const r = 6.8;
      shapes.push({ type: "polygon", sides: 5, r, offset: -Math.PI / 2, flatten });
      shapes.push({
        type: "polygon",
        sides: 5,
        r: r * 0.36,
        offset: -Math.PI / 2 + Math.PI / 5,
        flatten: flatten * 0.82,
      });
      for (let i = 0; i < 5; i++) {
        const a1 = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const a2 = ((i + 2) / 5) * Math.PI * 2 - Math.PI / 2;
        const cr = r * 0.92;
        shapes.push({
          type: "line",
          x1: cr * Math.cos(a1),
          z1: cr * Math.sin(a1),
          x2: cr * Math.cos(a2),
          z2: cr * Math.sin(a2),
          flatten: flatten * 0.72,
        });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: r * 1.1, flatten: flatten * 0.32 });
      return shapes;
    },
  },
  {
    id: "nested-squares",
    name: "Nested squares",
    generate(flatten) {
      const shapes = [];
      for (let k = 1; k <= 8; k++) {
        shapes.push({
          type: "polygon",
          sides: 4,
          r: k * 1.12 * Math.SQRT2,
          offset: Math.PI / 4,
          flatten: flatten * (0.78 + (k % 2) * 0.12),
        });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 9.1, flatten: flatten * 0.22 });
      return shapes;
    },
  },
  {
    id: "double-ring-crescents",
    name: "Ring crescents",
    generate(flatten) {
      const shapes = [];
      for (let k = 1; k <= 5; k++) {
        shapes.push({ type: "circle", cx: 0, cz: 0, r: k * 1.55, flatten: flatten * 0.9 });
      }
      for (let j = 0; j < 12; j++) {
        const a0 = (j / 12) * Math.PI * 2;
        const a1 = a0 + (Math.PI / 12) * 0.92;
        shapes.push({
          type: "arc",
          cx: 0,
          cz: 0,
          r: 4.2,
          startAngle: a0,
          endAngle: a1,
          flatten: flatten * 0.95,
        });
        shapes.push({
          type: "arc",
          cx: 0,
          cz: 0,
          r: 6.6,
          startAngle: a0 + Math.PI / 12,
          endAngle: a1 + Math.PI / 12,
          flatten: flatten * 0.88,
        });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 9.4, flatten: flatten * 0.2 });
      return shapes;
    },
  },

  /* ——— crop-catelog.md §1–48 + extras (stylised) ——— */
  {
    id: "milk-hill-galaxy-spiral",
    name: "Milk Hill spiral (inspired)",
    generate(flatten) {
      const shapes = [];
      const arms = 6;
      const n = 11;
      for (let a = 0; a < arms; a++) {
        const off = (a * 2 * Math.PI) / arms;
        for (let i = 1; i <= n; i++) {
          const t = (i / n) * 2.8;
          const rad = 0.35 * Math.exp(0.38 * t);
          const ang = off + t * 0.95;
          const cr = 0.11 + 0.07 * (1 - i / n);
          shapes.push({ type: "circle", cx: rad * Math.cos(ang), cz: rad * Math.sin(ang), r: cr, flatten: flatten * 0.88 });
        }
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 0.55, flatten });
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 9.2, flatten: flatten * 0.24 });
      return shapes;
    },
  },
  {
    id: "julia-spiral-field",
    name: "Julia spiral (inspired)",
    generate(flatten) {
      const shapes = [];
      let r = 0.35;
      let ang = 0;
      for (let i = 0; i < 72; i++) {
        const x = r * Math.cos(ang);
        const z = r * Math.sin(ang);
        const cr = 0.14 + 0.22 / (1 + i * 0.04);
        shapes.push({ type: "circle", cx: x, cz: z, r: cr, flatten: flatten * 0.9 });
        ang += 0.42;
        r += 0.11;
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 9, flatten: flatten * 0.22 });
      return shapes;
    },
  },
  {
    id: "triple-julia-c3",
    name: "Triple spiral C₃ (inspired)",
    generate(flatten) {
      const shapes = [];
      for (let arm = 0; arm < 3; arm++) {
        const off = (arm * 2 * Math.PI) / 3;
        let r = 0.4;
        let ang = off;
        for (let i = 0; i < 36; i++) {
          shapes.push({
            type: "circle",
            cx: r * Math.cos(ang),
            cz: r * Math.sin(ang),
            r: 0.16 + 0.04 * Math.sin(i * 0.5),
            flatten: flatten * 0.88,
          });
          ang += 0.38;
          r += 0.14;
        }
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 0.5, flatten });
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.25 });
      return shapes;
    },
  },
  {
    id: "koch-snowflake",
    name: "Koch snowflake (inspired)",
    generate(flatten) {
      const shapes = [];
      const R = 6.2;
      const depth = 3;
      for (let s = 0; s < 3; s++) {
        const a0 = (s * 2 * Math.PI) / 3 - Math.PI / 2;
        const a1 = ((s + 1) * 2 * Math.PI) / 3 - Math.PI / 2;
        kochSegXZ(shapes, R * Math.cos(a0), R * Math.sin(a0), R * Math.cos(a1), R * Math.sin(a1), depth, flatten);
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 9, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "koch-heptagon-hint",
    name: "Koch on 7-fold (inspired)",
    generate(flatten) {
      const shapes = [];
      const R = 5.8;
      const depth = 2;
      for (let s = 0; s < 7; s++) {
        const a0 = (s * 2 * Math.PI) / 7 - Math.PI / 2;
        const a1 = ((s + 1) * 2 * Math.PI) / 7 - Math.PI / 2;
        kochSegXZ(shapes, R * Math.cos(a0), R * Math.sin(a0), R * Math.cos(a1), R * Math.sin(a1), depth, flatten * 0.92);
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 1.2, flatten: flatten * 0.85 });
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.22 });
      return shapes;
    },
  },
  {
    id: "etchilhampton-dense-grid",
    name: "Etchilhampton grid (inspired)",
    generate(flatten) {
      const shapes = [];
      const span = 9;
      const n = 22;
      const step = (2 * span) / n;
      for (let k = -n; k <= n; k++) {
        const o = k * step;
        shapes.push({ type: "line", x1: -span, z1: o, x2: span, z2: o, flatten: flatten * 0.85 });
        shapes.push({ type: "line", x1: o, z1: -span, x2: o, z2: span, flatten: flatten * 0.85 });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.5, flatten: flatten * 0.32 });
      return shapes;
    },
  },
  {
    id: "barbury-pi-spiral",
    name: "Barbury π ratchet (inspired)",
    generate(flatten) {
      const shapes = [];
      const digits = [3, 1, 4, 1, 5, 9, 2, 6, 5, 4];
      let theta = -Math.PI / 2;
      let rad = 1.2;
      for (let i = 0; i < 10; i++) {
        const sweep = (digits[i] / 10) * ((2 * Math.PI) / 10);
        shapes.push({ type: "arc", cx: 0, cz: 0, r: rad, startAngle: theta, endAngle: theta + sweep, flatten: flatten * 0.92 });
        theta += (2 * Math.PI) / 10;
        rad += 0.62;
      }
      shapes.push({ type: "circle", cx: rad * 0.08, cz: -0.3, r: 0.25, flatten: flatten * 0.95 });
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 9.2, flatten: flatten * 0.18 });
      return shapes;
    },
  },
  {
    id: "euler-radial-binary",
    name: "Euler binary radial (inspired)",
    generate(flatten) {
      const shapes = [];
      const sectors = 12;
      const bits = 8;
      for (let s = 0; s < sectors; s++) {
        const a0 = (s * 2 * Math.PI) / sectors;
        const a1 = ((s + 1) * 2 * Math.PI) / sectors;
        shapes.push({ type: "line", x1: 0, z1: 0, x2: 8 * Math.cos(a0), z2: 8 * Math.sin(a0), flatten: flatten * 0.45 });
        for (let b = 0; b < bits; b++) {
          const on = ((s + b) % 3 !== 0) ? 1 : 0;
          if (!on) continue;
          const r0 = 2 + b * 0.65;
          const r1 = r0 + 0.35;
          shapes.push({ type: "arc", cx: 0, cz: 0, r: (r0 + r1) / 2, startAngle: a0 + 0.04, endAngle: a1 - 0.04, flatten: flatten * 0.78 });
        }
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "chilbolton-grid-dots",
    name: "Chilbolton grid (inspired)",
    generate(flatten) {
      const shapes = [];
      const cols = 23;
      const rows = 14;
      const sx = 0.32;
      const sz = 0.32;
      const pattern = (c, r) => ((c * 17 + r * 31 + (c >> 2)) % 7 !== 0 ? 1 : 0);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          if (!pattern(i, j)) continue;
          const x = (i - cols / 2) * sx;
          const z = (j - rows / 2) * sz;
          shapes.push({ type: "circle", cx: x, cz: z, r: 0.12, flatten: flatten * 0.82 });
        }
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.6, flatten: flatten * 0.22 });
      return shapes;
    },
  },
  {
    id: "magnetic-dipole-lines",
    name: "Magnetic dipole field (inspired)",
    generate(flatten) {
      const shapes = [];
      const d = 2.4;
      const n = 22;
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1)) * Math.PI * 0.92 + 0.04 * Math.PI;
        shapes.push({
          type: "line",
          x1: -d,
          z1: 0,
          x2: -d + 7.2 * Math.cos(t),
          z2: 7.2 * Math.sin(t),
          flatten: flatten * 0.52,
        });
        shapes.push({
          type: "line",
          x1: d,
          z1: 0,
          x2: d - 7.2 * Math.cos(t),
          z2: 7.2 * Math.sin(t),
          flatten: flatten * 0.52,
        });
      }
      shapes.push({ type: "circle", cx: -d, cz: 0, r: 0.4, flatten: flatten * 0.88 });
      shapes.push({ type: "circle", cx: d, cz: 0, r: 0.4, flatten: flatten * 0.88 });
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.9, flatten: flatten * 0.18 });
      return shapes;
    },
  },
  {
    id: "tesseract-schlegel",
    name: "4D tesseract hint",
    generate(flatten) {
      const shapes = [];
      const inner = 2.8;
      const outer = 6;
      shapes.push({ type: "polygon", sides: 4, r: inner, offset: Math.PI / 8, flatten: flatten * 0.88 });
      shapes.push({ type: "polygon", sides: 4, r: outer, offset: 0, flatten: flatten * 0.88 });
      for (let i = 0; i < 4; i++) {
        const a0 = (i / 4) * Math.PI * 2 + Math.PI / 8;
        const a1 = (i / 4) * Math.PI * 2;
        shapes.push({
          type: "line",
          x1: inner * Math.cos(a0),
          z1: inner * Math.sin(a0),
          x2: outer * Math.cos(a1),
          z2: outer * Math.sin(a1),
          flatten: flatten * 0.72,
        });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "mayan-sun-wheel",
    name: "Mayan calendar wheel (inspired)",
    generate(flatten) {
      const shapes = [];
      for (let k = 1; k <= 8; k++) shapes.push({ type: "circle", cx: 0, cz: 0, r: k * 1.05, flatten: flatten * (0.75 + (k % 3) * 0.06) });
      const spokes = 18;
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        shapes.push({ type: "line", x1: 0.8 * Math.cos(a), z1: 0.8 * Math.sin(a), x2: 8.2 * Math.cos(a), z2: 8.2 * Math.sin(a), flatten: flatten * 0.82 });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 9.1, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "mandelbrot-cardioid-hint",
    name: "Mandelbrot cardioid (inspired)",
    generate(flatten) {
      const shapes = [];
      const n = 120;
      let px = 0;
      let pz = 0;
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * Math.PI * 2;
        const r = 2.8 * (1 - Math.cos(t)) * 0.5;
        const x = r * Math.cos(t) - 1.1;
        const z = r * Math.sin(t);
        if (i > 0) shapes.push({ type: "line", x1: px, z1: pz, x2: x, z2: z, flatten: flatten * 0.88 });
        px = x;
        pz = z;
      }
      shapes.push({ type: "circle", cx: -0.85, cz: 0, r: 0.65, flatten: flatten * 0.82 });
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.22 });
      return shapes;
    },
  },
  {
    id: "rubiks-isometric",
    name: "Rubik isometric (inspired)",
    generate(flatten) {
      const shapes = [];
      const cell = (ox, oz, rot, ix, iz) => {
        const w = 0.42;
        const c = Math.cos(rot);
        const s = Math.sin(rot);
        const rx = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
        const [x0, z0] = rx(ix * 0.95, iz * 0.95);
        const corners = [
          [x0 - w, z0 - w],
          [x0 + w, z0 - w],
          [x0 + w, z0 + w],
          [x0 - w, z0 + w],
        ];
        for (let e = 0; e < 4; e++) {
          const b = (e + 1) % 4;
          shapes.push({
            type: "line",
            x1: corners[e][0],
            z1: corners[e][1],
            x2: corners[b][0],
            z2: corners[b][1],
            flatten: flatten * 0.7,
          });
        }
      };
      const r1 = Math.PI / 6;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) cell(-3.4, -0.6, r1, a, b);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) cell(2.6, -0.8, -r1, a, b);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) cell(0.2, 3.2, Math.PI / 3, a, b);
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 9.2, flatten: flatten * 0.18 });
      return shapes;
    },
  },
  {
    id: "angel-radiating",
    name: "Radiating lines (inspired)",
    generate(flatten) {
      const shapes = [];
      const n = 48;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const wave = 0.15 * Math.sin(i * 0.8);
        const r0 = 0.4 + wave;
        const r1 = 7.8 + wave * 2;
        shapes.push({
          type: "line",
          x1: r0 * Math.cos(a),
          z1: r0 * Math.sin(a),
          x2: r1 * Math.cos(a),
          z2: r1 * Math.sin(a),
          flatten: flatten * (0.65 + (i % 2) * 0.2),
        });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.9, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "picked-hill-pi-mandala",
    name: "π mandala rings (inspired)",
    generate(flatten) {
      const shapes = [];
      for (let k = 1; k <= 14; k++) shapes.push({ type: "circle", cx: 0, cz: 0, r: k * 0.58, flatten: flatten * (0.7 + (k % 3) * 0.08) });
      const m = 44;
      for (let i = 0; i < m; i++) {
        const a = (i / m) * Math.PI * 2;
        const rr = 4.2 + (i % 5) * 0.35;
        shapes.push({ type: "circle", cx: rr * Math.cos(a), cz: rr * Math.sin(a), r: 0.22, flatten: flatten * 0.8 });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 9, flatten: flatten * 0.18 });
      return shapes;
    },
  },
  {
    id: "quetzalcoatl-wings",
    name: "Feather bilateral (inspired)",
    generate(flatten) {
      const shapes = [];
      for (let side of [-1, 1]) {
        for (let f = 0; f < 12; f++) {
          const t = f / 12;
          const x0 = side * (1.2 + t * 6);
          const z0 = -4 + t * 8;
          const x1 = side * (1.8 + t * 6.2);
          const z1 = -3.2 + t * 8.2;
          shapes.push({ type: "line", x1: x0, z1: z0, x2: x1, z2: z1, flatten: flatten * 0.78 });
        }
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 0.9, flatten: flatten * 0.85 });
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "sri-yantra-lite",
    name: "Sri Yantra (simplified)",
    generate(flatten) {
      const shapes = [];
      for (let k = 0; k < 4; k++) {
        const rf = 2.2 + k * 1.35;
        const off = k * 0.08;
        shapes.push({ type: "polygon", sides: 3, r: rf, offset: off, flatten: flatten * (0.85 - k * 0.08) });
        shapes.push({ type: "polygon", sides: 3, r: rf * 0.92, offset: Math.PI + off * 0.9, flatten: flatten * (0.82 - k * 0.08) });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.22 });
      return shapes;
    },
  },
  {
    id: "flower-of-life-4-ring",
    name: "Flower of Life · 4 rings",
    generate(flatten) {
      const shapes = [];
      const r = 1.55;
      const centres = hexPackCentres(4, r * Math.sqrt(3));
      for (const [cx, cz] of centres) {
        if (Math.hypot(cx, cz) <= r *7.8) shapes.push({ type: "circle", cx, cz, r, flatten: flatten * 0.88 });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.22 });
      return shapes;
    },
  },
  {
    id: "golden-log-spiral",
    name: "Golden logarithmic spiral",
    generate(flatten) {
      const shapes = [];
      const b = Math.log(1.618) / (Math.PI / 2);
      let px = 0.25;
      let pz = 0;
      for (let i = 1; i < 200; i++) {
        const t = i * 0.08;
        const rad = 0.35 * Math.exp(b * t);
        const x = rad * Math.cos(t);
        const z = rad * Math.sin(t);
        shapes.push({ type: "line", x1: px, z1: pz, x2: x, z2: z, flatten: flatten * 0.92 });
        px = x;
        pz = z;
        if (rad > 9.5) break;
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 9.2, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "tetrahedron-outline",
    name: "Tetrahedron outline",
    generate(flatten) {
      const shapes = [];
      const r = 6.5;
      for (let i = 0; i < 3; i++) {
        const a1 = (i * 2 * Math.PI) / 3 - Math.PI / 2;
        const a2 = ((i + 1) * 2 * Math.PI) / 3 - Math.PI / 2;
        shapes.push({
          type: "line",
          x1: r * Math.cos(a1),
          z1: r * Math.sin(a1),
          x2: r * Math.cos(a2),
          z2: r * Math.sin(a2),
          flatten: flatten * 0.9,
        });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 0.45, flatten });
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "rose-curve-7",
    name: "Rose curve (k=7)",
    generate(flatten) {
      const shapes = [];
      const k = 7;
      const a = 7;
      let px = a * Math.cos(0) * Math.cos(0);
      let pz = a * Math.cos(0) * Math.sin(0);
      for (let i = 1; i <= 360; i++) {
        const t = (i / 360) * Math.PI * 2;
        const r = a * Math.cos(k * t);
        const x = r * Math.cos(t);
        const z = r * Math.sin(t);
        shapes.push({ type: "line", x1: px, z1: pz, x2: x, z2: z, flatten: flatten * 0.88 });
        px = x;
        pz = z;
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 9, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "maurer-rose",
    name: "Maurer rose (n=4,d=31°)",
    generate(flatten) {
      const shapes = [];
      const n = 4;
      const d = (31 * Math.PI) / 180;
      let px = 0;
      let pz = 0;
      for (let i = 0; i <= 360; i++) {
        const t = i * d;
        const rr = 6 * Math.sin(n * t);
        const x = rr * Math.cos(t);
        const z = rr * Math.sin(t);
        if (i > 0) shapes.push({ type: "line", x1: px, z1: pz, x2: x, z2: z, flatten: flatten * 0.9 });
        px = x;
        pz = z;
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 9, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "hypotrochoid-deltoid",
    name: "Spirograph / deltoid",
    generate(flatten) {
      const shapes = [];
      const R = 5;
      const r = R / 3;
      const d = r;
      let px = 0;
      let pz = 0;
      const steps = 240;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 2 * 3;
        const x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
        const z = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
        if (i > 0) shapes.push({ type: "line", x1: px, z1: pz, x2: x, z2: z, flatten: flatten * 0.9 });
        px = x;
        pz = z;
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "lissajous-3-4",
    name: "Lissajous 3:4",
    generate(flatten) {
      const shapes = [];
      const A = 6;
      const B = 6;
      let px = 0;
      let pz = 0;
      for (let i = 0; i <= 400; i++) {
        const t = (i / 400) * Math.PI * 2;
        const x = A * Math.sin(3 * t + 0.4);
        const z = B * Math.sin(4 * t);
        if (i > 0) shapes.push({ type: "line", x1: px, z1: pz, x2: x, z2: z, flatten: flatten * 0.88 });
        px = x;
        pz = z;
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "mandala-12-fold",
    name: "Mandala 12-fold",
    generate(flatten) {
      const shapes = [];
      for (let ring = 1; ring <= 5; ring++) {
        const rr = ring * 1.45;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          shapes.push({
            type: "circle",
            cx: rr * Math.cos(a),
            cz: rr * Math.sin(a),
            r: 0.35 + ring * 0.04,
            flatten: flatten * 0.82,
          });
        }
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.9, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "girih-decagon-hint",
    name: "Girih /10-fold star",
    generate(flatten) {
      const shapes = [];
      shapes.push({ type: "polygon", sides: 10, r: 7.2, offset: -Math.PI / 2, flatten: flatten * 0.55 });
      shapes.push({ type: "polygon", sides: 10, r: 4.5, offset: Math.PI / 10, flatten: flatten * 0.72 });
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        shapes.push({ type: "line", x1: 0, z1: 0, x2: 7.5 * Math.cos(a), z2: 7.5 * Math.sin(a), flatten: flatten * 0.45 });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "hex-lattice-fcc",
    name: "64-tetra / hex lattice",
    generate(flatten) {
      const shapes = [];
      const pts = hexPackCentres(3, 1.25);
      for (const [cx, cz] of pts) {
        shapes.push({ type: "circle", cx, cz, r: 0.42, flatten: flatten * 0.78 });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.22 });
      return shapes;
    },
  },
  {
    id: "apollonian-lite",
    name: "Apollonian gasket (lite)",
    generate(flatten) {
      const shapes = [];
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8, flatten: flatten * 0.25 });
      shapes.push({ type: "circle", cx: -2.6, cz: 0, r: 2.6, flatten: flatten * 0.82 });
      shapes.push({ type: "circle", cx: 2.6, cz: 0, r: 2.6, flatten: flatten * 0.82 });
      shapes.push({ type: "circle", cx: 0, cz: 4.5, r: 2.6, flatten: flatten * 0.82 });
      shapes.push({ type: "circle", cx: -1.3, cz: 2.25, r: 1.25, flatten: flatten * 0.78 });
      shapes.push({ type: "circle", cx: 1.3, cz: 2.25, r: 1.25, flatten: flatten * 0.78 });
      shapes.push({ type: "circle", cx: 0, cz: 1.5, r: 0.72, flatten: flatten * 0.85 });
      return shapes;
    },
  },
  {
    id: "poincare-arcs",
    name: "Hyperbolic arcs (hint)",
    generate(flatten) {
      const shapes = [];
      const m = 8;
      for (let i = 0; i < m; i++) {
        const a0 = (i / m) * Math.PI;
        const a1 = a0 + Math.PI / m;
        shapes.push({ type: "arc", cx: 0, cz: 0, r: 3 + (i % 3) * 1.2, startAngle: a0, endAngle: a1 + 0.2, flatten: flatten * 0.65 });
        shapes.push({ type: "arc", cx: 0.4, cz: -0.3, r: 5.5 - i * 0.15, startAngle: a0 + 0.5, endAngle: a1 + 0.7, flatten: flatten * 0.55 });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.22 });
      return shapes;
    },
  },
  {
    id: "cell24-projection",
    name: "24-cell hint",
    generate(flatten) {
      const shapes = [];
      const verts = [];
      const perms = [
        [1, 1, 0, 0],
        [1, -1, 0, 0],
        [-1, 1, 0, 0],
        [-1, -1, 0, 0],
        [1, 0, 1, 0],
        [1, 0, -1, 0],
        [-1, 0, 1, 0],
        [-1, 0, -1, 0],
        [0, 1, 1, 0],
        [0, 1, -1, 0],
        [0, -1, 1, 0],
        [0, -1, -1, 0],
      ];
      for (const [x, y, z, w] of perms) {
        const s = 1.15 - w * 0.15;
        verts.push([((x + y) * 1.8) / s, ((z + x * 0.3) * 1.8) / s]);
      }
      for (let i = 0; i < verts.length; i++) {
        for (let j = i + 1; j < verts.length; j++) {
          const d = Math.hypot(verts[i][0] - verts[j][0], verts[i][1] - verts[j][1]);
          if (d < 4.2 && d > 0.8) {
            shapes.push({
              type: "line",
              x1: verts[i][0],
              z1: verts[i][1],
              x2: verts[j][0],
              z2: verts[j][1],
              flatten: flatten * 0.55,
            });
          }
        }
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "torus-knot-3-2",
    name: "Torus knot (3,2)",
    generate(flatten) {
      const shapes = [];
      const p = 3;
      const q = 2;
      const R = 4;
      const r = 1.6;
      let px = 0;
      let pz = 0;
      for (let i = 0; i <= 200; i++) {
        const t = (i / 200) * Math.PI * 2 * q;
        const x = (R + r * Math.cos(q * t)) * Math.cos(p * t);
        const z = (R + r * Math.cos(q * t)) * Math.sin(p * t);
        if (i > 0) shapes.push({ type: "line", x1: px, z1: pz, x2: x, z2: z, flatten: flatten * 0.9 });
        px = x;
        pz = z;
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "torus-knot-5-3",
    name: "Torus knot (5,3)",
    generate(flatten) {
      const shapes = [];
      const p = 5;
      const q = 3;
      const R = 4;
      const r = 1.35;
      let px = 0;
      let pz = 0;
      for (let i = 0; i <= 360; i++) {
        const t = (i / 360) * Math.PI * 2 * q;
        const x = (R + r * Math.cos(q * t)) * Math.cos(p * t);
        const z = (R + r * Math.cos(q * t)) * Math.sin(p * t);
        if (i > 0) shapes.push({ type: "line", x1: px, z1: pz, x2: x, z2: z, flatten: flatten * 0.88 });
        px = x;
        pz = z;
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "moire-offset-rings",
    name: "Moiré offset rings",
    generate(flatten) {
      const shapes = [];
      for (let k = 1; k <= 18; k++) {
        shapes.push({ type: "circle", cx: 0, cz: 0, r: k * 0.48, flatten: flatten * 0.55 });
        shapes.push({ type: "circle", cx: 0.35, cz: 0.22, r: k * 0.48, flatten: flatten * 0.5 });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.18 });
      return shapes;
    },
  },
  {
    id: "penrose-star-hint",
    name: "Penrose / pentagrid hint",
    generate(flatten) {
      const shapes = [];
      for (let i = 0; i < 5; i++) {
        const ang = (i * Math.PI) / 5;
        const dx = Math.cos(ang) * 12;
        const dz = Math.sin(ang) * 12;
        shapes.push({ type: "line", x1: -dx, z1: -dz, x2: dx, z2: dz, flatten: flatten * 0.35 });
      }
      shapes.push({ type: "polygon", sides: 5, r: 6.5, offset: -Math.PI / 2, flatten: flatten * 0.62 });
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "clifford-attractor",
    name: "Clifford attractor (inspired)",
    generate(flatten) {
      const shapes = [];
      let x = 0.1;
      let z = 0.1;
      const a = -1.4;
      const b = 1.6;
      const c = 1.0;
      const d = 0.7;
      for (let i = 0; i < 800; i++) {
        const nx = Math.sin(a * z) + c * Math.cos(a * x);
        const nz = Math.sin(b * x) + d * Math.cos(b * z);
        const px = x * 4.2;
        const pz = z * 4.2;
        const qx = nx * 4.2;
        const qz = nz * 4.2;
        if (i > 20) shapes.push({ type: "line", x1: px, z1: pz, x2: qx, z2: qz, flatten: flatten * 0.42 });
        x = nx;
        z = nz;
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "calabi-quintic-hint",
    name: "Calabi–Yau quintic hint",
    generate(flatten) {
      const shapes = [];
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        shapes.push({
          type: "arc",
          cx: Math.cos(a) * 0.8,
          cz: Math.sin(a) * 0.8,
          r: 2.8,
          startAngle: a + 0.3,
          endAngle: a + Math.PI - 0.3,
          flatten: flatten * 0.72,
        });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 1.1, flatten: flatten * 0.8 });
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "schwarz-p-slice",
    name: "TPMS Schwarz P slice",
    generate(flatten) {
      const shapes = [];
      const n = 10;
      for (let i = -n; i <= n; i++) {
        for (let j = -n; j <= n; j++) {
          const x = i * 0.85;
          const z = j * 0.85;
          const v = Math.cos(x) + Math.cos(z);
          if (Math.abs(v) < 0.35) shapes.push({ type: "circle", cx: x, cz: z, r: 0.18, flatten: flatten * 0.75 });
        }
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "hat-monotile-outline",
    name: "Aperiodic hat (inspired)",
    generate(flatten) {
      const shapes = [];
      const pts = [
        [0, 0],
        [1.2, 0],
        [1.8, 0.9],
        [1.2, 1.8],
        [0, 1.5],
        [-0.5, 0.75],
      ];
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        shapes.push({
          type: "line",
          x1: pts[i][0] * 2.2,
          z1: pts[i][1] * 2.2 - 1.6,
          x2: pts[j][0] * 2.2,
          z2: pts[j][1] * 2.2 - 1.6,
          flatten: flatten * 0.85,
        });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "crabwood-binary-disc-hint",
    name: "Crabwood face / disc (inspired)",
    generate(flatten) {
      const shapes = [];
      let px = 0;
      let pz = 0;
      for (let s = 0; s < 140; s++) {
        const ang = s * 0.22;
        const rr = 0.35 + ang * 0.16;
        const x = rr * Math.cos(ang);
        const z = rr * Math.sin(ang);
        if (s > 0 && s % 2 === 0) {
          shapes.push({ type: "line", x1: px, z1: pz, x2: x, z2: z, flatten: flatten * 0.72 });
        }
        px = x;
        pz = z;
      }
      for (let j = -4; j <= 4; j++) {
        for (let i = -4; i <= 4; i++) {
          if (i * i + j * j > 18) continue;
          const on = (i + j + (i >> 1)) % 2 === 0;
          if (on) {
            shapes.push({
              type: "circle",
              cx: i * 0.55 - 5.2,
              cz: j * 0.55,
              r: 0.19,
              flatten: flatten * 0.62,
            });
          }
        }
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "human-butterfly-hint",
    name: "Butterfly / Vitruvian (inspired)",
    generate(flatten) {
      const shapes = [];
      for (const sgn of [-1, 1]) {
        for (let k = 0; k < 9; k++) {
          const rRing = 3.4 - k * 0.32;
          const a0 = (k / 9) * Math.PI * 0.92 + 0.08;
          const a1 = ((k + 1) / 9) * Math.PI * 0.92 + 0.08;
          shapes.push({
            type: "arc",
            cx: sgn * 2.2,
            cz: 0,
            r: rRing,
            startAngle: Math.PI / 2 + sgn * a1,
            endAngle: Math.PI / 2 + sgn * a0,
            flatten: flatten * 0.68,
          });
        }
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 0.65, flatten: flatten * 0.88 });
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "cell120-hint",
    name: "120-cell (inspired)",
    generate(flatten) {
      const shapes = [];
      const phi = 1.6180339887;
      for (let k = 1; k <= 6; k++) {
        shapes.push({
          type: "polygon",
          sides: 5,
          r: k * 1.05 * phi,
          offset: -Math.PI / 2,
          flatten: flatten * (0.48 + (k % 2) * 0.12),
        });
      }
      for (let ring = 1; ring <= 4; ring++) {
        const R = ring * 1.72;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          shapes.push({
            type: "circle",
            cx: R * Math.cos(a),
            cz: R * Math.sin(a),
            r: 0.2,
            flatten: flatten * 0.7,
          });
        }
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "cell600-hint",
    name: "600-cell (inspired)",
    generate(flatten) {
      const shapes = [];
      const t = (1 + Math.sqrt(5)) / 2;
      const raw = [
        [0, 1, t],
        [0, -1, t],
        [0, 1, -t],
        [0, -1, -t],
        [1, t, 0],
        [-1, t, 0],
        [1, -t, 0],
        [-1, -t, 0],
        [t, 0, 1],
        [t, 0, -1],
        [-t, 0, 1],
        [-t, 0, -1],
      ];
      const verts = [];
      for (const [x, y, z] of raw) {
        const len = Math.hypot(x, y, z) || 1;
        verts.push([(x / len) * 5.2, (z / len) * 5.2]);
      }
      for (const [x, z] of verts) {
        shapes.push({ type: "circle", cx: x, cz: z, r: 0.32, flatten: flatten * 0.8 });
      }
      for (let i = 0; i < verts.length; i++) {
        for (let j = i + 1; j < verts.length; j++) {
          const d = Math.hypot(verts[i][0] - verts[j][0], verts[i][1] - verts[j][1]);
          if (d < 3.1 && d > 1.75) {
            shapes.push({
              type: "line",
              x1: verts[i][0],
              z1: verts[i][1],
              x2: verts[j][0],
              z2: verts[j][1],
              flatten: flatten * 0.42,
            });
          }
        }
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
  {
    id: "chladni-square-hint",
    name: "Chladni square plate (inspired)",
    generate(flatten) {
      const shapes = [];
      const span = 9;
      const n = 18;
      for (let k = -n; k <= n; k++) {
        const o = (span * k) / n;
        shapes.push({ type: "line", x1: -span, z1: o, x2: span, z2: o, flatten: flatten * 0.52 });
        shapes.push({ type: "line", x1: o, z1: -span, x2: o, z2: span, flatten: flatten * 0.52 });
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.5, flatten: flatten * 0.26 });
      return shapes;
    },
  },
  {
    id: "gray-scott-spots",
    name: "Turing spots (inspired)",
    generate(flatten) {
      const shapes = [];
      const rng = (i, j) => Math.abs(Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1;
      for (let j = -10; j <= 10; j++) {
        for (let i = -10; i <= 10; i++) {
          if (rng(i, j) > 0.72) continue;
          const x = i * 0.82 + (rng(i + 1, j) - 0.5) * 0.2;
          const z = j * 0.82 + (rng(i, j + 2) - 0.5) * 0.2;
          shapes.push({ type: "circle", cx: x, cz: z, r: 0.28, flatten: flatten * 0.78 });
        }
      }
      shapes.push({ type: "circle", cx: 0, cz: 0, r: 8.8, flatten: flatten * 0.2 });
      return shapes;
    },
  },
];

/** crop-catelog.md §1–48 → pattern id (extras follow in FIELD_PATTERNS_CORE). */
const CATALOG_PATTERN_IDS = [
  "milk-hill-galaxy-spiral",
  "julia-spiral-field",
  "triple-julia-c3",
  "koch-snowflake",
  "koch-heptagon-hint",
  "etchilhampton-dense-grid",
  "barbury-pi-spiral",
  "euler-radial-binary",
  "crabwood-binary-disc-hint",
  "chilbolton-grid-dots",
  "magnetic-dipole-lines",
  "human-butterfly-hint",
  "tesseract-schlegel",
  "mayan-sun-wheel",
  "flower-of-life",
  "mandelbrot-cardioid-hint",
  "rubiks-isometric",
  "angel-radiating",
  "picked-hill-pi-mandala",
  "quetzalcoatl-wings",
  "vesica-piscis",
  "seed-of-life",
  "flower-of-life-4-ring",
  "metatron",
  "sri-yantra-lite",
  "sunflower-lattice",
  "tetrahedron-outline",
  "rose-curve-7",
  "maurer-rose",
  "hypotrochoid-deltoid",
  "lissajous-3-4",
  "mandala-12-fold",
  "girih-decagon-hint",
  "hex-lattice-fcc",
  "apollonian-lite",
  "poincare-arcs",
  "cell24-projection",
  "cell120-hint",
  "cell600-hint",
  "chladni-square-hint",
  "gray-scott-spots",
  "penrose-star-hint",
  "moire-offset-rings",
  "torus-knot-3-2",
  "calabi-quintic-hint",
  "clifford-attractor",
  "hat-monotile-outline",
  "schwarz-p-slice",
];

if (CATALOG_PATTERN_IDS.length !== CROP_CATALOG_SECTIONS.length) {
  throw new Error(
    `Catalog pattern count (${CATALOG_PATTERN_IDS.length}) ≠ crop-catelog sections (${CROP_CATALOG_SECTIONS.length})`
  );
}

const _patternById = new Map(ALL_PATTERNS_RAW.map((p) => [p.id, p]));
for (const id of CATALOG_PATTERN_IDS) {
  if (!_patternById.has(id)) {
    throw new Error(`crop-field-patterns.mjs: missing pattern id "${id}"`);
  }
}

const _catalogIdSet = new Set(CATALOG_PATTERN_IDS);

export const FIELD_PATTERNS_CORE = [
  ...CATALOG_PATTERN_IDS.map((id, i) => {
    const p = _patternById.get(id);
    return {
      id: p.id,
      catalogNumber: i + 1,
      name: `${i + 1}. ${CROP_CATALOG_SECTIONS[i].title}`,
      generate: p.generate,
    };
  }),
  ...ALL_PATTERNS_RAW.filter((p) => !_catalogIdSet.has(p.id)),
];

export const ICON_GENERIC = `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="0.75"><circle cx="18" cy="18" r="12"/><path d="M18 8v20M8 18h20"/></svg>`;

/** Optional per-id metadata for field.html readout panel */
export const FIELD_PREVIEW_META = {
  "flower-of-life": {
    symmetry: "D6",
    frequencyHz: 174,
    chladniMode: "(3, 5)",
    icon: `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="0.6"><circle cx="18" cy="18" r="6"/><circle cx="18" cy="12" r="6"/><circle cx="18" cy="24" r="6"/><circle cx="23.2" cy="15" r="6"/><circle cx="23.2" cy="21" r="6"/><circle cx="12.8" cy="15" r="6"/><circle cx="12.8" cy="21" r="6"/></svg>`,
  },
  "seed-of-life": {
    symmetry: "D6",
    frequencyHz: 396,
    chladniMode: "(4, 6)",
    icon: `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="0.7"><circle cx="18" cy="18" r="7"/><circle cx="18" cy="11" r="7"/><circle cx="18" cy="25" r="7"/><circle cx="24" cy="14.5" r="7"/><circle cx="24" cy="21.5" r="7"/><circle cx="12" cy="14.5" r="7"/><circle cx="12" cy="21.5" r="7"/></svg>`,
  },
  "hexagram": {
    symmetry: "D6",
    frequencyHz: 528,
    chladniMode: "(5, 7)",
    icon: `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="0.7"><polygon points="18,4 28,22 8,22"/><polygon points="18,32 8,14 28,14"/><circle cx="18" cy="18" r="12"/></svg>`,
  },
  "fibonacci-spiral": {
    symmetry: "C1",
    frequencyHz: 639,
    chladniMode: "(6, 8)",
    icon: `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="0.7"><path d="M18 18 Q18 10 26 10 Q34 10 34 18 Q34 30 22 34 Q10 38 6 26 Q2 14 14 6 Q22 1 30 6"/><circle cx="18" cy="18" r="14"/></svg>`,
  },
  "vesica-piscis": {
    symmetry: "D2",
    frequencyHz: 852,
    chladniMode: "(8, 10)",
    icon: `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="0.7"><circle cx="14" cy="18" r="10"/><circle cx="22" cy="18" r="10"/></svg>`,
  },
  "metatron": {
    symmetry: "D6",
    frequencyHz: 963,
    chladniMode: "(9, 11)",
    icon: `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="0.5"><circle cx="18" cy="18" r="2"/><circle cx="18" cy="10" r="2"/><circle cx="18" cy="26" r="2"/><circle cx="24.9" cy="14" r="2"/><circle cx="24.9" cy="22" r="2"/><circle cx="11.1" cy="14" r="2"/><circle cx="11.1" cy="22" r="2"/><circle cx="18" cy="4" r="2"/><circle cx="18" cy="32" r="2"/><circle cx="30.1" cy="11" r="2"/><circle cx="30.1" cy="25" r="2"/><circle cx="5.9" cy="11" r="2"/><circle cx="5.9" cy="25" r="2"/></svg>`,
  },
};

const _freqCycle = [174, 285, 396, 417, 528, 639, 741, 852, 963, 432];
const _modeCycle = ["(1,2)", "(2,3)", "(3,4)", "(3,5)", "(4,5)", "(5,6)", "(2,7)", "(4,9)", "(6,7)", "(8,9)"];

function hashId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getFieldPreviewPatterns() {
  return FIELD_PATTERNS_CORE.map((p) => {
    const extra = FIELD_PREVIEW_META[p.id];
    if (extra) return { ...p, ...extra };
    const h = hashId(p.id);
    return {
      ...p,
      symmetry: "C1",
      frequencyHz: _freqCycle[h % _freqCycle.length],
      chladniMode: _modeCycle[h % _modeCycle.length],
      icon: ICON_GENERIC,
    };
  });
}

/** Chladni (n,m) presets aligned with crop-catelog.md §40 nodal reference */
export const CHLADNI_CATALOG_PRESETS = [
  { id: "mode-1-2", name: "Mode (1, 2)", n: 1, m: 2 },
  { id: "mode-2-3", name: "Mode (2, 3)", n: 2, m: 3 },
  { id: "mode-3-4", name: "Mode (3, 4)", n: 3, m: 4 },
  { id: "mode-3-5", name: "Mode (3, 5)", n: 3, m: 5 },
  { id: "mode-4-5", name: "Mode (4, 5)", n: 4, m: 5 },
  { id: "mode-5-6", name: "Mode (5, 6)", n: 5, m: 6 },
  { id: "mode-2-7", name: "Mode (2, 7)", n: 2, m: 7 },
  { id: "mode-4-9", name: "Mode (4, 9)", n: 4, m: 9 },
  { id: "mode-6-7", name: "Mode (6, 7)", n: 6, m: 7 },
  { id: "mode-8-9", name: "Mode (8, 9)", n: 8, m: 9 },
];
