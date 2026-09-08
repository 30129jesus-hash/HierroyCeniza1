import type { ChallengeDef, MetaState } from './types';

export interface BattleOutcome {
  mode: 'historia' | 'supervivencia' | 'versus';
  won: boolean;
  conceded: boolean;
  diff: number;          // nivel de historia (1..8) o dificultad versus (0..2)
  newStreak: number;     // racha tras la batalla (supervivencia)
  kills: number;
  dragonKills: number;
  heroDamageTaken: number;
  heroDamageDealt: number;
  maxCostPlayed: number;
  spellsPlayed: number;
}

/* ---------- pool de desafíos diarios ---------- */

const DAILY_POOL: ChallengeDef[] = [
  { id: 'd_supervivencia', name: 'Sangre Fría', desc: 'Gana 1 cacería en Supervivencia.', icon: 'skull', hue: 0, reward: 60 },
  { id: 'd_horda3', name: 'Rompehordas', desc: 'Vence a la Horda 3 en Supervivencia.', icon: 'infinity', hue: 345, reward: 90 },
  { id: 'd_barato', name: 'Acero Humilde', desc: 'Vence la Horda 1 jugando solo cartas de coste 2 o menos.', icon: 'coin', hue: 40, reward: 120 },
  { id: 'd_elite', name: 'Duelo de Titanes', desc: 'Gana un duelo en categoría Élite.', icon: 'swords', hue: 20, reward: 100 },
  { id: 'd_escudo', name: 'Escudo Impecable', desc: 'Gana un duelo sin que tu héroe reciba daño.', icon: 'shield', hue: 210, reward: 120 },
  { id: 'd_historia', name: 'Portaestandartes', desc: 'Supera un nivel del Modo Historia.', icon: 'flag', hue: 46, reward: 60 },
  { id: 'd_matanza', name: 'Cosecha de Cuervos', desc: 'Consigue 12 bajas en una sola batalla.', icon: 'claw', hue: 340, reward: 80 },
  { id: 'd_hoja', name: 'Hoja Pura', desc: 'Gana una batalla sin jugar pociones ni mejoras.', icon: 'sword', hue: 260, reward: 100 },
  { id: 'd_asedio', name: 'Asedio', desc: 'Inflige 15 de daño al héroe enemigo en una batalla.', icon: 'fire', hue: 16, reward: 70 },
  { id: 'd_azufre', name: 'Olor a Azufre', desc: 'Abate un dragón en cualquier batalla.', icon: 'dragon', hue: 12, reward: 90 },
];

/* ---------- desafíos semanales ---------- */

const WEEKLY_POOL: (ChallengeDef & { counter?: string; need?: number })[] = [
  { id: 'w_racha5', name: 'La Larga Cacería', desc: 'Alcanza una racha de 5 en Supervivencia.', icon: 'moonFang', hue: 265, reward: 220 },
  { id: 'w_acero', name: 'Semana de Acero', desc: 'Gana 6 batallas esta semana.', icon: 'hammer', hue: 12, reward: 200, counter: 'wins', need: 6 },
  { id: 'w_cielos', name: 'Terror de los Cielos', desc: 'Abate 3 dragones esta semana.', icon: 'feather', hue: 45, reward: 240, counter: 'dragons', need: 3 },
];

export const challengeById = (id: string): ChallengeDef =>
  [...DAILY_POOL, ...WEEKLY_POOL].find((c) => c.id === id)!;

export const isWeekly = (id: string): boolean => WEEKLY_POOL.some((c) => c.id === id);

export const weeklyCounter = (id: string): { key: string; need: number } | undefined => {
  const def = WEEKLY_POOL.find((c) => c.id === id);
  return def?.counter && def.need !== undefined ? { key: def.counter, need: def.need } : undefined;
};

/* ---------- fechas deterministas ---------- */

export const todayKey = (): string => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const weekKey = (): string => {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${d.getFullYear()}-S${week}`;
};

/* PRNG determinista sembrado por una cadena (mismo día = mismos desafíos). */
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickSeeded<T>(pool: T[], seedKey: string, n: number): T[] {
  const rnd = mulberry32(hashSeed(seedKey));
  const copy = [...pool];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  }
  return out;
}

export const dailyIdsFor = (date: string): string[] =>
  pickSeeded(DAILY_POOL, `diario-${date}`, 3).map((c) => c.id);

export const weeklyIdFor = (week: string): string =>
  pickSeeded(WEEKLY_POOL, `semanal-${week}`, 1)[0].id;

/* ---------- evaluación tras una batalla ---------- */

function dailyCheck(id: string, o: BattleOutcome): boolean {
  const won = o.won && !o.conceded;
  switch (id) {
    case 'd_supervivencia': return o.mode === 'supervivencia' && won;
    case 'd_horda3': return o.mode === 'supervivencia' && won && o.newStreak === 3;
    case 'd_barato': return o.mode === 'supervivencia' && won && o.newStreak === 1 && o.maxCostPlayed <= 2;
    case 'd_elite': return o.mode === 'versus' && won && o.diff === 2;
    case 'd_escudo': return o.mode === 'versus' && won && o.heroDamageTaken === 0;
    case 'd_historia': return o.mode === 'historia' && won;
    case 'd_matanza': return won && o.kills >= 12;
    case 'd_hoja': return won && o.spellsPlayed === 0;
    case 'd_asedio': return o.heroDamageDealt >= 15;
    case 'd_azufre': return o.dragonKills >= 1;
    default: return false;
  }
}

function weeklyCheck(id: string, o: BattleOutcome, counters: Record<string, number>): boolean {
  const def = WEEKLY_POOL.find((c) => c.id === id);
  if (!def) return false;
  if (def.counter && def.need !== undefined) return (counters[def.counter] ?? 0) >= def.need;
  if (id === 'w_racha5') return o.newStreak >= 5;
  return false;
}

export interface ChallengeResolution {
  claimedIds: string[];   // desafíos completados en esta batalla
  gold: number;
  counters: Record<string, number>; // incrementos a aplicar
}

export function resolveChallenges(meta: MetaState, o: BattleOutcome): ChallengeResolution {
  const ch = meta.challenges;
  const claimedIds: string[] = [];

  // contadores semanales acumulados (se aplican antes de evaluar los basados en contador)
  const inc: Record<string, number> = {};
  if (!o.conceded) {
    if (o.won) inc.wins = 1;
    if (o.dragonKills > 0) inc.dragons = o.dragonKills;
  }
  const counters = { ...ch.weekly.counters };
  Object.entries(inc).forEach(([k, v]) => { counters[k] = (counters[k] ?? 0) + v; });

  for (const id of ch.daily.ids) {
    if (!ch.daily.claimed.includes(id) && dailyCheck(id, o)) claimedIds.push(id);
  }
  if (!ch.weekly.claimed && weeklyCheck(ch.weekly.id, o, counters)) claimedIds.push(ch.weekly.id);

  const gold = claimedIds.reduce((sum, id) => sum + challengeById(id).reward, 0);
  return { claimedIds, gold, counters: inc };
}

/* Asegura que los desafíos del día/semana existan (regenera si la fecha cambió). */
export function ensureChallenges(meta: MetaState): MetaState {
  const date = todayKey();
  const week = weekKey();
  let daily = meta.challenges.daily;
  let weekly = meta.challenges.weekly;
  let changed = false;

  if (daily.date !== date) {
    daily = { date, ids: dailyIdsFor(date), claimed: [] };
    changed = true;
  }
  if (weekly.key !== week) {
    weekly = { key: week, id: weeklyIdFor(week), claimed: false, counters: {} };
    changed = true;
  }
  if (!changed) return meta;
  return { ...meta, challenges: { daily, weekly } };
}
