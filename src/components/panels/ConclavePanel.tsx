import { useGameStore } from '../../store/gameStore';
import { Glyph, Seal, type GlyphName } from '../Sigils';

const PHASE_ORDER = ['grand_trial', 'swiss', 'ascension', 'complete'] as const;

export function ConclavePanel() {
  const conclave = useGameStore((s) => s.world.conclave);
  const startConclave = useGameStore((s) => s.startConclave);
  const resolveGrandTrial = useGameStore((s) => s.resolveGrandTrial);
  const resolveSwissRound = useGameStore((s) => s.resolveSwissRound);
  const resolveAscensionDuel = useGameStore((s) => s.resolveAscensionDuel);
  const startConclaveCombat = useGameStore((s) => s.startConclaveCombat);

  if (!conclave) {
    return (
      <div className="panel-scroll">
        <div className="p-4">
          <div className="page px-4 py-5 text-center">
            <Seal glyph="chalice" tone="brass" size="lg" className="mx-auto mb-3" />
            <h2 className="title-display text-2xl">The Conclave</h2>
            <div className="rule-ornate my-2" />
            <p className="text-sm marginalia leading-snug mb-4">
              The final tournament. Face rival mages in a three-act competition: a Grand Trial,
              Swiss rounds, and the Ascension Duel.
            </p>
            <button onClick={() => startConclave()} className="btn btn-brass w-full">
              <Glyph name="chalice" className="w-4 h-4" />
              Begin the Conclave
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sortedStandings = [...conclave.standings].sort((a, b) => b.points - a.points || b.wins - a.wins);
  const winner = conclave.winner ? conclave.participants.find(m => m.id === conclave.winner) : null;
  const hasPendingMatch = !!conclave.pendingPlayerMatch;
  const opponent = hasPendingMatch
    ? conclave.participants.find(m => m.id === conclave.pendingPlayerMatch)
    : null;

  const phaseIndex = PHASE_ORDER.indexOf(conclave.phase as typeof PHASE_ORDER[number]);

  return (
    <div className="panel-scroll">
      <div className="p-3 space-y-3">
        {/* --- Head ---------------------------------------------------------- */}
        <div className="page px-3 py-2.5 flex items-center gap-2.5">
          <Seal glyph="chalice" tone="brass" size="lg" />
          <div>
            <h2 className="title-display text-xl leading-tight">The Conclave</h2>
            <div className="text-2xs italic text-ink-600">Three acts, one champion</div>
          </div>
        </div>

        {/* --- Phase tracker: seals strung on a cord -------------------------- */}
        <div className="page px-3 py-3">
          <div className="flex items-start">
            <PhaseSeal
              glyph="star"
              label="Grand Trial"
              active={conclave.phase === 'grand_trial'}
              done={phaseIndex > 0}
            />
            <PhaseCord filled={phaseIndex > 0} />
            <PhaseSeal
              glyph="swords"
              label={`Swiss ${conclave.currentSwissRound}/${conclave.maxSwissRounds}`}
              active={conclave.phase === 'swiss'}
              done={phaseIndex > 1}
            />
            <PhaseCord filled={phaseIndex > 1} />
            <PhaseSeal
              glyph="bolt"
              label="Ascension"
              active={conclave.phase === 'ascension'}
              done={phaseIndex > 2}
            />
            <PhaseCord filled={phaseIndex > 2} />
            <PhaseSeal
              glyph="chalice"
              label="Complete"
              active={conclave.phase === 'complete'}
              done={phaseIndex > 3}
            />
          </div>
        </div>

        {/* --- Duel challenge letter ------------------------------------------ */}
        {hasPendingMatch && opponent && (
          <div className="page border-oxblood-700 px-3 py-3 text-center relative">
            <div className="inked-label text-oxblood-800">
              {conclave.pendingMatchPhase === 'ascension' ? 'Ascension Duel' : 'Your Swiss Match'}
            </div>
            <div className="rule-ornate my-1.5" />
            <p className="marginalia text-2xs">A challenge has been laid before you —</p>
            <div className="font-display font-bold text-xl text-ink-900 mt-1 leading-tight">
              You <span className="text-oxblood-700">vs</span> {opponent.name}
            </div>
            <div className="flex justify-center my-2">
              <span className="seal-ox w-12 h-12 shadow-seal">
                <Glyph name="swords" className="w-6 h-6" />
              </span>
            </div>
            <button onClick={() => startConclaveCombat()} className="btn btn-ox w-full">
              <Glyph name="swords" className="w-4 h-4" />
              Fight the Duel
            </button>
          </div>
        )}

        {/* --- Gilded champion plaque ------------------------------------------ */}
        {conclave.phase === 'complete' && winner && (
          <div
            className="rounded-xl border-2 border-brass-900 brass-plate px-4 py-4 text-center shadow-carved"
          >
            <div className="rounded-lg border-2 border-ink-900/40 px-3 py-3 bg-night-900/15">
              <Glyph name="chalice" className="w-10 h-10 mx-auto text-ink-900" strokeWidth={1.6} />
              <div className="font-display font-bold text-xl text-ink-900 mt-1 leading-tight">
                {winner.name}
              </div>
              <div className="inked-label text-ink-800/90 tracking-[0.2em] mt-0.5">
                Conclave Champion
              </div>
            </div>
          </div>
        )}

        {/* --- Standings leaderboard -------------------------------------------- */}
        <div className="page overflow-hidden">
          <h3 className="chapter text-2xs px-3 pt-2.5 pb-2">Standings</h3>
          <table className="w-full text-2xs border-collapse">
            <thead>
              <tr className="brass-plate">
                <th className="text-left font-display uppercase tracking-wider px-2 py-1.5 w-6">#</th>
                <th className="text-left font-display uppercase tracking-wider px-1 py-1.5">Mage</th>
                <th className="text-center font-display uppercase tracking-wider px-1 py-1.5 w-7">W</th>
                <th className="text-center font-display uppercase tracking-wider px-1 py-1.5 w-7">L</th>
                <th className="text-center font-display uppercase tracking-wider px-1 py-1.5 w-9">Pts</th>
                <th className="text-center font-display uppercase tracking-wider px-1 py-1.5 w-10">Trial</th>
              </tr>
            </thead>
            <tbody>
              {sortedStandings.map((s, i) => {
                const isPlayer = s.mageId === 'player';
                return (
                  <tr
                    key={s.mageId}
                    className={`border-b border-ink-700/20 ${
                      isPlayer
                        ? 'bg-brass-300/70 text-ink-900'
                        : i % 2 === 1
                        ? 'bg-parchment-300/40 text-ink-800'
                        : 'text-ink-800'
                    }`}
                  >
                    <td className="px-2 py-1.5 font-display font-bold text-ink-600 tabular-nums">
                      {i + 1}
                    </td>
                    <td className={`px-1 py-1.5 ${isPlayer ? 'font-bold' : 'font-medium'}`}>
                      <span className="flex items-center gap-1">
                        {isPlayer && <Glyph name="hat" className="w-3 h-3 text-brass-900 shrink-0" />}
                        <span className="truncate">{s.name}</span>
                      </span>
                    </td>
                    <td className="text-center px-1 py-1.5 tabular-nums">{s.wins}</td>
                    <td className="text-center px-1 py-1.5 tabular-nums">{s.losses}</td>
                    <td className="text-center px-1 py-1.5 font-display font-bold text-sm tabular-nums">
                      {s.points}
                    </td>
                    <td className="text-center px-1 py-1.5 text-ink-600 tabular-nums">
                      {s.grandTrialScore}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* --- Marshal's actions -------------------------------------------------- */}
        <div className="space-y-2">
          {conclave.phase === 'grand_trial' && (
            <button onClick={() => resolveGrandTrial()} className="btn btn-brass w-full">
              <Glyph name="star" className="w-4 h-4" />
              Run Grand Trial
            </button>
          )}
          {conclave.phase === 'swiss' && !hasPendingMatch && conclave.currentSwissRound < conclave.maxSwissRounds && (
            <button onClick={() => resolveSwissRound()} className="btn btn-wood w-full">
              <Glyph name="swords" className="w-4 h-4" />
              Run Swiss Round {conclave.currentSwissRound + 1}
            </button>
          )}
          {conclave.phase === 'swiss' && hasPendingMatch && (
            <div className="plaque-aged px-3 py-2 marginalia text-2xs text-center">
              Resolve your match above to continue.
            </div>
          )}
          {conclave.phase === 'ascension' && !hasPendingMatch && (
            <button onClick={() => resolveAscensionDuel()} className="btn btn-brass w-full">
              <Glyph name="bolt" className="w-4 h-4" />
              Run Ascension Duel
            </button>
          )}
          {conclave.phase === 'ascension' && hasPendingMatch && (
            <div className="plaque-aged px-3 py-2 marginalia text-2xs text-center">
              Resolve your Ascension Duel above!
            </div>
          )}
        </div>

        {/* --- Herald's log --------------------------------------------------------- */}
        <div className="plaque-aged px-3 py-2 max-h-52 overflow-y-auto">
          <h3 className="chapter text-2xs mb-1.5">Tournament Log</h3>
          <div className="space-y-0.5">
            {conclave.log.slice(-15).map((entry, i) => (
              <div key={i} className="font-display italic text-2xs text-ink-800 leading-snug">
                <span className="text-brass-800 not-italic mr-1">❧</span>
                {entry}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** One phase of the tournament, struck as a wax seal. */
function PhaseSeal({
  glyph,
  label,
  active,
  done,
}: {
  glyph: GlyphName;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 w-14 shrink-0">
      <span
        className={`${done ? 'seal-wood' : active ? 'seal-ox' : 'seal-blank'} w-9 h-9 ${
          active ? 'shadow-gilt' : ''
        }`}
      >
        <Glyph name={done ? 'check' : glyph} className="w-4 h-4" strokeWidth={2.2} />
      </span>
      <span
        className={`text-2xs leading-tight text-center font-display ${
          active ? 'font-bold text-ink-900' : done ? 'text-ink-700' : 'text-ink-500'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/** The cord strung between two phase seals. */
function PhaseCord({ filled }: { filled: boolean }) {
  return (
    <span
      className={`flex-1 h-0.5 mt-4 rounded-full ${filled ? 'bg-brass-700' : 'bg-ink-500/35'}`}
      style={filled ? { boxShadow: '0 0 6px rgba(184,134,11,0.6)' } : undefined}
    />
  );
}
