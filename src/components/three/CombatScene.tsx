// ============================================================================
// MageBorne Duelists — The Duelling Ground (3D combat stage)
// ============================================================================
// A fixed-camera, side-on battle stage in the style of the hex map: faceted
// low-poly, flat shading, warm light rig. Two combatants stand on a sunlit
// dais at a distance set by the range band; spells fly between them as
// element-coloured projectiles that burst on impact.
//
// Presentation only. The scene is driven entirely by props derived from
// CombatState — it never reads the store and never touches combat logic.
//
// Budget: ~50 meshes. All static geometry is built once and memoised; the
// animation loop allocates nothing (every vector/colour is preallocated).
// ============================================================================

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../../game/worldgen/worldgen';
import { beveledColumn, clamp01, makeSkyGeometry, part } from './lowpoly';
import { MONSTERS } from '../../data/monsters';
import { RIVALS } from '../../data/rivals';
import type { CombatParticipant, Condition, ConditionType, ElementalMastery } from '../../types';

// ---------------------------------------------------------------------------
// Public shape — what the panel hands down
// ---------------------------------------------------------------------------

export type VfxElement =
  | 'fire' | 'water' | 'wind' | 'earth'
  | 'lightning' | 'magma' | 'steam' | 'storm'
  | 'arcane';

export type FigureKind = 'wizard' | 'brute' | 'giant' | 'wraith';
export type Side = 'left' | 'right';

export type WizardVariant = 'classic' | 'angular' | 'hooded' | 'broad' | 'slim' | 'pauldron';

export interface FigureSpec {
  kind: FigureKind;
  element: VfxElement;
  variant?: WizardVariant;
}

export interface SceneFighter {
  id: string;
  side: Side;
  figure: FigureSpec;
  conditions: Condition[];
  defeated: boolean;
  victorious: boolean;
}

/** One thing that happened on the timeline, translated into a visual. */
export interface VfxCue {
  from: Side;
  element: VfxElement;
  kind: 'attack' | 'guard' | 'support' | 'move';
}

/** Everything the scene needs to replay the round that just resolved. */
export interface RoundVfx {
  runId: number;
  cues: VfxCue[];
  damage: Record<Side, number>;
  blocked: Record<Side, boolean>;
  downed: Side | null;
}

export interface CombatSceneProps {
  left: SceneFighter;
  right: SceneFighter;
  /** 0 = engaged, 1 = near, 2 = far. */
  gap: number;
  vfx: RoundVfx | null;
}

// ---------------------------------------------------------------------------
// Figures per combatant — read off the monster / rival catalogs
// ---------------------------------------------------------------------------

const PLAYER_FIGURE: FigureSpec = { kind: 'wizard', element: 'arcane' };

const MONSTER_FIGURE: Record<string, FigureSpec> = {
  ash_troll: { kind: 'brute', element: 'fire' },
  hill_giant: { kind: 'giant', element: 'earth' },
  storm_wraith: { kind: 'wraith', element: 'storm' },
};

const MASTERY_ORDER: Array<keyof ElementalMastery> = ['fire', 'water', 'wind', 'earth'];

function dominantElement(mastery: ElementalMastery): VfxElement {
  let best: keyof ElementalMastery = 'fire';
  for (const el of MASTERY_ORDER) {
    if (mastery[el] > mastery[best]) best = el;
  }
  return mastery[best] > 0 ? best : 'arcane';
}

const RIVAL_VARIANT: Record<string, WizardVariant> = {
  rival_vex: 'angular',
  rival_mira: 'hooded',
  rival_goran: 'broad',
  rival_zephyr: 'slim',
  rival_cinder: 'pauldron',
};

/** Which low-poly figure stands in for this combatant. */
export function deriveFigure(p: CombatParticipant, isPlayerSide: boolean): FigureSpec {
  if (isPlayerSide) return PLAYER_FIGURE;

  const monster = MONSTERS.find((m) => m.name === p.name);
  if (monster && MONSTER_FIGURE[monster.id]) return MONSTER_FIGURE[monster.id];

  const rival = RIVALS.find((r) => r.mage.id === p.id);
  if (rival) return { kind: 'wizard', element: dominantElement(rival.mage.mastery), variant: RIVAL_VARIANT[rival.mage.id] };

  return { kind: 'wizard', element: 'arcane' };
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const SKY_ZENITH = '#c8b7dc';   // lilac crown
const SKY_HORIZON = '#fbe3bd';  // warm cream
const SKY_BELOW = '#e3caa1';    // sunlit dust
const FOG_COLOR = '#f2ddbc';

const SKIN = '#f2cfae';
const WOOD_STAFF = '#6b4a32';

interface RobePalette {
  robe: string;
  robeDark: string;
  trim: string;
  orb: string;
}

const ROBES: Record<VfxElement, RobePalette> = {
  fire: { robe: '#b03a2a', robeDark: '#7c2418', trim: '#e0b24a', orb: '#ff8a3c' },
  water: { robe: '#2e6f8e', robeDark: '#1d4a61', trim: '#bcd9e6', orb: '#57c8f5' },
  wind: { robe: '#4a9ebf', robeDark: '#2c6c86', trim: '#e6f4f8', orb: '#b9f0ff' },
  earth: { robe: '#7a5c2e', robeDark: '#523c1c', trim: '#c8b183', orb: '#e3c07a' },
  magma: { robe: '#a8511e', robeDark: '#743310', trim: '#e0b24a', orb: '#ff9a4c' },
  lightning: { robe: '#c08a1e', robeDark: '#8a5f0d', trim: '#f2e7c9', orb: '#ffe066' },
  steam: { robe: '#7c8b90', robeDark: '#54606a', trim: '#e2e7e7', orb: '#dff0f2' },
  storm: { robe: '#5a5f9e', robeDark: '#3a3d70', trim: '#d6d6ef', orb: '#a3a8ff' },
  arcane: { robe: '#6d28d9', robeDark: '#4c1d95', trim: '#c4b5fd', orb: '#67e8f9' },
};

type ProjShape = 'bolt' | 'blob' | 'swirl' | 'shards';

interface ElementVfx {
  core: THREE.Color;
  glow: THREE.Color;
  shape: ProjShape;
  arc: number;
}

const EL_VFX: Record<VfxElement, ElementVfx> = {
  fire: { core: new THREE.Color('#ffd08a'), glow: new THREE.Color('#ff6a12'), shape: 'bolt', arc: 0.35 },
  magma: { core: new THREE.Color('#ffb07a'), glow: new THREE.Color('#e2551e'), shape: 'shards', arc: 0.8 },
  lightning: { core: new THREE.Color('#fff6c8'), glow: new THREE.Color('#ffd23f'), shape: 'bolt', arc: 0.1 },
  water: { core: new THREE.Color('#dff0ff'), glow: new THREE.Color('#3fa0e8'), shape: 'blob', arc: 0.95 },
  storm: { core: new THREE.Color('#e6e3ff'), glow: new THREE.Color('#6f74c8'), shape: 'blob', arc: 0.7 },
  wind: { core: new THREE.Color('#f4fdff'), glow: new THREE.Color('#8fd6ec'), shape: 'swirl', arc: 0.45 },
  steam: { core: new THREE.Color('#f6fafa'), glow: new THREE.Color('#b3c4c9'), shape: 'swirl', arc: 0.55 },
  earth: { core: new THREE.Color('#e0c391'), glow: new THREE.Color('#8a6a3a'), shape: 'shards', arc: 0.85 },
  arcane: { core: new THREE.Color('#efe4ff'), glow: new THREE.Color('#9d7ff0'), shape: 'bolt', arc: 0.4 },
};

// ---------------------------------------------------------------------------
// Shared materials — one instance for the whole stage
// ---------------------------------------------------------------------------

const STAGE_MATERIAL = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 0.9,
  metalness: 0.02,
});

const FLAME_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#ffb347',
  emissive: '#ff6a12',
  emissiveIntensity: 2.4,
  flatShading: true,
  roughness: 0.4,
});

// ---------------------------------------------------------------------------
// Projectile / burst geometry — built once, shared by every slot
// ---------------------------------------------------------------------------

// Every shape points down +Z so a single lookAt() aims it along its flight.
const PROJ_GEOM: Record<ProjShape, THREE.BufferGeometry> = {
  bolt: (() => {
    const g = new THREE.OctahedronGeometry(0.17, 0);
    g.scale(0.6, 0.6, 2.4);
    return g;
  })(),
  blob: (() => {
    const g = new THREE.IcosahedronGeometry(0.22, 0);
    g.scale(0.85, 0.85, 1.25);
    return g;
  })(),
  swirl: new THREE.TorusGeometry(0.2, 0.07, 4, 9),
  shards: (() => {
    const bits: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const g = flat(new THREE.TetrahedronGeometry(0.13, 0));
      g.rotateY(a);
      g.translate(Math.cos(a) * 0.11, Math.sin(a) * 0.09, Math.sin(a) * 0.08);
      bits.push(g);
    }
    return mergeGeometries(bits);
  })(),
};

const GLOW_GEOM = new THREE.SphereGeometry(0.28, 8, 6);

/** A star of outward-pointing shards — the impact burst. */
const BURST_GEOM = (() => {
  const bits: THREE.BufferGeometry[] = [];
  const rng = mulberry32(77113);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const tilt = (rng() - 0.5) * 1.1;
    const g = flat(new THREE.TetrahedronGeometry(0.14 + rng() * 0.07, 0));
    g.rotateZ(tilt);
    g.rotateY(a);
    g.translate(Math.cos(a) * 0.3, Math.sin(tilt) * 0.28, Math.sin(a) * 0.3);
    bits.push(g);
  }
  return mergeGeometries(bits);
})();

const SHELL_GEOM = new THREE.SphereGeometry(0.92, 10, 8);
const CRACK_GEOM = new THREE.IcosahedronGeometry(0.82, 0);
const DROP_GEOM = new THREE.SphereGeometry(0.07, 6, 4);
const FLAME_GEOM = new THREE.ConeGeometry(0.12, 0.34, 5);

const BOUND_GEOM = (() => {
  const rng = mulberry32(4242);
  const bits: THREE.BufferGeometry[] = [];
  const ring = new THREE.TorusGeometry(0.52, 0.07, 4, 12);
  ring.rotateX(-Math.PI / 2);
  bits.push(part(ring, '#6b5330', rng, { jitter: 0.05 }));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    bits.push(
      part(new THREE.TetrahedronGeometry(0.13, 0), '#7a5c2e', rng, {
        x: Math.cos(a) * 0.52,
        z: Math.sin(a) * 0.52,
        y: 0.05,
        ry: a,
        jitter: 0.06,
      }),
    );
  }
  return mergeGeometries(bits);
})();

// ---------------------------------------------------------------------------
// Combatant figures
// ---------------------------------------------------------------------------

/**
 * mergeGeometries refuses to mix indexed and non-indexed inputs, and the
 * primitives differ — everything headed for a merge goes through here first.
 */
function flat(g: THREE.BufferGeometry): THREE.BufferGeometry {
  if (!g.index) return g;
  const out = g.toNonIndexed();
  g.dispose();
  return out;
}

interface FigureBuild {
  body: THREE.BufferGeometry;
  glow: THREE.BufferGeometry | null;
  glowColor: string;
  glowEmissive: string;
  /** crown of the head — where status chips stack */
  height: number;
  /** where projectiles are thrown from and aimed at */
  chest: number;
  /** hover height above the dais */
  float: number;
  bob: number;
}

function buildWizard(pal: RobePalette, rng: () => number, variant: WizardVariant = 'classic'): FigureBuild {
  const parts: THREE.BufferGeometry[] = [
    // robe
    part(new THREE.ConeGeometry(0.42, 0.95, 7), pal.robe, rng, { y: 0.47 }),
    // shoulder shawl
    part(new THREE.ConeGeometry(0.44, 0.26, 7), pal.robeDark, rng, { y: 0.85 }),
    // sash
    part(new THREE.CylinderGeometry(0.3, 0.33, 0.07, 7), pal.trim, rng, { y: 0.6, jitter: 0.03 }),
    // head
    part(new THREE.SphereGeometry(0.16, 7, 5), SKIN, rng, { y: 1.0, jitter: 0.03 }),
  ];

  let staffLen = 1.7;
  let staffTilt = -0.12;
  let hatY = 1.44;
  let hatTilt = -0.1;

  switch (variant) {
    case 'angular': {
      // Vex: sharp 4-sided hat, high collar
      parts.push(part(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 4), pal.robeDark, rng, { y: 1.13, ry: Math.PI / 4 }));
      parts.push(part(new THREE.ConeGeometry(0.27, 0.72, 4), pal.robe, rng, { y: 1.5, ry: Math.PI / 4, rz: -0.16 }));
      parts.push(part(new THREE.ConeGeometry(0.2, 0.34, 4), pal.robeDark, rng, { y: 0.98, x: -0.12, rz: 0.3 }));
      hatY = 0; hatTilt = 0; // hat already placed
      break;
    }
    case 'hooded': {
      // Mira: hood instead of hat, flowing hem layer
      parts.push(part(new THREE.SphereGeometry(0.21, 7, 5), pal.robeDark, rng, { y: 1.02, z: -0.02, jitter: 0.03 }));
      parts.push(part(new THREE.ConeGeometry(0.24, 0.4, 7), pal.robeDark, rng, { y: 1.22, jitter: 0.04 }));
      parts.push(part(new THREE.ConeGeometry(0.46, 0.4, 7), pal.robe, rng, { y: 0.22, jitter: 0.05 }));
      hatY = 0; hatTilt = 0;
      break;
    }
    case 'broad': {
      // Goran: wide low hat, stone-club staff
      parts.push(part(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 7), pal.robeDark, rng, { y: 1.12 }));
      parts.push(part(new THREE.ConeGeometry(0.28, 0.42, 7), pal.robe, rng, { y: 1.36, rz: -0.06 }));
      staffTilt = 0.1;
      break;
    }
    case 'slim': {
      // Zephyr: small tilted cap + streamers
      parts.push(part(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 7), pal.robeDark, rng, { y: 1.11 }));
      parts.push(part(new THREE.ConeGeometry(0.16, 0.34, 7), pal.robe, rng, { y: 1.3, rz: -0.3 }));
      for (let i = 0; i < 3; i++) {
        parts.push(part(new THREE.ConeGeometry(0.05, 0.55 + rng() * 0.2, 4), pal.trim, rng, {
          x: -0.28 - rng() * 0.1, y: 1.0 + rng() * 0.25, rz: 0.7 + rng() * 0.3, jitter: 0.03,
        }));
      }
      hatY = 0; hatTilt = 0;
      break;
    }
    case 'pauldron': {
      // Cinder: asymmetrical shoulder pauldron, spiked
      parts.push(part(new THREE.IcosahedronGeometry(0.26, 0), pal.robeDark, rng, { z: -0.4, y: 1.12, jitter: 0.06 }));
      parts.push(part(new THREE.ConeGeometry(0.07, 0.22, 4), pal.trim, rng, { z: -0.42, y: 1.32, rz: 0.4, jitter: 0.03 }));
      parts.push(part(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 7), pal.robeDark, rng, { y: 1.13 }));
      parts.push(part(new THREE.ConeGeometry(0.25, 0.6, 7), pal.robe, rng, { y: 1.44, rz: -0.1 }));
      break;
    }
    default: {
      // classic: brim + askew cone + band
      parts.push(part(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 7), pal.robeDark, rng, { y: 1.13 }));
      parts.push(part(new THREE.ConeGeometry(0.25, 0.6, 7), pal.robe, rng, { y: hatY, rz: hatTilt }));
      parts.push(part(new THREE.CylinderGeometry(0.23, 0.25, 0.06, 7), pal.trim, rng, { y: 1.18, jitter: 0.03 }));
      hatY = 0; hatTilt = 0;
    }
  }

  if (variant === 'classic') {
    // staff toward the opponent
    parts.push(part(new THREE.CylinderGeometry(0.045, 0.055, staffLen, 6), WOOD_STAFF, rng, { x: 0.44, y: 0.85, rz: staffTilt }));
  } else if (variant === 'broad') {
    // stone club: thicker shaft + head
    parts.push(part(new THREE.CylinderGeometry(0.07, 0.09, 1.5, 6), WOOD_STAFF, rng, { x: 0.46, y: 0.8, rz: staffTilt }));
    parts.push(part(new THREE.IcosahedronGeometry(0.18, 0), '#9a8a70', rng, { x: 0.58, y: 1.45, jitter: 0.05 }));
  } else {
    parts.push(part(new THREE.CylinderGeometry(0.045, 0.055, staffLen, 6), WOOD_STAFF, rng, { x: 0.44, y: 0.85, rz: staffTilt }));
  }

  const orb = new THREE.SphereGeometry(0.12, 8, 6);
  const orbY = variant === 'broad' ? 1.62 : 1.7;
  orb.translate(0.545, orbY, 0);

  const height = variant === 'broad' ? 1.85 : variant === 'angular' ? 1.9 : 1.78;

  return {
    body: mergeGeometries(parts),
    glow: orb,
    glowColor: pal.orb,
    glowEmissive: pal.orb,
    height,
    chest: 0.88,
    float: 0,
    bob: 0.035,
  };
}

interface BrutePalette {
  skin: string;
  dark: string;
  accent: string;
  emberColor: string;
  scale: number;
  boulder: boolean;
}

function buildBrute(o: BrutePalette, rng: () => number): FigureBuild {
  const s = o.scale;
  const parts: THREE.BufferGeometry[] = [];

  // legs + feet
  for (const z of [-0.22, 0.22]) {
    parts.push(part(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 6), o.dark, rng, { z, y: 0.25 }));
    parts.push(part(new THREE.IcosahedronGeometry(0.18, 0), o.dark, rng, { z, x: 0.06, y: 0.08, sy: 0.6 }));
  }
  // hips + torso, hunched forward
  parts.push(part(new THREE.IcosahedronGeometry(0.36, 0), o.skin, rng, { y: 0.58, sy: 0.8 }));
  parts.push(part(new THREE.IcosahedronGeometry(0.54, 0), o.skin, rng, { y: 0.98, x: 0.04, sy: 0.92, jitter: 0.07 }));
  // shoulders
  for (const z of [-0.42, 0.42]) {
    parts.push(part(new THREE.IcosahedronGeometry(0.24, 0), o.skin, rng, { z, y: 1.14, jitter: 0.07 }));
    // long knuckle-dragging arms
    parts.push(part(new THREE.CylinderGeometry(0.12, 0.16, 0.86, 6), o.dark, rng, { z: z * 1.06, y: 0.72, rz: -0.1 }));
    parts.push(part(new THREE.IcosahedronGeometry(0.19, 0), o.dark, rng, { z: z * 1.1, x: 0.09, y: 0.3, jitter: 0.07 }));
  }
  // head, jutting forward
  parts.push(part(new THREE.SphereGeometry(0.23, 7, 5), o.skin, rng, { y: 1.32, x: 0.12, jitter: 0.05 }));
  parts.push(part(new THREE.BoxGeometry(0.26, 0.09, 0.36), o.dark, rng, { y: 1.37, x: 0.2 }));
  // tusks
  for (const z of [-0.09, 0.09]) {
    parts.push(part(new THREE.ConeGeometry(0.045, 0.16, 4), '#e8e0c8', rng, { z, x: 0.24, y: 1.28, jitter: 0.02 }));
  }
  // spine ridge
  for (let i = 0; i < 3; i++) {
    parts.push(
      part(new THREE.ConeGeometry(0.1 - i * 0.015, 0.22, 4), o.accent, rng, {
        x: -0.32 + i * 0.03,
        y: 1.16 - i * 0.22,
        rz: 0.5,
        jitter: 0.06,
      }),
    );
  }
  // loincloth
  parts.push(part(new THREE.ConeGeometry(0.4, 0.3, 6), o.accent, rng, { y: 0.5, jitter: 0.05 }));

  if (o.boulder) {
    parts.push(part(new THREE.IcosahedronGeometry(0.3, 0), '#8d7a6a', rng, { z: 0.46, x: 0.16, y: 0.24, jitter: 0.07 }));
  }

  // ember cracks / glowing eyes
  const glowBits: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const g = flat(new THREE.TetrahedronGeometry(0.08, 0));
    g.translate(0.22 + (rng() - 0.5) * 0.16, 0.85 + i * 0.16, (rng() - 0.5) * 0.5);
    glowBits.push(g);
  }
  for (const z of [-0.1, 0.1]) {
    const eye = flat(new THREE.SphereGeometry(0.05, 6, 4));
    eye.translate(0.3, 1.35, z);
    glowBits.push(eye);
  }

  const body = mergeGeometries(parts);
  body.scale(s, s, s);
  const glow = mergeGeometries(glowBits);
  glow.scale(s, s, s);

  return {
    body,
    glow,
    glowColor: o.emberColor,
    glowEmissive: o.emberColor,
    height: 1.6 * s,
    chest: 1.0 * s,
    float: 0,
    bob: 0.03,
  };
}

function buildWraith(rng: () => number): FigureBuild {
  const parts: THREE.BufferGeometry[] = [
    // cowl
    part(new THREE.ConeGeometry(0.44, 0.82, 7), '#5c6478', rng, { y: 1.12, jitter: 0.07 }),
    // hollow beneath the hood
    part(new THREE.SphereGeometry(0.25, 6, 5), '#252a38', rng, { y: 1.0, x: 0.06, jitter: 0.03 }),
    // mantle
    part(new THREE.ConeGeometry(0.52, 0.28, 7), '#4a5265', rng, { y: 0.92, jitter: 0.06 }),
  ];
  // tattered hem — shreds hanging from the mantle
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rng() * 0.4;
    const d = 0.14 + rng() * 0.26;
    const len = 0.5 + rng() * 0.5;
    parts.push(
      part(new THREE.ConeGeometry(0.12 + rng() * 0.05, len, 4), i % 2 ? '#4a5265' : '#3f4657', rng, {
        x: Math.cos(a) * d,
        z: Math.sin(a) * d,
        y: 0.86 - len / 2,
        rx: Math.PI,
        rz: (rng() - 0.5) * 0.4,
        jitter: 0.07,
      }),
    );
  }
  // reaching arms
  for (const z of [-0.34, 0.34]) {
    parts.push(
      part(new THREE.ConeGeometry(0.09, 0.6, 4), '#4a5265', rng, {
        z,
        x: 0.18,
        y: 0.78,
        rx: Math.PI,
        rz: -0.45,
        jitter: 0.05,
      }),
    );
  }

  const glowBits: THREE.BufferGeometry[] = [];
  for (const z of [-0.1, 0.1]) {
    const eye = flat(new THREE.SphereGeometry(0.055, 6, 4));
    eye.translate(0.24, 1.06, z);
    glowBits.push(eye);
  }

  return {
    body: mergeGeometries(parts),
    glow: mergeGeometries(glowBits),
    glowColor: '#cfeaff',
    glowEmissive: '#6fd0ff',
    height: 1.62,
    chest: 0.98,
    float: 0.42,
    bob: 0.11,
  };
}

function buildFigure(spec: FigureSpec): FigureBuild {
  const rng = mulberry32(spec.kind.length * 7919 + spec.element.length * 104729 + (spec.variant?.length ?? 0) * 31 + 13);
  switch (spec.kind) {
    case 'brute':
      return buildBrute(
        { skin: '#8d857a', dark: '#6d665c', accent: '#a2653f', emberColor: '#ff7a2a', scale: 1, boulder: false },
        rng,
      );
    case 'giant':
      return buildBrute(
        { skin: '#a49a76', dark: '#7d7458', accent: '#6f7c46', emberColor: '#ffd489', scale: 1.34, boulder: true },
        rng,
      );
    case 'wraith':
      return buildWraith(rng);
    default:
      return buildWizard(ROBES[spec.element] ?? ROBES.arcane, rng, spec.variant ?? 'classic');
  }
}

// ---------------------------------------------------------------------------
// Stage — dais, ground, props, braziers
// ---------------------------------------------------------------------------

// Set in the two corners the duelling axis leaves empty
const BRAZIERS: Array<[number, number]> = [
  [1.85, 2.25],
  [-2.15, -2.35],
];

interface StageBuild {
  dais: THREE.BufferGeometry;
  ground: THREE.BufferGeometry;
  props: THREE.BufferGeometry;
}

function buildStage(): StageBuild {
  const rng = mulberry32(20260818);

  const dais = beveledColumn(3.35, 0.3, 9, 0.17, '#cbb68f', '#a08a63', rng);

  const ground = part(new THREE.CircleGeometry(38, 9), '#bda67c', rng, {
    rx: -Math.PI / 2,
    y: -0.02,
    jitter: 0.055,
  });

  const props: THREE.BufferGeometry[] = [];

  // hills on the skyline, half-dissolved in the morning haze
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.15 + (i / 7) * Math.PI * 1.7;
    const d = 14 + rng() * 6;
    const h = 2.6 + rng() * 2.8;
    props.push(
      part(new THREE.ConeGeometry(h * (1.5 + rng() * 0.7), h, 5), i % 2 ? '#9b96b6' : '#8a89a8', rng, {
        x: Math.cos(a) * d,
        z: Math.sin(a) * d,
        y: h / 2 - 0.4,
        ry: rng() * Math.PI,
        jitter: 0.05,
      }),
    );
  }

  // standing stones ringing the ground
  const stonePos: Array<[number, number, number]> = [
    [-5.6, -4.4, 2.4],
    [-2.4, -5.8, 1.7],
    [2.9, -5.6, 2.0],
    [5.9, -3.9, 1.5],
    [-7.0, -0.6, 1.2],
    [6.8, 0.4, 1.35],
    [-4.4, 3.6, 1.6],
  ];
  for (const [x, z, h] of stonePos) {
    props.push(
      part(new THREE.CylinderGeometry(0.3, 0.42, h, 5), '#a89a86', rng, {
        x,
        z,
        y: h / 2,
        rz: (rng() - 0.5) * 0.18,
        ry: rng() * Math.PI,
        jitter: 0.06,
      }),
    );
    props.push(
      part(new THREE.IcosahedronGeometry(0.34, 0), '#8d8172', rng, { x: x + 0.5, z: z + 0.4, y: 0.14, sy: 0.6 }),
    );
  }

  // rim kerb stones around the dais
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + 0.24;
    props.push(
      part(new THREE.BoxGeometry(0.4, 0.2, 0.28), '#b09a72', rng, {
        x: Math.cos(a) * 3.3,
        z: Math.sin(a) * 3.3,
        y: 0.28,
        ry: a,
        jitter: 0.05,
      }),
    );
  }

  // grass tufts off the dais
  for (let i = 0; i < 16; i++) {
    const a = rng() * Math.PI * 2;
    const d = 3.9 + rng() * 6;
    props.push(
      part(new THREE.ConeGeometry(0.16 + rng() * 0.08, 0.3 + rng() * 0.24, 4), rng() > 0.5 ? '#8f9a52' : '#7d8b46', rng, {
        x: Math.cos(a) * d,
        z: Math.sin(a) * d,
        y: 0.14,
        ry: rng() * Math.PI,
        jitter: 0.07,
      }),
    );
  }

  // brazier stands
  for (const [x, z] of BRAZIERS) {
    props.push(part(new THREE.CylinderGeometry(0.1, 0.16, 0.9, 5), '#5f5348', rng, { x, z, y: 0.75 }));
    props.push(part(new THREE.CylinderGeometry(0.32, 0.19, 0.26, 6), '#7a6a55', rng, { x, z, y: 1.3, jitter: 0.05 }));
    props.push(part(new THREE.IcosahedronGeometry(0.26, 0), '#6b5f52', rng, { x, z, y: 0.32, sy: 0.5 }));
  }

  return { dais, ground, props: mergeGeometries(props) };
}

// ---------------------------------------------------------------------------
// Status chips — canvas-textured sprites floating above the head
// ---------------------------------------------------------------------------

const CHIP_META: Record<ConditionType, { label: string; ink: string }> = {
  burn: { label: 'BURN', ink: '#8b2418' },
  soaked: { label: 'SOAKED', ink: '#1d4a61' },
  unsteady: { label: 'UNSTEADY', ink: '#2c6c86' },
  bound: { label: 'BOUND', ink: '#523c1c' },
  exposed: { label: 'EXPOSED', ink: '#7a3b2e' },
  silenced: { label: 'SILENCED', ink: '#3d2f24' },
};

const chipCache = new Map<ConditionType, THREE.CanvasTexture>();

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** A little parchment chip, drawn once per condition and cached. */
function chipTexture(type: ConditionType): THREE.CanvasTexture | null {
  const cached = chipCache.get(type);
  if (cached) return cached;

  const meta = CHIP_META[type] ?? { label: type.toUpperCase(), ink: '#3d2f24' };
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 88;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  roundedRect(ctx, 8, 8, 240, 72, 22);
  ctx.fillStyle = '#f3ead8';
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = meta.ink;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(48, 44, 15, 0, Math.PI * 2);
  ctx.fillStyle = meta.ink;
  ctx.fill();

  ctx.fillStyle = meta.ink;
  ctx.font = 'bold 34px Georgia, "Palatino Linotype", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(meta.label, 148, 47, 168);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  chipCache.set(type, tex);
  return tex;
}

function StatusChips({ conditions, y }: { conditions: Condition[]; y: number }) {
  const shown = conditions.slice(0, 3);
  return (
    <>
      {shown.map((c, i) => {
        const tex = chipTexture(c.type);
        if (!tex) return null;
        return (
          <sprite key={c.type} position={[0, y + i * 0.32, 0]} scale={[0.86, 0.3, 1]}>
            <spriteMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
          </sprite>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// The scene bus — one mutable object every animated component reads
// ---------------------------------------------------------------------------

interface SceneBus {
  t: number;
  scale: number;
  slowUntil: number;
  anchor: Record<Side, THREE.Vector3>;
  hit: Record<Side, number>;
  hitMag: Record<Side, number>;
  guard: Record<Side, number>;
  flashT: number;
  flashPos: THREE.Vector3;
  flashColor: THREE.Color;
}

function makeBus(): SceneBus {
  return {
    t: 0,
    scale: 1,
    slowUntil: -1,
    anchor: { left: new THREE.Vector3(-1.6, 0.9, 0), right: new THREE.Vector3(1.6, 0.9, 0) },
    hit: { left: -99, right: -99 },
    hitMag: { left: 0, right: 0 },
    guard: { left: -99, right: -99 },
    flashT: -99,
    flashPos: new THREE.Vector3(),
    flashColor: new THREE.Color('#ffffff'),
  };
}

const other = (s: Side): Side => (s === 'left' ? 'right' : 'left');

// ---------------------------------------------------------------------------
// VFX pools
// ---------------------------------------------------------------------------

const PROJ_SLOTS = 4;
const BURST_SLOTS = 3;

interface ProjSlot {
  active: boolean;
  t: number;
  dur: number;
  arc: number;
  shape: ProjShape;
  core: THREE.Color;
  glow: THREE.Color;
  from: THREE.Vector3;
  to: THREE.Vector3;
  target: Side;
  mag: number;
  blocked: boolean;
}

interface BurstSlot {
  active: boolean;
  t: number;
  dur: number;
  size: number;
  core: THREE.Color;
  pos: THREE.Vector3;
}

interface VfxPools {
  proj: ProjSlot[];
  burst: BurstSlot[];
}

function makePools(): VfxPools {
  const proj: ProjSlot[] = [];
  for (let i = 0; i < PROJ_SLOTS; i++) {
    proj.push({
      active: false,
      t: 0,
      dur: 0.45,
      arc: 0.4,
      shape: 'bolt',
      core: new THREE.Color(),
      glow: new THREE.Color(),
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      target: 'right',
      mag: 0.5,
      blocked: false,
    });
  }
  const burst: BurstSlot[] = [];
  for (let i = 0; i < BURST_SLOTS; i++) {
    burst.push({ active: false, t: 0, dur: 0.5, size: 1, core: new THREE.Color(), pos: new THREE.Vector3() });
  }
  return { proj, burst };
}

interface PlanStep {
  at: number;
  cue: VfxCue;
}

interface RunState {
  runId: number;
  plan: PlanStep[];
  cursor: number;
  startT: number;
  done: boolean;
  mag: Record<Side, number>;
  blocked: Record<Side, boolean>;
  downed: Side | null;
}

/**
 * Owns scene time and the cue schedule. Everything else in the scene is a
 * pure reader of the bus / pools, so all the mutation lives right here.
 */
function Director({ vfx, bus, pools }: { vfx: RoundVfx | null; bus: SceneBus; pools: VfxPools }) {
  const run = useRef<RunState>({
    runId: -1,
    plan: [],
    cursor: 0,
    startT: 0,
    done: true,
    mag: { left: 0.5, right: 0.5 },
    blocked: { left: false, right: false },
    downed: null,
  });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const r = run.current;

    // brief slow-motion after a defeat blow
    const wantScale = bus.t < bus.slowUntil ? 0.35 : 1;
    bus.scale += (wantScale - bus.scale) * Math.min(1, dt * 6);
    bus.t += dt * bus.scale;

    // --- (re)build the schedule when a new round resolves ---
    if (vfx && vfx.runId !== r.runId) {
      r.runId = vfx.runId;
      r.plan.length = 0;
      r.cursor = 0;
      r.startT = bus.t;
      r.done = false;
      r.downed = vfx.downed;

      const hits: Record<Side, number> = { left: 0, right: 0 };
      for (const cue of vfx.cues) {
        if (cue.kind === 'attack') hits[other(cue.from)] += 1;
      }
      for (const side of ['left', 'right'] as Side[]) {
        const n = Math.max(1, hits[side]);
        r.mag[side] = clamp01(vfx.damage[side] / n / 5) || 0;
        r.blocked[side] = vfx.blocked[side] && vfx.damage[side] === 0;
      }

      let at = 0.18;
      for (const cue of vfx.cues) {
        r.plan.push({ at, cue });
        at += cue.kind === 'attack' ? 0.74 : 0.46;
      }
    }

    // --- fire scheduled cues ---
    while (r.cursor < r.plan.length && bus.t - r.startT >= r.plan[r.cursor].at) {
      fireCue(r.plan[r.cursor].cue, r, bus, pools);
      r.cursor += 1;
    }

    // --- advance projectiles ---
    let anyActive = false;
    for (const p of pools.proj) {
      if (!p.active) continue;
      p.t += dt * bus.scale;
      if (p.t >= p.dur) {
        p.active = false;
        landProjectile(p, bus, pools);
      } else {
        anyActive = true;
      }
    }

    // --- advance bursts ---
    for (const b of pools.burst) {
      if (!b.active) continue;
      b.t += dt * bus.scale;
      if (b.t >= b.dur) b.active = false;
    }

    // --- the killing blow gets a beat of slow motion ---
    if (!r.done && r.cursor >= r.plan.length && !anyActive) {
      r.done = true;
      if (r.downed) bus.slowUntil = bus.t + 0.95;
    }
  });

  return null;
}

function fireCue(cue: VfxCue, r: RunState, bus: SceneBus, pools: VfxPools) {
  const el = EL_VFX[cue.element] ?? EL_VFX.arcane;

  if (cue.kind === 'guard') {
    bus.guard[cue.from] = bus.t;
    spawnBurst(pools, bus.anchor[cue.from], el.core, 0.7, bus);
    return;
  }

  if (cue.kind !== 'attack') {
    // channelled / movement work reads as a swell of colour around the caster
    spawnBurst(pools, bus.anchor[cue.from], el.glow, 0.9, bus);
    return;
  }

  const target = other(cue.from);
  const slot = pools.proj.find((p) => !p.active);
  if (!slot) return;

  slot.active = true;
  slot.t = 0;
  slot.from.copy(bus.anchor[cue.from]);
  slot.to.copy(bus.anchor[target]);
  slot.dur = 0.3 + slot.from.distanceTo(slot.to) * 0.055;
  slot.arc = el.arc;
  slot.shape = el.shape;
  slot.core.copy(el.core);
  slot.glow.copy(el.glow);
  slot.target = target;
  slot.blocked = r.blocked[target];
  slot.mag = slot.blocked ? 0.2 : Math.max(0.35, r.mag[target]);
}

function landProjectile(p: ProjSlot, bus: SceneBus, pools: VfxPools) {
  if (p.blocked) {
    // Guard eats it: shimmer instead of a full shake
    bus.guard[p.target] = bus.t;
    spawnBurst(pools, p.to, p.core, 0.75, bus);
    return;
  }
  bus.hit[p.target] = bus.t;
  bus.hitMag[p.target] = p.mag;
  spawnBurst(pools, p.to, p.glow, 0.9 + p.mag * 0.9, bus);
}

function spawnBurst(pools: VfxPools, at: THREE.Vector3, color: THREE.Color, size: number, bus: SceneBus) {
  const slot = pools.burst.find((b) => !b.active) ?? pools.burst[0];
  slot.active = true;
  slot.t = 0;
  slot.dur = 0.5;
  slot.size = size;
  slot.core.copy(color);
  slot.pos.copy(at);
  bus.flashT = bus.t;
  bus.flashPos.copy(at);
  bus.flashColor.copy(color);
}

// ---------------------------------------------------------------------------
// VFX renderers — pure readers of their pool slot
// ---------------------------------------------------------------------------

function Projectile({ slot }: { slot: ProjSlot }) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const coreMat = useRef<THREE.MeshBasicMaterial>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    if (!slot.active) {
      if (g.visible) g.visible = false;
      return;
    }
    g.visible = true;

    const u = clamp01(slot.t / slot.dur);
    g.position.lerpVectors(slot.from, slot.to, u);
    g.position.y += Math.sin(u * Math.PI) * slot.arc;

    // aim down the flight path, then spin in place
    g.lookAt(slot.to);
    if (slot.shape === 'swirl') {
      g.rotateZ(slot.t * 10);
    } else if (slot.shape === 'shards') {
      g.rotateZ(slot.t * 7);
      g.rotateX(slot.t * 5);
    }
    g.scale.setScalar(0.8 + Math.sin(u * Math.PI) * 0.3);

    if (core.current && core.current.geometry !== PROJ_GEOM[slot.shape]) {
      core.current.geometry = PROJ_GEOM[slot.shape];
    }
    if (coreMat.current) coreMat.current.color.copy(slot.core);
    if (glowMat.current) {
      glowMat.current.color.copy(slot.glow);
      glowMat.current.opacity = 0.3 + Math.sin(u * Math.PI) * 0.22;
    }
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={core} geometry={PROJ_GEOM.bolt}>
        <meshBasicMaterial ref={coreMat} toneMapped={false} />
      </mesh>
      <mesh geometry={GLOW_GEOM}>
        <meshBasicMaterial
          ref={glowMat}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function Burst({ slot }: { slot: BurstSlot }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    if (!slot.active) {
      if (m.visible) m.visible = false;
      return;
    }
    m.visible = true;
    const u = clamp01(slot.t / slot.dur);
    m.position.copy(slot.pos);
    m.scale.setScalar(slot.size * (0.35 + u * 1.7));
    m.rotation.set(u * 1.4, u * 2.2, 0);
    if (mat.current) {
      mat.current.color.copy(slot.core);
      mat.current.opacity = (1 - u) * 0.95;
    }
  });

  return (
    <mesh ref={mesh} geometry={BURST_GEOM} visible={false}>
      <meshBasicMaterial
        ref={mat}
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** One light that jumps to whatever just went off. */
function ImpactLight({ bus }: { bus: SceneBus }) {
  const light = useRef<THREE.PointLight>(null);
  useFrame(() => {
    const l = light.current;
    if (!l) return;
    const age = bus.t - bus.flashT;
    const k = age >= 0 && age < 0.4 ? 1 - age / 0.4 : 0;
    l.intensity = k * k * 26;
    if (k > 0) {
      l.position.copy(bus.flashPos);
      l.color.copy(bus.flashColor);
    }
  });
  return <pointLight ref={light} intensity={0} distance={9} decay={2} />;
}

// ---------------------------------------------------------------------------
// Conditions rendered on the afflicted figure
// ---------------------------------------------------------------------------

function ConditionFx({ conditions, bus, height }: { conditions: Condition[]; bus: SceneBus; height: number }) {
  const has = (t: ConditionType) => conditions.some((c) => c.type === t);
  const burn = useRef<THREE.Group>(null);
  const bound = useRef<THREE.Mesh>(null);
  const crack = useRef<THREE.Mesh>(null);
  const drop = useRef<THREE.Mesh>(null);
  const crackMat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const t = bus.t;
    if (burn.current) {
      const s = 0.82 + Math.abs(Math.sin(t * 9)) * 0.42;
      burn.current.scale.set(s * 0.9, s, s * 0.9);
      burn.current.rotation.y = Math.sin(t * 3.4) * 0.5;
    }
    if (bound.current) bound.current.rotation.y = t * 0.5;
    if (crack.current) {
      crack.current.rotation.y = t * 0.35;
      if (crackMat.current) crackMat.current.opacity = 0.28 + Math.abs(Math.sin(t * 2.4)) * 0.3;
    }
    if (drop.current) {
      const u = (t * 0.7) % 1;
      drop.current.position.set(0.22, height * 0.62 - u * height * 0.55, 0.16);
      drop.current.scale.setScalar(1 - u * 0.5);
    }
  });

  return (
    <>
      {has('burn') && (
        <group ref={burn} position={[0.06, 0.62, 0]}>
          <mesh geometry={FLAME_GEOM} position={[0.24, 0.16, 0.16]}>
            <meshStandardMaterial color="#ffcf7a" emissive="#ff5a12" emissiveIntensity={2.6} flatShading />
          </mesh>
          <mesh geometry={FLAME_GEOM} position={[-0.22, 0.42, -0.12]} scale={0.72}>
            <meshStandardMaterial color="#ffb347" emissive="#ff3d05" emissiveIntensity={2.2} flatShading />
          </mesh>
        </group>
      )}

      {has('bound') && (
        <mesh ref={bound} geometry={BOUND_GEOM} material={STAGE_MATERIAL} position={[0, 0.04, 0]} />
      )}

      {has('exposed') && (
        <mesh ref={crack} geometry={CRACK_GEOM} position={[0, height * 0.52, 0]}>
          <meshBasicMaterial ref={crackMat} color="#c0392b" wireframe transparent opacity={0.4} toneMapped={false} />
        </mesh>
      )}

      {has('soaked') && (
        <>
          <mesh geometry={SHELL_GEOM} position={[0, height * 0.5, 0]} scale={0.86}>
            <meshBasicMaterial color="#3fa0e8" transparent opacity={0.16} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh ref={drop} geometry={DROP_GEOM}>
            <meshBasicMaterial color="#9fd8f7" transparent opacity={0.85} toneMapped={false} />
          </mesh>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// A combatant
// ---------------------------------------------------------------------------

/**
 * Half-separation [across, into the screen] per range band. The duel runs on
 * a diagonal — player near-left, foe far-right — so a portrait frame spends
 * its height on the fight instead of on empty sky.
 */
const GAP_POS: Array<[number, number]> = [
  [0.62, 0.95], // engaged
  [0.86, 1.75], // near
  [1.06, 2.5], // far
];

const band = (gap: number) => GAP_POS[Math.min(2, Math.max(0, gap))];

/**
 * Roughly where each figure lands on screen (0..1 of the canvas) per band —
 * the camera solve below is deterministic, so DOM overlays (damage floaters)
 * can anchor to this table instead of projecting anything.
 */
export function fighterAnchor(gap: number): Record<Side, { x: number; y: number }> {
  const i = Math.min(2, Math.max(0, gap));
  return [
    { left: { x: 0.28, y: 0.52 }, right: { x: 0.68, y: 0.48 } },
    { left: { x: 0.26, y: 0.53 }, right: { x: 0.67, y: 0.46 } },
    { left: { x: 0.25, y: 0.54 }, right: { x: 0.66, y: 0.45 } },
  ][i];
}

function Fighter({ fighter, gap, bus }: { fighter: SceneFighter; gap: number; bus: SceneBus }) {
  const { side, figure } = fighter;
  const dir = side === 'left' ? -1 : 1;
  const start = band(1);

  const build = useMemo(() => buildFigure(figure), [figure.kind, figure.element]);
  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.85,
        metalness: 0.02,
        transparent: true,
      }),
    [],
  );

  const root = useRef<THREE.Group>(null);
  const lean = useRef<THREE.Group>(null);
  const glowMat = useRef<THREE.MeshStandardMaterial>(null);
  const guardShell = useRef<THREE.Mesh>(null);
  const guardMat = useRef<THREE.MeshBasicMaterial>(null);
  const anim = useRef({ x: dir * start[0], z: -dir * start[1], topple: 0 });

  const phase = side === 'left' ? 0 : 1.9;
  const baseY = 0.3 + build.float;

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05) * bus.scale;
    const t = bus.t;
    const a = anim.current;
    const pos = band(gap); // indexed, not destructured — this runs every frame
    const dx = pos[0];
    const dz = pos[1];

    a.x = THREE.MathUtils.damp(a.x, dir * dx, 3.2, dt);
    a.z = THREE.MathUtils.damp(a.z, -dir * dz, 3.2, dt);
    a.topple = THREE.MathUtils.damp(a.topple, fighter.defeated ? 1 : 0, 2.6, dt);

    // impact reaction — shake + knockback back along the duelling axis
    const hitAge = t - bus.hit[side];
    let shake = 0;
    let knock = 0;
    if (hitAge >= 0 && hitAge < 0.36) {
      const k = 1 - hitAge / 0.36;
      const mag = bus.hitMag[side];
      shake = Math.sin(hitAge * 62) * k * 0.13 * (0.5 + mag);
      knock = k * k * 0.3 * mag;
    }

    const g = root.current;
    if (g) {
      const bob = Math.sin(t * 1.9 + phase) * build.bob;
      const hop = fighter.victorious ? Math.abs(Math.sin(t * 3.4)) * 0.16 : 0;
      // face down the axis at the other duellist
      const yaw = Math.atan2(dz, dx) + (dir < 0 ? 0 : Math.PI);
      g.position.set(
        a.x + (shake + knock) * dir,
        baseY + bob + hop - a.topple * 0.22,
        a.z - (shake + knock) * dir * 0.6,
      );
      g.rotation.y = yaw;
    }

    const l = lean.current;
    if (l) {
      const wobble = fighter.conditions.some((c) => c.type === 'unsteady') ? Math.sin(t * 6.5) * 0.07 : 0;
      // rocked backwards, the same way a topple falls: away from the middle
      const recoil = hitAge >= 0 && hitAge < 0.36 ? (1 - hitAge / 0.36) * 0.24 : 0;
      l.rotation.z = a.topple * 1.4 + wobble + recoil;
      l.rotation.x = Math.sin(t * 1.3 + phase) * 0.02;
    }

    bodyMat.opacity = 1 - a.topple * 0.6;

    if (glowMat.current) {
      const pulse = fighter.victorious ? 3.4 : 2;
      glowMat.current.emissiveIntensity = pulse + Math.sin(t * 2.6 + phase) * 0.8 - a.topple * 1.6;
    }

    const shell = guardShell.current;
    if (shell && guardMat.current) {
      const age = t - bus.guard[side];
      const k = age >= 0 && age < 0.75 ? 1 - age / 0.75 : 0;
      shell.visible = k > 0;
      guardMat.current.opacity = k * (0.34 + Math.abs(Math.sin(age * 26)) * 0.28);
    }

    // hand the projectile system somewhere to aim
    bus.anchor[side].set(a.x, baseY + build.chest, a.z);
  });

  return (
    <group ref={root} position={[dir * start[0], baseY, -dir * start[1]]}>
      {/* contact shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005 - build.float, 0]}>
        <circleGeometry args={[0.62, 12]} />
        <meshBasicMaterial color="#6b512f" transparent opacity={0.26} depthWrite={false} />
      </mesh>

      <group ref={lean}>
        <mesh geometry={build.body} material={bodyMat} />
        {build.glow && (
          <mesh geometry={build.glow}>
            <meshStandardMaterial
              ref={glowMat}
              color={build.glowColor}
              emissive={build.glowEmissive}
              emissiveIntensity={2}
              flatShading
              roughness={0.35}
            />
          </mesh>
        )}
        {/* conditions die with their host */}
        {!fighter.defeated && (
          <ConditionFx conditions={fighter.conditions} bus={bus} height={build.height} />
        )}
      </group>

      {/* guard shimmer */}
      <mesh ref={guardShell} geometry={SHELL_GEOM} visible={false} position={[0, build.chest, 0]} scale={[1, 1.15, 1]}>
        <meshBasicMaterial
          ref={guardMat}
          color="#ffdf9c"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {!fighter.defeated && <StatusChips conditions={fighter.conditions} y={build.height + 0.22} />}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Stage dressing
// ---------------------------------------------------------------------------

function Brazier({ x, z, phase }: { x: number; z: number; phase: number }) {
  const flame = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const f = 0.8 + Math.abs(Math.sin(t * 6.3 + phase)) * 0.45 + Math.sin(t * 11 + phase) * 0.12;
    if (flame.current) {
      flame.current.scale.set(0.9 + (f - 1) * 0.3, f, 0.9 + (f - 1) * 0.3);
      flame.current.rotation.y = t * 1.4 + phase;
    }
    if (light.current) light.current.intensity = 5 + f * 3.2;
  });

  return (
    <group position={[x, 0, z]}>
      <mesh ref={flame} geometry={FLAME_GEOM} material={FLAME_MATERIAL} position={[0, 1.58, 0]} scale={1.6} />
      <pointLight ref={light} position={[0, 1.7, 0]} color="#ff9a3c" intensity={7} distance={9} decay={2} />
    </group>
  );
}

function SkyDome() {
  const geometry = useMemo(() => makeSkyGeometry(46, SKY_BELOW, SKY_HORIZON, SKY_ZENITH), []);
  return (
    <>
      <mesh geometry={geometry}>
        <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
      </mesh>
      {/* low dawn sun, hazed out — no disc, just the bloom */}
      <mesh position={[-9.5, 6.5, -19]}>
        <sphereGeometry args={[5.2, 10, 8]} />
        <meshBasicMaterial
          color="#ffd08a"
          transparent
          opacity={0.26}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-9.5, 6.5, -19]}>
        <sphereGeometry args={[1.9, 10, 8]} />
        <meshBasicMaterial
          color="#fff0cc"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

function Stage() {
  const build = useMemo(buildStage, []);
  return (
    <>
      <mesh geometry={build.ground} material={STAGE_MATERIAL} />
      <mesh geometry={build.dais} material={STAGE_MATERIAL} />
      <mesh geometry={build.props} material={STAGE_MATERIAL} />
      {BRAZIERS.map(([x, z], i) => (
        <Brazier key={i} x={x} z={z} phase={i * 2.2} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Camera — fixed cinematic side-on framing with a slow drift
// ---------------------------------------------------------------------------

const CAM_FOV = 34;

function CameraRig({ gap, bus }: { gap: number; bus: SceneBus }) {
  const dist = useRef(10);

  useFrame(({ camera, size }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = bus.t;
    const pos = band(gap);
    const dx = pos[0];
    const dz = pos[1];

    // Frame both duellists whatever the viewport shape: solve the pull-back
    // that fits the NEAR figure (the widest on screen) into the horizontal
    // FOV, and never crowd them closer than a comfortable standoff.
    const halfV = Math.tan((CAM_FOV / 2) * THREE.MathUtils.DEG2RAD);
    const halfH = halfV * Math.max(0.42, size.width / Math.max(1, size.height));
    const want = Math.max(dz + 6.8, (dx + 1.2) / halfH + dz);
    dist.current = THREE.MathUtils.damp(dist.current, THREE.MathUtils.clamp(want, 7, 15), 2.4, dt);

    const d = dist.current;
    const drift = Math.sin(t * 0.16) * 0.4;
    camera.position.set(drift, 3.2 + Math.sin(t * 0.11) * 0.08, d);
    camera.lookAt(drift * 0.45, 0.82 + Math.sin(t * 0.09) * 0.03, 0);
  });

  return null;
}

// ---------------------------------------------------------------------------
// Scene contents
// ---------------------------------------------------------------------------

function SceneContents({ left, right, gap, vfx }: CombatSceneProps) {
  const bus = useMemo(makeBus, []);
  const pools = useMemo(makePools, []);

  return (
    <>
      {/* Director runs first so every reader below sees this frame's time. */}
      <Director vfx={vfx} bus={bus} pools={pools} />
      <CameraRig gap={gap} bus={bus} />

      {/* Warm dawn key from the upper left */}
      <directionalLight position={[-6, 9, 7]} intensity={1.6} color="#fff0d2" />
      {/* Cool sky fill from behind */}
      <directionalLight position={[7, 5, -8]} intensity={0.42} color="#cdd9f6" />
      <hemisphereLight args={['#fff2d8', '#a8875f', 0.85]} />
      <ambientLight intensity={0.42} color="#f2e6d4" />

      <fog attach="fog" args={[FOG_COLOR, 11, 34]} />

      <SkyDome />
      <Stage />

      <Fighter fighter={left} gap={gap} bus={bus} />
      <Fighter fighter={right} gap={gap} bus={bus} />

      {pools.proj.map((slot, i) => (
        <Projectile key={i} slot={slot} />
      ))}
      {pools.burst.map((slot, i) => (
        <Burst key={i} slot={slot} />
      ))}
      <ImpactLight bus={bus} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Exported component
// ---------------------------------------------------------------------------

export function CombatScene(props: CombatSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 3, 11], fov: CAM_FOV, near: 0.1, far: 90 }}
      style={{ width: '100%', height: '100%', background: SKY_HORIZON }}
      dpr={[1, 1.75]}
    >
      <SceneContents {...props} />
    </Canvas>
  );
}
