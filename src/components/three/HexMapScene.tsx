import { useMemo, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useGameStore } from '../../store/gameStore';
import { hexToPixel, hexNeighbors, HEX_SIZE, mulberry32 } from '../../game/worldgen/worldgen';
import { beveledColumn, clamp01, hashString, makeSkyGeometry, part, type PartOpts } from './lowpoly';
import type { ElementalMastery, HexTile, TerrainType, Settlement, SettlementType } from '../../types';

// ---------------------------------------------------------------------------
// Constants & palette
// ---------------------------------------------------------------------------

const HEX_RADIUS = HEX_SIZE * 0.94; // slight gap between tiles

interface TerrainStyle {
  top: string;
  side: string;
  height: number;
}

const TERRAIN_STYLE: Record<TerrainType, TerrainStyle> = {
  plains: { top: '#7fb64a', side: '#8a6d4a', height: 0.3 },
  forest: { top: '#55913a', side: '#6b4f38', height: 0.34 },
  mountains: { top: '#8d7a6a', side: '#6e5a4c', height: 0.6 },
  desert: { top: '#e5c86b', side: '#c4a254', height: 0.28 },
  swamp: { top: '#5d7042', side: '#4a5638', height: 0.26 },
  water: { top: '#2a6a9e', side: '#1d4f7a', height: 0.18 },
  tundra: { top: '#dde6e8', side: '#9fb0b8', height: 0.3 },
  volcanic: { top: '#5a4038', side: '#3f2c26', height: 0.5 },
  jungle: { top: '#3d8032', side: '#5d4a36', height: 0.34 },
  ruins: { top: '#8f9298', side: '#6d7076', height: 0.3 },
};

// Unmapped country reads as pale morning haze, not a hole in the world
const UNDISCOVERED_STYLE: TerrainStyle = { top: '#9a93ad', side: '#7d7791', height: 0.1 };

const WATER_SURFACE_Y = 0.23; // above the sunken water bed, below all land tops
const MIST_Y = UNDISCOVERED_STYLE.height + 0.16;

// Dawn over the almanac's world: lilac crown, amber sun, cream horizon
const SKY_ZENITH = '#8b93cf';
const SKY_HORIZON = '#f6ddb4';
const SKY_BELOW = '#d8c19c';
const FOG_COLOR = '#e6d3bb';

const FOREST_GREENS = ['#4a8a33', '#3d7a2c', '#579440', '#4f8f3f'];
const CITY_WALLS = ['#e8dcc8', '#dfd2b8', '#d8c8ae', '#e2d5c0'];
const CITY_ROOFS = ['#b5563c', '#a34a34', '#5a6b8c', '#8c4a3c'];

// ---------------------------------------------------------------------------
// Shared materials (one instance across the whole scene)
// ---------------------------------------------------------------------------

const TILE_MATERIAL = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 0.88,
  metalness: 0.02,
});

const WATER_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#3fa0e8',
  transparent: true,
  opacity: 0.72,
  roughness: 0.15,
  metalness: 0.4,
  flatShading: true,
});

const MIST_MATERIAL = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  transparent: true,
  opacity: 0.55,
  roughness: 1,
  depthWrite: false,
});

// ---------------------------------------------------------------------------
// Terrain decorations — merged into ONE mesh per tile for draw-call budget
// ---------------------------------------------------------------------------

function buildDecorations(terrain: TerrainType, rng: () => number): THREE.BufferGeometry | null {
  const parts: THREE.BufferGeometry[] = [];
  const scatter = (minR: number, maxR: number) => {
    const a = rng() * Math.PI * 2;
    const d = minR + rng() * (maxR - minR);
    return { x: Math.cos(a) * d, z: Math.sin(a) * d };
  };

  switch (terrain) {
    case 'forest': {
      // one grove: trees huddle around a shared heart, tallest at the centre
      const ga = rng() * Math.PI * 2;
      const gd = rng() * 0.26;
      const gx = Math.cos(ga) * gd;
      const gz = Math.sin(ga) * gd;
      const n = 4 + Math.floor(rng() * 2);
      for (let k = 0; k < n; k++) {
        const a = rng() * Math.PI * 2;
        const d = k === 0 ? 0 : 0.1 + rng() * 0.24;
        let x = gx + Math.cos(a) * d;
        let z = gz + Math.sin(a) * d;
        const len = Math.hypot(x, z);
        if (len > 0.55) { x *= 0.55 / len; z *= 0.55 / len; }
        const heart = 1 - Math.min(1, d * 2.4); // 1 at the grove centre, 0 at the fringe
        const th = (0.2 + rng() * 0.1) * (0.85 + heart * 0.65);
        const tr = (0.085 + rng() * 0.04) * (0.9 + heart * 0.35);
        const green = FOREST_GREENS[Math.floor(rng() * FOREST_GREENS.length)];
        parts.push(part(new THREE.CylinderGeometry(0.022, 0.034, 0.09, 5), '#6b4a32', rng, { x, z, y: 0.045, jitter: 0.03 }));
        parts.push(part(new THREE.ConeGeometry(tr, th, 6), green, rng, { x, z, y: 0.07 + th / 2, ry: rng() * Math.PI }));
        if (heart > 0.4) {
          parts.push(part(new THREE.ConeGeometry(tr * 0.62, th * 0.6, 6), green, rng, { x, z, y: 0.07 + th * 0.82, ry: rng() * Math.PI }));
        }
      }
      break;
    }
    case 'jungle': {
      // dense knot of canopy around one point, undergrowth at its feet
      const ga = rng() * Math.PI * 2;
      const gx = Math.cos(ga) * 0.2;
      const gz = Math.sin(ga) * 0.2;
      for (let k = 0; k < 3; k++) {
        const a = rng() * Math.PI * 2;
        const d = k === 0 ? 0 : 0.12 + rng() * 0.16;
        const x = gx + Math.cos(a) * d;
        const z = gz + Math.sin(a) * d;
        const th = (0.3 + rng() * 0.18) * (k === 0 ? 1.15 : 0.9);
        parts.push(part(new THREE.CylinderGeometry(0.025, 0.04, 0.14, 5), '#54402e', rng, { x, z, y: 0.07, jitter: 0.03 }));
        parts.push(part(new THREE.ConeGeometry(0.14 + rng() * 0.05, th, 6), '#2f6b28', rng, { x, z, y: 0.12 + th / 2, ry: rng() * Math.PI, jitter: 0.06 }));
      }
      parts.push(part(new THREE.IcosahedronGeometry(0.12, 0), '#357a2b', rng, {
        x: gx - Math.cos(ga) * 0.34, z: gz - Math.sin(ga) * 0.34, y: 0.07, sy: 0.65, jitter: 0.06,
      }));
      break;
    }
    case 'mountains': {
      // peaks march along a single ridge line, summit in the middle
      const ridge = rng() * Math.PI;
      const n = 3;
      for (let k = 0; k < n; k++) {
        const along = (k - (n - 1) / 2) * (0.28 + rng() * 0.08);
        const off = (rng() - 0.5) * 0.14;
        const pos = {
          x: Math.cos(ridge) * along - Math.sin(ridge) * off,
          z: Math.sin(ridge) * along + Math.cos(ridge) * off,
        };
        const h = k === 1 ? 0.52 + rng() * 0.22 : 0.28 + rng() * 0.16;
        const r = h * 0.52;
        const ry = rng() * Math.PI;
        parts.push(part(new THREE.ConeGeometry(r, h, 5), '#8a7568', rng, { ...pos, y: h / 2 - 0.02, ry, jitter: 0.07 }));
        if (k === 1 || rng() > 0.45) {
          // snow cap — coaxial smaller cone matching the peak's facets
          parts.push(part(new THREE.ConeGeometry(r * 0.34, h * 0.34, 5), '#eef3f6', rng, { ...pos, y: h * 0.68 + h * 0.17 - 0.02, ry, jitter: 0.03 }));
        }
      }
      break;
    }
    case 'volcanic': {
      const ry = rng() * Math.PI;
      parts.push(part(new THREE.ConeGeometry(0.3, 0.42, 6), '#4a3530', rng, { y: 0.19, ry, jitter: 0.06 }));
      parts.push(part(new THREE.ConeGeometry(0.12, 0.1, 6), '#e0501e', rng, { y: 0.42, ry, jitter: 0.1 }));
      for (let k = 0; k < 2; k++) {
        const { x, z } = scatter(0.35, 0.52);
        parts.push(part(new THREE.IcosahedronGeometry(0.06, 0), '#3a2b26', rng, { x, z, y: 0.03, jitter: 0.06 }));
      }
      break;
    }
    case 'ruins': {
      for (let k = 0; k < 3; k++) {
        const { x, z } = scatter(0.12, 0.42);
        const h = 0.14 + rng() * 0.2;
        parts.push(part(new THREE.CylinderGeometry(0.04, 0.048, h, 6), '#a8adb5', rng, { x, z, y: h / 2, rz: (rng() - 0.5) * 0.3 }));
      }
      const fallen = scatter(0.15, 0.4);
      parts.push(part(new THREE.CylinderGeometry(0.038, 0.038, 0.3, 6), '#9aa0a8', rng, { ...fallen, y: 0.04, rz: Math.PI / 2, ry: rng() * Math.PI }));
      const slab = scatter(0.1, 0.35);
      parts.push(part(new THREE.BoxGeometry(0.16, 0.05, 0.12), '#8f949c', rng, { ...slab, y: 0.025, ry: rng() * Math.PI }));
      break;
    }
    case 'desert': {
      for (let k = 0; k < 2; k++) {
        const { x, z } = scatter(0.1, 0.45);
        parts.push(part(new THREE.IcosahedronGeometry(0.16, 0), '#dfc06a', rng, { x, z, y: 0.03, sy: 0.35, jitter: 0.04 }));
      }
      const rock = scatter(0.2, 0.5);
      parts.push(part(new THREE.IcosahedronGeometry(0.05, 0), '#b08c4e', rng, { ...rock, y: 0.025 }));
      if (rng() > 0.55) {
        const c = scatter(0.15, 0.45);
        parts.push(part(new THREE.CylinderGeometry(0.028, 0.032, 0.16, 5), '#4a7a3a', rng, { ...c, y: 0.08, jitter: 0.04 }));
      }
      break;
    }
    case 'swamp': {
      const pool = scatter(0, 0.25);
      parts.push(part(new THREE.CircleGeometry(0.17, 6), '#2c4238', rng, { ...pool, y: 0.008, rx: -Math.PI / 2, jitter: 0.02 }));
      for (let k = 0; k < 2; k++) {
        const { x, z } = scatter(0.28, 0.5);
        parts.push(part(new THREE.CylinderGeometry(0.018, 0.028, 0.16, 5), '#4d4034', rng, { x, z, y: 0.08, rz: (rng() - 0.5) * 0.2, jitter: 0.03 }));
        parts.push(part(new THREE.ConeGeometry(0.065, 0.1, 5), '#54663c', rng, { x, z, y: 0.19, jitter: 0.05 }));
      }
      break;
    }
    case 'tundra': {
      const n = 2 + Math.floor(rng() * 2);
      for (let k = 0; k < n; k++) {
        const { x, z } = scatter(0.12, 0.5);
        const s = 0.05 + rng() * 0.04;
        parts.push(part(new THREE.IcosahedronGeometry(s, 0), '#cdd6da', rng, { x, z, y: s * 0.6, ry: rng() * Math.PI }));
      }
      if (rng() > 0.5) {
        const p = scatter(0.15, 0.45);
        parts.push(part(new THREE.ConeGeometry(0.08, 0.22, 6), '#7a9a8a', rng, { ...p, y: 0.11, jitter: 0.04 }));
      }
      break;
    }
    case 'plains': {
      if (rng() < 0.7) {
        const n = 1 + Math.floor(rng() * 2);
        for (let k = 0; k < n; k++) {
          const { x, z } = scatter(0.12, 0.5);
          parts.push(part(new THREE.IcosahedronGeometry(0.06, 0), '#5f9c44', rng, { x, z, y: 0.035, sy: 0.7, jitter: 0.06 }));
        }
      }
      if (rng() < 0.4) {
        const r = scatter(0.2, 0.5);
        parts.push(part(new THREE.IcosahedronGeometry(0.045, 0), '#9a8f7a', rng, { ...r, y: 0.025 }));
      }
      break;
    }
    case 'water':
      break;
  }

  if (parts.length === 0) return null;
  return mergeGeometries(parts);
}

// ---------------------------------------------------------------------------
// Water surface — indexed hex fan so vertices can be wave-displaced
// ---------------------------------------------------------------------------

function makeWaterGeometry(radius: number): THREE.BufferGeometry {
  const positions: number[] = [0, 0, 0];
  const normals: number[] = [0, 1, 0];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    positions.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    normals.push(0, 1, 0);
  }
  const indices: number[] = [];
  for (let i = 0; i < 6; i++) {
    indices.push(0, 1 + ((i + 1) % 6), 1 + i);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setIndex(indices);
  return geom;
}

function WaterSurface({ phase }: { phase: number }) {
  const geometry = useMemo(() => makeWaterGeometry(HEX_RADIUS * 0.96), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    pos.setY(0, Math.sin(t * 1.6 + phase) * 0.02);
    for (let i = 1; i <= 6; i++) {
      pos.setY(i, Math.sin(t * 1.3 + phase + i * 1.9) * 0.03);
    }
    pos.needsUpdate = true;
  });

  return <mesh geometry={geometry} material={WATER_MATERIAL} position={[0, WATER_SURFACE_Y, 0]} />;
}

// ---------------------------------------------------------------------------
// Fog of war — low dark cloud blobs drifting over undiscovered tiles
// ---------------------------------------------------------------------------

let mistGeometryCache: THREE.BufferGeometry | null = null;

function getMistGeometry(): THREE.BufferGeometry {
  if (!mistGeometryCache) {
    const rng = mulberry32(20260818);
    const blobs: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 4; k++) {
      const a = rng() * Math.PI * 2;
      const d = k === 0 ? 0 : 0.2 + rng() * 0.3;
      blobs.push(part(new THREE.IcosahedronGeometry(0.28 + rng() * 0.14, 0), '#c3bcd2', rng, {
        x: Math.cos(a) * d,
        z: Math.sin(a) * d,
        y: (rng() - 0.5) * 0.06,
        sy: 0.35,
        ry: rng() * Math.PI,
        jitter: 0.05,
      }));
    }
    mistGeometryCache = mergeGeometries(blobs);
  }
  return mistGeometryCache;
}

function FogMist({ phase }: { phase: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const dir = phase > Math.PI ? 1 : -1;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current) {
      ref.current.rotation.y = phase + t * 0.12 * dir;
      ref.current.position.y = MIST_Y + Math.sin(t * 0.5 + phase) * 0.03;
    }
  });

  return <mesh ref={ref} geometry={getMistGeometry()} material={MIST_MATERIAL} position={[0, MIST_Y, 0]} />;
}

// ---------------------------------------------------------------------------
// Selection halo — pulsing golden hex ring hugging the tile top
// ---------------------------------------------------------------------------

const HALO_GEOMETRY = (() => {
  const g = new THREE.RingGeometry(HEX_RADIUS * 0.78, HEX_RADIUS * 1.02, 6, 1, Math.PI / 6, Math.PI * 2);
  g.rotateX(-Math.PI / 2);
  return g;
})();

function SelectedHalo({ topY }: { topY: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (mesh.current) mesh.current.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
    if (mat.current) mat.current.opacity = 0.65 + Math.sin(t * 3) * 0.25;
  });

  return (
    <mesh ref={mesh} geometry={HALO_GEOMETRY} position={[0, topY + 0.03, 0]}>
      <meshBasicMaterial ref={mat} color="#fbbf24" transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Fake contact AO — dark soft disc under objects (no real shadows needed)
// ---------------------------------------------------------------------------

function ContactShadow({ y, radius }: { y: number; radius: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <circleGeometry args={[radius, 12]} />
      <meshBasicMaterial color="#4a3520" transparent opacity={0.26} depthWrite={false} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Player marker — the protagonist: flared robe, wide-brim hat, staff + orb
// ---------------------------------------------------------------------------

type OrbElement = 'fire' | 'water' | 'wind' | 'earth' | 'none';

const MARKER_ORB: Record<OrbElement, { core: string; glow: string }> = {
  fire: { core: '#ffd8a8', glow: '#ff8a3c' },
  water: { core: '#dff4ff', glow: '#57c8f5' },
  wind: { core: '#eefcff', glow: '#9fe8ff' },
  earth: { core: '#f2e3c0', glow: '#e3c07a' },
  none: { core: '#ffd8a8', glow: '#ff8a3c' }, // untrained hands still hold an ember
};

function dominantMastery(m: ElementalMastery): OrbElement {
  let best: keyof ElementalMastery = 'fire';
  for (const el of ['fire', 'water', 'wind', 'earth'] as const) {
    if (m[el] > m[best]) best = el;
  }
  return m[best] > 0 ? best : 'none';
}

// One merged body mesh, cut once at module scope — every field sees the same wizard
const PLAYER_BODY_GEOMETRY = (() => {
  const rng = mulberry32(9021);
  return mergeGeometries([
    // trailing hem + flared robe
    part(new THREE.ConeGeometry(0.21, 0.1, 7), '#4c1d95', rng, { y: 0.05 }),
    part(new THREE.ConeGeometry(0.185, 0.4, 7), '#6d28d9', rng, { y: 0.24 }),
    // shoulder shawl + sash
    part(new THREE.ConeGeometry(0.15, 0.13, 7), '#4c1d95', rng, { y: 0.4 }),
    part(new THREE.CylinderGeometry(0.12, 0.135, 0.032, 7), '#c4b5fd', rng, { y: 0.29, jitter: 0.03 }),
    // head
    part(new THREE.SphereGeometry(0.068, 7, 5), '#f2cfae', rng, { y: 0.47, jitter: 0.03 }),
    // wide hat brim, band, and a slightly askew cone
    part(new THREE.CylinderGeometry(0.16, 0.168, 0.022, 7), '#4c1d95', rng, { y: 0.525 }),
    part(new THREE.CylinderGeometry(0.096, 0.108, 0.028, 7), '#c4b5fd', rng, { y: 0.548, jitter: 0.03 }),
    part(new THREE.ConeGeometry(0.105, 0.28, 7), '#5b21b6', rng, { y: 0.67, rz: -0.09 }),
    // staff planted at the right hand
    part(new THREE.CylinderGeometry(0.016, 0.021, 0.64, 6), '#6b4a32', rng, { x: 0.19, y: 0.32, rz: -0.06 }),
  ]);
})();

function PlayerMarker({ topY }: { topY: number }) {
  const mastery = useGameStore((s) => s.world.player.mastery);
  const orbColors = MARKER_ORB[dominantMastery(mastery)];
  const body = useRef<THREE.Group>(null);
  const orbMat = useRef<THREE.MeshStandardMaterial>(null);
  const haloMat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (body.current) body.current.position.y = topY + 0.02 + Math.sin(t * 2) * 0.035;
    const pulse = 0.5 + Math.sin(t * 2.6) * 0.5;
    if (orbMat.current) orbMat.current.emissiveIntensity = 1.9 + pulse * 1.2;
    if (haloMat.current) haloMat.current.opacity = 0.18 + pulse * 0.14;
  });

  return (
    <group>
      <ContactShadow y={topY + 0.012} radius={0.24} />
      <group ref={body} position={[0, topY + 0.02, 0]}>
        <mesh geometry={PLAYER_BODY_GEOMETRY} material={TILE_MATERIAL} />
        {/* staff orb + additive halo, tinted by the player's strongest element */}
        <group position={[0.208, 0.67, 0]}>
          <mesh>
            <sphereGeometry args={[0.046, 8, 6]} />
            <meshStandardMaterial
              ref={orbMat}
              color={orbColors.core}
              emissive={orbColors.glow}
              emissiveIntensity={2.2}
              roughness={0.3}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.095, 8, 6]} />
            <meshBasicMaterial
              ref={haloMat}
              color={orbColors.glow}
              transparent
              opacity={0.22}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Settlement markers — distinct silhouettes per settlement type
// ---------------------------------------------------------------------------

interface SettlementBuild {
  solid: THREE.BufferGeometry;
  glow: THREE.BufferGeometry | null;
  glowColor: string;
  glowEmissive: string;
  /** tiny warm window lights — emissive dots that make the place feel lived-in */
  windows: THREE.BufferGeometry | null;
}

const WINDOW_GEOM = new THREE.BoxGeometry(0.018, 0.026, 0.018);

function windowsAt(spots: Array<[number, number, number]>): THREE.BufferGeometry {
  const bits: THREE.BufferGeometry[] = [];
  for (const [x, y, z] of spots) {
    const g = WINDOW_GEOM.clone();
    g.translate(x, y, z);
    bits.push(g);
  }
  return mergeGeometries(bits);
}

function prismRoof(radius: number, len: number, color: string, rng: () => number, o: PartOpts): THREE.BufferGeometry {
  // 3-sided cylinder, thetaStart=PI puts one edge straight up → gabled roof
  const g = new THREE.CylinderGeometry(radius, radius, len, 3, 1, false, Math.PI);
  return part(g, color, rng, { ...o, rx: Math.PI / 2, y: (o.y ?? 0) + radius * 0.5, jitter: 0.04 });
}

function buildSettlementGeometry(type: SettlementType, seed: number): SettlementBuild {
  const rng = mulberry32(seed);
  const parts: THREE.BufferGeometry[] = [];
  let glow: THREE.BufferGeometry | null = null;
  let glowColor = '';
  let glowEmissive = '';
  let windows: THREE.BufferGeometry | null = null;

  switch (type) {
    case 'city': {
      // curtain wall — hexagonal parapet ring with a gate gap and corner towers
      const wallR = 0.43;
      const gate = Math.floor(rng() * 6);
      for (let k = 0; k < 6; k++) {
        if (k === gate) continue;
        const a0 = (k / 6) * Math.PI * 2;
        const a1 = ((k + 1) / 6) * Math.PI * 2;
        const mx = (Math.cos(a0) + Math.cos(a1)) * 0.5 * wallR;
        const mz = (Math.sin(a0) + Math.sin(a1)) * 0.5 * wallR;
        const len = 2 * wallR * Math.sin(Math.PI / 6);
        parts.push(part(new THREE.BoxGeometry(len * 0.92, 0.085, 0.05), '#d8c8ae', rng, {
          x: mx, z: mz, y: 0.042, ry: -((a0 + a1) / 2) + Math.PI / 2, jitter: 0.03,
        }));
      }
      for (let k = 0; k < 6; k += 2) {
        const a = (k / 6) * Math.PI * 2;
        const tx = Math.cos(a) * wallR;
        const tz = Math.sin(a) * wallR;
        parts.push(part(new THREE.CylinderGeometry(0.046, 0.058, 0.17, 6), '#e2d5c0', rng, { x: tx, z: tz, y: 0.085, jitter: 0.03 }));
        parts.push(part(new THREE.ConeGeometry(0.062, 0.075, 6), '#8c4a3c', rng, { x: tx, z: tz, y: 0.21, jitter: 0.04 }));
      }
      // central keep with a banner flying from the roof
      parts.push(part(new THREE.BoxGeometry(0.17, 0.3, 0.17), '#e8dcc8', rng, { y: 0.15, jitter: 0.03 }));
      parts.push(part(new THREE.ConeGeometry(0.135, 0.12, 4), '#5a6b8c', rng, { y: 0.36, ry: Math.PI / 4, jitter: 0.04 }));
      parts.push(part(new THREE.CylinderGeometry(0.006, 0.006, 0.15, 4), '#6b4a32', rng, { y: 0.49 }));
      parts.push(part(new THREE.BoxGeometry(0.085, 0.05, 0.008), '#b5563c', rng, { x: 0.05, y: 0.53, jitter: 0.02 }));
      // houses in the ward
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + 0.7 + rng() * 0.5;
        const d = 0.25 + rng() * 0.05;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        const w = 0.09 + rng() * 0.03;
        const h = 0.08 + rng() * 0.05;
        parts.push(part(new THREE.BoxGeometry(w, h, w), CITY_WALLS[Math.floor(rng() * CITY_WALLS.length)], rng, { x, z, y: h / 2, jitter: 0.03 }));
        parts.push(part(new THREE.ConeGeometry(w * 0.8, 0.07, 4), CITY_ROOFS[Math.floor(rng() * CITY_ROOFS.length)], rng, { x, z, y: h + 0.035, ry: Math.PI / 4, jitter: 0.04 }));
      }
      windows = windowsAt([
        [0.088, 0.2, 0.03], [0.088, 0.12, -0.045], [-0.088, 0.23, -0.02],
        [0.02, 0.18, 0.088], [-0.04, 0.1, -0.088],
      ]);
      break;
    }
    case 'town': {
      const n = 2 + Math.floor(rng() * 2);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + rng() * 0.9;
        const d = k === 0 ? 0.08 : 0.22 + rng() * 0.1;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        const w = 0.13 + rng() * 0.04;
        const h = 0.1 + rng() * 0.06;
        const ry = rng() * Math.PI;
        parts.push(part(new THREE.BoxGeometry(w, h, w * 0.85), '#e6d9be', rng, { x, z, y: h / 2, ry, jitter: 0.03 }));
        parts.push(prismRoof(w * 0.62, w * 1.2, '#a05038', rng, { x, z, y: h, ry }));
        if (k === 0) windows = windowsAt([[x + w * 0.5, h * 0.55, z], [x - w * 0.45, h * 0.5, z + 0.02]]);
      }
      break;
    }
    case 'college': {
      // stepped plinth carrying a cluster of spired towers
      parts.push(part(new THREE.CylinderGeometry(0.3, 0.34, 0.07, 6), '#b9c2cd', rng, { y: 0.035, ry: rng() * Math.PI, jitter: 0.03 }));
      const towers = [
        { x: 0, z: 0, r: 0.085, h: 0.5, spire: 0.24, wall: '#dbe3ec' },
        { x: 0.2, z: 0.1, r: 0.054, h: 0.3, spire: 0.16, wall: '#cdd7e2' },
        { x: -0.14, z: -0.18, r: 0.06, h: 0.36, spire: 0.18, wall: '#d4dde7' },
      ];
      for (const tw of towers) {
        parts.push(part(new THREE.CylinderGeometry(tw.r, tw.r * 1.3, tw.h, 6), tw.wall, rng, { x: tw.x, z: tw.z, y: 0.07 + tw.h / 2, jitter: 0.03 }));
        parts.push(part(new THREE.CylinderGeometry(tw.r * 1.42, tw.r * 1.42, 0.03, 6), '#aab6c4', rng, { x: tw.x, z: tw.z, y: 0.085 + tw.h, jitter: 0.03 }));
        parts.push(part(new THREE.ConeGeometry(tw.r * 1.5, tw.spire, 6), '#3b4a8c', rng, { x: tw.x, z: tw.z, y: 0.1 + tw.h + tw.spire / 2, jitter: 0.04 }));
      }
      // arcane study orbs adrift between the spires
      const orbBits: THREE.BufferGeometry[] = [];
      for (const [ox, oy, oz] of [[0.15, 0.82, -0.09], [-0.17, 0.66, 0.13], [0.04, 0.95, 0.07]]) {
        const s = new THREE.SphereGeometry(0.032, 8, 6);
        s.translate(ox, oy, oz);
        orbBits.push(s);
      }
      glow = mergeGeometries(orbBits);
      glowColor = '#e6dcff';
      glowEmissive = '#8b5cf6';
      windows = windowsAt([
        [0.086, 0.34, 0.02], [0.086, 0.48, -0.03], [-0.086, 0.42, 0.03],
        [0.2 + 0.055, 0.28, 0.1], [-0.14, 0.32, -0.18 + 0.06],
      ]);
      break;
    }
    case 'nexus': {
      parts.push(part(new THREE.DodecahedronGeometry(0.15, 0), '#565070', rng, { y: 0.05, sy: 0.5, ry: rng() * Math.PI, jitter: 0.05 }));
      const off = rng() * Math.PI * 2;
      parts.push(part(new THREE.DodecahedronGeometry(0.09, 0), '#4a4562', rng, {
        x: Math.cos(off) * 0.24, z: Math.sin(off) * 0.24, y: 0.03, sy: 0.5, jitter: 0.05,
      }));
      const crystals: THREE.BufferGeometry[] = [];
      crystals.push(part(new THREE.OctahedronGeometry(0.09, 0), '#d8ccff', rng, { y: 0.26, sy: 2.4, ry: rng() * Math.PI, jitter: 0 }));
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + rng();
        const d = 0.12 + rng() * 0.09;
        crystals.push(part(new THREE.OctahedronGeometry(0.045 + rng() * 0.02, 0), '#d8ccff', rng, {
          x: Math.cos(a) * d,
          z: Math.sin(a) * d,
          y: 0.14 + rng() * 0.04,
          sy: 1.8 + rng() * 0.6,
          rx: (rng() - 0.5) * 0.5,
          rz: (rng() - 0.5) * 0.5,
          jitter: 0,
        }));
      }
      glow = mergeGeometries(crystals);
      glowColor = '#d8ccff';
      glowEmissive = '#7c5cff';
      break;
    }
    case 'ruin': {
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + rng() * 0.6;
        const d = 0.16 + rng() * 0.16;
        const h = 0.18 + rng() * 0.16;
        parts.push(part(new THREE.CylinderGeometry(0.042, 0.05, h, 6), '#a8adb5', rng, {
          x: Math.cos(a) * d, z: Math.sin(a) * d, y: h / 2, rz: (rng() - 0.5) * 0.3,
        }));
      }
      parts.push(part(new THREE.BoxGeometry(0.2, 0.05, 0.14), '#8f949c', rng, { y: 0.025, ry: rng() * Math.PI }));
      break;
    }
    case 'estate': {
      const ry = rng() * Math.PI;
      parts.push(part(new THREE.BoxGeometry(0.28, 0.16, 0.2), '#e2d6bc', rng, { y: 0.08, ry, jitter: 0.03 }));
      parts.push(prismRoof(0.12, 0.3, '#7a4a38', rng, { y: 0.16, ry: ry + Math.PI / 2 }));
      const a = ry + 2.2;
      parts.push(part(new THREE.BoxGeometry(0.11, 0.09, 0.11), '#d8c8a8', rng, {
        x: Math.cos(a) * 0.3, z: Math.sin(a) * 0.3, y: 0.045, jitter: 0.03,
      }));
      parts.push(part(new THREE.ConeGeometry(0.09, 0.08, 4), '#8c5a40', rng, {
        x: Math.cos(a) * 0.3, z: Math.sin(a) * 0.3, y: 0.13, ry: Math.PI / 4, jitter: 0.04,
      }));
      windows = windowsAt([[0.14, 0.09, 0.06], [-0.1, 0.08, -0.1]]);
      break;
    }
  }

  return {
    solid: parts.length ? mergeGeometries(parts) : new THREE.BufferGeometry(),
    glow,
    glowColor,
    glowEmissive,
    windows,
  };
}

// Parchment name plates, drawn once per settlement and cached
const labelCache = new Map<string, THREE.CanvasTexture>();

function labelTexture(name: string): THREE.CanvasTexture | null {
  const cached = labelCache.get(name);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // ink on parchment — #3d2f24 on #f3ead8 clears 4.5:1 with lots of room
  ctx.beginPath();
  ctx.roundRect(10, 14, 492, 100, 26);
  ctx.fillStyle = '#f3ead8';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#3d2f24';
  ctx.stroke();

  ctx.fillStyle = '#3d2f24';
  ctx.font = 'bold 52px Georgia, "Palatino Linotype", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 256, 66, 452);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  labelCache.set(name, tex);
  return tex;
}

function SettlementLabel({ name, y }: { name: string; y: number }) {
  const tex = labelTexture(name);
  if (!tex) return null;
  return (
    <sprite position={[0, y, 0]} scale={[1.7, 0.42, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

function SettlementMarker({ settlement, topY, labeled }: { settlement: Settlement; topY: number; labeled: boolean }) {
  const seed = hashString(settlement.id);
  const build = useMemo(() => buildSettlementGeometry(settlement.type, seed), [settlement.type, seed]);
  const group = useRef<THREE.Group>(null);
  const glowMat = useRef<THREE.MeshStandardMaterial>(null);
  const winMat = useRef<THREE.MeshStandardMaterial>(null);
  const phase = ((seed % 1000) / 1000) * Math.PI * 2;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (group.current) group.current.scale.setScalar(1 + Math.sin(t * 1.8 + phase) * 0.025);
    if (glowMat.current) glowMat.current.emissiveIntensity = 1.6 + Math.sin(t * 2.2 + phase) * 0.7;
    // hearth-light flicker, slower and subtler than the arcane glow
    if (winMat.current) winMat.current.emissiveIntensity = 1.55 + Math.sin(t * 2.7 + phase) * 0.3;
  });

  return (
    <group position={[0, topY, 0]}>
      <ContactShadow y={0.012} radius={0.42} />
      <group ref={group}>
        <mesh geometry={build.solid} material={TILE_MATERIAL} />
        {build.glow && (
          <mesh geometry={build.glow}>
            <meshStandardMaterial
              ref={glowMat}
              color={build.glowColor}
              emissive={build.glowEmissive}
              emissiveIntensity={1.6}
              flatShading
              roughness={0.35}
            />
          </mesh>
        )}
        {build.windows && (
          <mesh geometry={build.windows}>
            <meshStandardMaterial
              ref={winMat}
              color="#ffdf9c"
              emissive="#ffaa33"
              emissiveIntensity={1.55}
              roughness={0.4}
            />
          </mesh>
        )}
      </group>
      {labeled && <SettlementLabel name={settlement.name} y={1.15} />}
    </group>
  );
}

// ---------------------------------------------------------------------------
// The Conclave — concentric duelling rings where the whole season points
// ---------------------------------------------------------------------------

const CONCLAVE_GEOMETRY = (() => {
  const rng = mulberry32(777001);
  const parts: THREE.BufferGeometry[] = [
    // stepped stone rings
    part(new THREE.CylinderGeometry(0.52, 0.56, 0.05, 9), '#cbb68f', rng, { y: 0.025, jitter: 0.04 }),
    part(new THREE.CylinderGeometry(0.36, 0.4, 0.05, 9), '#bda67c', rng, { y: 0.075, jitter: 0.04 }),
    part(new THREE.CylinderGeometry(0.2, 0.24, 0.05, 9), '#cbb68f', rng, { y: 0.125, jitter: 0.04 }),
    // central brazier bowl
    part(new THREE.CylinderGeometry(0.07, 0.045, 0.07, 6), '#5f5348', rng, { y: 0.185, jitter: 0.04 }),
  ];
  // ring of standing stones
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.26;
    parts.push(part(new THREE.CylinderGeometry(0.035, 0.05, 0.2 + rng() * 0.06, 5), '#a89a86', rng, {
      x: Math.cos(a) * 0.47, z: Math.sin(a) * 0.47, y: 0.14,
      rz: (rng() - 0.5) * 0.12, ry: rng() * Math.PI, jitter: 0.05,
    }));
  }
  // banner poles with crimson pennants
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 1.1;
    const x = Math.cos(a) * 0.3;
    const z = Math.sin(a) * 0.3;
    parts.push(part(new THREE.CylinderGeometry(0.008, 0.011, 0.44, 4), '#6b4a32', rng, { x, z, y: 0.3 }));
    parts.push(part(new THREE.BoxGeometry(0.1, 0.055, 0.008), '#a3342a', rng, {
      x: x + Math.cos(a + Math.PI / 2) * 0.055,
      z: z + Math.sin(a + Math.PI / 2) * 0.055,
      y: 0.47,
      ry: -(a + Math.PI / 2),
      jitter: 0.03,
    }));
  }
  return mergeGeometries(parts);
})();

function ConclaveArena({ topY }: { topY: number }) {
  const flame = useRef<THREE.Mesh>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const f = 0.85 + Math.abs(Math.sin(t * 5.2)) * 0.4 + Math.sin(t * 9.7) * 0.1;
    if (flame.current) {
      flame.current.scale.set(0.9 + (f - 1) * 0.3, f, 0.9 + (f - 1) * 0.3);
      flame.current.rotation.y = t * 1.3;
    }
    if (glowMat.current) glowMat.current.opacity = 0.14 + (f - 0.85) * 0.2;
  });

  return (
    <group position={[0, topY, 0]}>
      <ContactShadow y={0.012} radius={0.58} />
      <mesh geometry={CONCLAVE_GEOMETRY} material={TILE_MATERIAL} />
      {/* the eternal brazier flame */}
      <mesh ref={flame} position={[0, 0.26, 0]}>
        <coneGeometry args={[0.05, 0.15, 5]} />
        <meshStandardMaterial color="#ffcf7a" emissive="#ff6a12" emissiveIntensity={2.6} flatShading roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.17, 8, 6]} />
        <meshBasicMaterial
          ref={glowMat}
          color="#ffb057"
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Single hex tile
// ---------------------------------------------------------------------------

interface HexTileMeshProps {
  hex: HexTile;
  isSelected: boolean;
  isPlayerHere: boolean;
  isConclave: boolean;
  settlement?: Settlement;
  onSelect: (id: string) => void;
}

function HexTileMesh({ hex, isSelected, isPlayerHere, isConclave, settlement, onSelect }: HexTileMeshProps) {
  const { x, y } = hexToPixel(hex.q, hex.r);
  const discovered = hex.discovered;
  const isWater = hex.terrain === 'water';
  const [hovered, setHovered] = useState(false);

  const style = discovered ? TERRAIN_STYLE[hex.terrain] : UNDISCOVERED_STYLE;
  const columnH = discovered && !isWater
    ? style.height + clamp01(hex.elevation) * 0.18
    : style.height;
  // where markers/halos sit — the water surface floats above the sunken bed
  const topY = discovered && isWater ? WATER_SURFACE_Y : columnH;

  const geometry = useMemo(
    () =>
      beveledColumn(
        HEX_RADIUS,
        columnH,
        6,
        Math.PI / 6, // pointy-top
        style.top,
        style.side,
        mulberry32(hashString(hex.id)),
      ),
    [hex.id, columnH, style],
  );

  const decorations = useMemo(
    () => (discovered ? buildDecorations(hex.terrain, mulberry32(hashString(hex.id) ^ 0x9e3779)) : null),
    [hex.id, hex.terrain, discovered],
  );

  const phase = ((hashString(hex.id) % 1000) / 1000) * Math.PI * 2;

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onSelect(hex.id);
    },
    [hex.id, onSelect],
  );

  return (
    <group position={[x, 0, y]} onClick={handleClick}>
      <mesh geometry={geometry} material={TILE_MATERIAL} />

      {decorations && <mesh geometry={decorations} material={TILE_MATERIAL} position={[0, columnH, 0]} />}

      {discovered && isWater && <WaterSurface phase={phase} />}

      {!discovered && <FogMist phase={phase} />}

      {isSelected && <SelectedHalo topY={topY} />}

      {settlement && discovered && <SettlementMarker settlement={settlement} topY={topY} />}

      {isPlayerHere && discovered && <PlayerMarker topY={topY} />}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Sky dome — vertex-color gradient, unaffected by fog
// ---------------------------------------------------------------------------

function SkyDome() {
  const geometry = useMemo(() => makeSkyGeometry(55, SKY_BELOW, SKY_HORIZON, SKY_ZENITH), []);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Scene contents (inside Canvas)
// ---------------------------------------------------------------------------

function SceneContents() {
  const world = useGameStore((s) => s.world);
  const selectedHexId = useGameStore((s) => s.selectedHexId);
  const selectHex = useGameStore((s) => s.selectHex);

  const hexes = useMemo(() => Object.values(world.hexes), [world.hexes]);

  const handleSelect = useCallback((id: string) => selectHex(id), [selectHex]);

  // Camera target follows the player
  const playerHex = world.hexes[world.playerHexId];
  const target = useMemo(() => {
    if (playerHex) {
      const p = hexToPixel(playerHex.q, playerHex.r);
      return [p.x, 0, p.y] as [number, number, number];
    }
    return [0, 0, 0] as [number, number, number];
  }, [playerHex]);

  return (
    <>
      {/* Warm key light from upper-left */}
      <directionalLight position={[-8, 13, 6]} intensity={1.6} color="#ffe3bb" />
      {/* Cool rim fill from the opposite side */}
      <directionalLight position={[7, 6, -9]} intensity={0.42} color="#c3d8f2" />
      {/* Sunlit sky above, warm earth bounce below */}
      <hemisphereLight args={['#ffeed4', '#7d8a6a', 0.8]} />
      <ambientLight intensity={0.46} color="#e6dcf0" />

      {/* Atmospheric depth fade into the morning haze */}
      <fog attach="fog" args={[FOG_COLOR, 16, 40]} />

      <SkyDome />

      {hexes.map((hex) => (
        <HexTileMesh
          key={hex.id}
          hex={hex}
          isSelected={selectedHexId === hex.id}
          isPlayerHere={world.playerHexId === hex.id}
          settlement={hex.settlementId ? world.settlements[hex.settlementId] : undefined}
          onSelect={handleSelect}
        />
      ))}

      <OrbitControls
        makeDefault
        target={target}
        enablePan
        enableRotate
        enableZoom
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={24}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI * 0.42}
        panSpeed={0.8}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Exported component
// ---------------------------------------------------------------------------

export function HexMapScene() {
  return (
    <Canvas
      camera={{ position: [5, 9, 11], fov: 48, near: 0.1, far: 120 }}
      style={{ width: '100%', height: '100%', background: SKY_BELOW }}
      dpr={[1, 2]}
    >
      <SceneContents />
    </Canvas>
  );
}
