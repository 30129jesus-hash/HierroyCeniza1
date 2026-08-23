import { useEffect, useMemo, useRef, useState } from 'react';
import type { BattleConfig, BattleEvent, BattleState, Side, Target, UnitInst } from '../game/types';
import {
  aiAttackPlan, aiPlan, attackTargets, canAfford, canAttackSide, createBattle, endAttackPlayer,
  endDeployEnemy, endDeployPlayer, endRound, foeHasTaunt, performAttack, playCard, readyCount,
  slotOf, validTargets,
} from '../game/engine';
import { RARITY_COLOR } from '../game/cards';
import { sfx } from '../game/audio';
import { music } from '../game/music';
import { useMeta } from '../state/store';
import CardView from './CardView';
import { Sigil, RuneRing } from './icons';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface Fx { id: number; anchor: string; type: 'txt' | 'burst'; txt?: string; color?: string; }

const anchor = (side: Side, lane: number) => `${side[0]}${lane}`;

const DMG_COLOR: Record<string, string> = { hit: '#ff4d5e', fire: '#ff8c3b', ice: '#6fe8ff', poison: '#9dff57' };

export interface BattleStats {
  kills: number;
  rounds: number;
  dragonKills: number;
  heroDamageTaken: number;
  heroHpLeft: number;
}

interface Props {
  cfg: BattleConfig;
  onEnd: (won: boolean, stats: BattleStats, conceded: boolean) => void;
}

export default function BattleScreen({ cfg, onEnd }: Props) {
  const [state, setStateRaw] = useState<BattleState>(() => createBattle(cfg));
  const stateRef = useRef(state);
  const commit = (s: BattleState) => { stateRef.current = s; setStateRaw(s); };

  const buildStats = (): BattleStats => ({
    kills: stateRef.current.kills,
    rounds: stateRef.current.round,
    dragonKills: stateRef.current.dragonKills,
    heroDamageTaken: stateRef.current.heroDamageTaken,
    heroHpLeft: stateRef.current.heroHp.player,
  });

  const { meta, dispatch } = useMeta();

  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [selAttacker, setSelAttacker] = useState<number | null>(null);
  const [fx, setFx] = useState<Fx[]>([]);
  const [lunges, setLunges] = useState<Record<string, 'up' | 'down'>>({});
  const [shakeId, setShakeId] = useState(0);
  const [result, setResult] = useState<null | 'victory' | 'defeat'>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const fxSeq = useRef(0);
  const lungeSeq = useRef(0);
  const timers = useRef<number[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [state.log, showLog]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setSel(null); setSelAttacker(null); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // música ambiental de batalla
  useEffect(() => {
    music.start();
    return () => { music.stop(); };
  }, []);
  useEffect(() => {
    music.setTense(state.phase === 'attackEnemy' || state.heroHp.player <= 8);
  }, [state.phase, state.heroHp.player]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const spawnFx = (anchorId: string, type: Fx['type'], txt?: string, color?: string) => {
    fxSeq.current += 1;
    const id = fxSeq.current;
    setFx((f) => [...f, { id, anchor: anchorId, type, txt, color }]);
    later(() => setFx((f) => f.filter((x) => x.id !== id)), 1100);
  };

  const spawnLunge = (side: Side, lane: number, dir: 'up' | 'down') => {
    lungeSeq.current += 1;
    const key = `${side[0]}${lane}#${lungeSeq.current}`;
    setLunges((l) => ({ ...l, [key]: dir }));
    later(() => setLunges((l) => { const n = { ...l }; delete n[key]; return n; }), 480);
  };

  const handleEvents = (events: BattleEvent[], step = 140): number => {
    events.forEach((e, i) => {
      later(() => {
        switch (e.t) {
          case 'attack':
            spawnLunge(e.side, e.lane, e.side === 'player' ? 'up' : 'down');
            break;
          case 'armor':
            sfx.shield();
            spawnFx(anchor(e.side, e.lane), 'txt', `-${e.amount} DEF`, '#9db8ff');
            if (e.broke) later(() => spawnFx(anchor(e.side, e.lane), 'txt', 'ROTA', '#ff8c3b'), 260);
            break;
          case 'damageUnit':
            if (e.kind === 'fire') sfx.fire(); else if (e.kind === 'ice') sfx.ice(); else if (e.kind === 'poison') sfx.poison(); else sfx.hit();
            spawnFx(anchor(e.side, e.lane), 'txt', `-${e.amount}`, DMG_COLOR[e.kind]);
            spawnFx(anchor(e.side, e.lane), 'burst', undefined, DMG_COLOR[e.kind]);
            break;
          case 'damageHero':
            sfx.heroHit();
            spawnFx(e.side === 'player' ? 'hp' : 'he', 'txt', `-${e.amount}`, '#ff4d5e');
            spawnFx(e.side === 'player' ? 'hp' : 'he', 'burst', undefined, '#ff4d5e');
            setShakeId((x) => x + 1);
            break;
          case 'healUnit':
            sfx.heal();
            spawnFx(anchor(e.side, e.lane), 'txt', `+${e.amount}`, '#9dff57');
            break;
          case 'healHero':
            sfx.heal();
            spawnFx(e.side === 'player' ? 'hp' : 'he', 'txt', `+${e.amount}`, '#9dff57');
            break;
          case 'freeze':
            sfx.freeze();
            spawnFx(anchor(e.side, e.lane), 'txt', 'CONGELADO', '#6fe8ff');
            break;
          case 'poisonApply':
            sfx.poison();
            spawnFx(anchor(e.side, e.lane), 'txt', 'VENENO', '#9dff57');
            break;
          case 'death':
            sfx.death();
            spawnFx(anchor(e.side, e.lane), 'burst', undefined, '#d8c9a8');
            break;
          case 'summon':
            sfx.summon();
            break;
          case 'buff':
            sfx.buff();
            spawnFx(anchor(e.side, e.lane), 'txt', e.label, '#ffd76a');
            break;
          case 'draw':
            sfx.draw();
            break;
          case 'victory':
            later(() => {
              if (e.winner === 'player') sfx.victory(); else sfx.defeat();
              setResult(e.winner === 'player' ? 'victory' : 'defeat');
            }, 500);
            break;
          default:
            break;
        }
      }, i * step);
    });
    return events.length * step + 250;
  };

  const awaitEvents = (events: BattleEvent[], step = 140) => sleep(handleEvents(events, step));

  /* ---------- despliegue del jugador ---------- */

  const targets: Target[] = useMemo(() => {
    if (sel === null) return [];
    const card = state.hands.player[sel];
    if (!card) return [];
    return validTargets(state, 'player', card);
  }, [sel, state]);

  const isTarget = (t: Target) => targets.some((x) =>
    x.kind === t.kind && x.side === t.side && (x.kind !== 'lane' || t.kind !== 'lane' || x.lane === t.lane));

  const clickCard = (idx: number) => {
    if (busy || state.phase !== 'deployPlayer' || result) return;
    sfx.unlock();
    if (sel === idx) { setSel(null); return; }
    const card = state.hands.player[idx];
    if (!canAfford(state, 'player', card)) {
      sfx.error();
      spawnFx('hp', 'txt', 'SIN ENERGÍA', '#ff4d5e');
      return;
    }
    sfx.click();
    setSel(idx);
  };

  const clickTarget = (t: Target) => {
    if (sel === null || busy || result) return;
    const r = playCard(stateRef.current, 'player', sel, t);
    if (r.state === stateRef.current) { sfx.error(); return; }
    sfx.card();
    commit(r.state);
    setSel(null);
    handleEvents(r.events);
  };

  /* ---------- flujo de la ronda ---------- */

  const doEnemyDeploy = async () => {
    const actions = aiPlan(stateRef.current);
    for (const a of actions) {
      const cur = stateRef.current;
      if (cur.winner) break;
      if (a.handIdx >= cur.hands.enemy.length) continue;
      const r = playCard(cur, 'enemy', a.handIdx, a.target);
      if (r.state === cur) continue;
      commit(r.state);
      await awaitEvents(r.events);
      await sleep(220);
    }
  };

  const doEnemyAttacks = async () => {
    const s0 = endAttackPlayer(stateRef.current);
    commit(s0);
    await sleep(420);
    if (stateRef.current.winner) return;
    if (canAttackSide(stateRef.current, 'enemy')) {
      const plan = aiAttackPlan(stateRef.current);
      for (const a of plan) {
        const cur = stateRef.current;
        if (cur.winner) break;
        const r = performAttack(cur, 'enemy', a.slot, a.target);
        if (r.state === cur) continue;
        commit(r.state);
        await awaitEvents(r.events, 170);
        await sleep(240);
      }
    }
  };

  const finishRound = async () => {
    await sleep(350);
    const r = endRound(stateRef.current);
    commit(r.state);
    await awaitEvents(r.events, 200);
    if (!r.state.winner) sfx.turn();
  };

  const endDeploy = async () => {
    if (busy || result || state.phase !== 'deployPlayer') return;
    setBusy(true);
    setSel(null);
    sfx.turn();
    await sleep(350);

    const s1 = endDeployPlayer(stateRef.current);
    commit(s1);
    await sleep(400);
    await doEnemyDeploy();
    if (stateRef.current.winner) { setBusy(false); return; }

    const s2 = endDeployEnemy(stateRef.current);
    commit(s2);
    await sleep(420);

    if (!canAttackSide(s2, 'player')) {
      await doEnemyAttacks();
      if (!stateRef.current.winner) await finishRound();
    }
    setBusy(false);
  };

  /* ---------- ataque del jugador ---------- */

  const isAttackPhase = state.phase === 'attackPlayer' && !busy && !result;
  const atkTargets: Target[] = useMemo(
    () => (selAttacker !== null && state.units[selAttacker]
      ? attackTargets(state, 'player', state.units[selAttacker]!)
      : []),
    [selAttacker, state],
  );
  const isAtkTarget = (t: Target) => atkTargets.some((x) =>
    x.kind === t.kind && x.side === t.side && (x.kind !== 'lane' || t.kind !== 'lane' || x.lane === t.lane));

  const clickOwnUnit = (lane: number) => {
    if (!isAttackPhase) return;
    sfx.unlock();
    const u = state.units[lane];
    if (!u) return;
    if (selAttacker === lane) { setSelAttacker(null); sfx.click(); return; }
    if (u.fresh && !u.swift) { sfx.error(); spawnFx(anchor('player', lane), 'txt', 'AÚN NO', '#6fe8ff'); return; }
    if (u.frozen > 0) { sfx.error(); spawnFx(anchor('player', lane), 'txt', 'CONGELADA', '#6fe8ff'); return; }
    if (!u.ready) { sfx.error(); spawnFx(anchor('player', lane), 'txt', 'AGOTADA', '#a8977a'); return; }
    sfx.click();
    setSelAttacker(lane);
  };

  const clickAttackTarget = (t: Target) => {
    if (selAttacker === null || !isAttackPhase) return;
    const r = performAttack(stateRef.current, 'player', selAttacker, t);
    if (r.state === stateRef.current) { sfx.error(); return; }
    sfx.card();
    commit(r.state);
    setSelAttacker(null);
    handleEvents(r.events, 150);
    if (readyCount(r.state, 'player') === 0) {
      later(async () => {
        if (stateRef.current.winner || stateRef.current.phase !== 'attackPlayer') return;
        setBusy(true);
        await sleep(500);
        await doEnemyAttacks();
        if (!stateRef.current.winner) await finishRound();
        setBusy(false);
      }, 950);
    }
  };

  const endAttack = async () => {
    if (busy || result || state.phase !== 'attackPlayer') return;
    setBusy(true);
    setSelAttacker(null);
    sfx.turn();
    await sleep(300);
    await doEnemyAttacks();
    if (!stateRef.current.winner) await finishRound();
    setBusy(false);
  };

  /* ---------- render helpers ---------- */

  const floatsFor = (anchorId: string) => fx.filter((f) => f.anchor === anchorId && f.type === 'txt');
  const burstsFor = (anchorId: string) => fx.filter((f) => f.anchor === anchorId && f.type === 'burst');
  const lungeFor = (side: Side, lane: number) => {
    const hit = Object.entries(lunges).find(([k]) => k.startsWith(`${side[0]}${lane}#`));
    return hit ? hit[1] : null;
  };

  const renderUnit = (side: Side, lane: number, u: UnitInst | null) => {
    const aid = anchor(side, lane);
    const t: Target = { kind: 'lane', side, lane };
    const spellTargetable = isTarget(t);
    const atkTargetable = side === 'enemy' && isAtkTarget(t);
    const ownClickable = side === 'player' && isAttackPhase && !!u;
    const ready = !!u && u.ready && (!u.fresh || u.swift) && u.frozen <= 0;
    const lunge = lungeFor(side, lane);
    return (
      <div
        key={`${aid}-${u?.uid ?? 'empty'}`}
        onClick={() => {
          if (spellTargetable) clickTarget(t);
          else if (atkTargetable) clickAttackTarget(t);
          else if (ownClickable) clickOwnUnit(lane);
        }}
        className={`relative w-[6.2rem] h-[8.2rem] sm:w-32 sm:h-40 ${u ? 'anim-summon' : ''} ${spellTargetable || atkTargetable || ownClickable ? 'cursor-pointer' : ''} ${lunge === 'up' ? 'anim-lunge-up' : lunge === 'down' ? 'anim-lunge-down' : ''}`}
        style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
      >
        {u ? (
          <div className={`absolute inset-0 ${side === 'player' && state.phase === 'attackPlayer' && !u.ready && (!u.fresh || u.swift) ? 'opacity-60 saturate-50' : ''} ${u.fresh && !u.swift ? 'saturate-[0.75]' : ''}`} style={{
            background: `linear-gradient(170deg, hsl(${u.def.hue} 30% 17%) 0%, #0d0a12 80%)`,
            border: `1.5px solid ${selAttacker === lane && side === 'player' ? '#ffd76a'
              : atkTargetable ? '#ff8c3b'
              : u.frozen > 0 ? '#6fe8ff' : u.poison > 0 ? '#9dff57'
              : side === 'player' ? (ready && isAttackPhase ? '#ffd76a' : RARITY_COLOR[u.def.rarity]) : '#8e1526'}`,
            boxShadow: selAttacker === lane && side === 'player' ? '0 0 18px rgba(255,215,106,0.6)'
              : atkTargetable ? '0 0 16px rgba(255,140,59,0.55)'
              : ready && isAttackPhase && side === 'player' ? '0 0 12px rgba(255,215,106,0.35)'
              : `0 4px 14px rgba(0,0,0,0.6), 0 0 ${u.frozen > 0 ? 14 : 6}px ${u.frozen > 0 ? 'rgba(111,232,255,0.5)' : u.poison > 0 ? 'rgba(157,255,87,0.4)' : 'rgba(0,0,0,0)'}`,
          }}>
            <div className="absolute inset-0 flex items-center justify-center" style={{ color: `hsl(${u.def.hue} 80% 62% / 0.3)` }}>
              <RuneRing className="w-[120%] h-[120%]" reverse={side === 'enemy'} />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
              <div style={{ color: `hsl(${u.def.hue} 85% 66%)`, filter: `drop-shadow(0 0 7px hsl(${u.def.hue} 90% 55% / 0.8))` }}>
                <Sigil icon={u.def.icon} className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <p className="font-display text-[0.6rem] sm:text-[0.66rem] text-bone-100 text-center leading-none px-1" style={{ textShadow: '0 1px 2px #000' }}>{u.def.name}</p>
            </div>
            <div className="absolute bottom-1 inset-x-0 flex items-center justify-center gap-1.5 font-display font-bold text-sm sm:text-base">
              <span className="flex items-center gap-0.5 text-ember-500"><Sigil icon="sword" className="w-3 h-3" />{u.atk}</span>
              {u.defv > 0 && <span className="flex items-center gap-0.5 text-frost-400"><Sigil icon="shield" className="w-3 h-3" />{u.defv}</span>}
              <span className="flex items-center gap-0.5 text-blood-400"><Sigil icon="heart" className="w-3 h-3" />{u.hp}<span className="text-[0.55rem] text-bone-500">/{u.maxHp}</span></span>
            </div>
            <div className="absolute top-1 right-1 flex gap-1">
              {u.frozen > 0 && <span className="text-frost-400" title="Congelado"><Sigil icon="ice" className="w-3.5 h-3.5" /></span>}
              {u.poison > 0 && <span className="text-venom-400" title={`Veneno ${u.poison} (${u.poisonT})`}><Sigil icon="skull" className="w-3.5 h-3.5" /></span>}
              {u.vamp && <span className="text-blood-400" title="Vampirismo"><Sigil icon="bat" className="w-3.5 h-3.5" /></span>}
              {u.ranged && <span className="text-gold-400" title="A distancia: puede atacar al héroe"><Sigil icon="bow" className="w-3.5 h-3.5" /></span>}
              {u.taunt && <span className="text-frost-400" title="Provocación: deben atacarla primero"><Sigil icon="shield" className="w-3.5 h-3.5" /></span>}
              {u.pierce && <span className="text-ember-400" title="Perforación: ignora la armadura"><Sigil icon="dagger" className="w-3.5 h-3.5" /></span>}
              {u.swift && <span className="text-gold-400" title="Veloz: ataca al desplegarse"><Sigil icon="up" className="w-3.5 h-3.5" /></span>}
              {u.thorns > 0 && <span className="text-venom-400" title={`Espinas ${u.thorns}`}><Sigil icon="claw" className="w-3.5 h-3.5" /></span>}
            </div>
            {side === 'player' && u.fresh && !u.swift && (
              <div className="absolute top-1 left-1 px-1 py-px bg-frost-400/15 border border-frost-400/50 font-body text-[0.5rem] uppercase tracking-wider text-frost-400">Nueva</div>
            )}
            {u.fresh && u.swift && (
              <div className="absolute top-1 left-1 px-1 py-px bg-gold-400/15 border border-gold-400/50 font-body text-[0.5rem] uppercase tracking-wider text-gold-400">Veloz</div>
            )}
            {side === 'player' && !u.fresh && !u.ready && state.phase === 'attackPlayer' && u.frozen <= 0 && (
              <div className="absolute top-1 left-1 px-1 py-px bg-ink-950/70 border border-bone-500/40 font-body text-[0.5rem] uppercase tracking-wider text-bone-500">Agotada</div>
            )}
            {side === 'player' && ready && isAttackPhase && (
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 text-gold-400 anim-glow"><Sigil icon="sword" className="w-4 h-4" /></div>
            )}
            {side === 'enemy' && (
              <div className="absolute top-1 left-1 w-2 h-2 rotate-45 bg-blood-600" style={{ boxShadow: '0 0 6px #e02f45' }} />
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center border border-dashed"
            style={{ borderColor: 'rgba(168,151,122,0.25)', background: 'rgba(13,10,18,0.35)' }}>
            <Sigil icon={side === 'player' ? 'shield' : 'skull'} className="w-6 h-6 text-bone-500/40" />
          </div>
        )}
        {(spellTargetable || atkTargetable) && <div className="absolute inset-0 anim-target pointer-events-none" style={{ border: '1.5px solid #ff8c3b' }} />}
        {floatsFor(aid).map((f, i) => (
          <span key={f.id} className="anim-float-up absolute font-display font-bold text-xl sm:text-2xl pointer-events-none"
            style={{ left: `${38 + (i % 3) * 14}%`, top: '30%', color: f.color, textShadow: '0 0 8px #000, 0 0 14px #000', zIndex: 30 }}>{f.txt}</span>
        ))}
        {burstsFor(aid).map((b) => (
          <span key={b.id} className="absolute inset-0 pointer-events-none" style={{ zIndex: 29 }}>
            {Array.from({ length: 10 }).map((_, i) => {
              const ang = (i / 10) * Math.PI * 2;
              const dist = 34 + Math.random() * 26;
              return (
                <i key={i} className="anim-burst absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ background: b.color, boxShadow: `0 0 6px ${b.color}`, ['--dx' as never]: `${Math.cos(ang) * dist}px`, ['--dy' as never]: `${Math.sin(ang) * dist}px` }} />
              );
            })}
          </span>
        ))}
      </div>
    );
  };

  const renderHero = (side: Side) => {
    const isP = side === 'player';
    const aid = isP ? 'hp' : 'he';
    const hp = state.heroHp[side];
    const max = state.heroMaxHp[side];
    const pct = Math.max(0, (hp / max) * 100);
    const t: Target = { kind: 'hero', side };
    const spellTargetable = isTarget(t);
    const heroReachable = selAttacker !== null && !!state.units[selAttacker] && isAtkTarget(t);
    const heroBlocked = !isP && selAttacker !== null && isAttackPhase && !heroReachable;
    return (
      <div onClick={() => { if (spellTargetable) clickTarget(t); else if (heroReachable) clickAttackTarget(t); }}
        className={`relative flex flex-col items-center gap-1 px-2 py-2 sm:px-4 sm:py-3 panel-dark ${spellTargetable || heroReachable ? 'cursor-pointer' : ''}`}>
        <div className="relative w-14 h-14 sm:w-16 sm:h-16">
          <div className="absolute inset-0 flex items-center justify-center" style={{ color: isP ? 'rgba(232,182,76,0.5)' : 'rgba(224,47,69,0.5)' }}>
            <RuneRing className="w-full h-full" reverse={!isP} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center" style={{ color: isP ? '#ffd76a' : `hsl(${cfg.enemyHue} 85% 62%)` }}>
            <Sigil icon={isP ? 'helm' : cfg.enemyIcon} className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
        </div>
        <p className="font-display text-[0.7rem] sm:text-sm leading-none text-bone-100">{isP ? 'Comandante' : cfg.enemyHeroName}</p>
        <div className="w-20 sm:w-28 h-2.5 bg-ink-950 border border-bone-500/30 overflow-hidden" style={{ clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)' }}>
          <div className="hp-bar-fill h-full" style={{ width: `${pct}%`, background: pct > 50 ? 'linear-gradient(90deg, #c22536, #e02f45)' : 'linear-gradient(90deg, #8e1526, #c22536)', boxShadow: '0 0 8px rgba(224,47,69,0.6)' }} />
        </div>
        <p className="font-display text-sm sm:text-base font-bold leading-none" style={{ color: pct > 50 ? '#ff4d5e' : '#e02f45' }}>{hp}<span className="text-[0.6rem] text-bone-500">/{max}</span></p>
        {!isP && (
          <div className="flex items-center gap-2 text-[0.6rem] font-body text-bone-500">
            <span className="flex items-center gap-0.5"><Sigil icon="cards" className="w-3 h-3" />{state.hands.enemy.length}</span>
            <span className="flex items-center gap-0.5"><Sigil icon="bag" className="w-3 h-3" />{state.decks.enemy.length}</span>
          </div>
        )}
        {heroBlocked && (
          <div className="absolute -bottom-2 inset-x-0 text-center pointer-events-none">
            <span className="font-body text-[0.55rem] uppercase tracking-widest text-bone-300 bg-ink-950/90 border border-bone-500/30 px-1.5 py-px">
              {foeHasTaunt(state, 'player') ? 'Provocación activa' : 'Solo a distancia'}
            </span>
          </div>
        )}
        {(spellTargetable || heroReachable) && <div className="absolute inset-0 anim-target pointer-events-none" style={{ border: '1.5px solid #ff8c3b' }} />}
        {floatsFor(aid).map((f, i) => (
          <span key={f.id} className="anim-float-up absolute font-display font-bold text-2xl pointer-events-none"
            style={{ left: `${35 + (i % 3) * 15}%`, top: '20%', color: f.color, textShadow: '0 0 8px #000', zIndex: 30 }}>{f.txt}</span>
        ))}
        {burstsFor(aid).map((b) => (
          <span key={b.id} className="absolute inset-0 pointer-events-none" style={{ zIndex: 29 }}>
            {Array.from({ length: 12 }).map((_, i) => {
              const ang = (i / 12) * Math.PI * 2;
              const dist = 40 + Math.random() * 30;
              return (
                <i key={i} className="anim-burst absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ background: b.color, boxShadow: `0 0 6px ${b.color}`, ['--dx' as never]: `${Math.cos(ang) * dist}px`, ['--dy' as never]: `${Math.sin(ang) * dist}px` }} />
              );
            })}
          </span>
        ))}
      </div>
    );
  };

  const phaseName =
    state.phase === 'deployPlayer' ? 'Tu despliegue'
    : state.phase === 'deployEnemy' ? 'Despliegue enemigo'
    : state.phase === 'attackPlayer' ? 'Tu ataque'
    : state.phase === 'attackEnemy' ? 'Ataque enemigo'
    : 'Fin de la batalla';
  const phaseLabel = state.winner ? 'Fin de la batalla' : busy ? `${phaseName}...` : phaseName;
  const ready = readyCount(state, 'player');

  return (
    <div className="bg-arena with-img min-h-screen h-screen flex flex-col overflow-hidden relative">
      <div className="bg-vignette absolute inset-0 pointer-events-none" />
      {Array.from({ length: 14 }).map((_, i) => (
        <span key={i} className="ember" style={{ left: `${(i * 7.3 + 4) % 100}%`, animationDuration: `${5 + (i % 5) * 1.7}s`, animationDelay: `${(i * 0.8) % 6}s`, ['--ex' as never]: `${(i % 2 ? 1 : -1) * (10 + i * 3)}px`, ['--eo' as never]: 0.35 + (i % 4) * 0.12 }} />
      ))}

      {/* barra superior */}
      <div className="relative z-10 flex items-center justify-between px-3 sm:px-5 py-2 border-b border-bone-500/15 bg-ink-950/70 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => { sfx.click(); onEnd(false, buildStats(), true); }}
            className="btn-rune px-2.5 py-1 text-sm bg-ink-700 text-bone-300 border border-bone-500/25 flex items-center gap-1">
            <Sigil icon="back" className="w-3.5 h-3.5" /> Rendirse
          </button>
          <button onClick={() => { sfx.click(); dispatch({ type: 'toggleMusic' }); }}
            title="Música ambiental"
            className="btn-rune px-2 py-1 bg-ink-700 border border-bone-500/25"
            style={{ color: meta.musicOn ? '#ffd76a' : '#4a4358' }}>
            <Sigil icon="wave" className="w-4 h-4" />
          </button>
          <div className="hidden sm:block">
            <p className="font-display text-base sm:text-lg leading-none text-bone-100 text-glow-ember">{cfg.title}</p>
            <p className="font-body text-[0.62rem] text-bone-500 uppercase tracking-widest">{cfg.mode === 'historia' ? `Historia · Nivel ${cfg.level}` : cfg.mode}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-center">
            <p className="font-display text-lg sm:text-xl leading-none text-ember-400 text-glow-ember">Ronda {Math.min(state.round, state.cfg.maxRounds)}<span className="text-bone-500 text-sm">/{state.cfg.maxRounds}</span></p>
            <p className={`font-body text-[0.62rem] uppercase tracking-[0.2em] ${busy ? 'text-blood-400' : state.phase.includes('attack') ? 'text-gold-400' : 'text-venom-400'} anim-glow`}>{phaseLabel}</p>
          </div>
          <button onClick={() => { sfx.click(); setShowLog(!showLog); }} className="btn-rune px-2.5 py-1 text-sm bg-ink-700 text-bone-300 border border-bone-500/25 hidden sm:block">Crónica</button>
          <button onClick={() => { sfx.click(); setShowHelp(true); }} className="btn-rune px-2 py-1 bg-ink-700 text-bone-300 border border-bone-500/25" aria-label="Ayuda">
            <Sigil icon="help" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* tablero */}
      <div key={shakeId} className={`relative z-10 flex-1 flex flex-col justify-center gap-2 sm:gap-3 px-2 sm:px-10 ${shakeId > 0 ? 'anim-shake' : ''}`}>
        <div className="flex items-center justify-center gap-3 sm:gap-8">
          {renderHero('enemy')}
          <div className="flex gap-2 sm:gap-5">
            {[0, 1, 2].map((l) => renderUnit('enemy', l, state.units[slotOf('enemy', l)]))}
          </div>
          <div className="w-20 hidden lg:flex flex-col items-center gap-1 text-bone-500">
            <p className="font-body text-[0.6rem] uppercase tracking-widest">Mazo</p>
            <div className="relative w-10 h-14">
              {[0, 1, 2].map((i) => (
                <div key={i} className="absolute inset-0 border border-blood-700 bg-ink-800" style={{ transform: `translate(${i * 2}px, ${-i * 2}px)` }}>
                  {i === 2 && <div className="w-full h-full flex items-center justify-center text-blood-600"><Sigil icon="skull" className="w-5 h-5" /></div>}
                </div>
              ))}
            </div>
            <p className="font-display text-sm text-bone-300">{state.decks.enemy.length}</p>
          </div>
        </div>

        {/* divisor de fases */}
        <div className="flex items-center gap-3 px-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blood-600/60 to-transparent" />
          <div className="flex items-center gap-3">
            <span className={`font-body text-[0.58rem] uppercase tracking-widest px-2 py-0.5 border ${state.phase.includes('deploy') ? 'text-frost-400 border-frost-400/50 bg-frost-400/10' : 'text-bone-500/50 border-bone-500/20'}`}>Despliegue</span>
            {[0, 1, 2].map((l) => {
              const fighting = state.units[l] && state.units[3 + l];
              return <span key={l} className={`w-2 h-2 rotate-45 ${fighting ? 'bg-ember-500 anim-glow' : 'bg-bone-500/30'}`} style={fighting ? { boxShadow: '0 0 8px #ff8c3b' } : undefined} />;
            })}
            <span className={`font-body text-[0.58rem] uppercase tracking-widest px-2 py-0.5 border ${state.phase.includes('attack') ? 'text-gold-400 border-gold-400/50 bg-gold-400/10' : 'text-bone-500/50 border-bone-500/20'}`}>Ataque</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blood-600/60 to-transparent" />
        </div>

        <div className="flex items-center justify-center gap-3 sm:gap-8">
          <div className="w-20 hidden lg:flex flex-col items-center gap-1 text-bone-500">
            <p className="font-body text-[0.6rem] uppercase tracking-widest">Mazo</p>
            <div className="relative w-10 h-14">
              {[0, 1, 2].map((i) => (
                <div key={i} className="absolute inset-0 border border-gold-500/50 bg-ink-800" style={{ transform: `translate(${i * 2}px, ${-i * 2}px)` }}>
                  {i === 2 && <div className="w-full h-full flex items-center justify-center text-gold-500"><Sigil icon="sun" className="w-5 h-5" /></div>}
                </div>
              ))}
            </div>
            <p className="font-display text-sm text-bone-300">{state.decks.player.length}</p>
          </div>
          <div className="flex gap-2 sm:gap-5">
            {[0, 1, 2].map((l) => renderUnit('player', l, state.units[slotOf('player', l)]))}
          </div>
          {renderHero('player')}
        </div>
      </div>

      {/* zona inferior */}
      <div className="relative z-20 bg-gradient-to-t from-ink-950 via-ink-950/92 to-transparent pt-6 pb-2 px-2 sm:px-6">
        <div className="flex items-end justify-center gap-2 sm:gap-4">
          <div className="flex flex-col items-center gap-1 mr-1 sm:mr-4 mb-2">
            <p className="font-body text-[0.6rem] uppercase tracking-widest text-frost-400">Energía</p>
            <div className="flex gap-1">
              {Array.from({ length: state.energy.player.max }).map((_, i) => (
                <span key={i} className="w-2.5 h-2.5 rotate-45 border"
                  style={i < state.energy.player.cur
                    ? { background: 'linear-gradient(135deg, #6fe8ff, #35c8e8)', borderColor: '#6fe8ff', boxShadow: '0 0 6px rgba(111,232,255,0.7)' }
                    : { background: 'transparent', borderColor: 'rgba(111,232,255,0.25)' }} />
              ))}
            </div>
            <p className="font-display text-lg text-frost-400 leading-none">{state.energy.player.cur}<span className="text-xs text-bone-500">/{state.energy.player.max}</span></p>
          </div>

          <div className="flex items-end justify-center overflow-x-auto max-w-full px-2" style={{ scrollbarWidth: 'none' }}>
            {state.hands.player.map((c, i) => (
              <div key={`${c.id}-${i}`} className="anim-card-in card-hover-lift -mx-2 sm:-mx-1" style={{ animationDelay: `${i * 0.04}s` }}>
                <CardView card={c} playable={canAfford(state, 'player', c) && !busy} selected={sel === i} onClick={() => clickCard(i)} />
              </div>
            ))}
            {state.hands.player.length === 0 && (
              <p className="font-display text-bone-500 italic mb-8">Sin cartas en la mano</p>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 ml-1 sm:ml-4 mb-2">
            {state.phase === 'deployPlayer' ? (
              <button onClick={endDeploy} disabled={busy || !!result}
                className="btn-rune px-4 sm:px-6 py-2.5 text-lg sm:text-xl font-bold text-bone-100"
                style={{ background: 'linear-gradient(160deg, #1f4a5c, #123040)', border: '1px solid rgba(111,232,255,0.5)', boxShadow: busy ? 'none' : '0 0 18px rgba(111,232,255,0.25)' }}>
                {busy ? 'Espera...' : 'Terminar despliegue'}
              </button>
            ) : (
              <button onClick={endAttack} disabled={busy || !!result || state.phase !== 'attackPlayer'}
                className="btn-rune px-4 sm:px-6 py-2.5 text-lg sm:text-xl font-bold text-bone-100"
                style={{ background: 'linear-gradient(160deg, #8e1526, #5c0d18)', border: '1px solid rgba(255,77,94,0.5)', boxShadow: busy ? 'none' : '0 0 18px rgba(224,47,69,0.35)' }}>
                {busy ? 'Espera...' : `Terminar ataque${ready > 0 ? ` (${ready})` : ''}`}
              </button>
            )}
            <p className="font-body text-[0.58rem] text-bone-500 uppercase tracking-widest">
              {sel !== null ? 'Elige un objetivo' : selAttacker !== null ? 'Elige la presa' : state.phase === 'attackPlayer' ? 'Elige un guerrero' : 'Juega tus cartas'}
            </p>
          </div>
        </div>
      </div>

      {/* crónica */}
      {showLog && (
        <div className="absolute right-3 top-14 bottom-40 w-56 z-30 panel-dark p-2 anim-slide-down">
          <p className="font-display text-sm text-gold-400 mb-1 px-1">Crónica de batalla</p>
          <div ref={logRef} className="h-[calc(100%-1.6rem)] overflow-y-auto flex flex-col gap-0.5 px-1">
            {state.log.map((l) => (
              <p key={l.id} className={`font-body text-[0.66rem] leading-snug ${l.tone === 'good' ? 'text-venom-400' : l.tone === 'bad' ? 'text-blood-400' : l.tone === 'sys' ? 'text-gold-400' : 'text-bone-300'}`}>{l.text}</p>
            ))}
          </div>
        </div>
      )}

      {/* ayuda */}
      {showHelp && (
        <div className="absolute inset-0 z-40 bg-ink-950/85 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="panel-dark max-w-lg w-full p-5 sm:p-6 anim-zoom-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl text-gold-400 text-glow-ember mb-3">Cómo se lucha</h3>
            <ul className="font-body text-sm text-bone-300 space-y-2 leading-snug">
              <li><b className="text-frost-400">Cada ronda tiene dos fases.</b> Primero el <b>despliegue</b>: juegas cartas con tu energía, luego el enemigo juega las suyas. Después llega la <b>fase de ataque</b>.</li>
              <li><b className="text-gold-400">Ataques a tu elección:</b> clica uno de tus guerreros listos (borde dorado) y luego la presa. Cada guerrero ataca una vez por ronda.</li>
              <li><b className="text-ember-400">A distancia (arco dorado):</b> solo las unidades a distancia pueden atacar al héroe enemigo mientras queden unidades rivales en pie. Las demás deben limpiar el tablero primero.</li>
              <li><b className="text-frost-400">Defensa = armadura:</b> absorbe el daño de los ataques hasta agotarse; el daño sobrante pasa a la Vida. Los hechizos y el veneno la ignoran.</li>
              <li><b className="text-ember-400">Habilidades:</b> <b>Provocación</b> (escudo azul) obliga a atacarla primero; <b>Perforación</b> (daga) ignora la armadura; <b>Veloz</b> (flecha) ataca la ronda en que se despliega; <b>Espinas</b> (garra) hiere a quien la ataque.</li>
              <li><b className="text-blood-400">Contraataque:</b> si atacas a una unidad, ambos se hieren a la vez. Contra el héroe no hay contraataque.</li>
              <li><b className="text-frost-400">Recién desplegadas:</b> las unidades marcadas como «Nueva» no pueden atacar hasta la siguiente ronda. Las congeladas tampoco atacan.</li>
              <li><b className="text-venom-400">Ítems y mejoras:</b> pociones de fuego, hielo o veneno dañan; las de vida curan; las piedras y gritos mejoran ATK, Defensa o Vida.</li>
              <li><b className="text-gold-400">Victoria:</b> reduce a 0 la vida del héroe enemigo antes de que acaben las {cfg.maxRounds} rondas. Si el jefe sigue en pie al agotarse, pierdes.</li>
            </ul>
            <button onClick={() => { sfx.click(); setShowHelp(false); }} className="btn-rune mt-4 px-5 py-1.5 bg-ink-700 border border-bone-500/30 text-bone-100">Entendido</button>
          </div>
        </div>
      )}

      {/* resultado */}
      {result && (
        <div className="absolute inset-0 z-50 bg-ink-950/90 flex items-center justify-center">
          <div className="text-center anim-zoom-in">
            <p className={`anim-win font-display font-black text-6xl sm:text-8xl tracking-wide ${result === 'victory' ? 'text-gold-400' : 'text-blood-500'}`}
              style={{ textShadow: result === 'victory' ? '0 0 40px rgba(255,215,106,0.5)' : '0 0 40px rgba(224,47,69,0.5)' }}>
              {result === 'victory' ? 'VICTORIA' : 'DERROTA'}
            </p>
            <p className="font-body text-bone-300 mt-3 text-sm sm:text-base">
              {result === 'victory'
                ? `La sangre enemiga riega el campo. Bajas: ${state.kills} · Rondas: ${state.round}.`
                : state.round > cfg.maxRounds
                  ? 'Las rondas se agotaron y el jefe siguió en pie. Volverás con más acero.'
                  : 'Las cuervas ya bajan al campo. Volverás con más acero.'}
            </p>
            <button onClick={() => { sfx.click(); onEnd(result === 'victory', buildStats(), false); }}
              className="btn-rune mt-6 px-8 py-2.5 text-xl font-bold text-bone-100"
              style={{ background: 'linear-gradient(160deg, #8e1526, #5c0d18)', border: '1px solid rgba(255,77,94,0.5)', boxShadow: '0 0 22px rgba(224,47,69,0.4)' }}>
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
