import type {
  AiAction, AiAttack, BattleConfig, BattleEvent, BattleState, CardDef,
  PlayResult, Side, Target, UnitInst,
} from './types';
import { cardById } from './cards';

/* ============ UTILIDADES ============ */

export const opp = (s: Side): Side => (s === 'player' ? 'enemy' : 'player');
export const slotOf = (side: Side, lane: number): number => (side === 'player' ? lane : 3 + lane);
export const laneOf = (slot: number): number => slot % 3;
export const sideOfSlot = (slot: number): Side => (slot < 3 ? 'player' : 'enemy');

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function log(s: BattleState, text: string, tone: 'info' | 'good' | 'bad' | 'sys') {
  s.logSeq += 1;
  s.log = [...s.log.slice(-40), { id: s.logSeq, text, tone }];
  const ev = s.__pendingLog;
  if (ev) ev.push({ t: 'log', text, tone });
}

/* ============ CREACIÓN ============ */

export function createBattle(cfg: BattleConfig): BattleState {
  const s: BattleState = {
    cfg,
    round: 1,
    phase: 'deployPlayer',
    winner: null,
    units: [null, null, null, null, null, null],
    hands: { player: [], enemy: [] },
    decks: { player: shuffle([...cfg.playerDeck]), enemy: shuffle([...cfg.enemyDeck]) },
    baseDecks: { player: [...cfg.playerDeck], enemy: [...cfg.enemyDeck] },
    energy: { player: { cur: 1, max: 1 }, enemy: { cur: 1, max: 1 } },
    heroHp: { player: cfg.heroHp, enemy: cfg.enemyHeroHp ?? cfg.heroHp },
    heroMaxHp: { player: cfg.heroHp, enemy: cfg.enemyHeroHp ?? cfg.heroHp },
    log: [],
    logSeq: 0,
    uidSeq: 0,
    kills: 0,
    dragonKills: 0,
    heroDamageTaken: 0,
    heroDamageDealt: 0,
    maxCostPlayed: 0,
    spellsPlayed: 0,
  };
  // mano inicial de 3
  for (let i = 0; i < 3; i++) { draw(s, 'player', 1); draw(s, 'enemy', 1); }
  log(s, `Comienza la batalla: ${cfg.title}. Ronda 1, despliega tus cartas.`, 'sys');
  return s;
}

/* ============ ROBO (rearma el mazo al agotarse) ============ */

export function draw(s: BattleState, side: Side, n: number): number {
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    if (s.hands[side].length >= 8) break;
    if (s.decks[side].length === 0) {
      s.decks[side] = shuffle([...s.baseDecks[side]]);
      log(s, side === 'player' ? 'Tu mazo se rearma al azar desde el pozo de guerra.' : 'El mazo enemigo se rearma.', 'sys');
    }
    const card = s.decks[side].shift();
    if (!card) break;
    s.hands[side] = [...s.hands[side], card];
    drawn += 1;
  }
  return drawn;
}

/* ============ ENERGÍA Y FASES ============ */

const energyMax = (s: BattleState, side: Side) =>
  Math.min(9, s.round + (side === 'enemy'
    ? s.cfg.enemyEnergyBonus
    : (s.cfg.relics ?? []).includes('rel_poder') ? 1 : 0));

export const canAfford = (s: BattleState, side: Side, card: CardDef) => card.cost <= s.energy[side].cur;

/* ============ UNIDADES ============ */

function makeUnit(s: BattleState, side: Side, def: CardDef): UnitInst {
  const bonus = side === 'enemy' ? s.cfg.enemyStatBonus : 0;
  const relics = s.cfg.relics ?? [];
  const atk = (def.atk ?? 0) + bonus + (side === 'player' && relics.includes('rel_estandarte') ? 1 : 0);
  const hp = (def.hp ?? 0) + bonus + (side === 'player' && relics.includes('rel_vida') ? 2 : 0);
  const defv = (def.def ?? 0) + (side === 'player' && relics.includes('rel_muralla') ? 1 : 0);
  s.uidSeq += 1;
  return {
    uid: s.uidSeq, def,
    atk, hp, maxHp: hp, defv,
    frozen: 0, poison: 0, poisonT: 0,
    vamp: !!def.vamp, ranged: !!def.ranged, taunt: !!def.taunt, pierce: !!def.pierce,
    swift: !!def.swift, thorns: def.thorns ?? 0,
    poisonAtk: def.poisonAtk ?? 0, freezeAtk: !!def.freezeAtk,
    tempAtk: 0, hasEscudo: false, lastHitBy: null,
    ready: false, fresh: true,
  };
}

function spawnSkeleton(s: BattleState, side: Side): UnitInst {
  s.uidSeq += 1;
  return {
    uid: s.uidSeq, def: cardById(side === 'player' ? 'p_cadaver' : 'e_cadaver'),
    atk: 1, hp: 1, maxHp: 1, defv: 0, frozen: 0, poison: 0, poisonT: 0,
    vamp: false, ranged: false, taunt: false, pierce: false, swift: false, thorns: 0,
    poisonAtk: 0, freezeAtk: false, tempAtk: 0, hasEscudo: false, lastHitBy: null,
    ready: false, fresh: true,
  };
}

/* ============ DAÑO / CURACIÓN ============ */

export function armorStrike(
  s: BattleState, side: Side, lane: number, amount: number,
  events: BattleEvent[], kind: 'hit' | 'fire' | 'ice' | 'poison' = 'hit', pierce = false,
): number {
  const slot = slotOf(side, lane);
  const u = s.units[slot];
  if (!u || amount <= 0) return 0;
  let toHp = amount;
  if (!pierce && u.defv > 0) {
    const absorbed = Math.min(u.defv, amount);
    u.defv -= absorbed;
    toHp -= absorbed;
    events.push({ t: 'armor', side, lane, amount: absorbed, broke: u.defv === 0 });
  }
  if (toHp > 0) {
    u.hp -= toHp;
    events.push({ t: 'damageUnit', side, lane, amount: toHp, kind });
  }
  if (u.hp <= 0) killUnit(s, side, lane, events);
  return toHp;
}

function triggerOnDeath(s: BattleState, side: Side, lane: number, u: UnitInst, events: BattleEvent[]) {
  const od = u.def.onDeath;
  if (!od) return;
  switch (od.kind) {
    case 'poisonKiller': {
      const kb = u.lastHitBy;
      if (kb && kb.side !== side) {
        const killer = s.units[slotOf(kb.side, kb.lane)];
        if (killer) {
          killer.poison = Math.max(killer.poison, od.amount);
          killer.poisonT = Math.max(killer.poisonT, 3);
          events.push({ t: 'poisonApply', side: kb.side, lane: kb.lane });
          log(s, `${u.def.name} estalla en veneno sobre ${killer.def.name}.`, side === 'player' ? 'good' : 'bad');
        }
      }
      break;
    }
    case 'summonSkeletons': {
      const lanes = [lane - 1, lane + 1].filter((l) => l >= 0 && l < 3 && !s.units[slotOf(side, l)]);
      for (const l of lanes) {
        const skel = spawnSkeleton(s, side);
        s.units[slotOf(side, l)] = skel;
        events.push({ t: 'summon', side, lane: l, uid: skel.uid });
      }
      if (lanes.length > 0) log(s, `${u.def.name} se deshace: ¡esqueletos!`, side === 'player' ? 'info' : 'bad');
      break;
    }
    case 'healHero': {
      healHero(s, side, od.amount, events);
      break;
    }
  }
}

function killUnit(s: BattleState, side: Side, lane: number, events: BattleEvent[]) {
  const slot = slotOf(side, lane);
  const u = s.units[slot];
  if (!u) return;
  triggerOnDeath(s, side, lane, u, events);
  s.units[slot] = null;
  events.push({ t: 'death', side, lane });
  if (side === 'enemy') {
    s.kills += 1;
    if (u.def.id === 'e_dragon') s.dragonKills += 1;
    log(s, `${u.def.name} ha caído.`, 'good');
  } else {
    log(s, `Tu ${u.def.name} ha caído.`, 'bad');
  }
}

export function healUnit(s: BattleState, side: Side, lane: number, amount: number, events: BattleEvent[]) {
  const u = s.units[slotOf(side, lane)];
  if (!u || amount <= 0) return;
  const healed = Math.min(amount, u.maxHp - u.hp);
  if (healed <= 0) return;
  u.hp += healed;
  events.push({ t: 'healUnit', side, lane, amount: healed });
  log(s, `${u.def.name} recupera ${healed} de vida.`, side === 'player' ? 'good' : 'info');
}

export function healHero(s: BattleState, side: Side, amount: number, events: BattleEvent[]) {
  const healed = Math.min(amount, s.heroMaxHp[side] - s.heroHp[side]);
  if (healed <= 0) return;
  s.heroHp[side] += healed;
  events.push({ t: 'healHero', side, amount: healed });
  log(s, side === 'player' ? `Tu héroe recupera ${healed} de vida.` : `El héroe enemigo recupera ${healed}.`, side === 'player' ? 'good' : 'bad');
}

export function damageHero(s: BattleState, side: Side, amount: number, events: BattleEvent[]) {
  if (amount <= 0) return;
  let dmg = amount;
  if (side === 'player' && (s.cfg.relics ?? []).includes('rel_amuleto')) {
    dmg = Math.max(1, amount - 1);
    if (dmg < amount) log(s, 'El Amuleto Rúnico absorbe 1 de daño.', 'info');
  }
  s.heroHp[side] = Math.max(0, s.heroHp[side] - dmg);
  events.push({ t: 'damageHero', side, amount: dmg });
  if (side === 'player') {
    s.heroDamageTaken += dmg;
    log(s, `Recibes ${dmg} de daño.`, 'bad');
  } else {
    s.heroDamageDealt += dmg;
    log(s, `Infliges ${dmg} de daño al héroe enemigo.`, 'good');
  }
  checkWin(s, events);
}

function checkWin(s: BattleState, events: BattleEvent[]) {
  if (s.winner) return;
  if (s.heroHp.enemy <= 0) {
    s.winner = 'player';
    s.phase = 'done';
    events.push({ t: 'victory', winner: 'player' });
    log(s, '¡Victoria! El estandarte enemigo arde.', 'sys');
  } else if (s.heroHp.player <= 0) {
    s.winner = 'enemy';
    s.phase = 'done';
    events.push({ t: 'victory', winner: 'enemy' });
    log(s, 'Tu héroe ha caído. La ceniza lo cubre todo.', 'sys');
  }
}

/* ============ GRITOS DE BATALLA (onPlay) ============ */

function triggerOnPlay(s: BattleState, side: Side, card: CardDef, lane: number, events: BattleEvent[]) {
  const op = card.onPlay!;
  const foe = opp(side);
  const foes = [0, 1, 2].filter((l) => s.units[slotOf(foe, l)]);
  switch (op.kind) {
    case 'damageRandom': {
      if (foes.length > 0) {
        const l = foes[Math.floor(Math.random() * foes.length)];
        armorStrike(s, foe, l, op.amount, events, 'hit', true);
      }
      break;
    }
    case 'healHero':
      healHero(s, side, op.amount, events);
      break;
    case 'freezeRandom': {
      const pool = foes.filter((l) => s.units[slotOf(foe, l)]!.frozen === 0);
      if (pool.length > 0) {
        const l = pool.sort((a, b) => s.units[slotOf(foe, b)]!.atk - s.units[slotOf(foe, a)]!.atk)[0];
        const u = s.units[slotOf(foe, l)]!;
        u.frozen = Math.max(u.frozen, op.amount);
        events.push({ t: 'freeze', side: foe, lane: l });
        log(s, `${u.def.name} queda congelada por ${card.name}.`, side === 'player' ? 'good' : 'bad');
      }
      break;
    }
    case 'aoe': {
      log(s, `${card.name} desata ${op.amount} de daño a todas las unidades rivales.`, side === 'player' ? 'good' : 'bad');
      for (let l = 0; l < 3; l++) if (s.units[slotOf(foe, l)]) armorStrike(s, foe, l, op.amount, events, 'fire', true);
      break;
    }
    case 'buffAllDef': {
      let n = 0;
      for (let l = 0; l < 3; l++) {
        const u = s.units[slotOf(side, l)];
        if (u && !(l === lane)) { u.defv += op.amount; n++; events.push({ t: 'buff', side, lane: l, label: `+${op.amount} DEF` }); }
      }
      log(s, `${card.name} forja +${op.amount} de Armadura en ${n} unidad${n === 1 ? '' : 'es'}.`, side === 'player' ? 'good' : 'bad');
      break;
    }
    case 'buffOtherAtk': {
      let n = 0;
      for (let l = 0; l < 3; l++) {
        const u = s.units[slotOf(side, l)];
        if (u && !(l === lane)) { u.atk += op.amount; n++; events.push({ t: 'buff', side, lane: l, label: `+${op.amount} ATK` }); }
      }
      log(s, `${card.name} alza su estandarte: +${op.amount} de ATK a ${n} unidad${n === 1 ? '' : 'es'}.`, side === 'player' ? 'good' : 'bad');
      break;
    }
    case 'draw': {
      draw(s, side, op.amount);
      events.push({ t: 'draw', side });
      break;
    }
  }
}

/* ============ HECHIZOS ============ */

function castSpell(s: BattleState, side: Side, card: CardDef, t: Target, events: BattleEvent[]) {
  const sp = card.spell!;
  const name = card.name;
  const foe = opp(side);
  switch (sp.school) {
    case 'fire': {
      log(s, `${name}: ${sp.amount} de daño.`, side === 'player' ? 'good' : 'bad');
      if (t.kind === 'hero') damageHero(s, t.side, sp.amount, events);
      else armorStrike(s, t.side, t.lane, sp.amount, events, 'fire', true);
      break;
    }
    case 'ice': {
      log(s, `${name}: ${sp.amount} de daño y congelación.`, side === 'player' ? 'good' : 'bad');
      if (t.kind === 'lane') {
        armorStrike(s, t.side, t.lane, sp.amount, events, 'ice', true);
        const u = s.units[slotOf(t.side, t.lane)];
        if (u) {
          u.frozen = Math.max(u.frozen, sp.amount2 ?? 1);
          events.push({ t: 'freeze', side: t.side, lane: t.lane });
        }
      }
      break;
    }
    case 'poison': {
      if (t.kind === 'lane') {
        const u = s.units[slotOf(t.side, t.lane)];
        if (u) {
          u.poison = Math.max(u.poison, sp.amount);
          u.poisonT = Math.max(u.poisonT, sp.amount2 ?? 3);
          events.push({ t: 'poisonApply', side: t.side, lane: t.lane });
          log(s, `${name} envenena a ${u.def.name}.`, side === 'player' ? 'good' : 'bad');
        }
      }
      break;
    }
    case 'heal': {
      log(s, `${name} restaura ${sp.amount} de vida.`, side === 'player' ? 'good' : 'info');
      if (t.kind === 'hero') healHero(s, t.side, sp.amount, events);
      else healUnit(s, t.side, t.lane, sp.amount, events);
      break;
    }
    case 'buffAtk': {
      if (t.kind === 'lane') {
        const u = s.units[slotOf(t.side, t.lane)];
        if (u) { u.atk += sp.amount; events.push({ t: 'buff', side: t.side, lane: t.lane, label: `+${sp.amount} ATK` }); log(s, `${u.def.name} gana +${sp.amount} de ATK.`, side === 'player' ? 'good' : 'bad'); }
      }
      break;
    }
    case 'buffDef': {
      if (t.kind === 'lane') {
        const u = s.units[slotOf(t.side, t.lane)];
        if (u) { u.defv += sp.amount; events.push({ t: 'buff', side: t.side, lane: t.lane, label: `+${sp.amount} DEF` }); log(s, `${u.def.name} gana +${sp.amount} de Armadura.`, side === 'player' ? 'good' : 'bad'); }
      }
      break;
    }
    case 'buffHp': {
      if (t.kind === 'lane') {
        const u = s.units[slotOf(t.side, t.lane)];
        if (u) { u.maxHp += sp.amount; u.hp += sp.amount; events.push({ t: 'healUnit', side: t.side, lane: t.lane, amount: sp.amount }); log(s, `${u.def.name} gana +${sp.amount} de Vida.`, side === 'player' ? 'good' : 'bad'); }
      }
      break;
    }
    case 'aoe': {
      log(s, `${name} golpea a todas las unidades enemigas (${sp.amount}).`, side === 'player' ? 'good' : 'bad');
      for (let l = 0; l < 3; l++) if (s.units[slotOf(foe, l)]) armorStrike(s, foe, l, sp.amount, events, 'fire', true);
      break;
    }
    case 'teamBuff': {
      log(s, `${name}: +${sp.amount}/+${sp.amount} a todas tus unidades.`, side === 'player' ? 'good' : 'bad');
      for (let l = 0; l < 3; l++) {
        const u = s.units[slotOf(side, l)];
        if (u) {
          u.atk += sp.amount; u.maxHp += sp.amount; u.hp += sp.amount;
          events.push({ t: 'buff', side, lane: l, label: `+${sp.amount}/+${sp.amount}` });
        }
      }
      break;
    }
    case 'ashRain': {
      log(s, `${name}: ceniza ardiente sobre el campo.`, side === 'player' ? 'good' : 'bad');
      for (let l = 0; l < 3; l++) if (s.units[slotOf(foe, l)]) armorStrike(s, foe, l, sp.amount, events, 'fire', true);
      damageHero(s, foe, sp.amount2 ?? 1, events);
      break;
    }
    case 'spikeShield': {
      if (t.kind === 'lane') {
        const u = s.units[slotOf(t.side, t.lane)];
        if (u && !u.hasEscudo) {
          u.hasEscudo = true;
          u.defv += sp.amount;
          u.thorns += sp.amount2 ?? 2;
          events.push({ t: 'buff', side: t.side, lane: t.lane, label: `+${sp.amount} DEF · Espinas` });
          log(s, `${u.def.name} queda erizado de espinas.`, side === 'player' ? 'good' : 'bad');
        }
      }
      break;
    }
    case 'shadowDagger': {
      if (t.kind === 'lane') {
        const u = s.units[slotOf(t.side, t.lane)];
        if (u) {
          u.atk += sp.amount; u.tempAtk += sp.amount;
          events.push({ t: 'buff', side: t.side, lane: t.lane, label: `+${sp.amount} ATK` });
          log(s, `${u.def.name} gana +${sp.amount} de ATK hasta fin de ronda.`, side === 'player' ? 'good' : 'bad');
        }
      }
      break;
    }
    case 'warCry': {
      log(s, `${name}: ¡todas tus unidades se vuelven veloces!`, side === 'player' ? 'good' : 'bad');
      for (let l = 0; l < 3; l++) {
        const u = s.units[slotOf(side, l)];
        if (u) {
          u.swift = true;
          u.atk += sp.amount;
          if (u.fresh) u.ready = u.frozen <= 0;
          events.push({ t: 'buff', side, lane: l, label: `Veloz +${sp.amount} ATK` });
        }
      }
      break;
    }
    case 'forbidden': {
      log(s, `${name}: robas ${sp.amount} cartas, pero pagas con sangre.`, side === 'player' ? 'good' : 'bad');
      draw(s, side, sp.amount);
      events.push({ t: 'draw', side });
      damageHero(s, side, sp.amount2 ?? 2, events);
      break;
    }
    case 'destinyArrow': {
      const dmg = s.heroHp[foe] <= 10 ? (sp.amount2 ?? 8) : sp.amount;
      log(s, `${name}: el destino reclama ${dmg} de daño.`, side === 'player' ? 'good' : 'bad');
      damageHero(s, foe, dmg, events);
      break;
    }
  }
}

/* ============ OBJETIVOS VÁLIDOS ============ */

export function validTargets(s: BattleState, side: Side, card: CardDef): Target[] {
  const t: Target[] = [];
  const foe = opp(side);
  if (card.kind === 'unit') {
    for (let l = 0; l < 3; l++) if (!s.units[slotOf(side, l)]) t.push({ kind: 'lane', side, lane: l });
    return t;
  }
  const sp = card.spell!;
  switch (sp.target) {
    case 'enemyAny':
      for (let l = 0; l < 3; l++) if (s.units[slotOf(foe, l)]) t.push({ kind: 'lane', side: foe, lane: l });
      t.push({ kind: 'hero', side: foe });
      break;
    case 'enemyUnits':
      for (let l = 0; l < 3; l++) if (s.units[slotOf(foe, l)]) t.push({ kind: 'lane', side: foe, lane: l });
      break;
    case 'enemyHero':
      t.push({ kind: 'hero', side: foe });
      break;
    case 'allyAny':
      for (let l = 0; l < 3; l++) {
        const u = s.units[slotOf(side, l)];
        if (!u) continue;
        if (sp.school === 'heal' && u.hp >= u.maxHp) continue;
        t.push({ kind: 'lane', side, lane: l });
      }
      if (sp.school !== 'heal' || s.heroHp[side] < s.heroMaxHp[side]) t.push({ kind: 'hero', side });
      break;
    case 'allyUnit':
      for (let l = 0; l < 3; l++) {
        const u = s.units[slotOf(side, l)];
        if (!u) continue;
        if (sp.school === 'spikeShield' && u.hasEscudo) continue; // Escudo de Espinas: solo uno por unidad
        t.push({ kind: 'lane', side, lane: l });
      }
      break;
    case 'allEnemyUnits':
    case 'allAllies':
      t.push({ kind: 'hero', side }); // objetivo dummy: no requiere selección
      break;
  }
  return t;
}

/* ============ JUGAR UNA CARTA ============ */

export function playCard(s: BattleState, side: Side, handIdx: number, target: Target | null): PlayResult {
  const prev = s;
  const events: BattleEvent[] = [];
  s.__pendingLog = events;
  const card = s.hands[side][handIdx];
  if (!card || !canAfford(s, side, card)) { s.__pendingLog = undefined; return { state: prev, events: [] }; }
  if (s.winner) { s.__pendingLog = undefined; return { state: prev, events: [] }; }

  s.hands[side] = s.hands[side].filter((_, i) => i !== handIdx);
  s.energy[side].cur -= card.cost;

  if (side === 'player') {
    s.maxCostPlayed = Math.max(s.maxCostPlayed, card.cost);
    if (card.kind === 'spell') s.spellsPlayed += 1;
  }

  if (card.kind === 'unit') {
    const lane = target?.kind === 'lane' ? target.lane : [0, 1, 2].find((l) => !s.units[slotOf(side, l)]);
    if (lane === undefined || s.units[slotOf(side, lane)]) {
      // deshacer
      s.hands[side] = [...s.hands[side].slice(0, handIdx), card, ...s.hands[side].slice(handIdx)];
      s.energy[side].cur += card.cost;
      s.__pendingLog = undefined;
      return { state: prev, events: [] };
    }
    const u = makeUnit(s, side, card);
    s.units[slotOf(side, lane)] = u;
    events.push({ t: 'summon', side, lane, uid: u.uid });
    log(s, side === 'player' ? `Despliegas a ${card.name}.` : `El enemigo despliega a ${card.name}.`, side === 'player' ? 'info' : 'bad');
    if (card.onPlay) triggerOnPlay(s, side, card, lane, events);
  } else {
    castSpell(s, side, card, target as Target, events);
  }
  s.__pendingLog = undefined;
  return { state: s, events };
}

/* ============ OBJETIVOS DE ATAQUE ============ */

export function attackTargets(s: BattleState, side: Side, unit: UnitInst): Target[] {
  const foe = opp(side);
  const t: Target[] = [];
  for (let l = 0; l < 3; l++) if (s.units[slotOf(foe, l)]) t.push({ kind: 'lane', side: foe, lane: l });
  const taunts = t.filter((x) => x.kind === 'lane' && s.units[slotOf(foe, x.lane)]?.taunt);
  if (taunts.length > 0) return taunts; // Provocación: hay que derribarlas primero
  if (unit.ranged || t.length === 0) t.push({ kind: 'hero', side: foe });
  return t;
}

export const foeHasTaunt = (s: BattleState, side: Side): boolean => {
  const foe = opp(side);
  return [0, 1, 2].some((l) => s.units[slotOf(foe, l)]?.taunt);
};

export const canAttackSide = (s: BattleState, side: Side): boolean => {
  const base = side === 'player' ? 0 : 3;
  return [0, 1, 2].some((l) => {
    const u = s.units[base + l];
    return !!u && u.ready && (!u.fresh || u.swift) && u.frozen <= 0;
  });
};

export const readyCount = (s: BattleState, side: Side): number => {
  const base = side === 'player' ? 0 : 3;
  return [0, 1, 2].filter((l) => {
    const u = s.units[base + l];
    return !!u && u.ready && (!u.fresh || u.swift) && u.frozen <= 0;
  }).length;
};

/* ============ COMBATE ============ */

export function performAttack(s: BattleState, side: Side, lane: number, target: Target): PlayResult {
  const prev = s;
  const events: BattleEvent[] = [];
  s.__pendingLog = events;
  if (s.winner) { s.__pendingLog = undefined; return { state: prev, events: [] }; }
  const attacker = s.units[slotOf(side, lane)];
  if (!attacker || !attacker.ready || attacker.frozen > 0 || (attacker.fresh && !attacker.swift)) { s.__pendingLog = undefined; return { state: prev, events: [] }; }

  const foe = opp(side);
  // validación: provocación / a distancia
  const allowed = attackTargets(s, side, attacker);
  const ok = allowed.some((t) => {
    if (t.kind !== target.kind) return false;
    if (t.kind === 'hero') return target.kind === 'hero' && t.side === target.side;
    return target.kind === 'lane' && t.side === target.side && t.lane === target.lane;
  });
  if (!ok) { s.__pendingLog = undefined; return { state: prev, events: [] }; }

  attacker.ready = false;
  events.push({ t: 'attack', side, lane, tSide: target.side, tLane: target.kind === 'lane' ? target.lane : null });

  if (target.kind === 'hero') {
    log(s, side === 'player' ? `${attacker.def.name} golpea al héroe enemigo (${attacker.atk}).` : `${attacker.def.name} te golpea (${attacker.atk}).`, side === 'player' ? 'good' : 'bad');
    if (attacker.vamp) healHero(s, side, attacker.atk, events);
    damageHero(s, target.side, attacker.atk, events);
    s.__pendingLog = undefined;
    return { state: s, events };
  }

  const defender = s.units[slotOf(foe, target.lane)];
  if (!defender) { s.__pendingLog = undefined; return { state: prev, events: [] }; }

  defender.lastHitBy = { side, lane };
  attacker.lastHitBy = { side: foe, lane: target.lane };

  const hpToDef = armorStrike(s, foe, target.lane, attacker.atk, events, 'hit', attacker.pierce);
  
  // Unidades a distancia no reciben contraataque ni espinas
  let hpToAtt = 0;
  if (!attacker.ranged) {
    hpToAtt = armorStrike(s, side, lane, defender.atk, events);
  }
  
  log(s, side === 'player'
    ? `${attacker.def.name} ataca a ${defender.def.name}${attacker.pierce ? ' (perforación)' : ''}${attacker.ranged ? ' (a distancia)' : ''}.`
    : `${attacker.def.name} ataca a tu ${defender.def.name}${attacker.ranged ? ' (a distancia)' : ''}.`,
    side === 'player' ? 'good' : 'bad');
  if (attacker.vamp && hpToDef > 0) healUnit(s, side, lane, hpToDef, events);
  if (defender.vamp && hpToAtt > 0 && s.units[slotOf(foe, target.lane)]) healUnit(s, foe, target.lane, hpToAtt, events);

  // veneno / congelación al golpear
  const defStill = s.units[slotOf(foe, target.lane)];
  if (defStill) {
    if (attacker.poisonAtk > 0) {
      defStill.poison = Math.max(defStill.poison, attacker.poisonAtk);
      defStill.poisonT = Math.max(defStill.poisonT, 3);
      events.push({ t: 'poisonApply', side: foe, lane: target.lane });
      log(s, `${defStill.def.name} queda envenenada.`, side === 'player' ? 'good' : 'bad');
    }
    if (attacker.freezeAtk) {
      defStill.frozen = Math.max(defStill.frozen, 1);
      events.push({ t: 'freeze', side: foe, lane: target.lane });
      log(s, `${defStill.def.name} se petrifica.`, side === 'player' ? 'good' : 'bad');
    }
  }

  // espinas del defensor (ignoran armadura) - solo si el atacante NO es a distancia
  if (!attacker.ranged && s.units[slotOf(foe, target.lane)] && defender.thorns > 0 && s.units[slotOf(side, lane)]) {
    log(s, `Espinas: ${defender.def.name} devuelve ${defender.thorns} de daño.`, side === 'player' ? 'bad' : 'good');
    armorStrike(s, side, lane, defender.thorns, events, 'hit', true);
  }
  s.__pendingLog = undefined;
  return { state: s, events };
}

/* ============ FLUJO DE FASES ============ */

function beginAttacks(s: BattleState): BattleState {
  s.phase = 'attackPlayer';
  s.units.forEach((u) => { if (u) u.ready = (!u.fresh || u.swift) && u.frozen <= 0; });
  return s;
}

export function endDeployPlayer(s: BattleState): PlayResult {
  const events: BattleEvent[] = [];
  s.__pendingLog = events;
  s.phase = 'deployEnemy';
  log(s, 'Fin del despliegue. El enemigo mueve ficha.', 'info');
  s.__pendingLog = undefined;
  return { state: s, events };
}

export function endDeployEnemy(s: BattleState): PlayResult {
  const events: BattleEvent[] = [];
  s.__pendingLog = events;
  beginAttacks(s);
  log(s, `Fase de ataque: elige a tus atacantes.`, 'sys');
  s.__pendingLog = undefined;
  return { state: s, events };
}

export function endAttackPlayer(s: BattleState): PlayResult {
  const events: BattleEvent[] = [];
  s.__pendingLog = events;
  s.phase = 'attackEnemy';
  log(s, 'El enemigo lanza su ataque.', 'bad');
  s.__pendingLog = undefined;
  return { state: s, events };
}

export function endRound(s: BattleState): PlayResult {
  const events: BattleEvent[] = [];
  s.__pendingLog = events;

  // veneno de fin de ronda
  for (let slot = 0; slot < 6; slot++) {
    const u = s.units[slot];
    if (!u || u.poison <= 0) continue;
    const side = sideOfSlot(slot);
    log(s, `El veneno consume a ${u.def.name} (${u.poison}).`, side === 'player' ? 'bad' : 'good');
    u.hp -= u.poison;
    events.push({ t: 'damageUnit', side, lane: laneOf(slot), amount: u.poison, kind: 'poison' });
    u.poisonT -= 1;
    if (u.poisonT <= 0) { u.poison = 0; u.poisonT = 0; }
    if (u.hp <= 0) killUnit(s, side, laneOf(slot), events);
  }

  if (!s.winner) {
    // fin de la limpieza de ronda
    s.units.forEach((u) => {
      if (!u) return;
      if (u.frozen > 0) u.frozen -= 1;
      if (u.tempAtk > 0) { u.atk = Math.max(0, u.atk - u.tempAtk); u.tempAtk = 0; }
      u.ready = false;
      u.fresh = false;
    });

    // reliquias de fin de ronda
    const relics = s.cfg.relics ?? [];
    if (relics.includes('rel_fuente') && !s.winner) {
      log(s, 'La Fuente Sanadora vierte su agua (2 de vida).', 'info');
      healHero(s, 'player', 2, events);
    }

    draw(s, 'player', 1);
    draw(s, 'enemy', 1);
    if (relics.includes('rel_sabiduria')) draw(s, 'player', 1);
    events.push({ t: 'draw', side: 'player' });

    s.phase = 'deployPlayer';
    s.round += 1;

    if (s.round > s.cfg.maxRounds) {
      // 20 rondas: si el jefe sigue en pie, pierdes
      s.winner = 'enemy';
      s.phase = 'done';
      events.push({ t: 'victory', winner: 'enemy' });
      log(s, `Se agotan las ${s.cfg.maxRounds} rondas: el jefe enemigo resiste. Derrota.`, 'sys');
    } else {
      s.energy.player.max = energyMax(s, 'player');
      s.energy.player.cur = s.energy.player.max;
      s.energy.enemy.max = energyMax(s, 'enemy');
      s.energy.enemy.cur = s.energy.enemy.max;
      log(s, `Ronda ${s.round}. Energía restaurada.`, 'sys');
    }
  }
  s.__pendingLog = undefined;
  return { state: s, events };
}

/* ============ IA: DESPLIEGUE ============ */

export function aiPlan(s: BattleState): AiAction[] {
  const plan: AiAction[] = [];
  const sim: BattleState = {
    ...s,
    units: [...s.units],
    hands: { player: [...s.hands.player], enemy: [...s.hands.enemy] },
    energy: {
      player: { ...s.energy.player },
      enemy: { ...s.energy.enemy },
    },
    heroHp: { ...s.heroHp },
  };
  const bonus = s.cfg.enemyStatBonus;
  let guard = 0;

  const consider = (handIdx: number, action: AiAction, score: number, best: { idx: number; action: AiAction; score: number } | null) => {
    if (!best || score > best.score) return { idx: handIdx, action, score };
    return best;
  };

  while (guard++ < 10) {
    let best: { idx: number; action: AiAction; score: number } | null = null;
    const units = sim.units;
    sim.hands.enemy.forEach((card, i) => {
      if (card.cost > sim.energy.enemy.cur) return;
      const sp = card.spell;
      const emptyLanes = [0, 1, 2].filter((l) => !units[3 + l]);

      if (card.kind === 'unit') {
        if (emptyLanes.length === 0) return;
        const statScore = (card.atk ?? 0) + bonus + (card.hp ?? 0) + bonus + (card.def ?? 0) * 1.5
          + (card.taunt ? 3 : 0) + (card.swift ? 2 : 0) + (card.ranged ? 1.5 : 0) + (card.thorns ?? 0) * 1.2 + (card.poisonAtk ?? 0) * 1.3;
        const lane = emptyLanes.sort((a, b) => {
          const pa = units[a]?.hp ?? 0; const pb = units[b]?.hp ?? 0;
          return pb - pa; // frente a la unidad rival más fuerte
        })[0];
        let score = statScore + 1;
        if (card.onPlay?.kind === 'aoe' && [0, 1, 2].filter((l) => units[l]).length >= 2) score += 4;
        best = consider(i, { handIdx: i, target: { kind: 'lane', side: 'enemy', lane } }, score, best);
        return;
      }

      if (!sp) return;
      switch (sp.school) {
        case 'fire': {
          const targets = [0, 1, 2].filter((l) => units[l]);
          for (const l of targets) {
            const d = units[l]!;
            const dmg = sp.amount;
            let score = 2 + Math.min(dmg, d.hp + d.defv) * 0.8 + d.atk * 0.5;
            if (dmg >= d.hp + d.defv) score += 3 + d.def.cost * 0.4;
            best = consider(i, { handIdx: i, target: { kind: 'lane', side: 'player', lane: l } }, score, best);
          }
          if (sim.heroHp.player <= sp.amount) best = { idx: i, action: { handIdx: i, target: { kind: 'hero', side: 'player' } }, score: 60 };
          else if (sp.amount >= 4 && sim.heroHp.player <= 12) best = consider(i, { handIdx: i, target: { kind: 'hero', side: 'player' } }, 4 + sp.amount * 0.5, best);
          break;
        }
        case 'poison': {
          const targets = [0, 1, 2].filter((l) => units[l] && units[l]!.poison === 0 && units[l]!.hp > sp.amount * (sp.amount2 ?? 3));
          for (const l of targets) {
            const d = units[l]!;
            best = consider(i, { handIdx: i, target: { kind: 'lane', side: 'player', lane: l } }, 3 + d.atk * 1.1, best);
          }
          break;
        }
        case 'heal': {
          const hurt = [3, 4, 5].map((sl) => units[sl]).filter((u): u is UnitInst => !!u && u.hp < u.maxHp)
            .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
          if (hurt && (hurt.maxHp - hurt.hp) >= 3) {
            best = consider(i, { handIdx: i, target: { kind: 'lane', side: 'enemy', lane: laneOf(units.indexOf(hurt)) } }, 2.5 + (hurt.maxHp - hurt.hp) * 0.6 + hurt.atk * 0.4, best);
          }
          if (sim.heroHp.enemy <= sim.heroMaxHp.enemy - sp.amount && sim.heroHp.enemy <= 14) {
            best = consider(i, { handIdx: i, target: { kind: 'hero', side: 'enemy' } }, 5, best);
          }
          break;
        }
        case 'buffAtk': {
          const own = [3, 4, 5].filter((sl) => units[sl]).sort((a, b) => units[b]!.atk - units[a]!.atk)[0];
          if (own !== undefined) best = consider(i, { handIdx: i, target: { kind: 'lane', side: 'enemy', lane: laneOf(own) } }, 2.5 + units[own]!.atk * 0.7, best);
          break;
        }
        case 'buffDef': {
          const own = [3, 4, 5].filter((sl) => units[sl] && (units[sl]!.taunt || units[sl]!.hp >= 4)).sort((a, b) => units[b]!.hp - units[a]!.hp)[0];
          if (own !== undefined) best = consider(i, { handIdx: i, target: { kind: 'lane', side: 'enemy', lane: laneOf(own) } }, 3 + units[own]!.hp * 0.25, best);
          break;
        }
        case 'shadowDagger': {
          const own = [3, 4, 5].filter((sl) => units[sl] && (!units[sl]!.fresh || units[sl]!.swift)).sort((a, b) => units[b]!.atk - units[a]!.atk)[0];
          if (own !== undefined) best = consider(i, { handIdx: i, target: { kind: 'lane', side: 'enemy', lane: laneOf(own) } }, 3 + units[own]!.atk * 0.7, best);
          break;
        }
        case 'warCry': {
          const own = [3, 4, 5].filter((sl) => units[sl]).length;
          const fresh = [3, 4, 5].filter((sl) => units[sl] && units[sl]!.fresh).length;
          if (own >= 2 || (own >= 1 && fresh >= 1)) best = consider(i, { handIdx: i, target: null }, 3.5 + own * 2 + fresh * 1.5, best);
          break;
        }
        case 'aoe':
        case 'ashRain': {
          const count = [0, 1, 2].filter((l) => units[l]).length;
          if (count >= 2) best = consider(i, { handIdx: i, target: null }, 4 + count * 2.2, best);
          break;
        }
        case 'destinyArrow': {
          const php = sim.heroHp.player;
          const dmg = php <= 10 ? (sp.amount2 ?? 8) : sp.amount;
          if (dmg >= php) best = { idx: i, action: { handIdx: i, target: null }, score: 50 };
          else if (php <= 14) best = consider(i, { handIdx: i, target: null }, 4 + dmg, best);
          break;
        }
        case 'spikeShield': {
          const own = [3, 4, 5].filter((sl) => units[sl] && !units[sl]!.hasEscudo && (units[sl]!.taunt || units[sl]!.hp >= 4)).sort((a, b) => units[b]!.hp - units[a]!.hp)[0];
          if (own !== undefined) best = consider(i, { handIdx: i, target: { kind: 'lane', side: 'enemy', lane: laneOf(own) } }, 3.5 + units[own]!.hp * 0.3, best);
          break;
        }
        case 'forbidden': {
          if (sim.heroHp.enemy > 8 && sim.hands.enemy.length <= 4) best = consider(i, { handIdx: i, target: null }, 3.5, best);
          break;
        }
        case 'buffHp':
        case 'teamBuff': {
          const own = [3, 4, 5].filter((sl) => units[sl]).length;
          if (own >= 2) best = consider(i, { handIdx: i, target: null }, 3 + own * 1.6, best);
          break;
        }
        default: break;
      }
    });

    if (!best) break;
    const chosen = best as { idx: number; action: AiAction; score: number };
    if (chosen.score < 2.2) break;
    plan.push(chosen.action);

    // aplicar en la simulación
    const card = sim.hands.enemy[chosen.action.handIdx];
    sim.hands.enemy = sim.hands.enemy.filter((_, idx) => idx !== chosen.action.handIdx);
    sim.energy.enemy.cur -= card.cost;
    if (card.kind === 'unit' && chosen.action.target?.kind === 'lane') {
      const { target } = chosen.action;
      sim.units[3 + target.lane] = {
        uid: 999, def: card, atk: (card.atk ?? 0) + bonus, hp: (card.hp ?? 0) + bonus,
        maxHp: (card.hp ?? 0) + bonus, defv: card.def ?? 0, frozen: 0, poison: 0, poisonT: 0,
        vamp: !!card.vamp, ranged: !!card.ranged, taunt: !!card.taunt, pierce: !!card.pierce,
        swift: !!card.swift, thorns: card.thorns ?? 0,
        poisonAtk: card.poisonAtk ?? 0, freezeAtk: !!card.freezeAtk,
        tempAtk: 0, hasEscudo: false, lastHitBy: null, ready: false, fresh: true,
      };
    }
    if (card.kind === 'spell' && card.spell?.school === 'fire' && chosen.action.target?.kind === 'lane') {
      const d = sim.units[chosen.action.target.lane];
      if (d) {
        d.hp -= card.spell.amount;
        if (d.hp <= 0) sim.units[chosen.action.target.lane] = null;
      }
    }
    if (card.kind === 'spell' && card.spell?.school === 'fire' && chosen.action.target?.kind === 'hero') {
      sim.heroHp.player = Math.max(0, sim.heroHp.player - card.spell.amount);
    }
    if (card.kind === 'spell' && card.spell?.school === 'destinyArrow') {
      const dmg = sim.heroHp.player <= 10 ? (card.spell.amount2 ?? 8) : card.spell.amount;
      sim.heroHp.player = Math.max(0, sim.heroHp.player - dmg);
    }
  }
  return plan;
}

/* ============ IA: ATAQUES ============ */

export function aiAttackPlan(s: BattleState): AiAttack[] {
  const plan: AiAttack[] = [];
  const units = s.units.map((u) => (u ? { ...u } : null));
  let heroHp = s.heroHp.player;
  const used = new Set<number>();
  let guard = 0;

  const attackers = () => [3, 4, 5].filter((i) => units[i] && !used.has(i) && units[i]!.ready && units[i]!.frozen <= 0 && (!units[i]!.fresh || units[i]!.swift));
  const playerUnits = () => [0, 1, 2].filter((l) => units[l]);
  const tauntLanes = () => playerUnits().filter((l) => units[l]!.taunt);
  const canHitHero = (u: UnitInst) => (u.ranged || playerUnits().length === 0) && tauntLanes().length === 0;

  // ¿Letal al héroe con quienes pueden alcanzarlo (sin provocación en contra)?
  const reachTotal = attackers().filter((i) => canHitHero(units[i]!)).reduce((a, i) => a + units[i]!.atk, 0);
  if (reachTotal >= heroHp && heroHp > 0) {
    return attackers().filter((i) => canHitHero(units[i]!)).map((slot) => ({ slot, target: { kind: 'hero' as const, side: 'player' as const } }));
  }

  while (guard++ < 9) {
    let best: { slot: number; target: Target; score: number } | null = null;
    const taunts = tauntLanes();
    const candidateLanes = taunts.length > 0 ? taunts : playerUnits();
    for (const slot of attackers()) {
      const att = units[slot]!;
      if (taunts.length === 0 && canHitHero(att)) {
        let score = att.atk * (heroHp <= 10 ? 1.35 : 1.0);
        if (att.atk >= heroHp) score = 1000;
        if (score > (best?.score ?? 0.7)) best = { slot, target: { kind: 'hero', side: 'player' }, score };
      }
      for (const l of candidateLanes) {
        const d = units[l]!;
        const dmg = att.pierce ? att.atk : Math.max(0, att.atk - d.defv);
        // Unidades a distancia no reciben contraataque ni espinas
        const ret = att.ranged ? 0 : Math.max(0, d.atk - att.defv) + d.thorns;
        let score: number;
        if (dmg >= d.hp) {
          score = 10 + d.atk * 1.6 + d.def.cost * 0.6 + (d.taunt ? 3 : 0);
          if (ret >= att.hp) score -= (att.atk * 1.2 + att.def.cost * 0.6) * 0.92;
        } else if (!att.pierce && att.atk <= d.defv) {
          score = 1.2 + d.defv * 0.2; // romper armadura poco a poco
        } else {
          score = dmg * 0.35 - (ret >= att.hp ? att.atk * 1.1 + 2 : ret * 0.2);
        }
        if (score > (best?.score ?? 0.7)) best = { slot, target: { kind: 'lane', side: 'player', lane: l }, score };
      }
    }
    if (!best) break;
    const chosen: { slot: number; target: Target; score: number } = best;
    plan.push({ slot: chosen.slot, target: chosen.target });
    used.add(chosen.slot);
    const att = units[chosen.slot]!;
    if (chosen.target.kind === 'hero') {
      heroHp = Math.max(0, heroHp - att.atk);
    } else {
      const d = units[chosen.target.lane]!;
      const absorbed = att.pierce ? 0 : Math.min(d.defv, att.atk);
      d.defv -= absorbed;
      d.hp -= att.atk - absorbed;
      // Unidades a distancia no reciben contraataque ni espinas
      if (!att.ranged) {
        const retAbs = Math.min(att.defv, d.atk);
        att.defv -= retAbs;
        att.hp -= d.atk - retAbs + d.thorns;
      }
      if (d.hp <= 0) units[chosen.target.lane] = null;
      if (att.hp <= 0) units[chosen.slot] = null;
    }
  }
  return plan;
}
