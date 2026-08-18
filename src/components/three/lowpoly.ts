// ============================================================================
// MageBorne Duelists — Low-poly kit
// ============================================================================
// The shared geometry vocabulary for every R3F scene: faceted vertex-colour
// painting, primitive transform helpers, and the beveled column that both the
// hex tiles and the duelling dais are cut from.
//
// Presentation only. No game state, no store access.
// ============================================================================

import * as THREE from 'three';

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const clamp01 = (v: number) => THREE.MathUtils.clamp(v, 0, 1);

/**
 * Convert to non-indexed geometry and add a per-face jittered vertex color.
 * Faceted color variation is what keeps flat-shaded low-poly from looking
 * like colored plastic.
 */
export function paintGeometry(
  src: THREE.BufferGeometry,
  color: THREE.Color,
  jitter: number,
  rng: () => number,
): THREE.BufferGeometry {
  const g = src.index ? src.toNonIndexed() : src;
  if (g !== src) src.dispose();
  const count = g.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 3) {
    const o = (rng() - 0.5) * 2 * jitter;
    const r = clamp01(color.r + o);
    const gr = clamp01(color.g + o);
    const b = clamp01(color.b + o);
    for (let j = i; j < Math.min(i + 3, count); j++) {
      colors[j * 3] = r;
      colors[j * 3 + 1] = gr;
      colors[j * 3 + 2] = b;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

export interface PartOpts {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  s?: number;
  sy?: number;
  jitter?: number;
}

/** Paint + transform a primitive so it can be merged into one mesh. */
export function part(
  geom: THREE.BufferGeometry,
  color: string,
  rng: () => number,
  o: PartOpts = {},
): THREE.BufferGeometry {
  const g = paintGeometry(geom, new THREE.Color(color), o.jitter ?? 0.05, rng);
  const s = o.s ?? 1;
  g.scale(s, o.sy ?? s, s);
  if (o.rx) g.rotateX(o.rx);
  if (o.rz) g.rotateZ(o.rz);
  if (o.ry) g.rotateY(o.ry);
  g.translate(o.x ?? 0, o.y ?? 0, o.z ?? 0);
  return g;
}

/**
 * An n-sided column with a beveled top plateau and per-facet colour variation.
 * Hex tiles are the 6-sided case; the duelling dais is the 9-sided one.
 * Emits position + colour only (no UVs) — do not merge with primitive parts.
 */
export function beveledColumn(
  radius: number,
  height: number,
  sides: number,
  thetaOffset: number,
  topColor: string,
  sideColor: string,
  rng: () => number,
): THREE.BufferGeometry {
  const top = new THREE.Color(topColor);
  const side = new THREE.Color(sideColor);
  const bevelCol = top.clone().lerp(new THREE.Color('#ffffff'), 0.12);
  const bevelH = Math.min(0.05, height * 0.22);
  const inset = radius * 0.12;
  const rimY = height - bevelH;

  const corners: Array<[number, number]> = [];
  for (let i = 0; i < sides; i++) {
    const a = ((Math.PI * 2) / sides) * i + thetaOffset;
    corners.push([Math.cos(a), Math.sin(a)]);
  }

  const positions: number[] = [];
  const colors: number[] = [];

  const pushTri = (
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
    col: THREE.Color,
    offset: number,
  ) => {
    positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    const r = clamp01(col.r + offset);
    const g = clamp01(col.g + offset);
    const b = clamp01(col.b + offset);
    for (let k = 0; k < 3; k++) colors.push(r, g, b);
  };

  for (let i = 0; i < sides; i++) {
    const [x0, z0] = corners[i];
    const [x1, z1] = corners[(i + 1) % sides];
    const oR = radius;
    const iR = radius - inset;

    // side wall — one shared shade per facet
    const so = (rng() - 0.5) * 0.1;
    pushTri(x0 * oR, 0, z0 * oR, x0 * oR, rimY, z0 * oR, x1 * oR, rimY, z1 * oR, side, so);
    pushTri(x0 * oR, 0, z0 * oR, x1 * oR, rimY, z1 * oR, x1 * oR, 0, z1 * oR, side, so);

    // bevel between rim and top plateau — slightly lighter edge highlight
    const bo = (rng() - 0.5) * 0.08;
    pushTri(x0 * oR, rimY, z0 * oR, x0 * iR, height, z0 * iR, x1 * iR, height, z1 * iR, bevelCol, bo);
    pushTri(x0 * oR, rimY, z0 * oR, x1 * iR, height, z1 * iR, x1 * oR, rimY, z1 * oR, bevelCol, bo);

    // top plateau fan
    pushTri(0, height, 0, x1 * iR, height, z1 * iR, x0 * iR, height, z0 * iR, top, (rng() - 0.5) * 0.07);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geom.computeVertexNormals();
  return geom;
}

/**
 * A vertex-coloured gradient sky dome. `stops` run bottom → top and are
 * sampled on the sphere's normalised Y.
 */
export function makeSkyGeometry(
  radius: number,
  below: string,
  horizon: string,
  zenith: string,
): THREE.BufferGeometry {
  const geom = new THREE.SphereGeometry(radius, 24, 16);
  const pos = geom.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cZenith = new THREE.Color(zenith);
  const cHorizon = new THREE.Color(horizon);
  const cBelow = new THREE.Color(below);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / radius; // -1..1
    if (t < 0) {
      c.copy(cHorizon).lerp(cBelow, Math.min(1, -t * 2));
    } else {
      c.copy(cHorizon).lerp(cZenith, Math.pow(t, 0.65));
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geom;
}
