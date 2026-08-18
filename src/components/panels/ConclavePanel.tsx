import { useGameStore } from '../../store/gameStore';

export function ConclavePanel() {
  const conclave = useGameStore((s) => s.world.conclave);
  const startConclave = useGameStore((s) => s.startConclave);
  const resolveGrandTrial = useGameStore((s) => s.resolveGrandTrial);
  const resolveSwissRound = useGameStore((s) => s.resolveSwissRound);
  const resolveAscensionDuel = useGameStore((s) => s.resolveAscensionDuel);

  if (!conclave) {
    return (
      <div className="p-4 text-slate-200 overflow-y-auto h-full">
        <h2 className="text-lg font-bold text-purple-400 mb-3">The Conclave</h2>
        <div className="text-slate-400 text-sm mb-4">
          The final tournament. Face rival mages in a three-act competition:
          a Grand Trial, Swiss rounds, and the Ascension Duel.
        </div>
        <button
          onClick={() => startConclave()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-semibold text-sm"
        >
          ⚔ Begin the Conclave
        </button>
      </div>
    );
  }

  const sortedStandings = [...conclave.standings].sort((a, b) => b.points - a.points || b.wins - a.wins);
  const winner = conclave.winner ? conclave.participants.find(m => m.id === conclave.winner) : null;

  return (
    <div className="p-4 text-slate-200 overflow-y-auto h-full">
      <h2 className="text-lg font-bold text-purple-400 mb-3">The Conclave</h2>

      {/* Phase indicator */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm">
          <PhaseBadge active={conclave.phase === 'grand_trial'} label="Grand Trial" />
          <span className="text-slate-600">→</span>
          <PhaseBadge active={conclave.phase === 'swiss'} label={`Swiss R${conclave.currentSwissRound}/${conclave.maxSwissRounds}`} />
          <span className="text-slate-600">→</span>
          <PhaseBadge active={conclave.phase === 'ascension'} label="Ascension" />
          <span className="text-slate-600">→</span>
          <PhaseBadge active={conclave.phase === 'complete'} label="Complete" />
        </div>
      </div>

      {/* Winner display */}
      {conclave.phase === 'complete' && winner && (
        <div className="mb-4 p-4 bg-amber-500/20 border border-amber-500 rounded text-center">
          <div className="text-2xl">🏆</div>
          <div className="text-lg font-bold text-amber-400 mt-1">{winner.name}</div>
          <div className="text-sm text-amber-300">Conclave Champion</div>
        </div>
      )}

      {/* Standings table */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-slate-300 mb-2">Standings</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="text-left py-1">#</th>
              <th className="text-left py-1">Mage</th>
              <th className="text-center py-1">W</th>
              <th className="text-center py-1">L</th>
              <th className="text-center py-1">Pts</th>
              <th className="text-center py-1">Trial</th>
            </tr>
          </thead>
          <tbody>
            {sortedStandings.map((s, i) => (
              <tr key={s.mageId} className={`border-b border-slate-800 ${s.mageId === 'player' ? 'text-amber-400' : 'text-slate-300'}`}>
                <td className="py-1">{i + 1}</td>
                <td className="py-1 font-medium">{s.name}</td>
                <td className="text-center py-1">{s.wins}</td>
                <td className="text-center py-1">{s.losses}</td>
                <td className="text-center py-1 font-bold">{s.points}</td>
                <td className="text-center py-1 text-slate-500">{s.grandTrialScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action buttons */}
      <div className="mb-4 space-y-2">
        {conclave.phase === 'grand_trial' && (
          <button
            onClick={() => resolveGrandTrial()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-semibold text-sm w-full"
          >
            Run Grand Trial
          </button>
        )}
        {conclave.phase === 'swiss' && conclave.currentSwissRound < conclave.maxSwissRounds && (
          <button
            onClick={() => resolveSwissRound()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold text-sm w-full"
          >
            Run Swiss Round {conclave.currentSwissRound + 1}
          </button>
        )}
        {conclave.phase === 'ascension' && (
          <button
            onClick={() => resolveAscensionDuel()}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold text-sm w-full"
          >
            ⚔ Run Ascension Duel
          </button>
        )}
        {conclave.phase === 'swiss' && conclave.currentSwissRound >= conclave.maxSwissRounds && (
          <div className="text-sm text-slate-400">Swiss rounds complete. Proceeding to Ascension...</div>
        )}
      </div>

      {/* Log */}
      <div className="bg-slate-800/50 rounded p-2 max-h-48 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-400 mb-1">Tournament Log</div>
        {conclave.log.slice(-15).map((entry, i) => (
          <div key={i} className="text-xs text-slate-300 mb-0.5">{entry}</div>
        ))}
      </div>
    </div>
  );
}

function PhaseBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
      active ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-500'
    }`}>
      {label}
    </span>
  );
}
