import { useState } from 'react';
import { MetaProvider, useMeta } from './state/store';
import type { BattleConfig, MetaState, Side } from './game/types';
import { ALL_CARDS, RELICS, STARTER_COLLECTION, STORY_LEVELS, achById, cardById, pactById, randomRelicOptions, survivalDeck, vsDeck } from './game/cards';
import { resolveChallenges, challengeById, type BattleOutcome } from './game/challenges';
import BattleScreen, { type BattleStats } from './components/BattleScreen';
import { ArsenalHub, BattleHub, FeatsHub, MarketHub, RelicPicker, TitleScreen } from './components/screens';
import { Sigil } from './components/icons';
import { sfx } from './game/audio';

type Screen =
  | { name: 'title' }
  | { name: 'battle' }
  | { name: 'feats' }
  | { name: 'arsenal' }
  | { name: 'market' };

/* Cada hub recuerda en qué pestaña se quedó el jugador. */
type HubTab = { battle: string; feats: string; arsenal: string; market: string };
const initialTabs: HubTab = { battle: 'historia', feats: 'desafios', arsenal: 'forja', market: 'mercader' };

/* Proyección del meta tras aplicar las recompensas de esta batalla (el state aún no se ha actualizado). */
interface ProjectedMeta {
  gold: number;
  totalWins: number;
  dragonsSlain: number;
  vsWins: number;
  storyCleared: number[];
  survivalStreak: number;
  collection: Record<string, number>;
}

function achievementsEarned(meta: MetaState, proj: ProjectedMeta, stats: BattleStats, won: boolean): string[] {
  const uniqueCards = Object.values(proj.collection).filter((n) => n > 0).length;
  const has = (id: string) => meta.achievements.includes(id);
  const earned: string[] = [];
  if (won && !has('ach_primera') && proj.totalWins >= 1) earned.push('ach_primera');
  if (won && !has('ach_ileso') && stats.heroDamageTaken === 0) earned.push('ach_ileso');
  if (won && !has('ach_sacrificio') && stats.heroHpLeft > 0 && stats.heroHpLeft <= 5) earned.push('ach_sacrificio');
  if (!has('ach_nivel4') && proj.storyCleared.includes(4)) earned.push('ach_nivel4');
  if (!has('ach_campana') && proj.storyCleared.length >= 8) earned.push('ach_campana');
  if (!has('ach_dragones') && proj.dragonsSlain >= 3) earned.push('ach_dragones');
  if (!has('ach_racha5') && proj.survivalStreak >= 5) earned.push('ach_racha5');
  if (!has('ach_versus') && proj.vsWins >= 5) earned.push('ach_versus');
  if (!has('ach_rico') && proj.gold >= 1000) earned.push('ach_rico');
  if (!has('ach_coleccionista') && uniqueCards >= 15) earned.push('ach_coleccionista');
  return earned;
}

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
  const [tabs, setTabs] = useState<HubTab>(initialTabs);
  /* Va a un hub dejando la pestaña indicada activa. */
  const go = (hub: Exclude<Screen['name'], 'title'>, tab?: string) => {
    if (hub !== 'battle' && tab) setTabs((t) => ({ ...t, [hub]: tab }));
    setScreen({ name: hub } as Screen);
  };
  const [battleCtx, setBattleCtx] = useState<{ cfg: BattleConfig; mode: 'historia' | 'supervivencia' | 'versus'; param: number; pacts: string[] } | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const [streak, setStreak] = useState(0);
  const [battleKey, setBattleKey] = useState(0);
  const [runRelics, setRunRelics] = useState<string[]>([]);
  const [relicPick, setRelicPick] = useState<{ options: import('./game/types').RelicDef[]; nextStreak: number } | null>(null);

  const startStory = (level: number, pacts: string[] = []) => {
    const lv = STORY_LEVELS[level - 1];
    const heroHp = pacts.includes('pacto_sangre') ? 15 : 25;
    const enemyStatBonus = lv.bonus + (pacts.includes('pacto_hierro') ? 1 : 0);
    const playerEnergyPenalty = pacts.includes('pacto_cuervo') ? 1 : 0;
    const enemyHeroHp = pacts.includes('pacto_ceniza') ? 30 : undefined;
    const cfg: BattleConfig = {
      mode: 'historia', level,
      title: lv.title,
      enemyHeroName: lv.hero,
      enemyIcon: lv.heroIcon,
      enemyHue: lv.hue,
      playerDeck: playerBattleDeck(meta.collection, meta.deck),
      enemyDeck: buildBattleDeck(lv.deck),
      heroHp, enemyHeroHp, maxRounds: 20,
      enemyStatBonus, enemyEnergyBonus: 0,
      playerEnergyPenalty,
      pacts,
    };
    setBattleCtx({ cfg, mode: 'historia', param: level, pacts });
    setBattleKey((k) => k + 1);
    setScreen({ name: 'battle' });
  };

  const startSurvival = (curStreak: number, relics: string[] = []) => {
    setRunRelics(relics);
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
      relics,
    };
    setBattleCtx({ cfg, mode: 'supervivencia', param: curStreak, pacts: [] });
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
    setBattleCtx({ cfg, mode: 'versus', param: diff, pacts: [] });
    setBattleKey((k) => k + 1);
    setScreen({ name: 'battle' });
  };

  const [achToast, setAchToast] = useState<{ id: string; at: number }[]>([]);
  const [chToast, setChToast] = useState<{ id: string; at: number }[]>([]);

  const grantAch = (proj: ProjectedMeta, stats: BattleStats, won: boolean) => {
    const earned = achievementsEarned(meta, proj, stats, won);
    if (earned.length === 0) return;
    const gold = earned.reduce((sum, id) => sum + achById(id).reward, 0);
    dispatch({ type: 'unlockAch', ids: earned, gold });
    setAchToast((t) => [...t, ...earned.map((id, i) => ({ id, at: Date.now() + i }))]);
    earned.forEach((_, i) => {
      setTimeout(() => setAchToast((t) => t.slice(1)), 3200 * (i + 1));
    });
  };

  const onBattleEnd = (won: boolean, stats: BattleStats, conceded: boolean) => {
    setScreen({ name: 'title' });
    if (!battleCtx) return;
    const { mode, param } = battleCtx;

    if (stats.dragonKills > 0) dispatch({ type: 'dragonKills', n: stats.dragonKills });

    // desafíos diarios / semanales
    const outcome: BattleOutcome = {
      mode,
      won: won && !conceded,
      conceded,
      diff: param,
      newStreak: mode === 'supervivencia' ? (won && !conceded ? streak + 1 : streak) : 0,
      kills: stats.kills,
      dragonKills: stats.dragonKills,
      heroDamageTaken: stats.heroDamageTaken,
      heroDamageDealt: stats.heroDamageDealt,
      maxCostPlayed: stats.maxCostPlayed,
      spellsPlayed: stats.spellsPlayed,
    };
    const chRes = resolveChallenges(meta, outcome);
    if (chRes.claimedIds.length > 0 || Object.keys(chRes.counters).length > 0) {
      dispatch({ type: 'challengesResolve', claimedIds: chRes.claimedIds, gold: chRes.gold, counters: chRes.counters });
    }
    if (chRes.claimedIds.length > 0) {
      setChToast((t) => [...t, ...chRes.claimedIds.map((id, i) => ({ id, at: Date.now() + i }))]);
      chRes.claimedIds.forEach((_, i) => {
        setTimeout(() => setChToast((t) => t.slice(1)), 3600 * (i + 1));
      });
    }

    const baseProj = (): ProjectedMeta => ({
      gold: meta.gold,
      totalWins: meta.totalWins,
      dragonsSlain: meta.dragonsSlain + stats.dragonKills,
      vsWins: meta.vsWins,
      storyCleared: meta.storyCleared,
      survivalStreak: 0,
      collection: meta.collection,
    });

    if (mode === 'historia') {
      const lv = STORY_LEVELS[param - 1];
      if (won && !conceded) {
        const first = !meta.storyCleared.includes(param);
        const gold = first ? lv.reward : 25;
        dispatch({ type: 'battleEnd', won: true, reward: gold });
        if (first) dispatch({ type: 'storyClear', level: param });
        grantAch({ ...baseProj(), gold: meta.gold + gold, totalWins: meta.totalWins + 1, storyCleared: first ? [...meta.storyCleared, param] : meta.storyCleared }, stats, true);
        setReward({
          title: 'Botín de guerra',
          lines: [
            `${lv.title} superado · ${stats.kills} bajas en ${stats.rounds} rondas.`,
            first ? (param < 8 ? `Nuevo estandarte desbloqueado: ${STORY_LEVELS[param].title}.` : 'La campaña está completa. El reino respira.') : 'Recompensa por repetir la campaña.',
          ],
          gold,
          next: () => { setReward(null); go('battle', 'historia'); },
          nextLabel: 'Volver al mapa',
        });
      } else {
        dispatch({ type: 'battleEnd', won: false, reward: 0 });
        grantAch(baseProj(), stats, false);
        setReward({
          title: 'Derrota',
          lines: [conceded ? 'Abandonaste el campo. El oro no se gana huyendo.' : `${lv.hero} se alzó vencedor. Afila el acero e inténtalo de nuevo.`],
          gold: 0,
          next: () => { setReward(null); go('battle', 'historia'); },
          nextLabel: 'Volver al mapa',
        });
      }
    } else if (mode === 'supervivencia') {
      if (won && !conceded) {
        const newStreak = streak + 1;
        const bolsa = runRelics.includes('rel_bolsa') ? 5 : 0;
        const gold = 12 + 4 * streak + bolsa;
        dispatch({ type: 'battleEnd', won: true, reward: gold });
        dispatch({ type: 'survival', streak: newStreak });
        setStreak(newStreak);
        grantAch({ ...baseProj(), gold: meta.gold + gold, totalWins: meta.totalWins + 1, survivalStreak: newStreak }, stats, true);
        const canPick = runRelics.length < RELICS.length;
        setReward({
          title: `Ronda ${newStreak} superada`,
          lines: [
            `Racha: ${newStreak} · ${stats.kills} bajas.`,
            bolsa > 0 ? `La Bolsa del Mercenario añade ${bolsa} de oro extra.` : 'La siguiente horda ya huele la sangre. Tu héroe sana sus heridas.',
          ],
          gold,
          next: () => {
            setReward(null);
            if (!canPick) { startSurvival(newStreak, runRelics); return; }
            setRelicPick({ options: randomRelicOptions(runRelics, 3, meta.relicsOwned), nextStreak: newStreak });
          },
          nextLabel: canPick ? 'Elegir reliquia' : 'Siguiente cacería',
        });
      } else {
        dispatch({ type: 'battleEnd', won: false, reward: 0 });
        dispatch({ type: 'survival', streak });
        const gold = streak > 0 && !conceded ? 10 : 0;
        if (gold > 0) dispatch({ type: 'gold', amount: gold });
        setStreak(0);
        setRunRelics([]);
        grantAch({ ...baseProj(), gold: meta.gold + gold }, stats, false);
        setReward({
          title: 'Fin de la cacería',
          lines: [
            streak > 0 ? `Caíste tras ${streak} ${streak === 1 ? 'victoria' : 'victorias'}. Récord: ${Math.max(meta.survivalBest, streak)}.` : 'La primera horda pudo contigo.',
            conceded ? 'Te retiraste con el botín de la ronda.' : 'Consuelo del mercader: unas monedas.',
          ],
          gold,
          next: () => { setReward(null); go('battle', 'supervivencia'); },
          nextLabel: 'Volver al campamento',
        });
      }
    } else {
      const rewards = [30, 60, 100];
      const names = ['Recluta', 'Veterano', 'Élite'];
      if (won && !conceded) {
        dispatch({ type: 'battleEnd', won: true, reward: rewards[param] });
        dispatch({ type: 'vsWin' });
        grantAch({ ...baseProj(), gold: meta.gold + rewards[param], totalWins: meta.totalWins + 1, vsWins: meta.vsWins + 1 }, stats, true);
        setReward({
          title: 'Duelo ganado',
          lines: [`Victoria en categoría ${names[param]} · ${stats.kills} bajas.`, 'El perdedor paga su deuda en oro.'],
          gold: rewards[param],
          next: () => { setReward(null); go('battle', 'versus'); },
          nextLabel: 'Otro duelo',
        });
      } else {
        dispatch({ type: 'battleEnd', won: false, reward: 0 });
        grantAch(baseProj(), stats, false);
        setReward({
          title: 'Duelo perdido',
          lines: [conceded ? 'Abandonaste el duelo. Sin honor no hay oro.' : 'El rival fue más rápido esta vez.'],
          gold: 0,
          next: () => { setReward(null); go('battle', 'versus'); },
          nextLabel: 'Volver al duelo',
        });
      }
    }
    setBattleCtx(null);
  };

  return (
    <div className="min-h-screen bg-ink-950 text-bone-300 no-select">
      {screen.name === 'title' && <TitleScreen onNav={(s) => setScreen({ name: s } as Screen)} />}
      {screen.name === 'battle' && battleCtx ? (
        <BattleScreen key={battleKey} cfg={battleCtx.cfg} onEnd={onBattleEnd} />
      ) : screen.name === 'battle' ? (
        <BattleHub tab={tabs.battle} onTab={(t) => setTabs((p) => ({ ...p, battle: t }))} onBack={() => setScreen({ name: 'title' })}
          onStory={startStory} onSurvival={() => startSurvival(0, [])} onVersus={startVersus} best={meta.survivalBest} />
      ) : null}
      {screen.name === 'feats' && (
        <FeatsHub tab={tabs.feats} onTab={(t) => setTabs((p) => ({ ...p, feats: t }))} onBack={() => setScreen({ name: 'title' })} />
      )}
      {screen.name === 'arsenal' && (
        <ArsenalHub tab={tabs.arsenal} onTab={(t) => setTabs((p) => ({ ...p, arsenal: t }))} onBack={() => setScreen({ name: 'title' })} />
      )}
      {screen.name === 'market' && (
        <MarketHub tab={tabs.market} onTab={(t) => setTabs((p) => ({ ...p, market: t }))} onBack={() => setScreen({ name: 'title' })} />
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

      {/* avisos de desafío completado */}
      {chToast.length > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-[70] flex flex-col items-center gap-2 pointer-events-none px-4">
          {chToast.map((t) => {
            const c = challengeById(t.id);
            return (
              <div key={t.at} className="panel-dark px-5 py-3 flex items-center gap-3 anim-slide-down" style={{ borderColor: `hsl(${c.hue} 60% 45% / 0.7)` }}>
                <span style={{ color: `hsl(${c.hue} 80% 62%)`, filter: `drop-shadow(0 0 8px hsl(${c.hue} 90% 55% / 0.8))` }}><Sigil icon={c.icon} className="w-6 h-6" /></span>
                <div>
                  <p className="font-body text-[0.58rem] uppercase tracking-widest text-frost-400">Desafío superado</p>
                  <p className="font-display text-lg leading-tight" style={{ color: `hsl(${c.hue} 75% 70%)` }}>{c.name} <span className="text-gold-400 text-sm">+{c.reward} oro</span></p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* avisos de logro desbloqueado */}
      {achToast.length > 0 && (
        <div className="fixed top-4 inset-x-0 z-[70] flex flex-col items-center gap-2 pointer-events-none px-4">
          {achToast.map((t) => {
            const a = achById(t.id);
            return (
              <div key={t.at} className="panel-dark px-5 py-3 flex items-center gap-3 anim-slide-down" style={{ borderColor: `hsl(${a.hue} 60% 45% / 0.7)` }}>
                <span style={{ color: `hsl(${a.hue} 80% 62%)`, filter: `drop-shadow(0 0 8px hsl(${a.hue} 90% 55% / 0.8))` }}><Sigil icon={a.icon} className="w-6 h-6" /></span>
                <div>
                  <p className="font-body text-[0.58rem] uppercase tracking-widest text-gold-400">Hazaña completada</p>
                  <p className="font-display text-lg leading-tight" style={{ color: `hsl(${a.hue} 75% 70%)` }}>{a.name} <span className="text-gold-400 text-sm">+{a.reward} oro</span></p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* elección de reliquia (supervivencia) */}
      {relicPick && (
        <RelicPicker
          options={relicPick.options}
          held={runRelics}
          onPick={(id) => {
            sfx.click();
            const newRelics = id ? [...runRelics, id] : runRelics;
            const ns = relicPick.nextStreak;
            setRelicPick(null);
            startSurvival(ns, newRelics);
          }}
        />
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
