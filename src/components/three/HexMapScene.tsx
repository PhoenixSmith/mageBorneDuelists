import { useMemo, useRef, useCallback } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { hexToPixel, HEX_SIZE } from '../../game/worldgen/worldgen';
import type { HexTile, TerrainType } from '../../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TERRAIN_COLORS: Record<TerrainType, string> = {
  plains: '#7cb342',
  forest: '#558b2f',
  mountains: '#8d6e63',
  desert: '#fdd835',
  swamp: '#4e6d3b',
  water: '#42a5f5',
  tundra: '#e0e0e0',
  volcanic: '#bf360c',
  jungle: '#2e7d32',
  ruins: '#616161',
};

const HEX_RADIUS = HEX_SIZE * 0.92; // slight gap between tiles
const TILE_DEPTH = 0.25; // extrusion depth for discovered tiles
const UNDISCOVERED_DEPTH = 0.08; // lowered/sunken undiscovered tiles
const SELECTED_EMISSIVE = '#fbbf24';
const FOG_COLOR = '#0a0e1a';

// ---------------------------------------------------------------------------
// Hex geometry helpers
// ---------------------------------------------------------------------------

/** Build a flat-shaded extruded hexagon shape (pointy-top orientation). */
function makeHexGeometry(radius: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6; // pointy-top
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 1,
    curveSegments: 1,
  });
  // Centre the extrusion around z=0 so the top surface sits at +depth/2
  geom.translate(0, 0, -depth / 2);
  geom.computeVertexNormals();
  return geom;
}

// ---------------------------------------------------------------------------
// Single hex tile
// ---------------------------------------------------------------------------

interface HexTileMeshProps {
  hex: HexTile;
  isSelected: boolean;
  isPlayerHere: boolean;
  hasSettlement: boolean;
  onSelect: (id: string) => void;
}

function HexTileMesh({ hex, isSelected, isPlayerHere, hasSettlement, onSelect }: HexTileMeshProps) {
  const { x, y } = hexToPixel(hex.q, hex.r);
  const discovered = hex.discovered;

  const color = discovered
    ? TERRAIN_COLORS[hex.terrain] ?? '#444'
    : '#0d1117';

  const depth = discovered ? TILE_DEPTH : UNDISCOVERED_DEPTH;

  // Memoise geometry per tile — shared shape, unique instance
  const geometry = useMemo(() => makeHexGeometry(HEX_RADIUS, depth), [depth]);

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      flatShading: true,
      roughness: 0.85,
      metalness: 0.05,
      emissive: isSelected ? new THREE.Color(SELECTED_EMISSIVE) : new THREE.Color('#000'),
      emissiveIntensity: isSelected ? 0.35 : 0,
      transparent: !discovered,
      opacity: discovered ? 1.0 : 0.55,
    });
    return mat;
  }, [color, isSelected, discovered]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onSelect(hex.id);
    },
    [hex.id, onSelect],
  );

  // Position: R3F y-axis maps to the worldgen "y" (which is axial-r derived).
  // We rotate so the hex grid lies on the XZ plane (top-down view).
  const posY = y;
  const posX = x;

  return (
    <group position={[posX, 0, posY]}>
      <mesh
        geometry={geometry}
        material={material}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleClick}
        castShadow
        receiveShadow
      />

      {/* Player marker — floating cone */}
      {isPlayerHere && discovered && (
        <PlayerMarker />
      )}

      {/* Settlement marker — small structure */}
      {hasSettlement && discovered && (
        <SettlementMarker />
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Player marker
// ---------------------------------------------------------------------------

function PlayerMarker() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.position.y = 0.55 + Math.sin(performance.now() * 0.003) * 0.06;
      ref.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <mesh ref={ref} position={[0, 0.55, 0]} castShadow>
      <coneGeometry args={[0.18, 0.35, 6]} />
      <meshStandardMaterial color="#fbbf24" flatShading emissive="#f59e0b" emissiveIntensity={0.4} roughness={0.4} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Settlement marker
// ---------------------------------------------------------------------------

function SettlementMarker() {
  return (
    <group position={[0, 0.2, 0]} castShadow>
      {/* Base block */}
      <mesh castShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[0.22, 0.16, 0.22]} />
        <meshStandardMaterial color="#e2e8f0" flatShading roughness={0.7} />
      </mesh>
      {/* Roof — low-poly pyramid */}
      <mesh castShadow position={[0, 0.22, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.18, 0.14, 4]} />
        <meshStandardMaterial color="#94a3b8" flatShading roughness={0.6} />
      </mesh>
    </group>
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

  const handleSelect = useCallback(
    (id: string) => selectHex(id),
    [selectHex],
  );

  // Compute a reasonable camera target — centre of map
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
      {/* Lighting */}
      <ambientLight intensity={0.45} color="#b0c4de" />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
      />
      <hemisphereLight args={['#a0c4ff', '#3a3a3a', 0.3]} />

      {/* Fog for atmosphere */}
      <fog attach="fog" args={[FOG_COLOR, 12, 28]} />

      {/* Hex tiles */}
      {hexes.map((hex) => (
        <HexTileMesh
          key={hex.id}
          hex={hex}
          isSelected={selectedHexId === hex.id}
          isPlayerHere={world.playerHexId === hex.id}
          hasSettlement={!!hex.settlementId}
          onSelect={handleSelect}
        />
      ))}

      {/* Orbit controls — pan, rotate, zoom */}
      <OrbitControls
        target={target}
        enablePan
        enableRotate
        enableZoom
        minDistance={3}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.1}
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
      shadows
      camera={{ position: [0, 10, 8], fov: 50, near: 0.1, far: 100 }}
      style={{ width: '100%', height: '100%', background: FOG_COLOR }}
      dpr={[1, 2]}
    >
      <SceneContents />
    </Canvas>
  );
}
