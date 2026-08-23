import { useState } from 'react';
import { MetaProvider, useMeta } from './state/store';
import type { BattleConfig, Side } from './game/types';
import { ALL_CARDS, STARTER_COLLECTION, STORY_LEVELS, cardById, survivalDeck, vsDeck } from './game/cards';
import BattleScreen from './components/BattleScreen';
import { CollectionScreen, DeckScreen, ShopScreen, StoryScreen, SurvivalScreen, TitleScreen, VersusScreen } from './components/screens';
import { Sigil } from './components/icons';
import { sfx } from './game/audio';

type Screen =
  | { name: 'title' }
  | { name: 'story' }
  | { name: 'survival' }
  | { name: 'versus' }
  | { name: 'arsenal' }
  | { name: 'shop' }
  | { name: 'collection' }
  | { name: 'battle' };

interface Reward {
  title: string;
  lines: string[];
  gold: number;
  next: () => void;
  nextLabel: string;
}

/* baraja 20 cartas al azar de la colección (o del mazo enemigo base) */
function buildBattleDeck(poolIds: string[]): import('./game/types').CardDef[] {
  const pool = poolIds.map(cardById);
  const deck = [...pool];
  while (deck.length < 20) deck.push(pool[Math.floor(Math.random() * pool.length)]);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, 20);
}

function shuffleDefs(deck: import('./game/types').CardDef[]): import('./game/types').CardDef[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function playerBattleDeck(collection: Record<string, number>, saved: string[] = []): import('./game/types').CardDef[] {
  if (saved.length === 20 && saved.every((id) => ALL_CARDS[id])) {
    const deck = shuffleDefs(saved.map(cardById));
    return deck;
  }
  const pool: import('./game/types').CardDef[] = [];
  Object.entries(collection).forEach(([id, n]) => {
    const def = ALL_CARDS[id];
    if (def && def.side === 'player') for (let i = 0; i < n; i++) pool.push(def);
  });
  const fallback = Object.entries(STARTER_COLLECTION).flatMap(([id, n]) => Array.from({ length: n }, () => ALL_CARDS[id]));
  const deck = [...(pool.length >= 20 ? pool : [...pool, ...fallback])];
  while (deck.length < 20) deck.push(pool[Math.floor(Math.random() * pool.length)] ?? fallback[0]);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, 20);
}

function Inner() {
  const { meta, dispatch } = useMeta();
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  const [battleCtx, setBattleCtx] = useState<{ cfg: BattleConfig; mode: 'historia' | 'supervivencia' | 'versus'; param: number } | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const [streak, setStreak] = useState(0);
  const [battleKey, setBattleKey] = useState(0);

  const startStory = (level: number) => {
    const lv = STORY_LEVELS[level - 1];
    const cfg: BattleConfig = {
      mode: 'historia', level,
      title: lv.title,
      enemyHeroName: lv.hero,
      enemyIcon: lv.heroIcon,
      enemyHue: lv.hue,
      playerDeck: playerBattleDeck(meta.collection, meta.deck),
      enemyDeck: buildBattleDeck(lv.deck),
      heroHp: 25, maxRounds: 20,
      enemyStatBonus: lv.bonus, enemyEnergyBonus: 0,
    };
    setBattleCtx({ cfg, mode: 'historia', param: level });
    setBattleKey((k) => k + 1);
    setScreen({ name: 'battle' });
  };

  const startSurvival = (curStreak: number) => {
    const cfg: BattleConfig = {
      mode: 'supervivencia',
      title: `Horda ${curStreak + 1}`,
      enemyHeroName: curStreak >= 8 ? 'La Horda Eterna' : `Señor de la Horda ${curStreak + 1}`,
      enemyIcon: 'skull',
      enemyHue: 0,
      playerDeck: playerBattleDeck(meta.collection, meta.deck),
      enemyDeck: buildBattleDeck(survivalDeck(curStreak + 1)),
      heroHp: 25 + Math.min(curStreak * 2, 10), maxRounds: 20,
      enemyStatBonus: Math.min(curStreak, 6), enemyEnergyBonus: curStreak >= 3 ? 1 : 0,
    };
    setBattleCtx({ cfg, mode: 'supervivencia', param: curStreak });
    setBattleKey((k) => k + 1);
    setScreen({ name: 'battle' });
  };

  const startVersus = (diff: number) => {
    const v = vsDeck(diff);
    const names = ['Caudillo Bandido', 'Señor de la Guerra', 'Heraldo del Abismo'];
    const icons = ['dagger', 'claw', 'demon'];
    const hues = [45, 20, 340];
    const cfg: BattleConfig = {
      mode: 'versus',
      title: `Duelo: ${['Recluta', 'Veterano', 'Élite'][diff]}`,
      enemyHeroName: names[diff],
      enemyIcon: icons[diff],
      enemyHue: hues[diff],
      playerDeck: playerBattleDeck(meta.collection, meta.deck),
      enemyDeck: buildBattleDeck(v.deck),
      heroHp: 25, maxRounds: 20,
      enemyStatBonus: v.bonus, enemyEnergyBonus: v.energy,
    };
    setBattleCtx({ cfg, mode: 'versus', param: diff });
    setBattleKey((k) => k + 1);
    setScreen({ name: 'battle' });
  };

  const onBattleEnd = (won: boolean, stats: { kills: number; rounds: number }, conceded: boolean) => {
    setScreen({ name: 'title' });
    if (!battleCtx) return;
    const { mode, param } = battleCtx;
    if (mode === 'historia') {
      const lv = STORY_LEVELS[param - 1];
      if (won && !conceded) {
        const first = !meta.storyCleared.includes(param);
        const gold = first ? lv.reward : 25;
        dispatch({ type: 'battleEnd', won: true, reward: gold });
        if (first) dispatch({ type: 'storyClear', level: param });
        setReward({
          title: 'Botín de guerra',
          lines: [
            `${lv.title} superado · ${stats.kills} bajas en ${stats.rounds} rondas.`,
            first ? (param < 8 ? `Nuevo estandarte desbloqueado: ${STORY_LEVELS[param].title}.` : 'La campaña está completa. El reino respira.') : 'Recompensa por repetir la campaña.',
          ],
          gold,
          next: () => { setReward(null); setScreen({ name: 'story' }); },
          nextLabel: 'Volver al mapa',
        });
      } else {
        dispatch({ type: 'battleEnd', won: false, reward: 0 });
        setReward({
          title: 'Derrota',
          lines: [conceded ? 'Abandonaste el campo. El oro no se gana huyendo.' : `${lv.hero} se alzó vencedor. Afila el acero e inténtalo de nuevo.`],
          gold: 0,
          next: () => { setReward(null); setScreen({ name: 'story' }); },
          nextLabel: 'Volver al mapa',
        });
      }
    } else if (mode === 'supervivencia') {
      if (won && !conceded) {
        const newStreak = streak + 1;
        const gold = 12 + 4 * streak;
        dispatch({ type: 'battleEnd', won: true, reward: gold });
        dispatch({ type: 'survival', streak: newStreak });
        setStreak(newStreak);
        setReward({
          title: `Ronda ${newStreak} superada`,
          lines: [`Racha: ${newStreak} · ${stats.kills} bajas.`, 'La siguiente horda ya huele la sangre. Tu héroe sana sus heridas.'],
          gold,
          next: () => { setReward(null); startSurvival(newStreak); },
          nextLabel: 'Siguiente cacería',
        });
      } else {
        dispatch({ type: 'battleEnd', won: false, reward: 0 });
        dispatch({ type: 'survival', streak });
        const gold = streak > 0 && !conceded ? 10 : 0;
        if (gold > 0) dispatch({ type: 'gold', amount: gold });
        setStreak(0);
        setReward({
          title: 'Fin de la cacería',
          lines: [
            streak > 0 ? `Caíste tras ${streak} ${streak === 1 ? 'victoria' : 'victorias'}. Récord: ${Math.max(meta.survivalBest, streak)}.` : 'La primera horda pudo contigo.',
            conceded ? 'Te retiraste con el botín de la ronda.' : 'Consuelo del mercader: unas monedas.',
          ],
          gold,
          next: () => { setReward(null); setScreen({ name: 'survival' }); },
          nextLabel: 'Volver al campamento',
        });
      }
    } else {
      const rewards = [30, 60, 100];
      const names = ['Recluta', 'Veterano', 'Élite'];
      if (won && !conceded) {
        dispatch({ type: 'battleEnd', won: true, reward: rewards[param] });
        dispatch({ type: 'vsWin' });
        setReward({
          title: 'Duelo ganado',
          lines: [`Victoria en categoría ${names[param]} · ${stats.kills} bajas.`, 'El perdedor paga su deuda en oro.'],
          gold: rewards[param],
          next: () => { setReward(null); setScreen({ name: 'versus' }); },
          nextLabel: 'Otro duelo',
        });
      } else {
        dispatch({ type: 'battleEnd', won: false, reward: 0 });
        setReward({
          title: 'Duelo perdido',
          lines: [conceded ? 'Abandonaste el duelo. Sin honor no hay oro.' : 'El rival fue más rápido esta vez.'],
          gold: 0,
          next: () => { setReward(null); setScreen({ name: 'versus' }); },
          nextLabel: 'Volver al duelo',
        });
      }
    }
    setBattleCtx(null);
  };

  return (
    <div className="min-h-screen bg-ink-950 text-bone-300 no-select">
      {screen.name === 'title' && <TitleScreen onNav={(s) => setScreen({ name: s } as Screen)} />}
      {screen.name === 'story' && <StoryScreen onBack={() => setScreen({ name: 'title' })} onPlay={startStory} />}
      {screen.name === 'survival' && <SurvivalScreen onBack={() => setScreen({ name: 'title' })} onPlay={() => startSurvival(0)} best={meta.survivalBest} />}
      {screen.name === 'versus' && <VersusScreen onBack={() => setScreen({ name: 'title' })} onPlay={startVersus} />}
      {screen.name === 'arsenal' && <DeckScreen onBack={() => setScreen({ name: 'title' })} />}
      {screen.name === 'shop' && <ShopScreen onBack={() => setScreen({ name: 'title' })} />}
      {screen.name === 'collection' && <CollectionScreen onBack={() => setScreen({ name: 'title' })} />}
      {screen.name === 'battle' && battleCtx && (
        <BattleScreen key={battleKey} cfg={battleCtx.cfg} onEnd={onBattleEnd} />
      )}

      {/* recompensa / resultado */}
      {reward && (
        <div className="fixed inset-0 z-[60] bg-ink-950/92 flex items-center justify-center p-4">
          <div className="panel-dark max-w-md w-full p-8 text-center anim-zoom-in">
            <p className="font-display text-4xl text-gold-400 text-glow-gold">{reward.title}</p>
            {reward.lines.map((l, i) => (
              <p key={i} className="font-body text-sm text-bone-300 mt-3 leading-snug">{l}</p>
            ))}
            <div className="mt-5 flex items-center justify-center gap-2 font-display text-3xl text-gold-400 text-glow-gold">
              <Sigil icon="coin" className="w-7 h-7" /> +{reward.gold}
            </div>
            <button onClick={() => { sfx.click(); reward.next(); }}
              className="btn-rune mt-6 px-8 py-2.5 text-xl font-bold text-bone-100"
              style={{ background: 'linear-gradient(160deg, #8e1526, #5c0d18)', border: '1px solid rgba(255,77,94,0.5)', boxShadow: '0 0 22px rgba(224,47,69,0.4)' }}>
              {reward.nextLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <MetaProvider>
      <Inner />
    </MetaProvider>
  );
}

export type { Side };
