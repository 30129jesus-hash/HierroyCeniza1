import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { MetaState } from '../game/types';
import { ALL_CARDS, STARTER_COLLECTION } from '../game/cards';
import { ensureChallenges } from '../game/challenges';
import { setMuted } from '../game/audio';
import { music } from '../game/music';

const KEY = 'hierro-ceniza-save-v1';

const defaultState = (): MetaState => ({
  gold: 150,
  collection: { ...STARTER_COLLECTION },
  deck: [],
  storyUnlocked: 1,
  storyCleared: [],
  survivalBest: 0,
  vsWins: 0,
  totalWins: 0,
  totalLosses: 0,
  achievements: [],
  dragonsSlain: 0,
  challenges: {
    daily: { date: '', ids: [], claimed: [] },
    weekly: { key: '', id: '', claimed: false, counters: {} },
  },
  muted: false,
  musicOn: true,
  diamonds: 0,
  unlockedFrames: [],
  activeFrame: null,
  relicsOwned: [],
  seasonEnds: 0,
  offerClaimedDate: '',
});

function load(): MetaState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<MetaState>;
    return { ...defaultState(), ...parsed, collection: { ...STARTER_COLLECTION, ...(parsed.collection ?? {}) } };
  } catch {
    return defaultState();
  }
}

type Action =
  | { type: 'gold'; amount: number }
  | { type: 'addCards'; cards: Record<string, number> }
  | { type: 'battleEnd'; won: boolean; reward: number }
  | { type: 'storyClear'; level: number }
  | { type: 'survival'; streak: number }
  | { type: 'vsWin' }
  | { type: 'setDeck'; deck: string[] }
  | { type: 'unlockAch'; ids: string[]; gold: number }
  | { type: 'dragonKills'; n: number }
  | { type: 'challengesTick' }
  | { type: 'challengesResolve'; claimedIds: string[]; gold: number; counters: Record<string, number> }
  | { type: 'buyDiamonds'; amount: number }
  | { type: 'spendDiamonds'; amount: number }
  | { type: 'unlockFrame'; id: string }
  | { type: 'setFrame'; id: string | null }
  | { type: 'ownRelic'; id: string }
  | { type: 'claimOffer'; date: string; card: string | null }
  | { type: 'premiumInit'; now: number; seasonDays: number }
  | { type: 'toggleMute' }
  | { type: 'toggleMusic' }
  | { type: 'reset' };

function reducer(s: MetaState, a: Action): MetaState {
  switch (a.type) {
    case 'gold':
      return { ...s, gold: Math.max(0, s.gold + a.amount) };
    case 'addCards': {
      const col = { ...s.collection };
      Object.entries(a.cards).forEach(([id, n]) => { col[id] = (col[id] ?? 0) + n; });
      return { ...s, collection: col };
    }
    case 'battleEnd':
      return {
        ...s,
        gold: s.gold + a.reward,
        totalWins: s.totalWins + (a.won ? 1 : 0),
        totalLosses: s.totalLosses + (a.won ? 0 : 1),
      };
    case 'storyClear': {
      const cleared = s.storyCleared.includes(a.level) ? s.storyCleared : [...s.storyCleared, a.level];
      return { ...s, storyCleared: cleared, storyUnlocked: Math.max(s.storyUnlocked, Math.min(8, a.level + 1)) };
    }
    case 'survival':
      return { ...s, survivalBest: Math.max(s.survivalBest, a.streak) };
    case 'vsWin':
      return { ...s, vsWins: s.vsWins + 1 };
    case 'setDeck':
      return { ...s, deck: a.deck };
    case 'unlockAch': {
      const fresh = a.ids.filter((id) => !s.achievements.includes(id));
      if (fresh.length === 0) return s;
      return { ...s, achievements: [...s.achievements, ...fresh], gold: s.gold + a.gold };
    }
    case 'dragonKills':
      return { ...s, dragonsSlain: s.dragonsSlain + a.n };
    case 'challengesTick':
      return ensureChallenges(s);
    case 'challengesResolve': {
      if (a.claimedIds.length === 0 && Object.keys(a.counters).length === 0) return s;
      const ch = s.challenges;
      const dailyClaimed = [...ch.daily.claimed];
      let weeklyClaimed = ch.weekly.claimed;
      const counters = { ...ch.weekly.counters };
      Object.entries(a.counters).forEach(([k, v]) => { counters[k] = (counters[k] ?? 0) + v; });
      a.claimedIds.forEach((id) => {
        if (id.startsWith('w_')) weeklyClaimed = true;
        else if (!dailyClaimed.includes(id)) dailyClaimed.push(id);
      });
      return {
        ...s,
        gold: s.gold + a.gold,
        challenges: {
          daily: { ...ch.daily, claimed: dailyClaimed },
          weekly: { ...ch.weekly, claimed: weeklyClaimed, counters },
        },
      };
    }
    case 'buyDiamonds':
      return { ...s, diamonds: s.diamonds + a.amount };
    case 'spendDiamonds':
      return s.diamonds >= a.amount ? { ...s, diamonds: s.diamonds - a.amount } : s;
    case 'unlockFrame':
      return s.unlockedFrames.includes(a.id) ? s : { ...s, unlockedFrames: [...s.unlockedFrames, a.id] };
    case 'setFrame':
      return { ...s, activeFrame: a.id };
    case 'ownRelic':
      return s.relicsOwned.includes(a.id) ? s : { ...s, relicsOwned: [...s.relicsOwned, a.id] };
    case 'claimOffer': {
      const col = a.card ? { ...s.collection, [a.card]: (s.collection[a.card] ?? 0) + 1 } : s.collection;
      return { ...s, gold: s.gold + 1000, collection: col, offerClaimedDate: a.date };
    }
    case 'premiumInit': {
      if (s.seasonEnds === 0 || a.now > s.seasonEnds) {
        return { ...s, seasonEnds: a.now + a.seasonDays * 86400000 };
      }
      return s;
    }
    case 'toggleMute':
      return { ...s, muted: !s.muted };
    case 'toggleMusic':
      return { ...s, musicOn: !s.musicOn };
    case 'reset':
      return defaultState();
    default:
      return s;
  }
}

interface Ctx {
  meta: MetaState;
  dispatch: React.Dispatch<Action>;
  ownedCount: (id: string) => number;
  deckFromCollection: () => import('../game/types').CardDef[];
}

const MetaCtx = createContext<Ctx | null>(null);

export function MetaProvider({ children }: { children: ReactNode }) {
  const [meta, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(meta)); } catch { /* sin almacenamiento */ }
  }, [meta]);
  useEffect(() => { dispatch({ type: 'challengesTick' }); dispatch({ type: 'premiumInit', now: Date.now(), seasonDays: 3 }); }, []);
  useEffect(() => { setMuted(meta.muted); }, [meta.muted]);
  useEffect(() => { music.setEnabled(meta.musicOn && !meta.muted); }, [meta.musicOn, meta.muted]);

  const value = useMemo<Ctx>(() => ({
    meta,
    dispatch,
    ownedCount: (id) => meta.collection[id] ?? 0,
    deckFromCollection: () => {
      const pool: import('../game/types').CardDef[] = [];
      Object.entries(meta.collection).forEach(([id, n]) => {
        const def = ALL_CARDS[id];
        if (def && def.side === 'player') for (let i = 0; i < n; i++) pool.push(def);
      });
      return pool;
    },
  }), [meta]);

  return <MetaCtx.Provider value={value}>{children}</MetaCtx.Provider>;
}

export function useMeta(): Ctx {
  const ctx = useContext(MetaCtx);
  if (!ctx) throw new Error('useMeta fuera de MetaProvider');
  return ctx;
}
