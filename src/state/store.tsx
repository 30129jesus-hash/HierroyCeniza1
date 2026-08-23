import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { MetaState } from '../game/types';
import { ALL_CARDS, STARTER_COLLECTION } from '../game/cards';
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
  muted: false,
  musicOn: true,
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
