// ============================================================================
// MageBorne Duelists — Combat Engine Unit Tests
// ============================================================================
// These tests use a lightweight assertion framework that works without vitest/jest.
// Run with: npx tsx src/game/engine/combat.test.ts
// Or import and call runTests() from anywhere.
// The file type-checks cleanly under tsc --noEmit.
// ============================================================================

import type {
  CombatState,
  CombatParticipant,
  Mage,
  ManaPool,
} from '../../types/index.ts';
import {
  applyDamage,
  applyCondition,
  removeCondition,
  tickConditions,
  checkDefeat,
  generateAttunement,
  drawCards,
  initCombat,
  buildTimeline,
  resolveRound,
  queueSpell,
} from './combat.ts';

// --- Test helpers -----------------------------------------------------------

let testsPassed = 0;
let testsFailed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (condition) {
    testsPassed++;
  } else {
    testsFailed++;
    failures.push(message);
    // eslint-disable-next-line no-console
    console.error(`FAIL: ${message}`);
  }
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  if (actual === expected) {
    testsPassed++;
  } else {
    testsFailed++;
    failures.push(`${message} (expected ${String(expected)}, got ${String(actual)})`);
    console.error(`FAIL: ${message} (expected ${String(expected)}, got ${String(actual)})`);
  }
}

function describe(name: string, fn: () => void): void {
  console.log(`\n--- ${name} ---`);
  fn();
}

// --- Test fixtures ----------------------------------------------------------

function makeTestParticipant(overrides: Partial<CombatParticipant> = {}): CombatParticipant {
  return {
    id: 'test',
    name: 'Test Fighter',
    isPlayer: true,
    vitality: 10,
    maxVitality: 10,
    focus: 4,
    maxFocus: 4,
    guard: 0,
    range: 'near',
    conditions: [],
    hand: [],
    queuedSpells: [],
    armor: 0,
    ...overrides,
  };
}

function makeTestCombat(overrides: Partial<CombatState> = {}): CombatState {
  return {
    id: 'test_combat',
    round: 1,
    phase: 'intent',
    participants: [makeTestParticipant()],
    timeline: [],
    log: [],
    result: 'ongoing',
    encounterType: 'monster',
    ...overrides,
  };
}

function makeTestMage(overrides: Partial<Mage> = {}): Mage {
  return {
    id: 'player',
    name: 'Test Mage',
    origin: 'scholar',
    vitality: 10,
    maxVitality: 10,
    focus: 4,
    maxFocus: 4,
    guard: 0,
    resolve: 10,
    maxResolve: 10,
    mastery: { fire: 2, water: 1, wind: 0, earth: 0 },
    manaPool: { fire: 0, water: 0, wind: 0, earth: 0 },
    attunementUsed: false,
    grimoire: ['ember', 'fireball', 'cinder_lance'],
    preparedDeck: ['ember', 'fireball', 'cinder_lance', 'ember', 'fireball', 'cinder_lance',
                   'ember', 'fireball', 'cinder_lance', 'ember', 'fireball', 'cinder_lance'],
    hand: [],
    discard: [],
    burned: [],
    fatigueCount: 0,
    range: 'near',
    conditions: [],
    equipment: { trinkets: [], consumables: [] },
    coin: 50,
    reagents: {},
    reputation: 0,
    notoriety: 0,
    titles: [],
    injuries: [],
    ...overrides,
  };
}

// --- Tests ------------------------------------------------------------------

export function runTests(): void {
  testsPassed = 0;
  testsFailed = 0;
  failures.length = 0;

  // === Damage application and defeat detection ===
  describe('Damage Application', () => {
    const combat = makeTestCombat();
    const result = applyDamage(combat, 'test', 5, 'physical');

    const target = result.participants[0];
    assertEq(target.vitality, 5, 'Basic damage reduces vitality by amount');
    assert(result.result === 'ongoing', 'Combat continues when vitality > 0');
  });

  describe('Damage with Guard', () => {
    const combat = makeTestCombat({
      participants: [makeTestParticipant({ guard: 3 })],
    });
    const result = applyDamage(combat, 'test', 5, 'physical');

    const target = result.participants[0];
    assertEq(target.vitality, 8, 'Guard absorbs damage first (5 dmg - 3 guard = 2 vitality loss)');
    assertEq(target.guard, 0, 'Guard is consumed');
  });

  describe('Damage with Armor', () => {
    const combat = makeTestCombat({
      participants: [makeTestParticipant({ armor: 2 })],
    });
    const result = applyDamage(combat, 'test', 5, 'physical');

    const target = result.participants[0];
    assertEq(target.vitality, 7, 'Armor reduces damage after guard (5 - 2 armor = 3 vitality loss)');
  });

  describe('Defeat Detection', () => {
    const combat = makeTestCombat();
    const result = applyDamage(combat, 'test', 10, 'physical');

    const target = result.participants[0];
    assertEq(target.vitality, 0, 'Vitality reaches 0');
    assert(checkDefeat(target), 'checkDefeat returns true at 0 vitality');
    assert(result.result === 'defeat', 'Combat result is defeat when player hits 0');
  });

  describe('Monster Defeat', () => {
    const combat = makeTestCombat({
      participants: [makeTestParticipant({ isPlayer: false, id: 'monster_0', vitality: 3 })],
    });
    const result = applyDamage(combat, 'monster_0', 3, 'physical');

    assert(result.result === 'victory', 'Combat result is victory when monster is defeated');
  });

  // === Condition application and expiry ===
  describe('Condition Application', () => {
    const combat = makeTestCombat();
    const result = applyCondition(combat, 'test', { type: 'burn', duration: 2 });

    const target = result.participants[0];
    assertEq(target.conditions.length, 1, 'Condition is added');
    assertEq(target.conditions[0].type, 'burn', 'Condition type is burn');
    assertEq(target.conditions[0].duration, 2, 'Condition duration is 2');
  });

  describe('Condition Stacking (Burn)', () => {
    const combat = makeTestCombat({
      participants: [makeTestParticipant({ conditions: [{ type: 'burn', duration: 2 }] })],
    });
    const result = applyCondition(combat, 'test', { type: 'burn', duration: 3 });

    const target = result.participants[0];
    assertEq(target.conditions.length, 1, 'Burn stacks into one condition');
    assertEq(target.conditions[0].duration, 3, 'Burn duration takes the max');
  });

  describe('Condition Removal', () => {
    const combat = makeTestCombat({
      participants: [makeTestParticipant({ conditions: [{ type: 'soaked', duration: 3 }] })],
    });
    const result = removeCondition(combat, 'test', 'soaked');

    const target = result.participants[0];
    assertEq(target.conditions.length, 0, 'Condition is removed');
  });

  describe('Condition Expiry (Tick)', () => {
    const combat = makeTestCombat({
      participants: [makeTestParticipant({
        conditions: [
          { type: 'burn', duration: 2 },
          { type: 'exposed', duration: 1 },
        ],
      })],
    });
    const result = tickConditions(combat, 'test');

    const target = result.participants[0];
    assertEq(target.conditions.length, 1, 'Expired condition is removed');
    assertEq(target.conditions[0].type, 'burn', 'Remaining condition is burn');
    assertEq(target.conditions[0].duration, 1, 'Burn duration ticked down to 1');
  });

  // === Speed-based timeline resolution ===
  describe('Timeline Building (Speed Order)', () => {
    const combat = makeTestCombat({
      participants: [
        makeTestParticipant({ id: 'p1', queuedSpells: [
          { cardId: 'ember', use: 'cast', speed: 3, empowered: false, overcharged: false },
        ]}),
        makeTestParticipant({ id: 'p2', isPlayer: false, queuedSpells: [
          { cardId: 'bt_boulder_throw', use: 'cast', speed: 2, empowered: false, overcharged: false },
        ]}),
      ],
    });

    const result = buildTimeline(combat);
    assertEq(result.timeline.length, 2, 'Timeline has 2 entries');
    assertEq(result.timeline[0].casterId, 'p1', 'Faster spell (speed 3) is first');
    assertEq(result.timeline[1].casterId, 'p2', 'Slower spell (speed 2) is second');
  });

  describe('Timeline Speed Descending', () => {
    const combat = makeTestCombat({
      participants: [
        makeTestParticipant({ id: 'slow', queuedSpells: [
          { cardId: 'stone_fist', use: 'cast', speed: 1, empowered: false, overcharged: false },
        ]}),
        makeTestParticipant({ id: 'fast', isPlayer: false, queuedSpells: [
          { cardId: 'gale_step', use: 'cast', speed: 4, empowered: false, overcharged: false },
        ]}),
      ],
    });

    const result = buildTimeline(combat);
    assertEq(result.timeline[0].casterId, 'fast', 'Speed 4 resolves before speed 1');
  });

  // === Fatigue system ===
  describe('Fatigue - Deck Exhaustion', () => {
    const mage = makeTestMage({
      preparedDeck: ['ember'],
      discard: ['fireball', 'cinder_lance'],
      hand: [],
    });

    // Draw 2 cards: first from deck, second triggers reshuffle + fatigue
    const result = drawCards(mage, 2);

    assert(result.hand.length >= 2, 'Hand has at least 2 cards after drawing 2');
    assertEq(result.fatigueCount, 1, 'Fatigue count is 1 after reshuffling');
    assert(result.preparedDeck.length > 0, 'Deck has cards after reshuffle');
  });

  describe('Fatigue - Empty Deck and Discard', () => {
    const mage = makeTestMage({
      preparedDeck: [],
      discard: [],
      hand: [],
    });

    const result = drawCards(mage, 1);
    assert(result.hand.includes('__fatigue__'), 'Fatigue card added to hand when no cards available');
    assertEq(result.fatigueCount, 1, 'Fatigue count incremented');
  });

  describe('Fatigue - Multiple Reshuffles', () => {
    // Deck has 1 card, discard has 1 card
    // Drawing 3: draw 1 from deck, then reshuffle (1 card + fatigue), draw 1, then deck empty again
    const mage = makeTestMage({
      preparedDeck: ['ember'],
      discard: ['fireball'],
      hand: [],
    });

    const result = drawCards(mage, 3);
    assert(result.fatigueCount >= 1, 'At least 1 fatigue from reshuffling');
    assert(result.hand.length >= 3, 'Hand has at least 3 cards');
  });

  // === Mana generation from attunement ===
  describe('Mana Generation - Attunement', () => {
    const mage = makeTestMage({
      mastery: { fire: 2, water: 1, wind: 0, earth: 0 },
      manaPool: { fire: 0, water: 0, wind: 0, earth: 0 },
      attunementUsed: false,
    });

    const pool: ManaPool = generateAttunement(mage);
    assertEq(pool.fire, 2, 'Fire mana = fire mastery rank');
    assertEq(pool.water, 1, 'Water mana = water mastery rank');
    assertEq(pool.wind, 0, 'Wind mana = wind mastery rank (0)');
    assertEq(pool.earth, 0, 'Earth mana = earth mastery rank (0)');
  });

  describe('Mana Generation - Already Used', () => {
    const mage = makeTestMage({
      mastery: { fire: 2, water: 1, wind: 0, earth: 0 },
      manaPool: { fire: 1, water: 0, wind: 0, earth: 0 },
      attunementUsed: true,
    });

    const pool: ManaPool = generateAttunement(mage);
    assertEq(pool.fire, 1, 'Fire mana unchanged when attunement already used');
    assertEq(pool.water, 0, 'Water mana unchanged when attunement already used');
  });

  describe('Mana Generation - Zero Mastery', () => {
    const mage = makeTestMage({
      mastery: { fire: 0, water: 0, wind: 0, earth: 0 },
      manaPool: { fire: 0, water: 0, wind: 0, earth: 0 },
      attunementUsed: false,
    });

    const pool: ManaPool = generateAttunement(mage);
    assertEq(pool.fire, 0, 'Zero fire mastery = zero fire mana');
    assertEq(pool.water, 0, 'Zero water mastery = zero water mana');
  });

  // === Combat initialization ===
  describe('Combat Initialization', () => {
    const mage = makeTestMage();
    const combat = initCombat([mage, { monsterId: 'ash_troll' }], 'monster');

    assertEq(combat.participants.length, 2, 'Two participants in combat');
    assertEq(combat.round, 1, 'Starts at round 1');
    assertEq(combat.phase, 'intent', 'Starts at intent phase');
    assertEq(combat.result, 'ongoing', 'Result is ongoing');
    assert(combat.log.length > 0, 'Has initial log entry');
  });

  // === Round resolution (integration) ===
  describe('Round Resolution - Basic', () => {
    const mage = makeTestMage();
    let combat = initCombat([mage, { monsterId: 'ash_troll' }], 'monster');

    // Queue a spell for the player
    const playerId = combat.participants.find((p) => p.isPlayer)?.id;
    if (playerId) {
      combat = queueSpell(combat, playerId, 'ember', 'cast', 'monster_1');
    }

    const result = resolveRound(combat);
    assert(result.round === 2, 'Round advances to 2 after resolution');
    // Player's queued spells are cleared; the monster auto-queues its next-round action
    const playerAfter = result.participants.find((p) => p.isPlayer);
    assert(playerAfter ? playerAfter.queuedSpells.length === 0 : true, 'Player queued spells cleared after round');
    const monsterAfter = result.participants.find((p) => !p.isPlayer);
    assert(monsterAfter ? monsterAfter.queuedSpells.length === 1 : true, 'Monster auto-queues next-round action');
  });

  describe('Round Resolution - Guard Expires', () => {
    const combat = makeTestCombat({
      participants: [makeTestParticipant({ guard: 5 })],
    });
    const result = resolveRound(combat);
    assertEq(result.participants[0].guard, 0, 'Guard expires after round');
  });

  // === Soaked interaction ===
  describe('Soaked - Fire Damage Reduction', () => {
    const combat = makeTestCombat({
      participants: [makeTestParticipant({
        vitality: 10,
        guard: 0,
        armor: 0,
        conditions: [{ type: 'soaked', duration: 3 }],
      })],
    });
    const result = applyDamage(combat, 'test', 5, 'fire');
    assertEq(result.participants[0].vitality, 6, 'Soaked reduces fire damage by 1 (5-1=4 damage)');
  });

  describe('Soaked - Lightning Damage Increase', () => {
    const combat = makeTestCombat({
      participants: [makeTestParticipant({
        vitality: 10,
        guard: 0,
        armor: 0,
        conditions: [{ type: 'soaked', duration: 3 }],
      })],
    });
    const result = applyDamage(combat, 'test', 5, 'lightning');
    assertEq(result.participants[0].vitality, 4, 'Soaked increases lightning damage by 1 (5+1=6 damage)');
  });

  describe('Soaked - Removed After Fire Damage', () => {
    const combat = makeTestCombat({
      participants: [makeTestParticipant({
        vitality: 10,
        guard: 0,
        armor: 0,
        conditions: [{ type: 'soaked', duration: 3 }],
      })],
    });
    const result = applyDamage(combat, 'test', 3, 'fire');
    assertEq(result.participants[0].conditions.length, 0, 'Soaked removed after taking fire damage');
  });

  // === Exposed interaction ===
  describe('Exposed - Bonus Damage', () => {
    const combat = makeTestCombat({
      participants: [makeTestParticipant({
        vitality: 10,
        guard: 0,
        armor: 0,
        conditions: [{ type: 'exposed', duration: 1 }],
      })],
    });
    const result = applyDamage(combat, 'test', 5, 'physical');
    assertEq(result.participants[0].vitality, 3, 'Exposed adds +2 damage (5+2=7 damage)');
    assertEq(result.participants[0].conditions.length, 0, 'Exposed consumed after attack');
  });

  // --- Summary ---
  console.log(`\n=== Test Results ===`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  if (failures.length > 0) {
    console.log(`\nFailures:`);
    failures.forEach((f) => console.log(`  - ${f}`));
  } else {
    console.log('All tests passed!');
  }
}

// Auto-run if executed directly
runTests();
