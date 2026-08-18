import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getAvailableQuests } from '../../game/engine/world';
import type { Quest } from '../../types';
import { Glyph, Seal, type GlyphName, type SealTone } from '../Sigils';

const QUEST_TYPE_LABELS: Record<string, string> = {
  short_job: 'Short Job',
  quest_chain: 'Quest Chain',
  personal_trial: 'Personal Trial',
  rival_objective: 'Rival Objective',
};

/** Each quest type is sealed in its own wax. */
const QUEST_TYPE_SEAL: Record<string, { tone: SealTone; glyph: GlyphName; text: string }> = {
  short_job: { tone: 'moss', glyph: 'quill', text: 'text-moss-deep' },
  quest_chain: { tone: 'tide', glyph: 'chain', text: 'text-tide-deep' },
  personal_trial: { tone: 'brass', glyph: 'star', text: 'text-brass-900' },
  rival_objective: { tone: 'ox', glyph: 'swords', text: 'text-oxblood-800' },
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
  const seal = QUEST_TYPE_SEAL[quest.type] ?? {
    tone: 'ink' as SealTone,
    glyph: 'scroll' as GlyphName,
    text: 'text-ink-700',
  };

  return (
    <div
      className={`plaque px-3 py-2.5 cursor-pointer transition-all ${
        isSelected ? 'border-brass-700 shadow-gilt' : 'hover:border-ink-800'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <Seal glyph={seal.glyph} tone={seal.tone} size="md" title={QUEST_TYPE_LABELS[quest.type]} />
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-[15px] leading-tight text-ink-900">
            {quest.name}
          </div>
          <div className={`inked-label ${seal.text}`}>
            {QUEST_TYPE_LABELS[quest.type] ?? quest.type}
          </div>
        </div>
        {quest.expiresDay && (
          <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded border border-oxblood-700 text-oxblood-800 text-2xs font-semibold">
            <Glyph name="clock" className="w-3 h-3" />
            Day {quest.expiresDay}
          </span>
        )}
      </div>

      <p className="text-2xs italic text-ink-700 leading-snug mt-1.5">{quest.description}</p>

      {!isComplete && currentStage && (
        <div className="slip mt-2 px-2 py-1.5 text-2xs text-ink-800 leading-snug">
          <span className="inked-label text-ink-600 mr-1">
            Stage {quest.currentStage + 1}/{quest.stages.length}
          </span>
          {currentStage.description}
        </div>
      )}

      {isComplete && (
        <div className="flex items-center gap-1 mt-2 text-2xs font-semibold text-moss-deep">
          <Glyph name="check" className="w-3.5 h-3.5" />
          All stages complete
        </div>
      )}

      {(onAccept || onComplete || onAbandon) && (
        <div className="flex gap-1.5 mt-2">
          {onAccept && (
            <button
              onClick={(e) => { e.stopPropagation(); onAccept(); }}
              className="btn btn-sm btn-moss"
            >
              <Glyph name="quill" className="w-3.5 h-3.5" />
              Accept
            </button>
          )}
          {onComplete && (
            <button
              onClick={(e) => { e.stopPropagation(); onComplete(); }}
              className="btn btn-sm btn-brass"
            >
              <Glyph name="check" className="w-3.5 h-3.5" />
              Complete
            </button>
          )}
          {onAbandon && (
            <button
              onClick={(e) => { e.stopPropagation(); onAbandon(); }}
              className="btn btn-sm btn-ox"
            >
              Abandon
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RewardLine({ glyph, children }: { glyph: GlyphName; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-2xs text-ink-800">
      <Glyph name={glyph} className="w-3.5 h-3.5 text-brass-800 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function QuestDetail({ quest, onComplete, onAbandon }: { quest: Quest; onComplete?: () => void; onAbandon?: () => void }) {
  return (
    <div className="page px-3 py-3 border-brass-700">
      <div className="font-display font-bold text-lg leading-tight text-ink-900">{quest.name}</div>
      <p className="text-2xs italic text-ink-700 leading-snug mt-1">{quest.description}</p>

      <div className="rule-ornate my-2" />

      <h4 className="chapter text-2xs mb-1.5">Stages</h4>
      <div className="space-y-1 mb-3">
        {quest.stages.map((stage, i) => {
          const done = i < quest.currentStage;
          const current = i === quest.currentStage;
          return (
            <div
              key={i}
              className={`flex items-start gap-2 text-2xs leading-snug ${
                done ? 'text-moss-deep' : current ? 'text-ink-900' : 'text-ink-500'
              }`}
            >
              <span
                className={`mt-px shrink-0 w-4 h-4 rounded-sm border flex items-center justify-center ${
                  done
                    ? 'border-moss-deep bg-moss-wash'
                    : current
                    ? 'border-brass-700 bg-brass-300'
                    : 'border-ink-500/60 bg-parchment-200'
                }`}
              >
                {done && <Glyph name="check" className="w-3 h-3" strokeWidth={2.6} />}
                {current && <Glyph name="quill" className="w-2.5 h-2.5 text-brass-900" />}
              </span>
              <span className={current ? 'font-semibold' : ''}>
                {stage.description}
                <span className="text-ink-500 italic ml-1">({stage.resolutionType})</span>
              </span>
            </div>
          );
        })}
      </div>

      <h4 className="chapter text-2xs mb-1.5">Rewards</h4>
      <div className="slip px-2 py-1.5 space-y-1 mb-3">
        {quest.rewards.coin && <RewardLine glyph="coin">{quest.rewards.coin} coin</RewardLine>}
        {quest.rewards.reputation && (
          <RewardLine glyph="star">{quest.rewards.reputation} reputation</RewardLine>
        )}
        {quest.rewards.title && <RewardLine glyph="rosette">{quest.rewards.title}</RewardLine>}
        {quest.rewards.reagents && (
          <RewardLine glyph="gem">
            {Object.entries(quest.rewards.reagents).map(([k, v]) => `${v} ${k}`).join(', ')}
          </RewardLine>
        )}
        {quest.rewards.spells && (
          <RewardLine glyph="scroll">{quest.rewards.spells.join(', ')}</RewardLine>
        )}
        {quest.rewards.masteryDeed && (
          <RewardLine glyph="essence">
            <span className="capitalize">{quest.rewards.masteryDeed.element}</span> mastery deed:{' '}
            {quest.rewards.masteryDeed.deed}
          </RewardLine>
        )}
      </div>

      {(onComplete || onAbandon) && (
        <div className="flex gap-2">
          {onComplete && (
            <button onClick={onComplete} className="btn btn-brass flex-1">
              <Glyph name="check" className="w-4 h-4" />
              Complete Quest
            </button>
          )}
          {onAbandon && (
            <button onClick={onAbandon} className="btn btn-ox">
              Abandon
            </button>
          )}
        </div>
      )}
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
    <div className="panel-scroll">
      <div className="p-3 space-y-3">
        {/* --- Header ------------------------------------------------------- */}
        <div className="page px-3 py-2.5 flex items-center gap-2.5">
          <Seal glyph="scroll" tone="ox" size="lg" />
          <div>
            <h2 className="title-display text-xl leading-tight">Notice Board</h2>
            <div className="text-2xs italic text-ink-600">Work, errands, and personal trials</div>
          </div>
        </div>

        {/* --- Available ----------------------------------------------------- */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="chapter text-2xs flex-1 text-parchment-100">Available</h3>
            {settlement && (
              <button
                onClick={() => generateSettlementQuests(settlement.id)}
                className="btn btn-sm btn-wood shrink-0"
              >
                <Glyph name="quill" className="w-3.5 h-3.5" />
                Ask Around
              </button>
            )}
          </div>

          {!settlement && (
            <div className="plaque-aged px-3 py-2 marginalia text-2xs">
              Visit a settlement to find work.
            </div>
          )}
          {settlement && availableQuests.length === 0 && (
            <div className="plaque-aged px-3 py-2 marginalia text-2xs">
              The board is bare. Ask around to see what work the town has.
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

        {/* --- Active -------------------------------------------------------- */}
        <div>
          <h3 className="chapter text-2xs mb-2 text-parchment-100">
            Undertaken · {activeQuests.length}
          </h3>
          {activeQuests.length === 0 ? (
            <div className="plaque-aged px-3 py-2 marginalia text-2xs">
              No quests undertaken.
            </div>
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

        {/* --- Detail --------------------------------------------------------- */}
        {selectedQuest && (
          <div>
            <h3 className="chapter text-2xs mb-2 text-parchment-100">The Writ</h3>
            <QuestDetail
              quest={selectedQuest}
              onComplete={selectedQuest.currentStage >= selectedQuest.stages.length - 1
                ? () => { completeQuest(selectedQuest.id); setSelectedQuestId(null); }
                : undefined
              }
            />
          </div>
        )}

        {/* --- Completed ------------------------------------------------------- */}
        {completed.length > 0 && (
          <div>
            <h3 className="chapter text-2xs mb-2 text-parchment-100">
              Discharged · {completed.length}
            </h3>
            <div className="slip px-2.5 py-2 text-2xs text-ink-600 italic">
              {completed.map((id) => id.split('_')[0]).join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
