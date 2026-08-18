import type { WorldState, Mage, HexTile, Settlement, Region } from '../../types';

// --- Seeded RNG -------------------------------------------------------------

export function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Hex Math (axial coordinates, pointy-top) --------------------------------

export const HEX_SIZE = 1;

export function hexToPixel(q: number, r: number, size = HEX_SIZE): { x: number; y: number } {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * 1.5 * r;
  return { x, y };
}

export function pixelToHex(x: number, y: number, size = HEX_SIZE): { q: number; r: number } {
  const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / size;
  const r = (2 / 3 * y) / size;
  return hexRound(q, r);
}

export function hexRound(q: number, r: number): { q: number; r: number } {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);
  if (qDiff > rDiff && qDiff > sDiff) rq = -rr - rs;
  else if (rDiff > sDiff) rr = -rq - rs;
  return { q: rq, r: rr };
}

export function hexNeighbors(q: number, r: number): Array<{ q: number; r: number }> {
  const dirs = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
  ];
  return dirs.map(d => ({ q: q + d.q, r: r + d.r }));
}

export function hexDistance(q1: number, r1: number, q2: number, r2: number): number {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}

// --- World Generation -------------------------------------------------------

const TERRAIN_BY_ELEVATION = (elev: number, moist: number): HexTile['terrain'] => {
  if (elev < 0.3) return 'water';
  if (elev > 0.75) return 'mountains';
  if (moist < 0.2) return 'desert';
  if (moist > 0.7 && elev < 0.5) return 'swamp';
  if (moist > 0.6 && elev < 0.6) return 'forest';
  if (moist > 0.5) return 'jungle';
  if (elev < 0.4) return 'plains';
  return 'tundra';
};

const SETTLEMENT_NAMES = [
  'Ashford', 'Brindle', 'Coralmouth', 'Duskvale', 'Emberhollow',
  'Frosthold', 'Glimmerfen', 'Highrock', 'Ironwall', 'Jadeford',
  'Kettlebrook', 'Larksong', 'Mistral', 'Northgate', 'Ostwood',
  'Plover', 'Quillford', 'Runeholt', 'Saltmere', 'Thornwick',
];

const REGION_NAMES = [
  'Ashen Marches', 'Greenweald', 'Froststeppe', 'Sunken Mire',
  'Storm Coast', 'Iron Peaks', 'Whisperwood', 'Red Wastes',
];

export function generateWorld(seed: number): WorldState {
  const rng = mulberry32(seed);
  const hexes: Record<string, HexTile> = {};
  const settlements: Record<string, Settlement> = {};
  const regions: Record<string, Region> = {};

  const MAP_RADIUS = 6;

  // Generate hexes
  for (let q = -MAP_RADIUS; q <= MAP_RADIUS; q++) {
    const r1 = Math.max(-MAP_RADIUS, -q - MAP_RADIUS);
    const r2 = Math.min(MAP_RADIUS, -q + MAP_RADIUS);
    for (let r = r1; r <= r2; r++) {
      const id = `${q},${r}`;
      const elevation = valueNoise(q, r);
      const moisture = valueNoise(q + 100, r + 100);
      const terrain = TERRAIN_BY_ELEVATION(elevation, moisture);
      hexes[id] = {
        id,
        q,
        r,
        terrain,
        elevation,
        moisture,
        discovered: false,
      };
    }
  }

  // Assign regions
  const regionElements: Array<Region['element']> = ['fire', 'water', 'wind', 'earth'];
  REGION_NAMES.forEach((name, i) => {
    const id = `region_${i}`;
    regions[id] = {
      id,
      name,
      element: regionElements[i % 4],
      danger: 'Various threats',
      opportunity: 'Trade and contracts',
      hexIds: [],
      stateChanges: [],
    };
  });

  // Scatter settlements on passable land with min-distance constraint
  const passableHexes = Object.values(hexes).filter(h =>
    h.terrain !== 'water' && h.terrain !== 'mountains'
  );
  const minDistance = 2;
  const placedSettlements: Array<{ hexId: string; q: number; r: number }> = [];
  let nameIdx = 0;

  for (const hex of passableHexes) {
    if (nameIdx >= SETTLEMENT_NAMES.length) break;
    const tooClose = placedSettlements.some(s =>
      hexDistance(hex.q, hex.r, s.q, s.r) < minDistance
    );
    if (tooClose) continue;
    if (rng() > 0.15) continue;

    const settlementId = `settlement_${nameIdx}`;
    const settlementType: Settlement['type'] =
      nameIdx < 2 ? 'city' :
      nameIdx < 5 ? 'college' :
      nameIdx < 8 ? 'nexus' :
      nameIdx < 12 ? 'town' : 'town';

    settlements[settlementId] = {
      id: settlementId,
      name: SETTLEMENT_NAMES[nameIdx],
      type: settlementType,
      hexId: hex.id,
      population: Math.floor(rng() * 5000) + 500,
      market: {
        supplies: {},
        demands: {},
        prices: {},
      },
      services: settlementType === 'college' ? ['inn', 'college', 'alchemist'] :
                settlementType === 'city' ? ['inn', 'forge', 'alchemist', 'market'] :
                settlementType === 'nexus' ? ['inn', 'ritual'] :
                ['inn', 'market'],
    };

    hex.settlementId = settlementId;
    hex.discovered = true;
    placedSettlements.push({ hexId: hex.id, q: hex.q, r: hex.r });
    nameIdx++;
  }

  // Assign hexes to nearest region
  const regionCenters = Object.values(regions).map((r, i) => ({
    id: r.id,
    q: Math.cos(i * Math.PI / 2) * 3,
    r: Math.sin(i * Math.PI / 2) * 3,
  }));

  for (const hex of Object.values(hexes)) {
    let nearestRegion = regionCenters[0];
    let minDist = Infinity;
    for (const rc of regionCenters) {
      const d = hexDistance(hex.q, hex.r, rc.q, rc.r);
      if (d < minDist) { minDist = d; nearestRegion = rc; }
    }
    hex.regionId = nearestRegion.id;
    regions[nearestRegion.id].hexIds.push(hex.id);
  }

  // Create starting player mage
  const startHex = placedSettlements[0];
  if (startHex) {
    hexes[startHex.hexId].discovered = true;
    // Discover neighbors of start
    const startQ = startHex.q;
    const startR = startHex.r;
    for (const n of hexNeighbors(startQ, startR)) {
      const nid = `${n.q},${n.r}`;
      if (hexes[nid]) hexes[nid].discovered = true;
    }
  }

  const player: Mage = {
    id: 'player',
    name: 'Apprentice',
    origin: 'scholar',
    vitality: 10,
    maxVitality: 10,
    focus: 4,
    maxFocus: 4,
    guard: 0,
    resolve: 10,
    maxResolve: 10,
    mastery: { fire: 1, water: 0, wind: 0, earth: 0 },
    manaPool: { fire: 0, water: 0, wind: 0, earth: 0 },
    attunementUsed: false,
    grimoire: ['ember', 'fireball', 'cinder_lance', 'gale_step', 'stone_fist', 'flowing_defense'],
    preparedDeck: ['ember', 'fireball', 'cinder_lance', 'gale_step', 'stone_fist', 'flowing_defense',
                   'ember', 'fireball', 'cinder_lance', 'gale_step', 'stone_fist', 'flowing_defense'],
    hand: [],
    discard: [],
    burned: [],
    fatigueCount: 0,
    range: 'near',
    conditions: [],
    equipment: {
      trinkets: [],
      consumables: [],
    },
    coin: 50,
    reagents: {},
    reputation: 0,
    notoriety: 0,
    titles: [],
    injuries: [],
  };

  return {
    seed,
    day: 1,
    maxDays: 84,
    hexes,
    settlements,
    regions,
    player,
    rivals: [],
    activeQuests: [],
    availableQuests: [],
    completedQuests: [],
    chronicle: [{
      day: 1,
      text: 'Your apprenticeship begins. The Conclave awaits in 12 weeks.',
      type: 'discovery',
    }],
    currentCombat: null,
    conclave: null,
    playerHexId: startHex?.hexId ?? '0,0',
  };
}

// Simple value noise
function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const hash = (a: number, b: number): number => {
    let h = (a * 374761393 + b * 668265263) | 0;
    h = (h ^ (h >> 13)) * 1274126177 | 0;
    return ((h ^ (h >> 16)) >>> 0) / 4294967296;
  };

  const v00 = hash(ix, iy);
  const v10 = hash(ix + 1, iy);
  const v01 = hash(ix, iy + 1);
  const v11 = hash(ix + 1, iy + 1);

  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  return v00 * (1 - sx) * (1 - sy) +
         v10 * sx * (1 - sy) +
         v01 * (1 - sx) * sy +
         v11 * sx * sy;
}

// --- End of file ---
