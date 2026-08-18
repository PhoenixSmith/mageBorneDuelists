import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getAvailableQuests } from '../../game/engine/world';
import type { Quest } from '../../types';

const QUEST_TYPE_LABELS: Record<string, string> = {
  short_job: 'Short Job',
  quest_chain: 'Quest Chain',
  personal_trial: 'Personal Trial',
  rival_objective: 'Rival Objective',
};

const QUEST_TYPE_COLORS: Record<string, string> = {
  short_job: 'text-green-400',
  quest_chain: 'text-purple-400',
  personal_trial: 'text-amber-400',
  rival_objective: 'text-red-400',
};

function QuestCard({
  quest,
  onAccept,
  onComplete,
  onAbandon,
  onSelect,
  isSelected,
}: {
  quest: Quest;
  onAccept?: () => void;
  onComplete?: () => void;
  onAbandon?: () => void;
  onSelect?: () => void;
  isSelected: boolean;
}) {
  const currentStage = quest.stages[quest.currentStage];
  const isComplete = quest.currentStage >= quest.stages.length;

  return (
    <div
      className={`p-3 rounded border cursor-pointer transition-colors ${
        isSelected
          ? 'border-amber-500 bg-amber-500/10'
          : 'border-slate-700 bg-slate-800 hover:border-slate-600'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm text-slate-100">{quest.name}</span>
        <span className={`text-[10px] font-semibold ${QUEST_TYPE_COLORS[quest.type] ?? 'text-slate-400'}`}>
          {QUEST_TYPE_LABELS[quest.type] ?? quest.type}
        </span>
      </div>
      <div className="text-xs text-slate-400 mb-2">{quest.description}</div>

      {!isComplete && currentStage && (
        <div className="text-xs text-slate-300 mb-1">
          <span className="text-slate-500">Stage {quest.currentStage + 1}/{quest.stages.length}:</span>{' '}
          {currentStage.description}
        </div>
      )}

      {isComplete && (
        <div className="text-xs text-green-400 mb-1">✓ All stages complete</div>
      )}

      {quest.expiresDay && (
        <div className="text-[10px] text-slate-500">
          Expires: Day {quest.expiresDay}
        </div>
      )}

      <div className="flex gap-1 mt-2">
        {onAccept && (
          <button
            onClick={(e) => { e.stopPropagation(); onAccept(); }}
            className="px-2 py-1 text-[10px] bg-green-600 hover:bg-green-500 text-white rounded font-bold"
          >
            Accept
          </button>
        )}
        {onComplete && (
          <button
            onClick={(e) => { e.stopPropagation(); onComplete(); }}
            className="px-2 py-1 text-[10px] bg-amber-600 hover:bg-amber-500 text-white rounded font-bold"
          >
            Complete
          </button>
        )}
        {onAbandon && (
          <button
            onClick={(e) => { e.stopPropagation(); onAbandon(); }}
            className="px-2 py-1 text-[10px] bg-red-600 hover:bg-red-500 text-white rounded font-bold"
          >
            Abandon
          </button>
        )}
      </div>
    </div>
  );
}

function QuestDetail({ quest, onComplete, onAbandon }: { quest: Quest; onComplete?: () => void; onAbandon?: () => void }) {
  return (
    <div className="p-3 rounded border border-amber-600 bg-slate-800">
      <div className="font-bold text-sm text-amber-400 mb-1">{quest.name}</div>
      <div className="text-xs text-slate-400 mb-2">{quest.description}</div>

      <div className="text-xs font-semibold text-slate-300 mb-1">Stages:</div>
      <div className="space-y-1 mb-3">
        {quest.stages.map((stage, i) => (
          <div key={i} className={`text-xs flex items-center gap-2 ${
            i < quest.currentStage ? 'text-green-400' :
            i === quest.currentStage ? 'text-amber-400' : 'text-slate-500'
          }`}>
            <span>{i < quest.currentStage ? '✓' : i === quest.currentStage ? '▶' : '○'}</span>
            <span>{stage.description}</span>
            <span className="text-slate-600">({stage.resolutionType})</span>
          </div>
        ))}
      </div>

      <div className="text-xs font-semibold text-slate-300 mb-1">Rewards:</div>
      <div className="text-xs text-slate-400 space-y-0.5 mb-3">
        {quest.rewards.coin && <div>🪙 {quest.rewards.coin} coin</div>}
        {quest.rewards.reputation && <div>⭐ {quest.rewards.reputation} reputation</div>}
        {quest.rewards.title && <div>🏅 {quest.rewards.title}</div>}
        {quest.rewards.reagents && (
          <div>
            💎 Reagents: {Object.entries(quest.rewards.reagents).map(([k, v]) => `${v} ${k}`).join(', ')}
          </div>
        )}
        {quest.rewards.spells && <div>📜 Spells: {quest.rewards.spells.join(', ')}</div>}
        {quest.rewards.masteryDeed && (
          <div className="text-amber-400">
            ✦ {quest.rewards.masteryDeed.element} mastery deed: {quest.rewards.masteryDeed.deed}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {onComplete && (
          <button
            onClick={onComplete}
            className="px-3 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded font-bold"
          >
            Complete Quest
          </button>
        )}
        {onAbandon && (
          <button
            onClick={onAbandon}
            className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded font-bold"
          >
            Abandon
          </button>
        )}
      </div>
    </div>
  );
}

export function QuestsPanel() {
  const world = useGameStore((s) => s.world);
  const acceptQuest = useGameStore((s) => s.acceptQuest);
  const completeQuest = useGameStore((s) => s.completeQuest);
  const generateSettlementQuests = useGameStore((s) => s.generateSettlementQuests);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);

  const activeQuests = world.activeQuests;
  const availableQuests = getAvailableQuests(world);
  const completed = world.completedQuests;

  // Check if player is at a settlement
  const playerHex = world.hexes[world.playerHexId];
  const settlementId = playerHex?.settlementId;
  const settlement = settlementId ? world.settlements[settlementId] : undefined;

  const selectedQuest =
    activeQuests.find((q) => q.id === selectedQuestId) ??
    availableQuests.find((q) => q.id === selectedQuestId);

  return (
    <div className="p-4 text-slate-200 overflow-y-auto h-full">
      <h2 className="text-lg font-bold text-green-400 mb-3">Quests</h2>

      {/* Available Quests */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-300">Available</h3>
          {settlement && (
            <button
              onClick={() => generateSettlementQuests(settlement.id)}
              className="px-2 py-1 text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-bold"
            >
              Generate Jobs
            </button>
          )}
        </div>
        {!settlement && (
          <div className="text-xs text-slate-500 mb-2">Visit a settlement to find work.</div>
        )}
        {settlement && availableQuests.length === 0 && (
          <div className="text-xs text-slate-500 mb-2">
            No jobs available. Click "Generate Jobs" to look for work.
          </div>
        )}
        {availableQuests.length > 0 && (
          <div className="space-y-2">
            {availableQuests.map((q) => (
              <QuestCard
                key={q.id}
                quest={q}
                onAccept={() => acceptQuest(q.id)}
                onSelect={() => setSelectedQuestId(q.id === selectedQuestId ? null : q.id)}
                isSelected={q.id === selectedQuestId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Active Quests */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Active ({activeQuests.length})</h3>
        {activeQuests.length === 0 ? (
          <div className="text-xs text-slate-500">No active quests.</div>
        ) : (
          <div className="space-y-2">
            {activeQuests.map((q) => (
              <QuestCard
                key={q.id}
                quest={q}
                onComplete={() => completeQuest(q.id)}
                onSelect={() => setSelectedQuestId(q.id === selectedQuestId ? null : q.id)}
                isSelected={q.id === selectedQuestId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quest Detail */}
      {selectedQuest && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Details</h3>
          <QuestDetail
            quest={selectedQuest}
            onComplete={selectedQuest.currentStage >= selectedQuest.stages.length - 1
              ? () => { completeQuest(selectedQuest.id); setSelectedQuestId(null); }
              : undefined
            }
          />
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Completed ({completed.length})</h3>
          <div className="text-xs text-slate-500">
            {completed.map((id) => id.split('_')[0]).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}
