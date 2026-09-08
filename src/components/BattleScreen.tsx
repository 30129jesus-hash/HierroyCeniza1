import { useEffect, useMemo, useRef, useState } from 'react';
import type { BattleConfig, BattleEvent, BattleState, Side, Target } from '../game/types';
import {
  aiAttackPlan, aiPlan, attackTargets, canAfford, canAttackSide, createBattle, endAttackPlayer,
  endDeployEnemy, endDeployPlayer, endRound, foeHasTaunt, performAttack, playCard, readyCount,
  slotOf, validTargets,
} from '../game/engine';
import { RELIC_LOOKUP, RARITY_COLOR } from '../game/cards';
import { sfx } from '../game/audio';
import { music } from '../game/music';
import { useMeta } from '../state/store';
import CardView from './CardView';
import { Sigil, RuneRing } from './icons';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface BattleStats {
  kills: number;
  rounds: number;
  dragonKills: number;
  heroDamageTaken: number;
  heroDamageDealt: number;
  heroHpLeft: number;
  maxCostPlayed: number;
  spellsPlayed: number;
}

interface Props {
  cfg: BattleConfig;
  onEnd: (won: boolean, stats: BattleStats, conceded: boolean) => void;
}

interface FxItem {
  id: number;
  x: number;
  y: number;
  kind: 'txt' | 'burst';
  text?: string;
  color?: string;
  dx?: number;
  dy?: number;
}

const DMG_COLOR: Record<string, string> = {
  hit: '#ff8c3b', fire: '#ff5722', ice: '#6fe8ff', poison: '#9dff57',
};

/* coordenadas aproximadas (en %) de cada ancla para los efectos flotantes,
   ajustadas al layout táctico: tablero centrado a la izquierda + panel derecho */
const anchorPos = (side: Side, lane: number | 'hero'): { x: number; y: number } => {
  if (side === 'enemy') return lane === 'hero' ? { x: 87, y: 15 } : { x: 20 + lane * 30, y: 24 };
  return lane === 'hero' ? { x: 13, y: 78 } : { x: 20 + lane * 30, y: 63 };
};

export default function BattleScreen({ cfg, onEnd }: Props) {
  const [initial] = useState(() => createBattle(cfg));
  const [state, setState] = useState<BattleState>(initial);
  const stateRef = useRef(state);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [selAttacker, setSelAttacker] = useState<number | null>(null);
  const [result, setResult] = useState<'victory' | 'defeat' | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showConcede, setShowConcede] = useState(false);
  const [fx, setFx] = useState<FxItem[]>([]);
  const [shakeClass, setShakeClass] = useState('');
  const [lunge, setLunge] = useState<{ lane: number; dir: 'up' | 'down' } | null>(null);
  const fxSeq = useRef(0);
  const { meta, dispatch } = useMeta();

  const applyState = (s: BattleState) => { stateRef.current = s; setState({ ...s }); };

  const buildStats = (): BattleStats => ({
    kills: stateRef.current.kills,
    rounds: stateRef.current.round,
    dragonKills: stateRef.current.dragonKills,
    heroDamageTaken: stateRef.current.heroDamageTaken,
    heroDamageDealt: stateRef.current.heroDamageDealt,
    heroHpLeft: stateRef.current.heroHp.player,
    maxCostPlayed: stateRef.current.maxCostPlayed,
    spellsPlayed: stateRef.current.spellsPlayed,
  });

  /* ---------- música ---------- */
  useEffect(() => {
    music.setIntensity(0.15);
    return () => music.setIntensity(0.1);
  }, []);

  /* ---------- efectos visuales ---------- */
  const spawnFx = (side: Side, lane: number | 'hero', kind: 'txt' | 'burst', text?: string, color?: string) => {
    const { x, y } = anchorPos(side, lane);
    if (kind === 'txt') {
      fxSeq.current += 1;
      const id = fxSeq.current;
      setFx((f) => [...f, { id, x, y, kind, text, color }]);
      setTimeout(() => setFx((f) => f.filter((i) => i.id !== id)), 1000);
    } else {
      const items: FxItem[] = [];
      for (let i = 0; i < 7; i++) {
        fxSeq.current += 1;
        items.push({
          id: fxSeq.current, x, y, kind: 'burst', color,
          dx: (Math.random() - 0.5) * 90, dy: (Math.random() - 0.7) * 80,
        });
      }
      setFx((f) => [...f, ...items]);
      setTimeout(() => {
        const ids = new Set(items.map((i) => i.id));
        setFx((f) => f.filter((i) => !ids.has(i.id)));
      }, 750);
    }
  };

  const doShake = () => {
    setShakeClass('');
    requestAnimationFrame(() => setShakeClass('anim-shake'));
  };

  const processEvents = (events: BattleEvent[]) => {
    for (const e of events) {
      switch (e.t) {
        case 'summon':
          sfx.summon();
          break;
        case 'damageUnit':
          if (e.kind === 'fire') sfx.fire(); else if (e.kind === 'ice') sfx.ice(); else if (e.kind === 'poison') sfx.poison(); else sfx.hit();
          spawnFx(e.side, e.lane, 'txt', `-${e.amount}`, DMG_COLOR[e.kind]);
          spawnFx(e.side, e.lane, 'burst', undefined, DMG_COLOR[e.kind]);
          break;
        case 'armor':
          sfx.shield();
          spawnFx(e.side, e.lane, 'txt', `-${e.amount} DEF`, '#9db8ff');
          if (e.broke) spawnFx(e.side, e.lane, 'txt', 'ROTA', '#ff8c3b');
          break;
        case 'damageHero':
          sfx.heroHit();
          spawnFx(e.side, 'hero', 'txt', `-${e.amount}`, '#ff4d5e');
          spawnFx(e.side, 'hero', 'burst', undefined, '#ff4d5e');
          if (e.side === 'player' || e.amount >= 5) doShake();
          break;
        case 'healUnit':
          sfx.heal();
          spawnFx(e.side, e.lane, 'txt', `+${e.amount}`, '#9dff57');
          break;
        case 'healHero':
          sfx.heal();
          spawnFx(e.side, 'hero', 'txt', `+${e.amount}`, '#9dff57');
          break;
        case 'freeze':
          sfx.freeze();
          spawnFx(e.side, e.lane, 'txt', 'CONGELADA', '#6fe8ff');
          break;
        case 'poisonApply':
          sfx.poison();
          spawnFx(e.side, e.lane, 'txt', 'VENENO', '#9dff57');
          break;
        case 'death':
          sfx.death();
          spawnFx(e.side, e.lane, 'burst', undefined, '#8a7a5f');
          doShake();
          break;
        case 'buff':
          sfx.buff();
          spawnFx(e.side, e.lane, 'txt', e.label, '#ffd76a');
          break;
        case 'draw':
          sfx.draw();
          break;
        case 'attack':
          setLunge({ lane: e.lane, dir: e.side === 'player' ? 'up' : 'down' });
          setTimeout(() => setLunge(null), 500);
          break;
        case 'victory':
          music.setIntensity(0);
          if (e.winner === 'player') sfx.victory(); else sfx.defeat();
          setTimeout(() => setResult(e.winner === 'player' ? 'victory' : 'defeat'), 700);
          break;
        default:
          break;
      }
    }
  };

  /* ---------- flujo de fases ---------- */

  const finishIfWinner = (): boolean => !!stateRef.current.winner;

  const runEnemyDeploy = async () => {
    setBusy(true);
    setSel(null);
    await sleep(550);
    let guard = 0;
    while (guard++ < 10 && !finishIfWinner()) {
      const actions = aiPlan(stateRef.current);
      if (actions.length === 0) break;
      const a = actions[0];
      const r = playCard(stateRef.current, 'enemy', a.handIdx, a.target);
      applyState(r.state);
      processEvents(r.events);
      if (r.events.length === 0) break; // sin jugadas válidas
      await sleep(620);
    }
    if (finishIfWinner()) { setBusy(false); return; }
    await sleep(350);
    const r2 = endDeployEnemy(stateRef.current);
    applyState(r2.state);
    processEvents(r2.events);
    sfx.turn();
    music.setIntensity(0.6);
    setBusy(false);
  };

  const runEnemyAttacks = async () => {
    setBusy(true);
    await sleep(600);
    const plan = aiAttackPlan(stateRef.current);
    for (const atk of plan) {
      if (finishIfWinner()) break;
      const r = performAttack(stateRef.current, 'enemy', atk.slot - 3, atk.target);
      applyState(r.state);
      processEvents(r.events);
      await sleep(700);
    }
    if (finishIfWinner()) { setBusy(false); return; }
    await sleep(400);
    const r2 = endRound(stateRef.current);
    applyState(r2.state);
    processEvents(r2.events);
    music.setIntensity(0.15);
    setBusy(false);
  };

  const endPlayerDeploy = () => {
    sfx.click();
    const r = endDeployPlayer(stateRef.current);
    applyState(r.state);
    processEvents(r.events);
    void runEnemyDeploy();
  };

  const endPlayerAttacks = () => {
    sfx.click();
    setSelAttacker(null);
    const r = endAttackPlayer(stateRef.current);
    applyState(r.state);
    processEvents(r.events);
    void runEnemyAttacks();
  };

  /* ---------- acciones del jugador ---------- */

  const selCard = sel !== null ? state.hands.player[sel] : null;
  const spellTargets: Target[] = useMemo(
    () => (selCard && selCard.kind === 'spell' ? validTargets(state, 'player', selCard) : []),
    [sel, selCard, state],
  );
  const noTargetSpell = !!selCard && selCard.kind === 'spell' &&
    (selCard.spell?.target === 'allAllies' || selCard.spell?.target === 'allEnemyUnits' || selCard.spell?.target === 'enemyHero');

  const isSpellTarget = (t: Target): boolean =>
    spellTargets.some((x) => x.kind === t.kind && (x.kind === 'hero' ? t.kind === 'hero' : x.lane === (t as { lane: number }).lane));

  const atkTargets: Target[] = useMemo(
    () => (selAttacker !== null && state.units[selAttacker]
      ? attackTargets(state, 'player', state.units[selAttacker]!)
      : []),
    [selAttacker, state],
  );
  const isAtkTarget = (t: Target): boolean =>
    atkTargets.some((x) => x.kind === t.kind && (x.kind === 'hero' ? true : x.lane === (t as { lane: number }).lane));

  const clickCard = (i: number) => {
    if (busy || state.phase !== 'deployPlayer' || result) return;
    sfx.unlock();
    if (sel === i) { setSel(null); return; }
    const card = state.hands.player[i];
    if (!canAfford(state, 'player', card)) { sfx.error(); return; }
    
    // Hechizos sin objetivo se juegan automáticamente
    if (noTargetSpellOrAuto(card)) {
      const r = playCard(stateRef.current, 'player', i, null);
      applyState(r.state);
      processEvents(r.events);
      sfx.card();
      setSel(null);
      return;
    }
    
    // Unidades y hechizos con objetivo requieren selección manual
    setSel(i);
    sfx.click();
  };

  const noTargetSpellOrAuto = (card: { kind: string; spell?: { target: string } }) =>
    card.kind === 'spell' && (card.spell?.target === 'allAllies' || card.spell?.target === 'allEnemyUnits' || card.spell?.target === 'enemyHero');

  const tryPlayOnTarget = (t: Target): boolean => {
    if (sel === null || !selCard) return false;
    if (!isSpellTarget(t)) return false;
    const r = playCard(stateRef.current, 'player', sel, t);
    applyState(r.state);
    processEvents(r.events);
    sfx.card();
    setSel(null);
    return true;
  };

  const clickUnit = (side: Side, lane: number) => {
    if (busy || result) return;
    sfx.unlock();
    
    // Colocación manual de unidad seleccionada
    if (state.phase === 'deployPlayer' && sel !== null && selCard && selCard.kind === 'unit') {
      if (side === 'player' && !state.units[slotOf('player', lane)]) {
        const r = playCard(stateRef.current, 'player', sel, { kind: 'lane', side: 'player', lane });
        applyState(r.state);
        processEvents(r.events);
        sfx.card();
        setSel(null);
        return;
      }
    }
    
    // hechizo con objetivo
    if (state.phase === 'deployPlayer' && tryPlayOnTarget({ kind: 'lane', side, lane })) return;
    // ataque: seleccionar atacante
    if (state.phase === 'attackPlayer' && side === 'player') {
      const u = state.units[slotOf('player', lane)];
      if (!u) return;
      if (selAttacker === lane) { setSelAttacker(null); sfx.click(); return; }
      if (u.fresh && !u.swift) { sfx.error(); spawnFx('player', lane, 'txt', 'AÚN NO', '#6fe8ff'); return; }
      if (!u.ready || u.frozen > 0) { sfx.error(); return; }
      setSelAttacker(lane);
      sfx.click();
      return;
    }
    // ataque: elegir presa
    if (state.phase === 'attackPlayer' && side === 'enemy' && selAttacker !== null) {
      doAttack({ kind: 'lane', side: 'enemy', lane });
    }
  };

  const clickEnemyHero = () => {
    if (busy || result) return;
    sfx.unlock();
    if (state.phase === 'deployPlayer' && tryPlayOnTarget({ kind: 'hero', side: 'enemy' })) return;
    if (state.phase === 'attackPlayer' && selAttacker !== null) doAttack({ kind: 'hero', side: 'enemy' });
  };

  const doAttack = (t: Target) => {
    if (selAttacker === null) return;
    if (!isAtkTarget(t)) { sfx.error(); return; }
    const r = performAttack(stateRef.current, 'player', selAttacker, t);
    applyState(r.state);
    processEvents(r.events);
    setSelAttacker(null);
    // si no quedan atacantes, pasa la fase
    if (!stateRef.current.winner && readyCount(stateRef.current, 'player') === 0) {
      setTimeout(() => { if (!stateRef.current.winner) endPlayerAttacks(); }, 650);
    }
  };

  const clickOwnHero = () => {
    if (busy || result) return;
    if (state.phase === 'deployPlayer') tryPlayOnTarget({ kind: 'hero', side: 'player' });
  };

  const isAttackPhase = state.phase === 'attackPlayer' && !busy && !result;
  const ready = readyCount(state, 'player');
  const tauntedByFoe = foeHasTaunt(state, 'player');
  const heroTargetable = selAttacker !== null && isAtkTarget({ kind: 'hero', side: 'enemy' });

  const logToneColor: Record<string, string> = {
    info: '#cbbda0', good: '#9dff57', bad: '#ff4d5e', sys: '#ffd76a',
  };

  /* ---------- render de unidad ---------- */

  const renderUnit = (side: Side, lane: number) => {
    const slot = slotOf(side, lane);
    const u = state.units[slot];
    const t: Target = { kind: 'lane', side, lane };
    const spellTargetable = state.phase === 'deployPlayer' && sel !== null && isSpellTarget(t);
    const atkTargetable = isAttackPhase && side === 'enemy' && selAttacker !== null && isAtkTarget(t);
    const unitPlaceable = state.phase === 'deployPlayer' && sel !== null && selCard?.kind === 'unit' && side === 'player' && !u;
    const selectable = isAttackPhase && side === 'player' && !!u && u.ready && (!u.fresh || u.swift) && u.frozen <= 0;
    const isSel = selAttacker === lane && side === 'player';
    const lunging = lunge && ((side === 'player' && lunge.lane === lane) || (side === 'enemy' && lunge.lane === slot - 3));

    return (
      <div key={slot} className="relative flex-1 max-w-[7.5rem] aspect-[3/4]">
        <button
          onClick={() => clickUnit(side, lane)}
          disabled={!u && !unitPlaceable}
          className={`absolute inset-0 no-select ${u || unitPlaceable ? 'cursor-pointer' : 'cursor-default'} ${lunging ? (lunge!.dir === 'up' ? 'anim-lunge-up' : 'anim-lunge-down') : ''}`}
          aria-label={u ? u.def.name : 'Carril vacío'}
        >
          <div className={`absolute inset-0 transition-all ${spellTargetable || atkTargetable || unitPlaceable ? 'anim-target' : ''} ${selectable && !isSel ? 'anim-glow' : ''}`}
            style={{
              background: u ? `linear-gradient(170deg, hsl(${u.def.hue} 30% 16%), #0d0a12)` : 'rgba(30,23,41,0.35)',
              border: `1.5px ${u ? 'solid' : 'dashed'} ${isSel ? '#ffd76a'
                : atkTargetable ? '#ff8c3b'
                : spellTargetable ? '#6fe8ff'
                : unitPlaceable ? '#9dff57'
                : u ? (u.frozen > 0 ? '#6fe8ff' : u.poison > 0 ? '#9dff57' : `${RARITY_COLOR[u.def.rarity]}88`)
                : 'rgba(168,151,122,0.25)'}`,
              boxShadow: isSel ? '0 0 18px rgba(255,215,106,0.6)'
                : atkTargetable ? '0 0 16px rgba(255,140,59,0.55)'
                : spellTargetable ? '0 0 14px rgba(111,232,255,0.5)'
                : unitPlaceable ? '0 0 14px rgba(157,255,87,0.5)'
                : '0 4px 14px rgba(0,0,0,0.6)',
            }}>
            {!u && (
              <div className="absolute inset-0 flex items-center justify-center text-bone-500/30">
                <RuneRing className="w-3/4 h-3/4" />
              </div>
            )}
            {unitPlaceable && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-body text-[0.6rem] uppercase tracking-widest text-venom-400">Colocar aquí</span>
              </div>
            )}
            {u && (
              <div className="absolute inset-0 anim-summon" key={u.uid}>
                {u.def.art ? (
                  <>
                    <img src={u.def.art} alt={u.def.name} draggable={false} loading="lazy"
                      onError={(ev) => { (ev.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 pointer-events-none"
                      style={{ background: `linear-gradient(180deg, hsl(${u.def.hue} 40% 10% / 0.35) 0%, hsl(${u.def.hue} 45% 7% / 0.65) 100%)` }} />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ color: `hsl(${u.def.hue} 80% 62% / 0.3)` }}>
                    <RuneRing className="w-[120%] h-[120%]" reverse={side === 'enemy'} />
                  </div>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                  {!u.def.art && (
                    <div style={{ color: `hsl(${u.def.hue} 85% 66%)`, filter: `drop-shadow(0 0 7px hsl(${u.def.hue} 90% 55% / 0.8))` }}>
                      <Sigil icon={u.def.icon} className="w-8 h-8 sm:w-10 sm:h-10" />
                    </div>
                  )}
                  <p className="font-display text-[0.6rem] sm:text-[0.66rem] text-bone-100 text-center leading-none px-1" style={{ textShadow: '0 1px 2px #000' }}>{u.def.name}</p>
                </div>
                {/* insignias */}
                <div className="absolute top-1 right-1 flex flex-col items-end gap-0.5">
                  {u.vamp && <span className="text-blood-400" title="Vampirismo"><Sigil icon="bat" className="w-3.5 h-3.5" /></span>}
                  {u.ranged && <span className="text-gold-400" title="A distancia"><Sigil icon="bow" className="w-3.5 h-3.5" /></span>}
                  {u.taunt && <span className="text-frost-400" title="Provocación"><Sigil icon="shield" className="w-3.5 h-3.5" /></span>}
                  {u.pierce && <span className="text-ember-400" title="Perforación"><Sigil icon="dagger" className="w-3.5 h-3.5" /></span>}
                  {u.swift && <span className="text-gold-400" title="Veloz"><Sigil icon="up" className="w-3.5 h-3.5" /></span>}
                  {u.thorns > 0 && <span className="text-venom-400" title={`Espinas ${u.thorns}`}><Sigil icon="claw" className="w-3.5 h-3.5" /></span>}
                </div>
                {/* estados */}
                {side === 'player' && u.fresh && !u.swift && (
                  <div className="absolute top-1 left-1 px-1 py-px bg-frost-400/15 border border-frost-400/50 font-body text-[0.5rem] uppercase tracking-wider text-frost-400">Nueva</div>
                )}
                {u.fresh && u.swift && (
                  <div className="absolute top-1 left-1 px-1 py-px bg-gold-400/15 border border-gold-400/50 font-body text-[0.5rem] uppercase tracking-wider text-gold-400">Veloz</div>
                )}
                {u.frozen > 0 && (
                  <div className="absolute inset-0 bg-frost-400/15 flex items-end justify-center pb-6">
                    <span className="px-1.5 py-px bg-frost-400/20 border border-frost-400/60 font-body text-[0.5rem] uppercase tracking-wider text-frost-400">Congelada</span>
                  </div>
                )}
                {isAttackPhase && side === 'player' && !u.ready && !u.fresh && (
                  <div className="absolute inset-0 bg-ink-950/40 flex items-end justify-center pb-6">
                    <span className="px-1.5 py-px bg-ink-900/70 border border-bone-500/40 font-body text-[0.5rem] uppercase tracking-wider text-bone-500">Agotada</span>
                  </div>
                )}
                {/* stats */}
                <div className="absolute bottom-1 inset-x-0 flex items-center justify-center gap-1.5 font-display font-bold text-sm sm:text-base">
                  <span className="flex items-center gap-0.5 text-ember-500"><Sigil icon="sword" className="w-3 h-3" />{u.atk}</span>
                  {u.defv > 0 && <span className="flex items-center gap-0.5 text-frost-400"><Sigil icon="shield" className="w-3 h-3" />{u.defv}</span>}
                  <span className="flex items-center gap-0.5 text-blood-400"><Sigil icon="heart" className="w-3 h-3" />{u.hp}</span>
                </div>
                {/* barra de vida */}
                <div className="absolute bottom-0 inset-x-0 h-1 bg-ink-950">
                  <div className="hp-bar-fill h-full" style={{ width: `${Math.max(0, (u.hp / u.maxHp) * 100)}%`, background: u.poison > 0 ? '#9dff57' : u.hp / u.maxHp > 0.5 ? '#e02f45' : '#8e1526' }} />
                </div>
                {u.poison > 0 && <span className="absolute bottom-1 left-1 text-venom-400"><Sigil icon="skull" className="w-3 h-3" /></span>}
              </div>
            )}
          </div>
        </button>
      </div>
    );
  };

  /* ---------- panel de héroe ---------- */

  const renderHero = (side: Side) => {
    const hp = state.heroHp[side];
    const max = state.heroMaxHp[side];
    const isEnemy = side === 'enemy';
    const clickable = isEnemy ? (heroTargetable || (state.phase === 'deployPlayer' && sel !== null && isSpellTarget({ kind: 'hero', side }))) : (state.phase === 'deployPlayer' && sel !== null && isSpellTarget({ kind: 'hero', side }));
    return (
      <button onClick={isEnemy ? clickEnemyHero : clickOwnHero}
        className={`relative no-select ${clickable ? 'cursor-pointer' : 'cursor-default'} ${!isEnemy ? 'w-36 sm:w-44' : 'w-36 sm:w-44'}`}>
        <div className={`panel-dark p-2.5 sm:p-3 text-left transition-all ${clickable ? 'anim-target' : ''}`}
          style={{ borderColor: isEnemy ? 'rgba(224,47,69,0.45)' : 'rgba(232,182,76,0.4)', clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
          <div className="flex items-center gap-2">
            <span className="shrink-0" style={{ color: isEnemy ? `hsl(${cfg.enemyHue} 80% 62%)` : '#ffd76a', filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.8))' }}>
              <Sigil icon={isEnemy ? cfg.enemyIcon : 'sun'} className="w-7 h-7 sm:w-8 sm:h-8" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm sm:text-base leading-tight text-bone-100 truncate">{isEnemy ? cfg.enemyHeroName : 'Comandante'}</p>
              <p className="font-display text-base sm:text-lg leading-none" style={{ color: hp / max > 0.4 ? '#ff4d5e' : '#8e1526' }}>
                {hp}<span className="text-bone-500 text-xs">/{max}</span>
              </p>
            </div>
          </div>
          <div className="mt-1.5 h-1.5 bg-ink-950 overflow-hidden">
            <div className="hp-bar-fill h-full" style={{ width: `${(hp / max) * 100}%`, background: 'linear-gradient(90deg, #8e1526, #e02f45)' }} />
          </div>
          {isEnemy && !isAttackPhase && sel === null && tauntedByFoe && (
            <p className="font-body text-[0.5rem] uppercase tracking-wider text-frost-400 mt-1">Provocación activa</p>
          )}
          {isEnemy && isAttackPhase && selAttacker !== null && !heroTargetable && (
            <p className="font-body text-[0.5rem] uppercase tracking-wider text-bone-500 mt-1">
              {tauntedByFoe ? 'Provocación lo protege' : 'Solo a distancia'}
            </p>
          )}
        </div>
      </button>
    );
  };

  /* ---------- render principal ---------- */

  return (
    <div className="bg-arena with-img min-h-screen relative overflow-hidden">
      <div className="bg-vignette absolute inset-0 pointer-events-none z-0" />

      <div className={`relative z-10 min-h-screen flex flex-col ${shakeClass}`}>
        {/* cabecera */}
        <header className="flex items-center justify-between gap-2 px-3 sm:px-6 py-2.5 border-b border-bone-500/15 bg-ink-950/70">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => { sfx.click(); setShowConcede(true); }}
              className="btn-rune px-2.5 py-1 text-sm bg-ink-700 text-bone-300 border border-bone-500/25 flex items-center gap-1">
              <Sigil icon="back" className="w-3.5 h-3.5" /> Rendirse
            </button>
            <button onClick={() => { sfx.click(); dispatch({ type: 'toggleMusic' }); }}
              title="Música ambiental"
              className="btn-rune px-2 py-1 bg-ink-700 border border-bone-500/25"
              style={{ color: meta.musicOn ? '#ffd76a' : '#4a4358' }}>
              <Sigil icon="wave" className="w-4 h-4" />
            </button>
            <button onClick={() => { sfx.click(); setShowHelp(true); }}
              className="btn-rune px-2 py-1 bg-ink-700 text-bone-300 border border-bone-500/25">
              <Sigil icon="help" className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center min-w-0">
            <p className="font-display text-lg sm:text-2xl text-gold-400 text-glow-gold leading-none truncate">{cfg.title}</p>
            <p className="font-body text-[0.6rem] uppercase tracking-widest text-bone-500">
              Ronda <b className="text-bone-100">{Math.min(state.round, cfg.maxRounds)}</b>/{cfg.maxRounds}
              {(cfg.relics ?? []).length > 0 && <span className="text-gold-400"> · {(cfg.relics ?? []).map((r) => RELIC_LOOKUP[r] ?? '◆').join(' ')}</span>}
            </p>
          </div>
          <div className="flex items-center gap-3 text-bone-300">
            <span className="flex items-center gap-1 font-display" title="Mazo enemigo"><Sigil icon="cards" className="w-4 h-4 text-blood-400" />{state.decks.enemy.length}</span>
            <span className="flex items-center gap-1 font-display" title="Tu mazo"><Sigil icon="cards" className="w-4 h-4 text-frost-400" />{state.decks.player.length}</span>
          </div>
        </header>

        {/* tablero */}
        <main className="flex-1 flex flex-col justify-between max-w-5xl w-full mx-auto px-2 sm:px-6 py-3 gap-2 relative">
          {/* Círculo rúnico decorativo de fondo */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <RuneRing className="w-96 h-96 text-gold-400" />
          </div>
          
          {/* fila enemiga */}
          <div className="flex items-start justify-center gap-2 sm:gap-4">
            {renderHero('enemy')}
            <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3">
              {[0, 1, 2].map((l) => renderUnit('enemy', l))}
            </div>
            <div className="w-10 sm:w-16" />
          </div>

          {/* divisor de fase */}
          <div className="flex items-center justify-center gap-3 py-1">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blood-600/60 to-transparent" />
            <p className="font-display text-base sm:text-xl px-3" style={{ color: state.phase.startsWith('deploy') ? '#6fe8ff' : '#ff8c3b', textShadow: '0 0 12px rgba(0,0,0,0.9)' }}>
              {state.phase === 'deployPlayer' ? 'Despliegue — tu turno'
                : state.phase === 'deployEnemy' ? 'El enemigo despliega…'
                : state.phase === 'attackPlayer' ? 'Fase de ataque — elige atacante y presa'
                : state.phase === 'attackEnemy' ? 'El enemigo ataca…' : 'Fin de la batalla'}
            </p>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blood-600/60 to-transparent" />
          </div>

          {/* fila del jugador */}
          <div className="flex items-end justify-center gap-2 sm:gap-4">
            <div className="w-10 sm:w-16" />
            <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3">
              {[0, 1, 2].map((l) => renderUnit('player', l))}
            </div>
            {renderHero('player')}
          </div>

          {/* energía + acción + mano */}
          <div className="flex flex-col items-center gap-1.5 pb-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1" title="Energía">
                {Array.from({ length: state.energy.player.max }).map((_, i) => (
                  <span key={i} className="w-3 h-3 rotate-45 border"
                    style={{
                      background: i < state.energy.player.cur ? 'linear-gradient(135deg, #6fe8ff, #2b7f9e)' : 'transparent',
                      borderColor: i < state.energy.player.cur ? '#6fe8ff' : 'rgba(111,232,255,0.3)',
                      boxShadow: i < state.energy.player.cur ? '0 0 6px rgba(111,232,255,0.6)' : 'none',
                    }} />
                ))}
              </div>
              <span className="font-display text-lg text-frost-400">{state.energy.player.cur}/{state.energy.player.max}</span>
              {state.phase === 'deployPlayer' && !busy && (
                <button onClick={endPlayerDeploy} className="btn-rune px-5 py-1.5 text-lg font-bold text-bone-100"
                  style={{ background: 'linear-gradient(160deg, #155e6e, #0b3a45)', border: '1px solid rgba(111,232,255,0.5)', boxShadow: '0 0 14px rgba(111,232,255,0.25)' }}>
                  Terminar despliegue
                </button>
              )}
              {state.phase === 'attackPlayer' && !busy && (
                <button onClick={endPlayerAttacks} className="btn-rune px-5 py-1.5 text-lg font-bold text-bone-100"
                  style={{ background: 'linear-gradient(160deg, #8e3a15, #5c240b)', border: '1px solid rgba(255,140,59,0.5)', boxShadow: '0 0 14px rgba(255,140,59,0.3)' }}>
                  Terminar ataque {ready > 0 ? `(${ready} listos)` : ''}
                </button>
              )}
            </div>
            {selCard && (
              <p className="font-body text-[0.62rem] uppercase tracking-widest text-frost-400 anim-slide-down">
                {selCard.kind === 'unit' ? 'Elige un carril vacío' : 'Elige el objetivo del hechizo'}
              </p>
            )}
            {selAttacker !== null && (
              <p className="font-body text-[0.62rem] uppercase tracking-widest text-ember-400 anim-slide-down">
                Elige la presa: unidad enemiga{heroTargetable ? ' o el héroe' : ''}
              </p>
            )}
            <div className="flex items-end justify-center overflow-x-auto max-w-full px-2" style={{ scrollbarWidth: 'none' }}>
              {state.hands.player.map((c, i) => (
                <div key={`${c.id}-${i}`} className="anim-card-in card-hover-lift -mx-2 sm:-mx-1" style={{ animationDelay: `${i * 0.04}s` }}>
                  <CardView card={c} playable={canAfford(state, 'player', c) && !busy && state.phase === 'deployPlayer' && !result} selected={sel === i} onClick={() => clickCard(i)} />
                </div>
              ))}
              {state.hands.player.length === 0 && (
                <p className="font-display text-bone-500 italic mb-8">Sin cartas en la mano</p>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* capa de efectos */}
      <div className="absolute inset-0 pointer-events-none z-40">
        {fx.map((f) => f.kind === 'txt' ? (
          <span key={f.id} className="absolute anim-float-up font-display font-bold text-xl sm:text-2xl"
            style={{ left: `${f.x}%`, top: `${f.y}%`, color: f.color, textShadow: '0 0 10px rgba(0,0,0,0.9), 0 2px 3px #000' }}>
            {f.text}
          </span>
        ) : (
          <span key={f.id} className="absolute anim-burst w-1.5 h-1.5 rounded-full"
            style={{ left: `${f.x}%`, top: `${f.y}%`, background: f.color, boxShadow: `0 0 6px ${f.color}`, ['--dx' as never]: `${f.dx}px`, ['--dy' as never]: `${f.dy}px` } as React.CSSProperties} />
        ))}
      </div>

      {/* ayuda */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-ink-950/92 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="panel-dark max-w-lg w-full p-6 anim-zoom-in max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-3xl text-gold-400 text-glow-gold mb-3">Cómo se lucha</p>
            <ul className="space-y-2 font-body text-sm text-bone-300 list-none">
              <li><b className="text-frost-400">Cada ronda tiene dos fases.</b> Primero el <b>despliegue</b>: juegas cartas con tu energía, luego el enemigo juega las suyas. Después llega la <b>fase de ataque</b>.</li>
              <li><b className="text-gold-400">Ataques a tu elección:</b> clica uno de tus guerreros listos (borde dorado) y luego la presa. Cada guerrero ataca una vez por ronda.</li>
              <li><b className="text-ember-400">A distancia (arco dorado):</b> solo las unidades a distancia pueden atacar al héroe enemigo. Las demás deben derrotar antes a todas las unidades rivales. <b>Las unidades a distancia no reciben contraataque ni espinas.</b></li>
              <li><b className="text-frost-400">Defensa = armadura:</b> absorbe el daño de los ataques hasta agotarse; el daño sobrante pasa a la Vida (4 de daño contra 2 de defensa = defensa rota y 2 de vida perdidos). Los hechizos y el veneno la ignoran.</li>
              <li><b className="text-blood-400">Contraataque:</b> si atacas a una unidad cuerpo a cuerpo, ambos se hieren a la vez. Contra el héroe no hay contraataque. Las <b>Espinas</b> devuelven daño al atacante (excepto a unidades a distancia).</li>
              <li><b className="text-frost-400">Provocación:</b> mientras viva una unidad con escudo azul, hay que atacarla a ella primero.</li>
              <li><b className="text-gold-400">Veloz:</b> ataca la misma ronda en que se despliega. <b>Perforación</b> ignora la armadura. <b>Vampirismo</b> cura con el daño infligido.</li>
              <li><b className="text-venom-400">Ítems y mejoras:</b> pociones de fuego, hielo o veneno dañan; las de vida curan; las piedras y gritos mejoran ATK, Armadura o Vida.</li>
              <li><b className="text-gold-400">Victoria:</b> reduce a 0 la vida del héroe enemigo antes de que acaben las {cfg.maxRounds} rondas. Si el jefe sigue en pie al agotarse, pierdes.</li>
            </ul>
            <button onClick={() => { sfx.click(); setShowHelp(false); }} className="btn-rune mt-4 px-6 py-2 text-lg bg-ink-700 text-bone-100 border border-bone-500/40 mx-auto block">Entendido</button>
          </div>
        </div>
      )}

      {/* rendición */}
      {showConcede && !result && (
        <div className="fixed inset-0 z-50 bg-ink-950/92 flex items-center justify-center p-4">
          <div className="panel-dark max-w-sm w-full p-6 text-center anim-zoom-in">
            <p className="font-display text-3xl text-blood-400 text-glow-blood">¿Abandonar el campo?</p>
            <p className="font-body text-sm text-bone-300 mt-2">La derrota se registrará y no habrá recompensa.</p>
            <div className="flex justify-center gap-3 mt-5">
              <button onClick={() => { sfx.click(); setShowConcede(false); }} className="btn-rune px-5 py-2 text-lg bg-ink-700 text-bone-100 border border-bone-500/40">Seguir luchando</button>
              <button onClick={() => { sfx.click(); onEnd(false, buildStats(), true); }} className="btn-rune px-5 py-2 text-lg text-bone-100" style={{ background: 'linear-gradient(160deg, #8e1526, #5c0d18)', border: '1px solid rgba(255,77,94,0.5)' }}>Rendirse</button>
            </div>
          </div>
        </div>
      )}

      {/* resultado */}
      {result && (
        <div className="fixed inset-0 z-50 bg-ink-950/90 flex items-center justify-center p-4">
          <div className="text-center anim-win">
            <p className={`font-display text-7xl sm:text-8xl ${result === 'victory' ? 'text-gold-400 text-glow-gold' : 'text-blood-500 text-glow-blood'}`}>
              {result === 'victory' ? 'VICTORIA' : 'DERROTA'}
            </p>
            <p className="font-body text-bone-300 mt-3">
              {result === 'victory' ? 'El estandarte enemigo arde. El reino respira.' : 'La ceniza lo cubre todo. Otra vez será.'}
            </p>
            <p className="font-body text-[0.68rem] uppercase tracking-widest text-bone-500 mt-1">
              {state.kills} bajas · {Math.min(state.round, cfg.maxRounds)} rondas
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
