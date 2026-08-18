# MageBorne Duelists — Design Document

## One-line pitch

A competitive open-world wizard apprenticeship game where every player begins as a catastrophically underqualified level-1 mage, adventures across a living hex map, builds a spell deck and magical estate, then enters a multi-stage endgame tournament.

## Core loop

```
Explore hexes
→ accept quests / hunt monsters / trade / study ruins
→ earn coin, reagents, spells, and reputation
→ improve your spell deck and equipment
→ specialize or hybridize across four elements
→ qualify for the Conclave
→ duel the surviving rivals
```

Inspirations: **Xia's sandbox opportunity structure + Mage Knight deck progression + Gloomhaven tactical card commitment + Earthborne Rangers persistent world + climactic PvP tournament.**

Primary visual inspiration: **Earthborne Rangers** — low-poly, hex map, living world, cards-as-identity.

---

## 1. Central design principle

**Your adventure build and duel build must be the same build.**

If Fire is good for killing monsters but useless in the tournament, the game has a trap choice. If Water is the obvious PvP element, everyone pivots Water late. Bad.

Each element represents a persistent tactical grammar:

| Element | Sandbox identity | Duel identity | Resource tension |
|---|---|---|---|
| **Fire** | Kill threats, burn obstacles, intimidate | Burst damage, curses, self-damage | Power now vs deck exhaustion |
| **Water** | Healing, navigation, alchemy, diplomacy | Adaptation, cleansing, redirection | Flexible but reagent-hungry |
| **Wind** | Movement, scouting, theft, evasion | Tempo, interrupts, card cycling | Acts first but lacks permanence |
| **Earth** | Mining, crafting, protection, construction | Armor, wards, summons | Slow setup, difficult to dislodge |

The player should feel like a fire mage in every subsystem.

### Combat vs utility spells

The real split is **combat spells vs utility spells**, not world combat vs duel combat.

- **Combat spells:** Strong against monsters and rival mages.
- **Utility spells:** Movement, exploration, trade, healing, crafting, social manipulation.
- **Hybrid spells:** Moderately useful in both contexts.

| Spell | Open-world value | Duel value |
|---|---|---|
| Fireball | High | High |
| Stone Ward | High | High |
| Chain Lightning | High vs groups | Medium |
| Featherstep | High movement | Low, maybe grants Evade |
| Purify Water | High in cursed/plague regions | Low, except cleansing poison |
| Shape Stone | Opens routes, mines ore | Medium as cover/control |
| Merchant's Glamour | Better prices/dialogue | Nearly none |
| Campfire Familiar | Faster rest/crafting | None |
| Scrying Wind | Reveals hexes and quests | Medium if it reveals prepared cards |
| Summon Rain | Changes crops, fires, rivers | Situational arena control |

### The crucial anti-annoyance rule

Utility cards need a **generic secondary use** during combat. Every card has:

1. A printed primary effect.
2. An elemental combat fallback.

```
Fire card → +1 Force
Water card → +1 Guard or remove 1 condition
Wind card → +1 Speed or cycle a card
Earth card → +1 Guard or retain mana
```

So `Merchant's Glamour` remains bad in combat, but never literally blank.

Likewise, combat cards can have weak world fallbacks:

- Fireball clears brambles, but might destroy loot.
- Stone Ward bridges one hazardous edge.
- Chain Lightning powers a magical device.
- Counterspell dispels a warded ruin.

---

## 2. What the player builds — four interlocking layers

### Spell deck

Your main action economy. Starting deck:

- 4 basic movement spells
- 3 elemental sparks (determined by apprentice background)
- 2 Focus cards
- 1 personal flaw

Each round, draw five. Cards can be used for:

- Their printed spell
- Basic movement
- Basic defense
- Channeling elemental mana

Bad draws remain usable, but inefficiently.

### Equipment

Persistent modifiers rather than more shuffled cards:

- Wand, staff, orb, tome
- Robe or light armor
- Familiar
- Two trinkets
- Consumables

Equipment should alter cards rather than merely add stats.

Examples:

- **Salamander-Wood Wand:** The first Fire card you exhaust each turn returns to hand, but inflicts 1 Burn.
- **Rainkeeper's Cloak:** After you Cleanse, bank one Water mana.
- **Seven-League Sandals:** Wind movement can cross one hazardous edge.
- **Graven Familiar:** Earth summons occupy one less preparation slot.

### Elemental mastery

Four tracks, but not ordinary XP ladders. Each level unlocks **permission**, not `+5%`.

Example Fire track:

1. **Kindling:** Burn obstacles and ignite enemies.
2. **Conflagration:** Combine two Fire cards into one amplified cast.
3. **Living Flame:** Burn becomes a spendable resource.
4. **Phoenix Doctrine:** Once per duel, return from defeat at 1 Resolve while permanently burning three cards.

Advancing requires actual elemental deeds, not generic XP:

- Fire: defeat dangerous enemies or destroy valuable opportunities
- Water: resolve curses, heal settlements, complete alchemical transformations
- Wind: discover remote places, escape pursuit, win races
- Earth: craft wonders, fortify settlements, defeat enemies without yielding ground

Specialization emerges from play.

### Reputation and titles

Separate from raw power:

- Academic standing
- Popular renown
- Criminal notoriety
- Faction relationships
- Public titles

Titles act like Xia's achievements:

- **First Dragon-Slayer**
- **Master of Two Schools**
- **The Unburned**
- **Friend of the Small Gods**
- **Wanted in Three Kingdoms**
- **First to Circumnavigate the World**

They award permanent techniques, tournament advantages, or qualification points. They lure players into doing interesting things instead of repeatedly farming the optimal cave.

---

## 3. The map

Partially procedural hex overworld, discovered during play.

### Major tile types

- Towns and cities
- Wizard colleges
- Elemental nexuses
- Monster territories
- Ruins and dungeons
- Noble estates
- Wild magic zones
- Trade routes
- Rivers, mountains, forests, wastelands
- Traveling entities

Each region has:

1. A danger
2. An economic opportunity
3. A magical affinity
4. A faction or authority
5. Something that can change permanently

Example:

> **Ashen Marches**
> Fire affinity. Cheap sulfur and monster contracts. Constant wildfire pressure. The local baron pays for extermination, while a salamander cult pays you to let the beasts multiply.

The sandbox shouldn't just be encounter dispensers.

### Safe-slow versus risky-fast travel

Steal Xia's Scan/Blind Jump grammar.

When approaching an undiscovered hex:

- **Survey:** Spend Focus, reveal adjacent terrain before entering.
- **Press On:** Enter immediately and resolve whatever is there.

Wind excels at pressing on. Earth excels at surviving bad terrain. Water can retreat along rivers. Fire can destroy certain hazards but may permanently worsen the region.

---

## 4. The economy

Three main resources:

- **Coin:** equipment, services, lodging, transport, bribes
- **Reagents:** spell acquisition, alchemy, enchanting, rituals
- **Focus:** action tempo and preparation

Elemental mana is mostly generated and spent **during encounters**, not stockpiled indefinitely.

```
Questing earns coin and reputation
Monster hunting earns reagents and trophies
Trade earns efficient coin but little mastery
Study earns spells but consumes time
Crafting converts reagents into permanent equipment
Crime offers shortcuts but creates bounty and hostile intervention
```

No route should do everything.

### Living markets

Cities have limited demands and supplies:

- A plague city pays heavily for Water reagents.
- A warfront demands Fire weapons and healing potions.
- A university purchases relics but raises prices on spellbooks.
- Selling too much dragon bone collapses the local price.

This stops one solved trade route from becoming the game.

---

## 5. Quests

Avoid generic `kill 4 wolves`. Quests should alter geography, factions, or future card availability.

### Short jobs (1-2 turns)

- Escort an alchemist
- Collect stormglass
- Dispel a haunting
- Recover a stolen grimoire

### Quest chains (branching regional stories)

- A river spirit demands a dam be destroyed.
- The town needs the dam for irrigation.
- The college wants to imprison the spirit.
- Your resolution changes Water spell availability and regional travel.

### Personal trials (advance elemental mastery)

- Fire Trial: destroy something you could profitably preserve
- Water Trial: defeat an enemy without inflicting direct damage
- Wind Trial: complete objectives in three distant regions before the moon changes
- Earth Trial: defend one location through escalating attacks

### Rival objectives (multiplayer interaction before duels)

- One player escorts the fugitive.
- Another carries the royal warrant.
- A third wants the fugitive's forbidden spell.
- Nobody must fight, but all have leverage.

---

## 6. Combat

Card-driven and deterministic enough to support real buildcraft, with controlled uncertainty.

### Combat objective

Each character has:

- **Vitality:** Physical health. Usually 6 to 10.
- **Focus:** Mental/action resource. Usually 3 to 5 per round.
- **Guard:** Temporary protection that expires after the round.
- **Conditions:** Burn, Soaked, Unsteady, Bound, etc.
- **Position:** Three abstract ranges rather than a tactical grid.

```
ENGAGED ↔ NEAR ↔ FAR
```

You win by reducing enemies to 0 Vitality, forcing surrender, escaping, or completing an encounter objective.

Not every fight is extermination:

- Survive four rounds
- Protect a caravan
- Break three ritual stones
- Capture rather than kill
- Escape the collapsing ruin
- Steal an item and withdraw

### Combat round

1. **Reveal intent:** PvE enemies reveal what they plan to do.
2. **Draw and prepare:** Draw to five cards, refresh Focus. Secretly choose up to two primary spells, any cards to channel, a target for each spell, and casting order.
3. **Reveal casts:** Queued spells appear on a shared casting timeline, ordered by Speed.
4. **Reaction windows:** Before a hostile spell resolves, affected players may cast a Reaction card, use an equipment ability, improvise by discarding an elemental card, or pass. One reaction per target per spell.
5. **Resolve:** From fastest to slowest. Invalid targets cause spells to Fizzle. Moving out of range can cause projectiles to miss.
6. **Aftermath:** Ongoing effects trigger (Burn deals damage), Guard expires, summons act, downed combatants surrender or suffer injury, discard used cards, retain unused cards, gain Fatigue if reshuffling.

---

## 7. Card anatomy and system

Every spell card has six pieces of information:

```
CINDER LANCE
Fire • Attack • Projectile
Speed: 2
Focus: 1
Range: Near or Far

Deal 3 damage.
If the target is Burning, deal +1 and consume Burn.

CHANNEL: Generate 1 Fire mana.
REACTION: Discard to prevent 1 Fire damage.
```

### Every card has three possible uses

1. **Cast it:** Pay its Focus/mana cost and resolve its printed spell.
2. **Channel it:** Discard it to generate one mana matching its element.
3. **Improvise with it:** Discard for the element's weak universal reaction:
   - Fire: +1 damage to a spell after casting it, then take 1 Burn.
   - Water: Prevent 1 damage or remove one minor condition.
   - Wind: +1 Speed or move one range band.
   - Earth: Gain 2 Guard, but become Slow.

No card is completely dead, but using a utility spell as generic mana means sacrificing its real effect until the deck cycles.

### Deck structure

- **12-card prepared deck** (starting)
- Draw **5 cards per round**
- Normally cast **2 spells per round**
- Hand persists between rounds
- Draw back to 5
- When the deck empties, reshuffle the discard pile and gain **1 Fatigue**

Fatigue places weak cards into your deck:

```
FATIGUE
Dead card.
Discard at the end of your turn, or spend 1 Focus to remove it.
```

Drawn-out fights become increasingly ugly. Earth and Water can endure. Fire tries to finish before choking on exhaustion. Wind cycles quickly but reaches Fatigue sooner.

Your grimoire may contain dozens of learned spells, but only your prepared 12 enter an expedition.

### Mana and Focus

**Focus** limits how many difficult things you can do now:

- Refreshes every round (usually 4).
- Pays for casting spells and reactions.
- Unspent Focus can power reactions.

**Mana** creates elemental combinations:

- Generated primarily by channeling cards.
- Persists only until the end of the round.
- Basic spells require no mana or one mana.
- Advanced spells require two or more elemental mana.
- Hybrid spells require two different elements.

### Mana generation model

**Elemental attunement with limited card channeling:**

- Generate **1 mana per mastery rank per encounter**, not every round.
- Terrain and equipment provide renewable situational mana.
- Any matching card may be discarded to channel emergency mana.

This makes mana scarce enough to create climactic spells without requiring three-card payments every round.

---

## 8. Spell families

### Attacks

```
EMBER
Fire • Attack
Speed 3 • Focus 1 • Near

Deal 2 damage and inflict Burn.
```

```
STONE FIST
Earth • Attack
Speed 1 • Focus 1 • Engaged

Deal 3 damage.
Against a Bound target, deal 5 instead.
```

### Guards

```
FLOWING DEFENSE
Water • Reaction
Focus 1

Prevent 2 damage.
You may become Soaked to prevent 4 instead.
```

```
GRANITE SKIN
Earth • Guard
Speed 1 • Focus 1

Gain 5 Guard.
You cannot voluntarily move this round.
```

### Movement

```
GALE STEP
Wind • Movement
Speed 4 • Focus 1

Move one range band.
If this causes a spell to lose range, draw one card.
```

### Control

```
MUDDLE
Water + Earth • Control
Speed 2 • Focus 1
Mana: 1 Water + 1 Earth

Inflict Bound.
The target must spend 1 Focus or discard a Wind card to move.
```

### Counters

```
CROSSWIND
Wind • Reaction
Focus 1

A projectile targets a different legal character or location.
```

```
QUENCH
Water • Reaction
Focus 1

Cancel a Fire spell unless its caster channels another Fire card.
```

Hard cancellation is rare. Most counters impose an additional price or transform the outcome.

### Setup and rituals

```
LEY ANCHOR
Earth • Preparation
Speed 0 • Focus 2

Create an Anchor at your current range.
Your Earth spells cost one fewer channeled card here.
Destroy the Anchor if you leave its range.
```

```
GATHERING STORM
Wind + Water • Preparation
Focus 1

Place one Storm counter here.
At three counters, deal 3 damage to every enemy and move each one band.
```

### Summons

```
CLAY SERVITOR
Earth • Summon
Speed 1 • Focus 2
Mana: 2 Earth

Summon a Servitor with 3 Vitality.
It can intercept one Engaged attack each round.
```

Keep summons scarce. Otherwise the wizard duel becomes two Pokémon trainers watching token economies metastasize.

### Utility cards

```
SHAPE STONE
Earth • Utility

WORLD: Alter a stone obstacle, expose ore, or create a crossing.

COMBAT: Create Cover at your range.
Characters behind it gain 2 Guard against projectiles.
```

```
SCRYING WIND
Wind • Utility

WORLD: Reveal a distant hex or inspect an encounter.

COMBAT: Look at one enemy's queued spell before choosing your second spell.
```

```
PURIFY
Water • Utility

WORLD: Cleanse poisoned water, food, land, or a cursed object.

COMBAT: Remove Poison, Burn, or one magical condition.
```

```
HEARTHFLAME
Fire • Utility

WORLD: Establish a safe camp and improve recovery.

COMBAT: Create a flame terrain effect. Hidden enemies are revealed and ice effects melt.
```

---

## 9. Conditions and elemental interactions

Small shared vocabulary:

### Burn

- Take 1 damage during Aftermath.
- Additional Burn increases duration, not damage.
- Water effects remove it.
- Some Fire spells consume it for burst damage.

### Soaked

- Fire damage against you is reduced by 1.
- Lightning damage against you is increased by 1.
- Removed after taking Fire or Lightning damage.

### Unsteady

- Your next spell suffers -1 Speed.
- Earth and explosive attacks commonly inflict it.

### Bound

- Cannot change range without paying 1 Focus or breaking the source.
- Earth, roots, and ice commonly inflict it.

### Exposed

- The next attack against you deals +2 damage.
- Usually caused by Wind, feints, or failed heavy casts.

### Silenced

- Cannot channel cards during your next cast.
- Severe and therefore short-lived.

Organic combinations:

```
Water applies Soaked
→ Wind/Fire casts Lightning
→ Earth applies Bound
→ Fire safely channels a slow Meteor
```

Setting up a combo should be **advantageous**, not mandatory. A basic attack still needs to function alone.

---

## 10. Damage, defeat, and injuries

Damage reduces Vitality. Armor and Guard reduce damage.

At 0 Vitality, choose based on encounter type:

### Against monsters

- Become **Downed**.
- An ally can revive you.
- If the party retreats or collapses, suffer an Injury and lose time/cargo.

### Against ordinary NPCs

The victor chooses among contextually legal outcomes:

- Knock out
- Capture
- Rob
- Kill
- Force retreat

Killing has reputation and legal consequences.

### Against players in the sandbox

Default defeat is punitive without deleting someone's evening:

- Victor claims one trophy, bounty, or carried reagent stack.
- Loser gains an Injury.
- Loser retreats to a nearby sanctuary.
- Both spend world time.

No taking learned spells or core equipment unless the players accepted a high-stakes duel contract.

### Tournament duel

At 0 Resolve or Vitality, you yield. Tournament magic prevents death. Injury matters only if explicitly carried between bouts.

---

## 11. Monsters

Monsters don't need full player decks. Each has:

- Vitality
- Armor
- Movement
- A 4 to 8 card behavior deck
- One passive
- One escalation rule
- Loot table

### Example: Ash Troll

**Vitality:** 12
**Armor:** 1
**Passive:** Fire damage heals it unless it is Soaked.

Behavior cards:

- **Coal Hurl:** Far attack for 3, inflicts Burn.
- **Crushing Advance:** Move closer, then attack for 4 if Engaged.
- **Feed the Furnace:** Consume nearby Flame terrain and heal 3.
- **Roar:** Inflict Unsteady on everyone.
- **Overheat:** Expose itself, then its next attack deals +3.

Water is obviously useful, but other builds still have answers:

- Wind repeatedly evades its slow attacks.
- Earth tanks and binds it.
- Fire can extinguish its flame through a specific technique or overpower its healing.
- Items may supply water bombs.

**No absolute elemental immunity.** Hard immunities make builds randomly nonfunctional.

---

## 12. Example combat round

A novice Fire/Wind mage fights a hill giant.

### Mage hand

- Ember
- Gale Step
- Cinder Lance
- Scrying Wind
- Focus Breath

### Giant intent

```
BOULDER THROW
Speed 2
Deal 4 damage at Near or Far.
```

The mage queues:

1. **Gale Step**, Speed 4: move from Far to Engaged.
2. **Ember**, Speed 3: deal 2 and inflict Burn.

Resolution:

- Gale Step resolves. The mage enters Engaged range.
- Ember deals 2 and adds Burn.
- Boulder Throw resolves, but its target is now Engaged and therefore invalid. It fizzles.
- Burn deals 1 during Aftermath.

The mage dealt only 3 damage, but avoided 4 through positioning. That's the combat's core pleasure: **cards alter the situation, not merely the HP totals.**

Next round, the giant may reveal **Backhand**, specifically punishing Engaged targets. The player cannot repeat the same trick indefinitely.

---

## 13. Wizard duel differences

Same rules. Three additions:

### Hidden preparation

Both players queue their first spell secretly. After revealing it, each chooses their second spell. This creates a manageable bluff structure without requiring simultaneous programming of an entire round.

### Counterspell sideboard

Before a duel, each mage may swap perhaps **three cards** between grimoire and prepared deck.

You know the opponent's:

- Elemental mastery
- Visible equipment
- Publicly used spells
- Reputation and titles

You don't know their exact 12-card preparation.

### Resolve

Duels use **Resolve** alongside Vitality.

- Taking damage reduces Vitality.
- Being countered, trapped, or dramatically outplayed can reduce Resolve.
- Some spells attack Resolve directly.
- A mage at 0 Resolve yields even if physically healthy.

This supports Water illusionists, Wind tricksters, and intimidating Fire builds without making every duel a murder contest.

---

## 14. Deck-building model

Three zones:

- **Grimoire:** Everything learned
- **Prepared deck:** Spells chosen before adventuring
- **Exhausted/burned:** Temporarily or permanently unavailable cards

A mage might know 30 spells but prepare 12 to 16. This permits collection without late-game deck bloat.

Preparation occurs at:

- Inns
- Colleges
- Personal camps, with penalties
- Owned towers, eventually

Higher mastery permits:

- More advanced spells
- More prepared cards of that element
- Elemental card fusion
- Better opening hands
- Specialized reaction slots

**Changing prepared spells costs time.** Otherwise players inspect an enemy and freely counter-build. Information should matter, but scouting shouldn't grant perfect respec.

---

## 15. Multiclassing

Pure specialization should be powerful but legible. Hybrids unlock emergent schools:

| Combination | School | Identity |
|---|---|---|
| Fire + Earth | **Magma** | Siege, armor melting, persistent terrain |
| Fire + Wind | **Lightning** | Explosive tempo, unstable chaining |
| Fire + Water | **Steam** | Concealment, pressure, delayed bursts |
| Water + Wind | **Storm** | Weather, displacement, repeated control |
| Water + Earth | **Growth** | Healing, roots, creatures, attrition |
| Wind + Earth | **Dust** | Blinding, erosion, traps, mobile terrain |

Hybrids shouldn't be a fifth and sixth full progression track. That becomes content bankruptcy.

> Reaching rank 2 in two elements unlocks a small set of cross-element spells requiring both mana types.

Perhaps six to eight spells per pairing. Enough to create identity without building six additional games.

---

## 16. Time as the strategic constraint

The world needs a fixed or semi-fixed calendar.

Every major action costs days:

- Travel
- Rest
- Study
- Craft
- Quest
- Recover from defeat

The final Conclave occurs after, say, **12 weeks**.

This creates the actual resource-management game:

- Do I spend a week learning Meteor?
- Do I take a lucrative detour?
- Do I hunt the rival before they finish their Earth trial?
- Do I enter the tournament injured but carrying a surprise spell?
- Do I pay for fast travel or save for equipment?

Without time pressure, sandbox preparation becomes grind until everyone has everything.

---

## 17. The final tournament — three-act Conclave

Do not make the entire match culminate in one single-elimination duel. Too much variance, and eliminated players become furniture.

### Act I: The Grand Trial

All players simultaneously face a public magical challenge:

- Contain an elemental breach
- Navigate a shifting labyrinth
- Defend constructs while disrupting rivals
- Capture moving leyline nodes

Performance determines:

- Starting Resolve
- Arena choice
- Initiative
- Sideboard access
- Seeding

Thus non-combat investment still matters.

### Act II: Rival duels

Three-round Swiss into a top-two final. Everyone plays throughout, and one bad matchup does not delete three hours of preparation.

### Act III: The Ascension Duel

Top two fight a larger duel with:

- Arena selection influenced by prior achievements
- Secret spell preparation
- Publicly known equipment
- Persistent injuries/curses from the tournament
- Perhaps one patron or familiar intervention

The final must be materially different from ordinary monster combat. More interrupts, feints, counterspells, terrain manipulation, and information games.

---

## 18. Interaction throughout the sandbox

Waiting until the tournament for interaction would suck. Add indirect and direct pressure:

- **Shared markets:** Your selling crashes prices for rivals.
- **Rival objectives:** Quests where multiple players pursue incompatible outcomes.
- **Bounty system:** Criminal mages become targets.
- **Information warfare:** Scrying reveals rival deck composition or location.
- **World state changes:** Resolving a quest changes travel routes or spell availability for everyone.
- **Direct PvP:** Permitted but not required. Defeat claims one trophy, not character destruction.

---

## 19. Equipment

Equipment changes rules rather than mostly increasing numbers.

### Wands

Improve quick, narrow casts.

> **Forked Hazel Wand:** Once per round, pay 1 Focus to change a projectile's target after reactions.

### Staves

Support expensive spells and Guard.

> **Basalt Staff:** Channeling an Earth card also grants 1 Guard.

### Grimoires

Manipulate preparation and draw.

> **Tidebound Grimoire:** Keep one additional Water card between rounds.

### Robes

Defense and resource conversion.

> **Stormsilk Robe:** After you evade a spell by moving, gain 1 Wind mana.

### Familiars

Give limited recurring actions.

> **Coal Newt:** Once per round, move one Burn from you to an Engaged character.

### Consumables

Cover weaknesses but cost money.

- Healing draught
- Bottled gust
- Flashpowder
- Clay ward
- Antidote
- Mana crystal

Consumables let a pure Fire mage prepare for a Fire-resistant enemy without respeccing into Water.

---

## 20. Character construction — origin + discipline

### Origins

| Origin | General strengths |
|---|---|
| Street Urchin | Theft, evasion, rumors |
| Minor Noble | Influence, retainers, credit |
| Hedge Witch | Reagents, spirits, healing |
| Soldier | Armor, threat control, endurance |
| Artisan | Crafting, repair, appraisal |
| Scholar | Investigation, preparation, spell access |

### Disciplines (emergent from spell composition and equipment)

- Combat + Fire/Wind → **War Mage**
- Utility + Wind/Water → **Wayfinder**
- Crafting + Earth/Fire → **Artificer**
- Control + Water/Earth → **Warden**
- Social + Fire/Water → **Enchanter**
- Summoning across several elements → **Conjurer**

**Element determines how your magic behaves. Role determines what you use it for.**

---

## 21. Reference game breakdown

### Mage Knight (20%)

**What it contributes:** Cards as fungible power and efficiency puzzles.

**Best inspirations:**

1. Cards have strong and weak uses (printed spell, basic channel, generic improvisation).
2. Elemental mana enhances spells (basic mode, empowered mode, overcharged mode).
3. Big combination turns.
4. Different challenge vectors (travel, social, investigation, warding, force, control, ritual).

**What not to steal:** Hand-calculation turns lasting ten minutes, opaque arithmetic, huge power inflation, solitary optimization.

### Earthborne Rangers (45%)

**What it contributes:** Open-world questing where cards constitute a character rather than merely a combat deck.

**Best inspirations:**

1. Two-layer character construction (origin + discipline).
2. Location decks create local ecology.
3. Progress tokens on world problems.
4. Utility cards are first-class.
5. Persistent but non-apocalyptic consequences.

**What not to steal:** Excessive gentleness, effects spread across too many cards, fiddly nested triggers, difficulty identifying strategically relevant objects, cooperative assumptions.

### Gloomhaven (35%)

**What it contributes:** Cards as tactical commitments and a dwindling clock.

**Best inspirations:**

1. Two-part cards (Cast + Maneuver).
2. Initiative belongs to cards.
3. Lost and burned cards.
4. Rest as a dangerous choice.
5. Enemies have telegraphed behavior cards.

**What not to steal:** Hex-by-hex tactical movement for every encounter, huge scenario setup, monster standee swarms, modifier deck atop card selection, keyword soup, cooperative campaign permanence.

---

## 22. Combined card system

### Every card

Each prepared card has:

```
NAME + ELEMENT
SPEED

CAST
The distinctive spell effect.

MANEUVER
A weaker universal or utility action.

EMPOWER
Effect gained by spending matching mana.

BURN ICON
Whether using the empowered effect removes it for the encounter.
```

Example:

```
CINDER LANCE
Fire • Speed 2

CAST
Deal 3 damage at Near or Far.

MANEUVER
Move one range closer. Gain 1 Guard.

EMPOWER: FIRE
Deal +1 damage. If the target is Burning,
consume Burn to inflict Exposed.

OVERCHARGE: BURN
Strike every enemy at the target's range.
```

### On a combat round

1. Draw to **five cards**.
2. Secretly choose **two cards**.
3. Choose: Cast from one, Maneuver from the other.
4. One chosen card establishes Speed.
5. Reveal enemy/player choices.
6. Resolve by Speed.
7. Allow limited reactions.
8. Discard both cards unless Burned.
9. Recover cards by Centering or after combat.

That's Gloomhaven's strongest skeleton without cloning it.

### Outside combat

Do **not** use the two-card pairing for every mundane action. World tests accumulate progress:

```
Cross the Witchfen: 5 Travel
Convince the Magistrate: 4 Influence
Decode the Tablet: 6 Lore
Contain the Wildfire: 5 Control
```

Cards contribute their Maneuver values or printed utility effects. This is Earthborne's interaction structure filtered through Mage Knight's fungibility.

Example:

```
GALE STEP

Combat Cast:
Move up to two ranges. Avoid one area effect.

World Utility:
Contribute 2 Travel.
If crossing mountains or ravines, contribute 3 instead.

Channel:
Generate Wind mana.
```

The same card works everywhere without pretending Gale Step and Fireball are equally good at negotiating grain prices.

---

## 23. Elemental deck identities

### Fire: Consume the future

- High damage
- Burn cards for amplification
- Converts Vitality into mana
- Destroys terrain and rewards
- Fast victories, poor endurance

Fire's central question: **How much of tomorrow are you willing to burn to win now?**

### Water: Preserve and transform

- Recover discarded cards
- Redirect attacks
- Cleanse conditions
- Copy or modify mana
- Adapt prepared cards during encounters

Water's danger is becoming generically best at everything. Its raw numbers should be modest.

### Wind: Information and tempo

- High Speed
- Range manipulation
- Draw and discard
- Peek at enemy commitments
- Interrupt or redirect slow spells

Wind wins through sequencing, not evasion RNG.

### Earth: Invest and dominate

- Persistent wards
- Guard
- Bind enemies
- Create terrain
- Summon durable constructs

Earth spends early actions establishing a board state. The opponent must prevent the fortress from becoming fait accompli.

---

## 24. Important guardrails

- **Don't use a giant reaction stack.** One reaction per target per spell. Maybe one counter-counter through rare advanced cards.
- **Don't let decks become 40-card garbage piles.** Prepared deck stays around 12 to 16 cards. Learn broadly, prepare narrowly.
- **Don't make elemental matchups absolute.** Use synergies, conditions, and tactical advantages. Avoid `Water deals double damage to Fire enemies`.
- **Don't make basic spells obsolete.** Advanced spells should be powerful but card-hungry. Cheap Ember remains useful because it requires no elaborate mana assembly.
- **Don't resolve everything through damage.** Movement, escape, protection, ritual disruption, and capture need mechanical support.
- **Don't give every card five paragraphs.** Most cards should be one main effect, one conditional rider, standardized channel/improvise iconography.

---

## 25. Lean prototype

For a first playable combat test:

- 2 mages
- 10 Vitality each
- 4 Focus per round
- 12-card prepared decks
- Draw to 5
- Two casts per round
- Three range bands
- Four conditions: Burn, Soaked, Bound, Exposed
- 8 basic spells per element
- 4 hybrid spells total
- 3 monsters with five behavior cards each
- No summons, Resolve, familiars, or persistent injuries yet

The key test: **Does revealing enemy intent, committing cards, manipulating range, and holding reactions produce readable magical outplays without analysis paralysis?**

---

## 26. Tech stack

- **React + TypeScript** (Vite)
- **Three.js / React Three Fiber** — low-poly 3D hex map
- **Tailwind CSS v3** — styling
- **Zustand** — state management
- **Vite** — build tooling

### Folder structure

```
src/
  types/index.ts        # domain model, all interfaces
  data/catalogs.ts      # static game data (spells, monsters, terrain)
  game/                 # pure logic: hex math, worldgen, combat engine
    engine/             # resolveTurn, combat, conditions
    ai/                 # monster behavior, AI mages
    worldgen/           # hex generation, region seeding
  store/gameStore.ts    # zustand store: world state + actions + tick
  components/           # TopBar, BottomNav, GameLog
    panels/             # one file per major panel
    three/              # R3F hex map, scene components
  App.tsx
  main.tsx              # calls generateWorld() before render
```

Keep `types/`, `data/`, `game/` framework-agnostic. Only `store/` and `components/` touch React.

---

## 27. What each reference governs

| Game layer | Primary inspiration | What we take |
|---|---|---|
| Overworld structure | Earthborne Rangers | Persistent places, local decks, noncombat interactions |
| Character identity | Earthborne Rangers | Origin + discipline construction |
| Card fungibility | Mage Knight | Strong spell, generic use, elemental enhancement |
| Power progression | Mage Knight | Weak novice to combo-engine archmage |
| Combat turn | Gloomhaven | Two-card commitment, initiative, tactical pairing |
| Attrition | Gloomhaven | Discard, Burn, Centering, shrinking options |
| Monsters | Gloomhaven | Telegraphing behavior decks |
| Quests | Earthborne Rangers | Situations with multiple resolutions |
| Final duels | Gloomhaven + original | Hidden two-card commitment and limited reactions |
| Sandbox economy | Xia | Risk → money → gear → greater opportunity |
| Endgame | Original | Preparation culminates in competitive Conclave |
