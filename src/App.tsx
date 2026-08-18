import { useGameStore } from './store/gameStore';
import { TopBar, BottomNav, ChronicleLog } from './components/Shell';
import { MapPanel } from './components/panels/MapPanel';
import { DeckPanel } from './components/panels/DeckPanel';
import { CombatPanel } from './components/panels/CombatPanel';
import { QuestsPanel } from './components/panels/QuestsPanel';
import { ShopPanel } from './components/panels/ShopPanel';
import { CharacterPanel } from './components/panels/CharacterPanel';

function App() {
  const activePanel = useGameStore((s) => s.activePanel);

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white">
      <TopBar />
      <div className="flex-1 overflow-hidden">
        {activePanel === 'map' && <MapPanel />}
        {activePanel === 'deck' && <DeckPanel />}
        {activePanel === 'combat' && <CombatPanel />}
        {activePanel === 'quests' && <QuestsPanel />}
        {activePanel === 'shop' && <ShopPanel />}
        {activePanel === 'character' && <CharacterPanel />}
      </div>
      <ChronicleLog />
      <BottomNav />
    </div>
  );
}

export default App;
