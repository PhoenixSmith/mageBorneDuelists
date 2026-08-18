import { useMemo, useRef, useCallback } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useGameStore } from '../../store/gameStore';
import { hexToPixel, HEX_SIZE, mulberry32 } from '../../game/worldgen/worldgen';
import type { HexTile, TerrainType, Settlement, SettlementType } from '../../types';

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

const UNDISCOVERED_STYLE: TerrainStyle = { top: '#161c2c', side: '#0e1220', height: 0.1 };

const WATER_SURFACE_Y = 0.23; // above the sunken water bed, below all land tops
const MIST_Y = UNDISCOVERED_STYLE.height + 0.16;

const SKY_ZENITH = '#101830';
const SKY_HORIZON = '#4a4670';
const SKY_BELOW = '#0b0e1a';
const FOG_COLOR = '#3a3960';

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
// Small helpers
// ---------------------------------------------------------------------------

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const clamp01 = (v: number) => THREE.MathUtils.clamp(v, 0, 1);

/**
 * Convert to non-indexed geometry and add a per-face jittered vertex color.
 * Faceted color variation is what keeps flat-shaded low-poly from looking
 * like colored plastic.
 */
function paintGeometry(
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

interface PartOpts {
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

/** Paint + transform a primitive so it can be merged into one tile mesh. */
function part(
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

// ---------------------------------------------------------------------------
// Hex column geometry — beveled top plateau, per-vertex color variation
// ---------------------------------------------------------------------------

function buildHexColumn(
  radius: number,
  height: number,
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
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6; // pointy-top
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

  for (let i = 0; i < 6; i++) {
    const [x0, z0] = corners[i];
    const [x1, z1] = corners[(i + 1) % 6];
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
      const n = 3 + Math.floor(rng() * 2);
      for (let k = 0; k < n; k++) {
        const { x, z } = scatter(0.12, 0.55);
        const th = 0.26 + rng() * 0.16;
        const tr = 0.1 + rng() * 0.05;
        const green = FOREST_GREENS[Math.floor(rng() * FOREST_GREENS.length)];
        parts.push(part(new THREE.CylinderGeometry(0.022, 0.034, 0.09, 5), '#6b4a32', rng, { x, z, y: 0.045, jitter: 0.03 }));
        parts.push(part(new THREE.ConeGeometry(tr, th, 6), green, rng, { x, z, y: 0.07 + th / 2, ry: rng() * Math.PI }));
        if (rng() > 0.5) {
          parts.push(part(new THREE.ConeGeometry(tr * 0.62, th * 0.6, 6), green, rng, { x, z, y: 0.07 + th * 0.82, ry: rng() * Math.PI }));
        }
      }
      break;
    }
    case 'jungle': {
      for (let k = 0; k < 3; k++) {
        const { x, z } = scatter(0.1, 0.5);
        const th = 0.3 + rng() * 0.18;
        parts.push(part(new THREE.CylinderGeometry(0.025, 0.04, 0.14, 5), '#54402e', rng, { x, z, y: 0.07, jitter: 0.03 }));
        parts.push(part(new THREE.ConeGeometry(0.14 + rng() * 0.05, th, 6), '#2f6b28', rng, { x, z, y: 0.12 + th / 2, ry: rng() * Math.PI, jitter: 0.06 }));
      }
      const bush = scatter(0.2, 0.5);
      parts.push(part(new THREE.IcosahedronGeometry(0.12, 0), '#357a2b', rng, { ...bush, y: 0.07, sy: 0.65, jitter: 0.06 }));
      break;
    }
    case 'mountains': {
      const n = 2 + Math.floor(rng() * 2);
      for (let k = 0; k < n; k++) {
        const pos = k === 0
          ? { x: (rng() - 0.5) * 0.16, z: (rng() - 0.5) * 0.16 }
          : scatter(0.24, 0.46);
        const h = k === 0 ? 0.5 + rng() * 0.25 : 0.28 + rng() * 0.18;
        const r = h * 0.52;
        const ry = rng() * Math.PI;
        parts.push(part(new THREE.ConeGeometry(r, h, 5), '#8a7568', rng, { ...pos, y: h / 2 - 0.02, ry, jitter: 0.07 }));
        if (k === 0 || rng() > 0.45) {
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
      blobs.push(part(new THREE.IcosahedronGeometry(0.28 + rng() * 0.14, 0), '#1c2233', rng, {
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
      <meshBasicMaterial color="#04060c" transparent opacity={0.28} depthWrite={false} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Player marker — little wizard with an orbiting familiar orb
// ---------------------------------------------------------------------------

function PlayerMarker({ topY }: { topY: number }) {
  const body = useRef<THREE.Group>(null);
  const orb = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (body.current) body.current.position.y = topY + 0.02 + Math.sin(t * 2) * 0.04;
    if (orb.current) {
      orb.current.position.set(
        Math.cos(t * 0.9) * 0.24,
        0.34 + Math.sin(t * 2.6) * 0.04,
        Math.sin(t * 0.9) * 0.24,
      );
    }
  });

  return (
    <group>
      <ContactShadow y={topY + 0.012} radius={0.26} />
      <group ref={body} position={[0, topY + 0.02, 0]}>
        {/* robe */}
        <mesh position={[0, 0.17, 0]}>
          <coneGeometry args={[0.15, 0.34, 7]} />
          <meshStandardMaterial color="#6d28d9" flatShading roughness={0.8} />
        </mesh>
        {/* head */}
        <mesh position={[0, 0.36, 0]}>
          <sphereGeometry args={[0.065, 7, 5]} />
          <meshStandardMaterial color="#f2cfae" flatShading roughness={0.7} />
        </mesh>
        {/* hat brim */}
        <mesh position={[0, 0.41, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.022, 7]} />
          <meshStandardMaterial color="#4c1d95" flatShading roughness={0.75} />
        </mesh>
        {/* hat cone, slightly askew */}
        <mesh position={[0, 0.52, 0]} rotation={[0, 0, 0.08]}>
          <coneGeometry args={[0.095, 0.22, 7]} />
          <meshStandardMaterial color="#5b21b6" flatShading roughness={0.75} />
        </mesh>
        {/* familiar orb + additive glow shell */}
        <group ref={orb} position={[0.24, 0.34, 0]}>
          <mesh>
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshStandardMaterial color="#bdf3ff" emissive="#38d6f8" emissiveIntensity={2.2} roughness={0.3} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.09, 8, 6]} />
            <meshBasicMaterial color="#67e8f9" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
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

  switch (type) {
    case 'city': {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + rng() * 0.8;
        const d = k === 0 ? 0 : 0.26 + rng() * 0.12;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        const w = 0.13 + rng() * 0.06;
        const h = (k === 0 ? 0.3 : 0.16) + rng() * 0.16;
        const wall = CITY_WALLS[Math.floor(rng() * CITY_WALLS.length)];
        const roof = CITY_ROOFS[Math.floor(rng() * CITY_ROOFS.length)];
        parts.push(part(new THREE.BoxGeometry(w, h, w), wall, rng, { x, z, y: h / 2, jitter: 0.03 }));
        const rh = 0.09 + rng() * 0.07;
        parts.push(part(new THREE.ConeGeometry(w * 0.82, rh, 4), roof, rng, { x, z, y: h + rh / 2, ry: Math.PI / 4, jitter: 0.04 }));
      }
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
      }
      break;
    }
    case 'college': {
      parts.push(part(new THREE.BoxGeometry(0.3, 0.12, 0.3), '#cbd5e1', rng, { y: 0.06, ry: rng() * Math.PI, jitter: 0.03 }));
      parts.push(part(new THREE.CylinderGeometry(0.085, 0.115, 0.5, 6), '#dbe3ec', rng, { y: 0.37, jitter: 0.03 }));
      parts.push(part(new THREE.CylinderGeometry(0.125, 0.125, 0.035, 6), '#aab6c4', rng, { y: 0.635, jitter: 0.03 }));
      parts.push(part(new THREE.ConeGeometry(0.13, 0.22, 6), '#3b4a8c', rng, { y: 0.765, jitter: 0.04 }));
      glow = new THREE.SphereGeometry(0.05, 8, 6);
      glow.translate(0, 0.95, 0);
      glowColor = '#ffe4b0';
      glowEmissive = '#ffb347';
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
      break;
    }
  }

  return {
    solid: parts.length ? mergeGeometries(parts) : new THREE.BufferGeometry(),
    glow,
    glowColor,
    glowEmissive,
  };
}

function SettlementMarker({ settlement, topY }: { settlement: Settlement; topY: number }) {
  const seed = hashString(settlement.id);
  const build = useMemo(() => buildSettlementGeometry(settlement.type, seed), [settlement.type, seed]);
  const group = useRef<THREE.Group>(null);
  const glowMat = useRef<THREE.MeshStandardMaterial>(null);
  const phase = ((seed % 1000) / 1000) * Math.PI * 2;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (group.current) group.current.scale.setScalar(1 + Math.sin(t * 1.8 + phase) * 0.025);
    if (glowMat.current) glowMat.current.emissiveIntensity = 1.6 + Math.sin(t * 2.2 + phase) * 0.7;
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
      </group>
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
  settlement?: Settlement;
  onSelect: (id: string) => void;
}

function HexTileMesh({ hex, isSelected, isPlayerHere, settlement, onSelect }: HexTileMeshProps) {
  const { x, y } = hexToPixel(hex.q, hex.r);
  const discovered = hex.discovered;
  const isWater = hex.terrain === 'water';

  const style = discovered ? TERRAIN_STYLE[hex.terrain] : UNDISCOVERED_STYLE;
  const columnH = discovered && !isWater
    ? style.height + clamp01(hex.elevation) * 0.18
    : style.height;
  // where markers/halos sit — the water surface floats above the sunken bed
  const topY = discovered && isWater ? WATER_SURFACE_Y : columnH;

  const geometry = useMemo(
    () => buildHexColumn(HEX_RADIUS, columnH, style.top, style.side, mulberry32(hashString(hex.id))),
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

function makeSkyGeometry(): THREE.BufferGeometry {
  const geom = new THREE.SphereGeometry(55, 24, 16);
  const pos = geom.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const zenith = new THREE.Color(SKY_ZENITH);
  const horizon = new THREE.Color(SKY_HORIZON);
  const below = new THREE.Color(SKY_BELOW);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / 55; // -1..1
    if (t < 0) {
      c.copy(horizon).lerp(below, Math.min(1, -t * 2));
    } else {
      c.copy(horizon).lerp(zenith, Math.pow(t, 0.65));
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geom;
}

function SkyDome() {
  const geometry = useMemo(makeSkyGeometry, []);
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
      <directionalLight position={[-8, 13, 6]} intensity={1.45} color="#ffd3a1" />
      {/* Cool rim fill from the opposite side */}
      <directionalLight position={[7, 6, -9]} intensity={0.3} color="#8fb8d8" />
      {/* Cool teal bounce from below via hemisphere ground color */}
      <hemisphereLight args={['#c9d6f2', '#27585e', 0.5]} />
      <ambientLight intensity={0.32} color="#b8c4e6" />

      {/* Atmospheric depth fade into the dusk horizon */}
      <fog attach="fog" args={[FOG_COLOR, 15, 36]} />

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
