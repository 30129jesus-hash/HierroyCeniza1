import type {
  AiAction, AiAttack, BattleConfig, BattleEvent, BattleState, CardDef,
  PlayResult, Side, Target, UnitInst,
} from './types';

export const laneOf = (slot: number) => slot % 3;
export const sideOfSlot = (slot: number): Side => (slot < 3 ? 'player' : 'enemy');
export const slotOf = (side: Side, lane: number) => (side === 'player' ? lane : 3 + lane);
export const opp = (side: Side): Side => (side === 'player' ? 'enemy' : 'player');

const energyMax = (s: BattleState, side: Side) =>
  Math.min(9, Math.max(1, s.round + (side === 'enemy'
    ? s.cfg.enemyEnergyBonus
    : ((s.cfg.relics ?? []).includes('rel_poder') ? 1 : 0) - (s.cfg.playerEnergyPenalty ?? 0))));

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clone(s: BattleState): BattleState {
  return {
    ...s,
    units: s.units.map((u) => (u ? { ...u } : null)),
    hands: { player: [...s.hands.player], enemy: [...s.hands.enemy] },
    decks: { player: [...s.decks.player], enemy: [...s.decks.enemy] },
    energy: { player: { ...s.energy.player }, enemy: { ...s.energy.enemy } },
    heroHp: { ...s.heroHp },
    heroMaxHp: { ...s.heroMaxHp },
    log: [...s.log],
  };
}

function log(s: BattleState, text: string, tone: 'info' | 'good' | 'bad' | 'sys' = 'info') {
  s.logSeq += 1;
  s.log = [...s.log.slice(-70), { id: s.logSeq, text, tone }];
}

function draw(s: BattleState, side: Side, n: number) {
  for (let i = 0; i < n; i++) {
    if (s.decks[side].length === 0) {
      // El mazo se agotó: se rearma al azar con las 20 cartas originales
      if (s.baseDecks[side].length === 0) return;
      s.decks[side] = shuffle([...s.baseDecks[side]]);
      log(s, side === 'player' ? 'Tu mazo se rearma al azar desde el pozo de guerra.' : 'El mazo enemigo se rearma.', side === 'player' ? 'sys' : 'bad');
    }
    if (s.decks[side].length === 0 || s.hands[side].length >= 8) return;
    s.hands[side].push(s.decks[side].shift()!);
  }
}

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
    energy: {
      player: { cur: 1, max: 1 },
      enemy: { cur: 1 + cfg.enemyEnergyBonus, max: 1 + cfg.enemyEnergyBonus },
    },
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
  draw(s, 'player', 3);
  draw(s, 'enemy', 3);
  log(s, 'Ronda 1: despliega tus fuerzas.', 'sys');
  return s;
}

function makeUnit(s: BattleState, def: CardDef, side: Side): UnitInst {
  const bonus = side === 'enemy' ? s.cfg.enemyStatBonus : 0;
  const relics = s.cfg.relics ?? [];
  const pAtk = side === 'player' && relics.includes('rel_estandarte') ? 1 : 0;
  const pHp = side === 'player' && relics.includes('rel_vida') ? 2 : 0;
  const pDef = side === 'player' && relics.includes('rel_muralla') ? 1 : 0;
  s.uidSeq += 1;
  return {
    uid: s.uidSeq, def,
    atk: (def.atk ?? 0) + bonus + pAtk,
    hp: (def.hp ?? 0) + bonus + pHp,
    maxHp: (def.hp ?? 0) + bonus + pHp,
    defv: (def.def ?? 0) + pDef,
    frozen: 0, poison: 0, poisonT: 0,
    vamp: !!def.vamp,
    ranged: !!def.ranged, taunt: !!def.taunt, pierce: !!def.pierce,
    swift: !!def.swift, thorns: def.thorns ?? 0,
    poisonAtk: def.poisonAtk ?? 0, freezeAtk: !!def.freezeAtk,
    tempAtk: 0, hasEscudo: false, lastHitBy: null,
    ready: false, fresh: true,
  };
}

function checkWin(s: BattleState, events: BattleEvent[]) {
  if (s.winner) return;
  if (s.heroHp.enemy <= 0) { s.winner = 'player'; s.phase = 'done'; events.push({ t: 'victory', winner: 'player' }); }
  else if (s.heroHp.player <= 0) { s.winner = 'enemy'; s.phase = 'done'; events.push({ t: 'victory', winner: 'enemy' }); }
}

/* Daño contra unidad. La defensa es ARMADURA: absorbe el golpe entero hasta
   agotarse y solo el sobrante pasa a la vida. Los hechizos/veneno la ignoran. */
function armorStrike(s: BattleState, side: Side, lane: number, amount: number, events: BattleEvent[], kind: 'hit' | 'fire' | 'ice' | 'poison' = 'hit', ignoreDef = false): number {
  const u = s.units[slotOf(side, lane)];
  if (!u || amount <= 0) return 0;
  if (ignoreDef) {
    u.hp -= amount;
    events.push({ t: 'damageUnit', side, lane, amount, kind });
    if (u.hp <= 0) killUnit(s, side, lane, events);
    return amount;
  }
  const absorbed = Math.min(u.defv, amount);
  if (absorbed > 0) {
    u.defv -= absorbed;
    events.push({ t: 'armor', side, lane, amount: absorbed, broke: u.defv === 0 });
  }
  const rest = amount - absorbed;
  if (rest > 0) {
    u.hp -= rest;
    events.push({ t: 'damageUnit', side, lane, amount: rest, kind });
  }
  if (u.hp <= 0) killUnit(s, side, lane, events);
  return rest;
}

function killUnit(s: BattleState, side: Side, lane: number, events: BattleEvent[]) {
  const u = s.units[slotOf(side, lane)];
  if (!u) return;
  s.units[slotOf(side, lane)] = null;
  events.push({ t: 'death', side, lane });
  if (side === 'enemy') {
    s.kills += 1;
    if (u.def.id === 'e_dragon') s.dragonKills += 1;
    log(s, `${u.def.name} ha caído.`, 'good');
  } else {
    log(s, `Tu ${u.def.name} ha caído.`, 'bad');
  }
  triggerOnDeath(s, side, lane, u, events);
}

/* Token: esqueleto 1/1 invocado por el Golem de Púrpura. */
const SKELETON_DEF: CardDef = {
  id: 'token_esqueleto', name: 'Esqueleto', side: 'player', kind: 'unit', cost: 0,
  atk: 1, hp: 1, def: 0, rarity: 'común', icon: 'skull', hue: 40,
  text: 'Huesos que se niegan a descansar.', tags: ['nomuerto'],
};

function spawnSkeleton(s: BattleState, side: Side): UnitInst {
  s.uidSeq += 1;
  return {
    uid: s.uidSeq, def: SKELETON_DEF, atk: 1, hp: 1, maxHp: 1, defv: 0,
    frozen: 0, poison: 0, poisonT: 0, vamp: false,
    ranged: false, taunt: false, pierce: false, swift: false, thorns: 0,
    poisonAtk: 0, freezeAtk: false, tempAtk: 0, hasEscudo: false, lastHitBy: null,
    ready: false, fresh: true,
  };
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
          log(s, `El cadáver de ${u.def.name} envenena a ${killer.def.name}.`, side === 'player' ? 'good' : 'bad');
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
      if (lanes.length > 0) log(s, `De ${u.def.name} emergen ${lanes.length} esqueleto${lanes.length > 1 ? 's' : ''}.`, side === 'player' ? 'good' : 'bad');
      break;
    }
    case 'healHero': {
      healHero(s, side, od.amount, events);
      break;
    }
  }
}

function damageHero(s: BattleState, side: Side, amount: number, events: BattleEvent[]) {
  if (amount <= 0) return;
  let dmg = amount;
  if (side === 'player' && (s.cfg.relics ?? []).includes('rel_amuleto')) {
    dmg = Math.max(1, amount - 1);
    if (dmg < amount) log(s, `El Amuleto Rúnico absorbe 1 de daño.`, 'info');
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

function healUnit(s: BattleState, side: Side, lane: number, amount: number, events: BattleEvent[]) {
  const u = s.units[slotOf(side, lane)];
  if (!u) return;
  const healed = Math.min(amount, u.maxHp - u.hp);
  if (healed <= 0) return;
  u.hp += healed;
  events.push({ t: 'healUnit', side, lane, amount: healed });
}

function healHero(s: BattleState, side: Side, amount: number, events: BattleEvent[]) {
  const healed = Math.min(amount, s.heroMaxHp[side] - s.heroHp[side]);
  if (healed <= 0) return;
  s.heroHp[side] += healed;
  events.push({ t: 'healHero', side, amount: healed });
  log(s, side === 'player' ? `Tu héroe recupera ${healed} de vida.` : `El héroe enemigo recupera ${healed}.`, side === 'player' ? 'good' : 'bad');
}

function castSpell(s: BattleState, side: Side, card: CardDef, t: Target, events: BattleEvent[]) {
  const sp = card.spell!;
  const name = card.name;
  const atLane = (side2: Side, lane: number) => s.units[slotOf(side2, lane)];

  switch (sp.school) {
    case 'fire': {
      if (t.kind === 'hero') {
        damageHero(s, t.side, sp.amount, events);
      } else {
        log(s, `${name}: ${sp.amount} de daño.`, side === 'player' ? 'good' : 'bad');
        armorStrike(s, t.side, t.lane, sp.amount, events, 'fire', true);
      }
      break;
    }
    case 'ice': {
      if (t.kind === 'lane') {
        log(s, `${name}: ${sp.amount} de daño y congelación.`, side === 'player' ? 'good' : 'bad');
        armorStrike(s, t.side, t.lane, sp.amount, events, 'ice', true);
        const u = atLane(t.side, t.lane);
        if (u && u.frozen === 0) {
          u.frozen = sp.amount2 ?? 1;
          events.push({ t: 'freeze', side: t.side, lane: t.lane });
          log(s, `${u.def.name} queda congelada.`, side === 'player' ? 'good' : 'bad');
        }
      }
      break;
    }
    case 'poison': {
      if (t.kind === 'lane') {
        const u = atLane(t.side, t.lane);
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
        const u = atLane(t.side, t.lane);
        if (u) { u.atk += sp.amount; events.push({ t: 'buff', side: t.side, lane: t.lane, label: `+${sp.amount} ATK` }); log(s, `${u.def.name} gana +${sp.amount} de ATK.`, side === 'player' ? 'good' : 'bad'); }
      }
      break;
    }
    case 'buffDef': {
      if (t.kind === 'lane') {
        const u = atLane(t.side, t.lane);
        if (u) { u.defv += sp.amount; events.push({ t: 'buff', side: t.side, lane: t.lane, label: `+${sp.amount} DEF` }); log(s, `${u.def.name} gana +${sp.amount} de Defensa.`, side === 'player' ? 'good' : 'bad'); }
      }
      break;
    }
    case 'buffHp': {
      if (t.kind === 'lane') {
        const u = atLane(t.side, t.lane);
        if (u) { u.maxHp += sp.amount; u.hp += sp.amount; events.push({ t: 'buff', side: t.side, lane: t.lane, label: `+${sp.amount} VIDA` }); log(s, `${u.def.name} gana +${sp.amount} de Vida.`, side === 'player' ? 'good' : 'bad'); }
      }
      break;
    }
    case 'aoe': {
      log(s, `${name} golpea a todas las unidades enemigas (${sp.amount}).`, side === 'player' ? 'good' : 'bad');
      const foe = opp(side);
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
      const foe = opp(side);
      for (let l = 0; l < 3; l++) if (s.units[slotOf(foe, l)]) armorStrike(s, foe, l, sp.amount, events, 'fire', true);
      damageHero(s, foe, sp.amount2 ?? 1, events);
      break;
    }
    case 'spikeShield': {
      if (t.kind === 'lane') {
        const u = atLane(t.side, t.lane);
        if (u && !u.hasEscudo) {
          u.defv += sp.amount; u.thorns += (sp.amount2 ?? 2); u.hasEscudo = true;
          events.push({ t: 'buff', side: t.side, lane: t.lane, label: `+${sp.amount} DEF · ESPINAS` });
          log(s, `${u.def.name} queda erizado de espinas.`, side === 'player' ? 'good' : 'bad');
        }
      }
      break;
    }
    case 'shadowDagger': {
      if (t.kind === 'lane') {
        const u = atLane(t.side, t.lane);
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
          u.swift = true; u.atk += sp.amount;
          events.push({ t: 'buff', side, lane: l, label: `VELOZ +${sp.amount}` });
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
      const foe = opp(side);
      const dmg = s.heroHp[foe] <= 10 ? (sp.amount2 ?? 8) : sp.amount;
      log(s, `${name}: el destino reclama ${dmg} de daño.`, side === 'player' ? 'good' : 'bad');
      damageHero(s, foe, dmg, events);
      break;
    }
  }
}

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
      for (let l = 0; l < 3; l++) {
        const u = s.units[slotOf(side, l)];
        if (u && !(l === lane)) { u.defv += op.amount; events.push({ t: 'buff', side, lane: l, label: `+${op.amount} DEF` }); }
      }
      break;
    }
    case 'buffOtherAtk': {
      for (let l = 0; l < 3; l++) {
        const u = s.units[slotOf(side, l)];
        if (u && !(l === lane)) { u.atk += op.amount; events.push({ t: 'buff', side, lane: l, label: `+${op.amount} ATK` }); }
      }
      break;
    }
    case 'draw': {
      draw(s, side, op.amount);
      events.push({ t: 'draw', side });
      break;
    }
  }
}

/* ============ FASE DE DESPLIEGUE ============ */

export const canAfford = (s: BattleState, side: Side, card: CardDef) => card.cost <= s.energy[side].cur;

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
      for (let l = 0; l < 3; l++) if (s.units[slotOf(side, l)]) t.push({ kind: 'lane', side, lane: l });
      t.push({ kind: 'hero', side });
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
      t.push({ kind: 'hero', side }); // pseudo-objetivo: sin selección
      break;
  }
  return t;
}

export function playCard(prev: BattleState, side: Side, handIdx: number, target: Target | null): PlayResult {
  const s = clone(prev);
  const events: BattleEvent[] = [];
  const card = s.hands[side][handIdx];
  if (!card || s.winner || card.cost > s.energy[side].cur) return { state: prev, events: [] };
  const valid = validTargets(s, side, card);
  if (card.kind === 'unit') {
    if (!target || target.kind !== 'lane' || target.side !== side || s.units[slotOf(target.side, target.lane)]) return { state: prev, events: [] };
  } else if (!valid.some((v) => v.kind === (target?.kind ?? '') && v.side === (target?.side ?? '') && (v.kind !== 'lane' || target?.kind !== 'lane' || v.lane === target.lane))) {
    return { state: prev, events: [] };
  }

  s.energy[side].cur -= card.cost;
  s.hands[side].splice(handIdx, 1);

  if (side === 'player') {
    s.maxCostPlayed = Math.max(s.maxCostPlayed, card.cost);
    if (card.kind === 'spell') s.spellsPlayed += 1;
  }

  if (card.kind === 'unit') {
    const lane = (target as { lane: number }).lane;
    const u = makeUnit(s, card, side);
    s.units[slotOf(side, lane)] = u;
    events.push({ t: 'summon', side, lane, uid: u.uid });
    log(s, side === 'player' ? `Despliegas a ${card.name}.` : `El enemigo despliega a ${card.name}.`, side === 'player' ? 'info' : 'bad');
    if (card.onPlay) triggerOnPlay(s, side, card, lane, events);
  } else {
    castSpell(s, side, card, target as Target, events);
  }
  return { state: s, events };
}

export function endDeployPlayer(prev: BattleState): BattleState {
  const s = clone(prev);
  if (s.winner || s.phase !== 'deployPlayer') return prev;
  s.phase = 'deployEnemy';
  s.energy.enemy.max = energyMax(s, 'enemy');
  s.energy.enemy.cur = s.energy.enemy.max;
  return s;
}

export function endDeployEnemy(prev: BattleState): BattleState {
  const s = clone(prev);
  if (s.winner || s.phase !== 'deployEnemy') return prev;
  return beginAttacks(s);
}

function beginAttacks(s: BattleState): BattleState {
  s.phase = 'attackPlayer';
  s.units.forEach((u) => { if (u) u.ready = (!u.fresh || u.swift) && u.frozen <= 0; });
  const pAtk = canAttackSide(s, 'player');
  if (!pAtk && !canAttackSide(s, 'enemy')) log(s, 'Nadie está listo para atacar. La ronda avanza.', 'sys');
  else if (!pAtk) log(s, 'Ninguna de tus unidades está lista para atacar.', 'info');
  return s;
}

/* ============ FASE DE ATAQUE ============ */

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

/* Presas válidas: solo los de a distancia (o tablero rival vacío) alcanzan al héroe. */
export const foeUnitsAlive = (s: BattleState, side: Side): number => {
  const foe = opp(side);
  return [0, 1, 2].filter((l) => s.units[slotOf(foe, l)]).length;
};

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

export function performAttack(prev: BattleState, side: Side, attackerSlot: number, target: Target): PlayResult {
  const s = clone(prev);
  const events: BattleEvent[] = [];
  const attacker = s.units[attackerSlot];
  if (!attacker || s.winner || !attacker.ready || attacker.frozen > 0) return { state: prev, events: [] };
  if (attacker.fresh && !attacker.swift) return { state: prev, events: [] };
  const expectedPhase = side === 'player' ? 'attackPlayer' : 'attackEnemy';
  if (s.phase !== expectedPhase) return { state: prev, events: [] };
  const foe = opp(side);
  if (target.side !== foe) return { state: prev, events: [] };
  if (target.kind === 'hero' && !attacker.ranged && foeUnitsAlive(s, side) > 0) return { state: prev, events: [] };
  const foeTaunts = [0, 1, 2].filter((l) => s.units[slotOf(foe, l)]?.taunt);
  if (foeTaunts.length > 0 && !(target.kind === 'lane' && foeTaunts.includes(target.lane))) return { state: prev, events: [] };

  const lane = laneOf(attackerSlot);
  const tLane = target.kind === 'lane' ? target.lane : null;
  events.push({ t: 'attack', side, lane, tSide: foe, tLane });
  attacker.ready = false;

  if (target.kind === 'hero') {
    log(s, side === 'player'
      ? `${attacker.def.name} golpea al héroe enemigo (${attacker.atk}).`
      : `${attacker.def.name} te golpea (${attacker.atk}).`, side === 'player' ? 'good' : 'bad');
    damageHero(s, foe, attacker.atk, events);
    if (attacker.vamp && attacker.hp < attacker.maxHp) {
      healUnit(s, side, lane, attacker.atk, events);
      log(s, `Vampirismo: ${attacker.def.name} drena vida.`, side === 'player' ? 'good' : 'bad');
    }
    return { state: s, events };
  }

  const defender = s.units[slotOf(foe, target.lane)];
  if (!defender) return { state: prev, events: [] };
  // Rastreamos quién asesta cada golpe (para "al morir" del Cadáver Renacido).
  defender.lastHitBy = { side, lane };
  attacker.lastHitBy = { side: foe, lane: target.lane };
  const hpToDef = armorStrike(s, foe, target.lane, attacker.atk, events, 'hit', attacker.pierce);
  // Veneno / congelación al impactar (Tejedor, Serpiente Petrificante).
  const defAfter = s.units[slotOf(foe, target.lane)];
  if (defAfter && attacker.poisonAtk > 0) {
    defAfter.poison = Math.max(defAfter.poison, attacker.poisonAtk);
    defAfter.poisonT = Math.max(defAfter.poisonT, 3);
    events.push({ t: 'poisonApply', side: foe, lane: target.lane });
    log(s, `${defAfter.def.name} queda envenenado.`, side === 'player' ? 'good' : 'bad');
  }
  if (defAfter && attacker.freezeAtk && defAfter.frozen === 0) {
    defAfter.frozen = 1;
    events.push({ t: 'freeze', side: foe, lane: target.lane });
    log(s, `${defAfter.def.name} queda petrificado.`, side === 'player' ? 'good' : 'bad');
  }
  const hpToAtt = armorStrike(s, side, lane, defender.atk, events);
  log(s, side === 'player'
    ? `${attacker.def.name} ataca a ${defender.def.name}${attacker.pierce ? ' (perforación)' : ''}.`
    : `${attacker.def.name} ataca a tu ${defender.def.name}.`,
    side === 'player' ? 'good' : 'bad');
  if (attacker.vamp && hpToDef > 0) healUnit(s, side, lane, hpToDef, events);
  if (defender.vamp && hpToAtt > 0) healUnit(s, foe, target.lane, hpToAtt, events);
  if (s.units[slotOf(foe, target.lane)] && defender.thorns > 0) {
    log(s, `Espinas: ${defender.def.name} devuelve ${defender.thorns} de daño.`, side === 'player' ? 'bad' : 'good');
    armorStrike(s, side, lane, defender.thorns, events, 'hit', true);
  }
  return { state: s, events };
}

export function endAttackPlayer(prev: BattleState): BattleState {
  const s = clone(prev);
  if (s.winner || s.phase !== 'attackPlayer') return prev;
  s.phase = 'attackEnemy';
  return s;
}

/* ============ IA: DESPLIEGUE ============ */

export function aiPlan(s: BattleState): AiAction[] {
  const actions: AiAction[] = [];
  let energy = s.energy.enemy.cur;
  const hand = [...s.hands.enemy];
  const units: (UnitInst | null)[] = s.units.map((u) => (u ? { ...u } : null));
  let guard = 0;

  while (guard++ < 12) {
    let best: { idx: number; action: AiAction; score: number } | null = null;
    const consider = (idx: number, action: AiAction, score: number) => {
      if (!best || score > best.score) best = { idx, action, score };
    };

    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      if (card.cost > energy) continue;

      if (card.kind === 'unit') {
        const openLanes = [0, 1, 2].filter((l) => !units[3 + l]);
        if (openLanes.length === 0) continue;
        // prefiere tapar el carril con tu unidad más peligrosa si aguanta el golpe
        let lane = openLanes[0];
        let bestThreat = -1;
        for (const l of openLanes) {
          const pu = units[l];
          if (pu && pu.atk > bestThreat) { bestThreat = pu.atk; lane = l; }
        }
        const score = 3 + (card.atk ?? 0) + (card.hp ?? 0) * 0.7 + card.cost * 0.4 + (bestThreat > 0 ? bestThreat * 0.5 : 0);
        consider(i, { handIdx: i, target: { kind: 'lane', side: 'enemy', lane } }, score);
      } else {
        const sp = card.spell!;
        switch (sp.school) {
          case 'fire': {
            let scored = false;
            for (let l = 0; l < 3; l++) {
              const pu = units[l];
              if (pu && pu.hp <= sp.amount) { consider(i, { handIdx: i, target: { kind: 'lane', side: 'player', lane: l } }, 8 + pu.atk * 1.5); scored = true; }
            }
            if (!scored) {
              const hurt = [0, 1, 2].filter((l) => units[l]).sort((a, b) => units[b]!.atk - units[a]!.atk)[0];
              if (hurt !== undefined) consider(i, { handIdx: i, target: { kind: 'lane', side: 'player', lane: hurt } }, 2.5 + sp.amount * 0.4);
            }
            break;
          }
          case 'ice': {
            const threat = [0, 1, 2].filter((l) => units[l] && units[l]!.frozen === 0).sort((a, b) => units[b]!.atk - units[a]!.atk)[0];
            if (threat !== undefined) consider(i, { handIdx: i, target: { kind: 'lane', side: 'player', lane: threat } }, 4 + units[threat]!.atk);
            break;
          }
          case 'poison': {
            const tough = [0, 1, 2].filter((l) => units[l]).sort((a, b) => units[b]!.hp - units[a]!.hp)[0];
            if (tough !== undefined) consider(i, { handIdx: i, target: { kind: 'lane', side: 'player', lane: tough } }, 3.5 + (units[tough]!.defv > 0 ? 2 : 0));
            break;
          }
          case 'heal': {
            const hurtUnit = [3, 4, 5].filter((sl) => units[sl] && units[sl]!.hp < units[sl]!.maxHp).sort((a, b) => units[a]!.hp - units[b]!.hp)[0];
            if (hurtUnit !== undefined) consider(i, { handIdx: i, target: { kind: 'lane', side: 'enemy', lane: laneOf(hurtUnit) } }, 3 + (units[hurtUnit]!.maxHp - units[hurtUnit]!.hp) * 0.5);
            else consider(i, { handIdx: i, target: { kind: 'hero', side: 'enemy' } }, 1.5);
            break;
          }
          case 'buffAtk':
          case 'buffDef':
          case 'buffHp': {
            const own = [3, 4, 5].filter((sl) => units[sl]).sort((a, b) => units[b]!.atk - units[a]!.atk)[0];
            if (own !== undefined) consider(i, { handIdx: i, target: { kind: 'lane', side: 'enemy', lane: laneOf(own) } }, 3 + units[own]!.atk * 0.6);
            break;
          }
          case 'aoe': {
            const count = [0, 1, 2].filter((l) => units[l]).length;
            if (count >= 2) consider(i, { handIdx: i, target: null }, 4 + count * 2);
            break;
          }
          case 'teamBuff': {
            const count = [3, 4, 5].filter((sl) => units[sl]).length;
            if (count >= 2) consider(i, { handIdx: i, target: null }, 3 + count * 2.2);
            break;
          }
          case 'warCry': {
            const own = [3, 4, 5].filter((sl) => units[sl]).length;
            const fresh = [3, 4, 5].filter((sl) => units[sl] && units[sl]!.fresh).length;
            if (own >= 2 || (own >= 1 && fresh >= 1)) consider(i, { handIdx: i, target: null }, 3.5 + own * 2 + fresh * 1.5);
            break;
          }
          case 'shadowDagger': {
            const own = [3, 4, 5].filter((sl) => units[sl] && !units[sl]!.fresh).sort((a, b) => units[b]!.atk - units[a]!.atk)[0];
            if (own !== undefined) consider(i, { handIdx: i, target: { kind: 'lane', side: 'enemy', lane: laneOf(own) } }, 3 + units[own]!.atk * 0.7);
            break;
          }
          case 'ashRain': {
            const count = [0, 1, 2].filter((l) => units[l]).length;
            if (count >= 2) consider(i, { handIdx: i, target: null }, 4 + count * 2.2);
            break;
          }
          case 'destinyArrow': {
            const php = s.heroHp.player;
            const dmg = php <= 10 ? (sp.amount2 ?? 8) : sp.amount;
            if (dmg >= php) consider(i, { handIdx: i, target: null }, 50);
            else consider(i, { handIdx: i, target: null }, 3 + dmg * 0.6);
            break;
          }
          case 'spikeShield': {
            const own = [3, 4, 5].filter((sl) => units[sl] && !units[sl]!.hasEscudo && (units[sl]!.taunt || units[sl]!.hp >= 4)).sort((a, b) => units[b]!.hp - units[a]!.hp)[0];
            if (own !== undefined) consider(i, { handIdx: i, target: { kind: 'lane', side: 'enemy', lane: laneOf(own) } }, 3.5 + units[own]!.hp * 0.3);
            break;
          }
          case 'forbidden': {
            if (s.heroHp.enemy > 8 && s.hands.enemy.length <= 4) consider(i, { handIdx: i, target: null }, 3.5);
            break;
          }
        }
      }
    }

    if (!best) break;
    const chosen: { idx: number; action: AiAction; score: number } = best;
    actions.push(chosen.action);
    const card = hand[chosen.idx];
    energy -= card.cost;
    // simula el efecto para las siguientes decisiones
    if (card.kind === 'unit' && chosen.action.target?.kind === 'lane') {
      const bonus = s.cfg.enemyStatBonus;
      units[3 + chosen.action.target.lane] = {
        uid: 999, def: card, atk: (card.atk ?? 0) + bonus, hp: (card.hp ?? 0) + bonus,
        maxHp: (card.hp ?? 0) + bonus, defv: card.def ?? 0, frozen: 0, poison: 0, poisonT: 0,
        vamp: !!card.vamp, ranged: !!card.ranged, taunt: !!card.taunt, pierce: !!card.pierce,
        swift: !!card.swift, thorns: card.thorns ?? 0,
        poisonAtk: card.poisonAtk ?? 0, freezeAtk: !!card.freezeAtk,
        tempAtk: 0, hasEscudo: false, lastHitBy: null, ready: false, fresh: true,
      };
    }
    if (card.kind === 'spell' && card.spell?.school === 'fire' && chosen.action.target?.kind === 'lane') {
      const u = units[chosen.action.target.lane];
      if (u) { u.hp -= card.spell.amount; if (u.hp <= 0) units[chosen.action.target.lane] = null; }
    }
    hand.splice(chosen.idx, 1);
  }
  return actions;
}

/* ============ IA: ATAQUE ============ */

export function aiAttackPlan(s: BattleState): AiAttack[] {
  const plan: AiAttack[] = [];
  const units: (UnitInst | null)[] = s.units.map((u) => (u ? { ...u } : null));
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
        const ret = Math.max(0, d.atk - att.defv) + d.thorns;
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
      const retAbs = Math.min(att.defv, d.atk);
      att.defv -= retAbs;
      att.hp -= d.atk - retAbs + d.thorns;
      if (d.hp <= 0) units[chosen.target.lane] = null;
      if (att.hp <= 0) units[chosen.slot] = null;
    }
  }
  return plan;
}

/* ============ FIN DE RONDA ============ */

export function endRound(prev: BattleState): PlayResult {
  const s = clone(prev);
  const events: BattleEvent[] = [];
  if (s.winner || s.phase !== 'attackEnemy') return { state: prev, events: [] };

  // veneno (ignora armadura)
  for (let slot = 0; slot < 6; slot++) {
    const u = s.units[slot];
    if (u && u.poison > 0 && u.poisonT > 0) {
      const side = sideOfSlot(slot);
      log(s, `El veneno consume a ${u.def.name} (${u.poison}).`, side === 'player' ? 'bad' : 'good');
      u.hp -= u.poison;
      events.push({ t: 'damageUnit', side, lane: laneOf(slot), amount: u.poison, kind: 'poison' });
      u.poisonT -= 1;
      if (u.poisonT <= 0) u.poison = 0;
      if (u.hp <= 0) killUnit(s, side, laneOf(slot), events);
    }
  }

  // congelación, fatiga de invocación y limpieza de buffs temporales
  s.units.forEach((u) => {
    if (u) {
      u.frozen = Math.max(0, u.frozen - 1);
      u.fresh = false;
      u.ready = false;
      if (u.tempAtk > 0) { u.atk = Math.max(0, u.atk - u.tempAtk); u.tempAtk = 0; }
    }
  });

  s.round += 1;

  if (s.round > s.cfg.maxRounds) {
    // Se acabó el tiempo: si el jefe enemigo sigue en pie, pierdes.
    s.winner = 'enemy';
    s.phase = 'done';
    log(s, `Las ${s.cfg.maxRounds} rondas se agotaron y el enemigo sigue en pie. Derrota.`, 'sys');
    events.push({ t: 'victory', winner: 'enemy' });
    return { state: s, events };
  }

  // reliquias de fin de ronda
  const relics = s.cfg.relics ?? [];
  if (relics.includes('rel_fuente')) {
    log(s, `La Fuente Sanadora vierte su agua (2 de vida).`, 'info');
    healHero(s, 'player', 2, events);
  }

  draw(s, 'player', 1);
  draw(s, 'enemy', 1);
  if (relics.includes('rel_sabiduria')) draw(s, 'player', 1);
  events.push({ t: 'draw', side: 'player' });

  s.phase = 'deployPlayer';
  s.energy.player.max = energyMax(s, 'player');
  s.energy.player.cur = s.energy.player.max;
  s.energy.enemy.max = energyMax(s, 'enemy');
  log(s, `Ronda ${s.round}: despliega tus fuerzas.`, 'sys');
  return { state: s, events };
}
