import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMeta } from '../state/store';
import { ACHIEVEMENTS, DUPE_GOLD, PACK_COST, PACTS, PLAYER_CARDS, RARITY_COLOR, RELICS, RELIC_LOOKUP, SHOP_POOL_COMMON, SHOP_POOL_EPIC, SHOP_POOL_LEGENDARY, SHOP_POOL_RARE, STORY_LEVELS, cardById, pactById } from '../game/cards';
import type { AchDef, CardDef, RelicDef } from '../game/types';
import { DIAMOND_PACKS, DAILY_OFFER, FRAMES, SEASON_DAYS, frameById } from '../game/premium';
import { challengeById, todayKey, weeklyCounter } from '../game/challenges';
import { sfx } from '../game/audio';
import CardView from './CardView';
import { Sigil, RuneRing } from './icons';

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

function Embers({ n = 16 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="ember" style={{ left: `${(i * 6.7 + 3) % 100}%`, animationDuration: `${6 + (i % 5) * 1.8}s`, animationDelay: `${(i * 0.9) % 7}s`, ['--ex' as never]: `${(i % 2 ? 1 : -1) * (12 + i * 2.5)}px`, ['--eo' as never]: 0.3 + (i % 4) * 0.12 }} />
      ))}
    </>
  );
}

export function Header({ title, sub, onBack }: { title: string; sub: string; onBack: () => void }) {
  const { meta } = useMeta();
  return (
    <div className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-4 border-b border-bone-500/15 bg-ink-950/60">
      <button onClick={() => { sfx.click(); onBack(); }}
        className="btn-rune px-3 py-1.5 bg-ink-700 text-bone-300 border border-bone-500/25 flex items-center gap-1.5 text-sm">
        <Sigil icon="back" className="w-4 h-4" /> Volver
      </button>
      <div className="text-center">
        <h2 className="font-display text-2xl sm:text-4xl text-bone-100 text-glow-ember leading-none">{title}</h2>
        <p className="font-body text-[0.65rem] uppercase tracking-[0.25em] text-bone-500 mt-1">{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-display text-lg text-gold-400 text-glow-gold">
          <Sigil icon="coin" className="w-5 h-5" /> {meta.gold}
        </div>
        {meta.diamonds > 0 && (
          <div className="flex items-center gap-1.5 font-display text-lg" style={{ color: '#6fe8ff', textShadow: '0 0 12px rgba(111,232,255,0.5)' }}>
            <Sigil icon="gem" className="w-4 h-4" /> {meta.diamonds.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

/* Carcasa con pestañas: agrupa varias secciones bajo un mismo techo. */
export function TabShell({ title, sub, onBack, tabs, tab, onTab, children }: {
  title: string; sub: string; onBack: () => void;
  tabs: { id: string; label: string; icon: string }[];
  tab: string; onTab: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="bg-arena min-h-screen relative">
      <div className="bg-vignette absolute inset-0 pointer-events-none" />
      <Embers n={12} />
      <Header title={title} sub={sub} onBack={onBack} />
      <div className="relative z-10 flex justify-center gap-1.5 sm:gap-2 px-3 pt-4 flex-wrap">
        {tabs.map((t) => {
          const active = t.id === tab;
          return (
            <button key={t.id} onClick={() => { sfx.click(); onTab(t.id); }}
              className="btn-rune flex items-center gap-2 px-4 sm:px-6 py-2 font-display text-base sm:text-xl transition-all"
              style={{
                background: active ? 'linear-gradient(160deg, #8e1526, #5c0d18)' : 'rgba(30,23,41,0.75)',
                border: `1px solid ${active ? 'rgba(255,77,94,0.6)' : 'rgba(168,151,122,0.22)'}`,
                color: active ? '#f0e6cf' : '#8a7a5f',
                boxShadow: active ? '0 0 18px rgba(224,47,69,0.4)' : 'none',
                transform: active ? 'translateY(-2px)' : 'none',
              }}>
              <Sigil icon={t.icon} className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}

/* ================= TÍTULO ================= */

export function TitleScreen({ onNav }: { onNav: (s: string) => void }) {
  const { meta, dispatch } = useMeta();
  const [confirmReset, setConfirmReset] = useState(false);

  const items = [
    {
      id: 'battle', label: 'Batalla', icon: 'sword', hue: 46,
      desc: `Historia · Supervivencia (récord ${meta.survivalBest}) · Versus (${meta.vsWins} duelos)`,
    },
    {
      id: 'feats', label: 'Hazañas', icon: 'crown', hue: 48,
      desc: `Desafíos ${meta.challenges.daily.claimed.length}/${meta.challenges.daily.ids.length} · Logros ${meta.achievements.length}/${ACHIEVEMENTS.length}`,
    },
    {
      id: 'arsenal', label: 'Arsenal', icon: 'helm', hue: 220,
      desc: `${meta.deck.length === 20 ? 'Mazo de 20 listo' : 'Arma tu mazo de 20'} · ${Object.keys(meta.collection).filter((k) => meta.collection[k] > 0).length} cartas únicas`,
    },
    {
      id: 'market', label: 'Mercado', icon: 'bag', hue: 190,
      desc: `Sobres, oferta diaria y cosméticos · ${meta.diamonds.toLocaleString()} diamantes`,
    },
  ];

  return (
    <div className="bg-arena bg-menu-img min-h-screen relative overflow-hidden flex">
      <div className="bg-vignette absolute inset-0 pointer-events-none" />
      <Embers n={22} />
      {/* gotas de sangre decorativas */}
      <div className="absolute top-0 right-[12%] w-px h-10 bg-gradient-to-b from-blood-600 to-transparent anim-drip" />
      <div className="absolute top-0 right-[30%] w-px h-16 bg-gradient-to-b from-blood-600 to-transparent anim-drip" style={{ animationDelay: '1.1s' }} />

      <div className="relative z-10 flex flex-col justify-center px-6 sm:px-16 py-10 w-full max-w-2xl">
        <p className="font-body text-[0.7rem] uppercase tracking-[0.5em] text-blood-400 mb-2 anim-slide-down">Un reino en cenizas</p>
        <h1 className="font-display font-black text-6xl sm:text-8xl leading-[0.9] text-bone-100 text-glow-ember anim-slide-down">
          Hierro<br /><span className="text-blood-500 text-glow-blood">&amp; Ceniza</span>
        </h1>
        <p className="font-body italic text-bone-300 mt-4 max-w-md text-sm sm:text-base anim-slide-down" style={{ animationDelay: '0.1s' }}>
          «Los dioses murieron hace mucho. Lo que queda reclama sangre, y solo el acero sabe responder.»
        </p>

        <div className="mt-8 flex flex-col gap-2.5 max-w-sm">
          {items.map((it, i) => (
            <button key={it.id} onClick={() => { sfx.click(); onNav(it.id); }}
              className="btn-rune group flex items-center gap-4 px-5 py-3 text-left anim-slide-down"
              style={{
                animationDelay: `${0.15 + i * 0.07}s`,
                background: 'linear-gradient(120deg, rgba(30,23,41,0.88), rgba(13,10,18,0.7))',
                border: '1px solid rgba(168,151,122,0.28)',
                borderLeft: `3px solid hsl(${it.hue} 70% 50%)`,
              }}>
              <span style={{ color: `hsl(${it.hue} 80% 60%)`, filter: `drop-shadow(0 0 6px hsl(${it.hue} 90% 50% / 0.7))` }}>
                <Sigil icon={it.icon} className="w-6 h-6" />
              </span>
              <span className="flex-1">
                <span className="block font-display text-xl sm:text-2xl text-bone-100 leading-none group-hover:text-gold-400 transition-colors">{it.label}</span>
                <span className="block font-body text-[0.65rem] uppercase tracking-widest text-bone-500 mt-0.5">{it.desc}</span>
              </span>
              <Sigil icon="back" className="w-4 h-4 text-bone-500 rotate-180 group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-4 anim-slide-down" style={{ animationDelay: '0.6s' }}>
          <button onClick={() => { sfx.unlock(); dispatch({ type: 'toggleMute' }); }}
            className="btn-rune px-3 py-1.5 bg-ink-700 border border-bone-500/25 text-bone-300 text-sm flex items-center gap-1.5">
            <Sigil icon={meta.muted ? 'soundOff' : 'sound'} className="w-4 h-4" /> {meta.muted ? 'Silencio' : 'Sonido'}
          </button>
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)} className="font-body text-[0.62rem] uppercase tracking-widest text-bone-500 hover:text-blood-400 transition-colors">Borrar partida</button>
          ) : (
            <span className="flex items-center gap-2 font-body text-[0.62rem] uppercase tracking-widest text-blood-400">
              ¿Seguro?
              <button onClick={() => { dispatch({ type: 'reset' }); setConfirmReset(false); sfx.coin(); }} className="underline">Sí, quemar todo</button>
              <button onClick={() => setConfirmReset(false)} className="text-bone-500 underline">No</button>
            </span>
          )}
          <span className="ml-auto font-body text-[0.62rem] uppercase tracking-widest text-bone-500">
            {meta.totalWins} victorias · {meta.totalLosses} derrotas
          </span>
        </div>
      </div>
    </div>
  );
}

/* ================= HISTORIA ================= */

export function StoryScreen({ onBack, onPlay }: { onBack: () => void; onPlay: (level: number, pacts: string[]) => void }) {
  const { meta } = useMeta();
  const [sel, setSel] = useState<number | null>(null);
  const [pacts, setPacts] = useState<string[]>([]);

  const togglePact = (id: string) => {
    sfx.click();
    setPacts((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const startLevel = () => {
    if (sel === null) return;
    sfx.summon();
    onPlay(sel, pacts);
    setSel(null);
    setPacts([]);
  };

  const selDef = sel !== null ? STORY_LEVELS[sel - 1] : null;
  const baseReward = selDef ? (meta.storyCleared.includes(sel ?? 0) ? 25 : selDef.reward) : 0;
  const totalMult = pacts.reduce((m, id) => m * pactById(id).mult, 1);

  return (
    <>
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 py-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STORY_LEVELS.map((lv, i) => {
            const unlocked = i + 1 <= meta.storyUnlocked;
            const cleared = meta.storyCleared.includes(i + 1);
            return (
              <button key={lv.n} disabled={!unlocked}
                onClick={() => { sfx.click(); setSel(i + 1); setPacts([]); }}
                className={`panel-dark relative p-4 text-left transition-transform anim-slide-down ${unlocked ? 'hover:-translate-y-1.5 cursor-pointer' : 'opacity-45 cursor-not-allowed'}`}
                style={{ animationDelay: `${i * 0.06}s`, borderColor: unlocked ? `hsl(${lv.hue} 60% 45% / 0.55)` : undefined }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display text-3xl font-bold" style={{ color: unlocked ? `hsl(${lv.hue} 75% 60%)` : '#4a4358', textShadow: unlocked ? `0 0 12px hsl(${lv.hue} 80% 50% / 0.5)` : 'none' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {cleared ? (
                    <span className="text-gold-400"><Sigil icon="crown" className="w-5 h-5" /></span>
                  ) : unlocked ? (
                    <span style={{ color: `hsl(${lv.hue} 70% 55%)` }}><Sigil icon={lv.heroIcon} className="w-5 h-5" /></span>
                  ) : (
                    <span className="text-bone-500"><Sigil icon="lock" className="w-5 h-5" /></span>
                  )}
                </div>
                <p className="font-display text-lg text-bone-100 leading-tight">{lv.title}</p>
                <p className="font-body text-[0.68rem] text-bone-500 mt-1 leading-snug min-h-8">{lv.desc}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-body text-[0.6rem] uppercase tracking-widest text-bone-500">Jefe: <b className="text-bone-300">{lv.hero}</b></span>
                  <span className="flex items-center gap-1 font-display text-sm text-gold-400">
                    <Sigil icon="coin" className="w-3.5 h-3.5" /> {cleared ? 25 : lv.reward}
                  </span>
                </div>
                {cleared && <p className="mt-1 font-body text-[0.55rem] uppercase tracking-widest text-gold-400/80">Superado — repetible</p>}
              </button>
            );
          })}
        </div>
        <p className="font-body italic text-bone-500 text-center text-xs mt-8">«Cada estandarte que cae acerca el amanecer... o lo entierra para siempre.»</p>
      </div>

      {/* modal de Pactos Oscuros */}
      {selDef && sel !== null && (
        <div className="fixed inset-0 z-[60] bg-ink-950/94 flex items-center justify-center p-4">
          <div className="panel-dark max-w-lg w-full p-6 sm:p-8 anim-zoom-in max-h-[92vh] overflow-y-auto">
            <p className="font-body text-[0.6rem] uppercase tracking-[0.3em] text-blood-400">Nivel {String(sel).padStart(2, '0')} · {selDef.title}</p>
            <h3 className="font-display text-3xl text-bone-100 mt-1">Pactos Oscuros</h3>
            <p className="font-body text-xs text-bone-500 mt-1.5 leading-snug">
              Jura desventajas voluntarias a cambio de oro multiplicado. Se acumulan: cada pacto multiplica la recompensa.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              {PACTS.map((p) => {
                const on = pacts.includes(p.id);
                return (
                  <button key={p.id} onClick={() => togglePact(p.id)}
                    className="flex items-start gap-3 p-3 text-left transition-all"
                    style={{
                      background: on ? 'linear-gradient(120deg, rgba(142,21,38,0.35), rgba(13,10,18,0.6))' : 'rgba(30,23,41,0.5)',
                      border: `1px solid ${on ? 'rgba(255,77,94,0.65)' : 'rgba(168,151,122,0.22)'}`,
                      boxShadow: on ? '0 0 14px rgba(224,47,69,0.25)' : 'none',
                    }}>
                    <span className="mt-0.5 shrink-0" style={{ color: on ? '#ff4d5e' : '#4a4358' }}><Sigil icon={p.icon} className="w-5 h-5" /></span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-display text-base leading-tight" style={{ color: on ? '#ff8a95' : '#cbbda0' }}>{p.name}</span>
                        <span className="font-display text-sm text-gold-400 shrink-0">×{p.mult}</span>
                      </span>
                      <span className="block font-body text-[0.65rem] text-bone-300/80 mt-0.5">{p.cost}</span>
                      <span className="block font-body italic text-[0.6rem] text-bone-500 mt-0.5">{p.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-bone-500/15 pt-3">
              <span className="font-body text-[0.6rem] uppercase tracking-widest text-bone-500">Recompensa estimada</span>
              <span className="flex items-center gap-1.5 font-display text-2xl text-gold-400 text-glow-gold">
                <Sigil icon="coin" className="w-5 h-5" /> {Math.round(baseReward * totalMult)}
              </span>
            </div>

            <div className="mt-4 flex gap-3">
              <button onClick={() => { sfx.click(); setSel(null); setPacts([]); }}
                className="btn-rune flex-1 px-4 py-2 text-lg bg-ink-700 text-bone-300 border border-bone-500/25">
                Cancelar
              </button>
              <button onClick={startLevel}
                className="btn-rune flex-[2] px-4 py-2 text-lg font-bold text-bone-100"
                style={{ background: 'linear-gradient(160deg, #8e1526, #5c0d18)', border: '1px solid rgba(255,77,94,0.5)', boxShadow: '0 0 18px rgba(224,47,69,0.4)' }}>
                {pacts.length > 0 ? `Marchar bajo ${pacts.length} pacto${pacts.length > 1 ? 's' : ''}` : 'Marchar a la batalla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= SUPERVIVENCIA ================= */

export function SurvivalScreen({ onBack, onPlay, best }: { onBack: () => void; onPlay: () => void; best: number }) {
  return (
    <>
      <div className="relative z-10 flex items-center justify-center px-4 py-8">
        <div className="panel-dark max-w-xl w-full p-8 sm:p-10 text-center anim-zoom-in">
          <div className="w-20 h-20 mx-auto relative mb-4" style={{ color: 'rgba(224,47,69,0.8)' }}>
            <RuneRing className="absolute inset-0 w-full h-full" />
            <div className="absolute inset-0 flex items-center justify-center text-blood-500"><Sigil icon="skull" className="w-9 h-9" /></div>
          </div>
          <h3 className="font-display text-4xl text-bone-100 text-glow-blood">Hasta la última gota</h3>
          <p className="font-body text-bone-300 mt-3 text-sm leading-relaxed">
            Oleadas infinitas de enemigos cada vez más fuertes. Antes de cada cacería eliges una <b className="text-gold-400">reliquia</b> pasiva
            que se acumula; cada victoria da oro y tu héroe sana sus heridas, pero la derrota lo termina todo y las pierde. ¿Cuántas rondas aguantarás?
          </p>
          <div className="mt-5 flex items-center justify-center gap-6">
            <div>
              <p className="font-body text-[0.6rem] uppercase tracking-widest text-bone-500">Récord</p>
              <p className="font-display text-3xl text-gold-400 text-glow-gold">{best}</p>
            </div>
            <div className="w-px h-10 bg-bone-500/25" />
            <div>
              <p className="font-body text-[0.6rem] uppercase tracking-widest text-bone-500">Oro por ronda</p>
              <p className="font-display text-3xl text-gold-400 text-glow-gold">12+</p>
            </div>
          </div>
          <button onClick={() => { sfx.summon(); onPlay(); }}
            className="btn-rune mt-7 px-10 py-3 text-2xl font-bold text-bone-100"
            style={{ background: 'linear-gradient(160deg, #8e1526, #5c0d18)', border: '1px solid rgba(255,77,94,0.5)', boxShadow: '0 0 24px rgba(224,47,69,0.4)' }}>
            Entrar a la horda
          </button>
        </div>
      </div>
    </>
  );
}

/* ================= VERSUS ================= */

export function VersusScreen({ onBack, onPlay }: { onBack: () => void; onPlay: (d: number) => void }) {
  const diffs = [
    { n: 0, name: 'Recluta', desc: 'Bandidos y lobos hambrientos. Calentamiento.', icon: 'dagger', hue: 45, reward: 30, bonus: 'Enemigos sin mejora' },
    { n: 1, name: 'Veterano', desc: 'Legiones curtidas con acero adicional.', icon: 'claw', hue: 20, reward: 60, bonus: 'Enemigos +1/+1' },
    { n: 2, name: 'Élite', desc: 'Lo peor del abismo, con energía extra.', icon: 'demon', hue: 340, reward: 100, bonus: 'Enemigos +2/+2 y +1 energía' },
  ];
  return (
    <>
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-8 grid sm:grid-cols-3 gap-5">
        {diffs.map((d, i) => (
          <button key={d.n} onClick={() => { sfx.click(); onPlay(d.n); }}
            className="panel-dark p-6 text-left hover:-translate-y-1.5 transition-transform anim-slide-down"
            style={{ animationDelay: `${i * 0.08}s`, borderColor: `hsl(${d.hue} 60% 45% / 0.5)` }}>
            <div className="flex items-center justify-between">
              <span style={{ color: `hsl(${d.hue} 80% 60%)`, filter: `drop-shadow(0 0 8px hsl(${d.hue} 90% 50% / 0.7))` }}>
                <Sigil icon={d.icon} className="w-9 h-9" />
              </span>
              <span className="flex items-center gap-1 font-display text-lg text-gold-400"><Sigil icon="coin" className="w-4 h-4" />{d.reward}</span>
            </div>
            <p className="font-display text-2xl text-bone-100 mt-3">{d.name}</p>
            <p className="font-body text-xs text-bone-500 mt-1 leading-snug">{d.desc}</p>
            <p className="font-body text-[0.6rem] uppercase tracking-widest mt-3" style={{ color: `hsl(${d.hue} 70% 60%)` }}>{d.bonus}</p>
          </button>
        ))}
      </div>
    </>
  );
}

/* ================= TIENDA ================= */

type PackKind = 'recluta' | 'guerra';

export function ShopScreen({ onBack }: { onBack: () => void }) {
  const { meta, dispatch } = useMeta();
  const [opening, setOpening] = useState<{ cards: string[]; revealed: number; saved: boolean; base: Record<string, number> } | null>(null);
  const [err, setErr] = useState(false);

  /* Probabilidades nerfeadas: las cartas fuertes (épica/legendaria) son mucho más escasas. */
  const genPack = (kind: PackKind): string[] => {
    if (kind === 'recluta') {
      const third = Math.random() < 0.3 ? pick(SHOP_POOL_RARE) : pick(SHOP_POOL_COMMON);
      return [pick(SHOP_POOL_COMMON), pick(SHOP_POOL_COMMON), third];
    }
    // Sobre de Guerra: 1 rara garantizada + 2 con probabilidades bajas de épica/legendaria
    const strong = (pEpic: number, pLeg: number): string => {
      const r = Math.random();
      if (r < pLeg) return pick(SHOP_POOL_LEGENDARY);
      if (r < pLeg + pEpic) return pick(SHOP_POOL_EPIC);
      return pick(SHOP_POOL_RARE);
    };
    return [pick(SHOP_POOL_RARE), strong(0.32, 0.08), strong(0.22, 0.06)];
  };

  const isDupe = (o: { cards: string[]; base: Record<string, number> }, id: string, idx: number) => {
    const owned = o.base[id] ?? 0;
    const extra = o.cards.slice(0, idx).filter((c) => c === id).length;
    return owned + extra > 0;
  };

  const buy = (kind: PackKind, cost: number) => {
    sfx.unlock();
    if (meta.gold < cost) { sfx.error(); setErr(true); setTimeout(() => setErr(false), 600); return; }
    dispatch({ type: 'gold', amount: -cost });
    sfx.pack();
    setOpening({ cards: genPack(kind), revealed: 0, saved: false, base: { ...meta.collection } });
  };

  const revealNext = () => {
    if (!opening || opening.revealed >= 3) return;
    const card = cardById(opening.cards[opening.revealed]);
    if (card.rarity === 'épica' || card.rarity === 'legendaria') sfx.epic(); else sfx.reveal(opening.revealed);
    setOpening({ ...opening, revealed: opening.revealed + 1 });
  };

  const refundFor = (o: { cards: string[]; base: Record<string, number> }) =>
    o.cards.reduce((acc, id, i) => acc + (isDupe(o, id, i) ? DUPE_GOLD[cardById(id).rarity] : 0), 0);

  const saveCards = () => {
    if (!opening) return;
    const rec: Record<string, number> = {};
    let refund = 0;
    opening.cards.forEach((id, i) => {
      if (isDupe(opening, id, i)) refund += DUPE_GOLD[cardById(id).rarity];
      else rec[id] = (rec[id] ?? 0) + 1;
    });
    dispatch({ type: 'addCards', cards: rec });
    if (refund > 0) dispatch({ type: 'gold', amount: refund });
    sfx.coin();
    setOpening(null);
  };

  const packs = [
    { kind: 'recluta' as PackKind, name: 'Sobre de Recluta', cost: PACK_COST.recluta, desc: '3 cartas. Humildes, pero el acero barato también corta.', icon: 'shield', hue: 210, odds: '70% común · 30% rara' },
    { kind: 'guerra' as PackKind, name: 'Sobre de Guerra', cost: PACK_COST.guerra, desc: '3 cartas forjadas en batalla. Rara garantizada, épicas y legendarias escasas.', icon: 'dragon', hue: 12, odds: '1 rara garantizada · épica 22-32% · legendaria 6-8%' },
  ];

  return (
    <>
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-6">
        <p className="font-body italic text-bone-500 text-center text-sm mb-2">«Oro por acero, acero por sangre. El precio siempre es el mismo.»</p>
        <p className="font-body text-center text-[0.68rem] text-bone-300/80 mb-8">Las cartas repetidas se funden en oro: {DUPE_GOLD['común']}/{DUPE_GOLD['rara']}/{DUPE_GOLD['épica']}/{DUPE_GOLD['legendaria']} según rareza.</p>
        <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
          {packs.map((p, i) => (
            <div key={p.kind} className={`panel-dark p-6 text-center anim-slide-down ${err ? 'anim-shake' : ''}`} style={{ animationDelay: `${i * 0.08}s`, borderColor: `hsl(${p.hue} 60% 45% / 0.5)` }}>
              <div className="relative w-32 h-40 mx-auto mb-4 anim-bob" style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
                <div className="absolute inset-0" style={{ background: `linear-gradient(170deg, hsl(${p.hue} 35% 18%), #0d0a12 80%)`, border: `1.5px solid hsl(${p.hue} 70% 50%)`, boxShadow: `0 0 20px hsl(${p.hue} 80% 50% / 0.35)` }} />
                <div className="absolute inset-0 flex items-center justify-center" style={{ color: `hsl(${p.hue} 80% 60% / 0.4)` }}>
                  <RuneRing className="w-[120%] h-[120%]" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center" style={{ color: `hsl(${p.hue} 85% 65%)`, filter: `drop-shadow(0 0 10px hsl(${p.hue} 90% 55% / 0.8))` }}>
                  <Sigil icon={p.icon} className="w-12 h-12" />
                </div>
              </div>
              <p className="font-display text-2xl text-bone-100">{p.name}</p>
              <p className="font-body text-xs text-bone-500 mt-1.5 min-h-8">{p.desc}</p>
              <p className="font-body text-[0.62rem] uppercase tracking-widest mt-2" style={{ color: `hsl(${p.hue} 70% 60%)` }}>{p.odds}</p>
              <button onClick={() => buy(p.kind, p.cost)} disabled={meta.gold < p.cost}
                className="btn-rune mt-4 px-6 py-2 text-lg font-bold text-bone-100 flex items-center gap-2 mx-auto"
                style={{ background: meta.gold >= p.cost ? 'linear-gradient(160deg, #8e6a1f, #5c430f)' : '#1e1729', border: '1px solid rgba(232,182,76,0.4)' }}>
                <Sigil icon="coin" className="w-4 h-4 text-gold-400" /> {p.cost}
              </button>
              {meta.gold < p.cost && <p className="font-body text-[0.62rem] text-blood-400 mt-1.5">Oro insuficiente — lucha para ganarlo</p>}
            </div>
          ))}
        </div>
      </div>

      {opening && (
        <div className="fixed inset-0 z-50 bg-ink-950/92 flex items-center justify-center p-4">
          <div className="text-center anim-zoom-in">
            <p className="font-display text-3xl text-gold-400 text-glow-ember mb-5">
              {opening.revealed === 0 ? 'Un sobre sellado con cera negra...' : opening.revealed < 3 ? 'El destino susurra...' : 'Tu botín'}
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {opening.cards.map((id, i) => {
                const revealed = i < opening.revealed;
                const dupe = revealed && isDupe(opening, id, i);
                return revealed ? (
                  <div key={i} className="anim-zoom-in relative">
                    <CardView card={cardById(id)} size="shop" />
                    <span className={`absolute top-1 inset-x-0 text-center font-body text-[0.6rem] uppercase tracking-widest px-1 py-0.5 mx-auto w-fit left-0 right-0 ${dupe ? 'text-gold-400' : 'text-venom-400'}`} style={{ background: 'rgba(13,10,18,0.85)', border: `1px solid ${dupe ? 'rgba(232,182,76,0.5)' : 'rgba(157,255,87,0.5)'}` }}>
                      {dupe ? `Repetida +${DUPE_GOLD[cardById(id).rarity]} oro` : '¡Nueva!'}
                    </span>
                  </div>
                ) : (
                  <button key={i} onClick={i === opening.revealed ? revealNext : undefined}
                    className={`w-40 h-56 relative ${i === opening.revealed ? 'cursor-pointer hover:scale-105 transition-transform' : 'opacity-60 cursor-default'}`}
                    style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
                    <div className="absolute inset-0 bg-gradient-to-b from-ink-700 to-ink-950 border border-bone-500/30" />
                    <div className="absolute inset-0 flex items-center justify-center text-blood-600/60"><RuneRing className="w-3/4 h-3/4" /></div>
                    <div className="absolute inset-0 flex items-center justify-center text-blood-500"><Sigil icon="skull" className="w-12 h-12" /></div>
                    {i === opening.revealed && <p className="absolute bottom-3 inset-x-0 font-display text-sm text-gold-400 anim-glow">Clic para revelar</p>}
                  </button>
                );
              })}
            </div>
            {opening.revealed >= 3 && (
              <>
                {refundFor(opening) > 0 && (
                  <p className="font-body text-sm text-gold-400 mt-3">+{refundFor(opening)} de oro por cartas repetidas</p>
                )}
                <button onClick={saveCards} className="btn-rune mt-4 px-8 py-2.5 text-xl font-bold text-bone-100"
                  style={{ background: 'linear-gradient(160deg, #8e6a1f, #5c430f)', border: '1px solid rgba(232,182,76,0.5)', boxShadow: '0 0 18px rgba(232,182,76,0.35)' }}>
                  Guardar cartas
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ================= COLECCIÓN ================= */

export function CollectionScreen({ onBack }: { onBack: () => void }) {
  const { meta, deckFromCollection } = useMeta();
  const [filter, setFilter] = useState<'todas' | 'unidades' | 'hechizos'>('todas');

  const cards = useMemo(() => {
    const order = { 'legendaria': 0, 'épica': 1, 'rara': 2, 'común': 3 } as const;
    return PLAYER_CARDS
      .filter((c) => filter === 'todas' || (filter === 'unidades' ? c.kind === 'unit' : c.kind === 'spell'))
      .sort((a, b) => order[a.rarity] - order[b.rarity] || a.cost - b.cost);
  }, [filter]);

  const deckSize = deckFromCollection().length;

  return (
    <>
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-2">
            {(['todas', 'unidades', 'hechizos'] as const).map((f) => (
              <button key={f} onClick={() => { sfx.click(); setFilter(f); }}
                className={`btn-rune px-4 py-1.5 text-sm capitalize ${filter === f ? 'text-ink-950' : 'text-bone-300'}`}
                style={{ background: filter === f ? 'linear-gradient(160deg, #e8b64c, #b8862f)' : '#1e1729', border: '1px solid rgba(168,151,122,0.3)' }}>
                {f}
              </button>
            ))}
          </div>
          <p className="font-body text-[0.68rem] uppercase tracking-widest text-bone-500">
            En batalla se usan <b className="text-bone-100">20 cartas</b>: tu mazo del Arsenal, o un barajado de tu colección ({deckSize} copias)
          </p>
        </div>
        <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
          {cards.map((c: CardDef, i) => {
            const n = meta.collection[c.id] ?? 0;
            return (
              <div key={c.id} className="anim-card-in" style={{ animationDelay: `${Math.min(i * 0.02, 0.5)}s` }}>
                <CardView card={c} size="shop" dimmed={n === 0} count={n} />
                <p className="text-center mt-1 font-body text-[0.6rem] uppercase tracking-widest" style={{ color: n > 0 ? RARITY_COLOR[c.rarity] : '#4a4358' }}>
                  {n > 0 ? `${c.rarity} ×${n}` : 'Sin conseguir'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ================= SELECTOR DE RELIQUIAS ================= */

export function RelicPicker({ options, held, onPick }: { options: RelicDef[]; held: string[]; onPick: (id: string | null) => void }) {
  const heldDefs = held.map((id) => RELIC_LOOKUP[id]).filter(Boolean);
  return (
    <div className="fixed inset-0 z-[60] bg-ink-950/92 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full text-center anim-zoom-in">
        <p className="font-body text-[0.65rem] uppercase tracking-[0.3em] text-blood-400 mb-1">El botín de la cacería</p>
        <h3 className="font-display text-4xl sm:text-5xl text-gold-400 text-glow-gold">Elige una reliquia</h3>
        <p className="font-body text-xs text-bone-500 mt-2">Se acumula durante toda la racha de supervivencia.</p>

        {heldDefs.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="font-body text-[0.6rem] uppercase tracking-widest text-bone-500">Portas:</span>
            {heldDefs.map((r) => (
              <span key={r.id} className="flex items-center gap-1 px-2 py-0.5 border font-body text-[0.62rem]"
                style={{ borderColor: `hsl(${r.hue} 60% 45% / 0.6)`, color: `hsl(${r.hue} 75% 65%)` }}>
                <Sigil icon={r.icon} className="w-3 h-3" />{r.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          {options.map((r, i) => (
            <button key={r.id} onClick={() => { sfx.epic(); onPick(r.id); }}
              className="panel-dark p-6 text-left hover:-translate-y-2 transition-transform anim-slide-down group"
              style={{ animationDelay: `${0.1 + i * 0.09}s`, borderColor: `hsl(${r.hue} 60% 45% / 0.55)` }}>
              <div className="relative w-14 h-14 mb-3" style={{ color: `hsl(${r.hue} 80% 62%)` }}>
                <RuneRing className="absolute inset-0 w-full h-full" reverse={i % 2 === 1} />
                <div className="absolute inset-0 flex items-center justify-center anim-bob" style={{ filter: `drop-shadow(0 0 8px hsl(${r.hue} 90% 55% / 0.8))` }}>
                  <Sigil icon={r.icon} className="w-6 h-6" />
                </div>
              </div>
              <p className="font-display text-xl leading-tight group-hover:text-gold-400 transition-colors" style={{ color: `hsl(${r.hue} 75% 70%)` }}>{r.name}</p>
              <p className="font-body text-xs text-bone-300 mt-1.5 leading-snug">{r.desc}</p>
            </button>
          ))}
        </div>

        <button onClick={() => { sfx.click(); onPick(null); }}
          className="mt-6 font-body text-[0.65rem] uppercase tracking-widest text-bone-500 hover:text-bone-300 transition-colors">
          Seguir sin reliquia nueva
        </button>
      </div>
    </div>
  );
}

/* ================= LOGROS ================= */

export function AchievementsScreen({ onBack }: { onBack: () => void }) {
  const { meta } = useMeta();
  const unlockedCount = meta.achievements.length;
  return (
    <>
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-6">
        <p className="font-body text-[0.68rem] uppercase tracking-widest text-bone-500 mb-6">
          <b className="text-gold-400">{unlockedCount}</b> de <b className="text-bone-100">{ACHIEVEMENTS.length}</b> hazañas completadas
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {ACHIEVEMENTS.map((a: AchDef, i) => {
            const done = meta.achievements.includes(a.id);
            return (
              <div key={a.id} className={`panel-dark p-4 flex items-start gap-4 anim-slide-down ${done ? '' : 'opacity-50 saturate-[0.3]'}`}
                style={{ animationDelay: `${i * 0.04}s`, borderColor: done ? `hsl(${a.hue} 60% 45% / 0.6)` : undefined }}>
                <div className="relative w-12 h-12 shrink-0" style={{ color: done ? `hsl(${a.hue} 80% 62%)` : '#4a4358' }}>
                  <RuneRing className="absolute inset-0 w-full h-full" reverse={i % 2 === 1} />
                  <div className="absolute inset-0 flex items-center justify-center" style={done ? { filter: `drop-shadow(0 0 8px hsl(${a.hue} 90% 55% / 0.8))` } : undefined}>
                    <Sigil icon={done ? a.icon : 'lock'} className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-lg leading-tight" style={{ color: done ? `hsl(${a.hue} 75% 70%)` : '#8a7a5f' }}>{a.name}</p>
                    <span className={`flex items-center gap-1 font-display text-sm ${done ? 'text-gold-400' : 'text-bone-500'}`}>
                      <Sigil icon="coin" className="w-3.5 h-3.5" />{a.reward}
                    </span>
                  </div>
                  <p className="font-body text-xs text-bone-300/80 mt-0.5 leading-snug">{a.desc}</p>
                  <p className={`font-body text-[0.58rem] uppercase tracking-widest mt-1.5 ${done ? 'text-gold-400' : 'text-bone-500'}`}>
                    {done ? 'Completado' : 'Pendiente'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ================= DESAFÍOS DIARIOS / SEMANALES ================= */

export function ChallengesScreen({ onBack }: { onBack: () => void }) {
  const { meta } = useMeta();
  const ch = meta.challenges;

  const dateLabel = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  const weeklyDef = ch.weekly.id ? challengeById(ch.weekly.id) : null;
  const weeklyCounterDef = ch.weekly.id ? weeklyCounter(ch.weekly.id) : undefined;
  const weeklyProgress = weeklyCounterDef
    ? Math.min(ch.weekly.counters[weeklyCounterDef.counter] ?? 0, weeklyCounterDef.need)
    : null;

  return (
    <>
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-6">
        <p className="font-body text-[0.68rem] uppercase tracking-widest text-bone-500 mb-1">
          Desafíos diarios · <b className="text-bone-300 capitalize">{dateLabel}</b>
        </p>
        <p className="font-body text-xs text-bone-500 mb-4 leading-snug">
          Se renuevan cada día. Complétalos en cualquier modo y el oro se abona al instante.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          {ch.daily.ids.map((id, i) => {
            const def = challengeById(id);
            const done = ch.daily.claimed.includes(id);
            return (
              <div key={id} className={`panel-dark p-4 anim-slide-down ${done ? '' : ''}`}
                style={{ animationDelay: `${i * 0.06}s`, borderColor: done ? `hsl(${def.hue} 60% 45% / 0.6)` : undefined, opacity: done ? 1 : 0.92 }}>
                <div className="flex items-center justify-between">
                  <span style={{ color: done ? `hsl(${def.hue} 80% 62%)` : '#8a7a5f', filter: done ? `drop-shadow(0 0 8px hsl(${def.hue} 90% 55% / 0.7))` : undefined }}>
                    <Sigil icon={def.icon} className="w-7 h-7" />
                  </span>
                  <span className="flex items-center gap-1 font-display text-sm text-gold-400"><Sigil icon="coin" className="w-3.5 h-3.5" />{def.reward}</span>
                </div>
                <p className="font-display text-lg leading-tight mt-2" style={{ color: done ? `hsl(${def.hue} 75% 70%)` : '#f0e6cf' }}>{def.name}</p>
                <p className="font-body text-[0.68rem] text-bone-300/80 mt-1 leading-snug min-h-8">{def.desc}</p>
                <p className={`mt-2 inline-flex items-center gap-1 font-body text-[0.58rem] uppercase tracking-widest px-1.5 py-0.5 border ${done ? 'text-venom-400 border-venom-400/40' : 'text-bone-500 border-bone-500/25'}`}>
                  <Sigil icon={done ? 'sun' : 'lock'} className="w-3 h-3" />{done ? 'Completado' : 'Pendiente'}
                </p>
              </div>
            );
          })}
        </div>

        <p className="font-body text-[0.68rem] uppercase tracking-widest text-bone-500 mt-8 mb-3">Desafío semanal</p>
        {weeklyDef && (
          <div className="panel-dark p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{ borderColor: ch.weekly.claimed ? `hsl(${weeklyDef.hue} 60% 45% / 0.6)` : 'rgba(232,182,76,0.3)' }}>
            <span className="shrink-0" style={{ color: ch.weekly.claimed ? `hsl(${weeklyDef.hue} 80% 62%)` : '#e8b64c', filter: `drop-shadow(0 0 10px hsl(${weeklyDef.hue} 90% 55% / 0.6))` }}>
              <Sigil icon={weeklyDef.icon} className="w-10 h-10" />
            </span>
            <div className="flex-1">
              <p className="font-display text-2xl leading-tight" style={{ color: ch.weekly.claimed ? `hsl(${weeklyDef.hue} 75% 70%)` : '#f0e6cf' }}>{weeklyDef.name}</p>
              <p className="font-body text-xs text-bone-300/80 mt-1">{weeklyDef.desc}</p>
              {weeklyProgress !== null && weeklyCounterDef && (
                <div className="mt-2 max-w-xs">
                  <div className="h-2 bg-ink-950 border border-bone-500/30 overflow-hidden">
                    <div className="hp-bar-fill h-full" style={{ width: `${(weeklyProgress / weeklyCounterDef.need) * 100}%`, background: 'linear-gradient(90deg, #b8862f, #e8b64c)' }} />
                  </div>
                  <p className="font-body text-[0.6rem] text-bone-500 mt-0.5">{weeklyProgress} / {weeklyCounterDef.need}</p>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="flex items-center gap-1 font-display text-2xl text-gold-400 text-glow-gold"><Sigil icon="coin" className="w-5 h-5" />{weeklyDef.reward}</span>
              <span className={`font-body text-[0.6rem] uppercase tracking-widest ${ch.weekly.claimed ? 'text-venom-400' : 'text-bone-500'}`}>
                {ch.weekly.claimed ? 'Reclamado' : 'En curso'}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ================= ARSENAL (armador de mazo) ================= */

const shuffleIds = (arr: string[]): string[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function DeckScreen({ onBack }: { onBack: () => void }) {
  const { meta, dispatch } = useMeta();
  const [deck, setDeck] = useState<string[]>(meta.deck);
  const [toast, setToast] = useState(false);

  const owned = useMemo(
    () => PLAYER_CARDS.filter((c) => (meta.collection[c.id] ?? 0) > 0)
      .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)),
    [meta.collection],
  );
  const countIn = (id: string) => deck.filter((d) => d === id).length;
  const maxCopies = (id: string) => Math.min(3, meta.collection[id] ?? 0);

  const add = (id: string) => {
    if (deck.length >= 20) { sfx.error(); return; }
    if (countIn(id) >= maxCopies(id)) { sfx.error(); return; }
    sfx.card();
    setDeck([...deck, id]);
  };
  const remove = (id: string) => {
    const i = deck.indexOf(id);
    if (i < 0) return;
    sfx.click();
    setDeck(deck.filter((_, j) => j !== i));
  };
  const auto = () => {
    const pool: string[] = [];
    owned.forEach((c) => { for (let i = 0; i < maxCopies(c.id); i++) pool.push(c.id); });
    setDeck(shuffleIds(pool).slice(0, 20));
    sfx.pack();
  };
  const save = () => {
    if (deck.length !== 20) { sfx.error(); return; }
    dispatch({ type: 'setDeck', deck });
    sfx.coin();
    setToast(true);
    setTimeout(() => setToast(false), 1800);
  };

  const curve = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0, 0, 0];
    deck.forEach((id) => { const c = cardById(id).cost; buckets[Math.min(c, 7) - 1] += 1; });
    const max = Math.max(1, ...buckets);
    return { buckets, max };
  }, [deck]);

  const deckList = useMemo(() => {
    const m = new Map<string, number>();
    deck.forEach((id) => m.set(id, (m.get(id) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => cardById(a[0]).cost - cardById(b[0]).cost);
  }, [deck]);

  const complete = deck.length === 20;

  return (
    <>
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-6 grid lg:grid-cols-[1fr_21rem] gap-6 items-start">
        {/* colección disponible */}
        <div className="panel-dark p-4">
          <p className="font-body text-[0.65rem] uppercase tracking-[0.2em] text-bone-500 mb-3">Tus cartas — clic para añadir al mazo</p>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {owned.map((c) => {
              const inDeck = countIn(c.id);
              const atMax = inDeck >= maxCopies(c.id);
              const full = deck.length >= 20;
              return (
                <div key={c.id}
                  onClick={() => add(c.id)}
                  className={`group flex items-center gap-2.5 px-2.5 py-1.5 cursor-pointer transition-all border ${inDeck > 0 ? 'bg-ink-700/60' : 'bg-ink-900/40 hover:bg-ink-700/40'} ${full && inDeck === 0 ? 'opacity-50' : ''}`}
                  style={{ borderColor: inDeck > 0 ? RARITY_COLOR[c.rarity] : 'rgba(168,151,122,0.15)', clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}>
                  <span className="font-display font-bold text-base w-6 text-center shrink-0" style={{ color: '#6fe8ff' }}>{c.cost}</span>
                  <span style={{ color: `hsl(${c.hue} 80% 62%)` }}><Sigil icon={c.kind === 'unit' ? c.icon : 'flask'} className="w-5 h-5 shrink-0" /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-display text-[0.85rem] leading-tight text-bone-100 truncate group-hover:text-gold-400 transition-colors">{c.name}</span>
                    <span className="block font-body text-[0.55rem] uppercase tracking-wider" style={{ color: RARITY_COLOR[c.rarity] }}>
                      {c.rarity}{c.kind === 'unit' ? ` · ${c.atk}/${c.hp}${c.def ? ` +${c.def} def` : ''}` : ''}
                    </span>
                  </span>
                  {inDeck > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); remove(c.id); }}
                      className="shrink-0 w-6 h-6 flex items-center justify-center font-display text-lg leading-none text-bone-300 hover:text-blood-400 border border-bone-500/30 hover:border-blood-500/60 transition-colors"
                      title="Quitar una copia">−</button>
                  )}
                  <span className={`shrink-0 font-display text-sm ${atMax ? 'text-bone-500' : 'text-bone-300'}`}>
                    {inDeck}<span className="text-bone-500 text-[0.6rem]">/{Math.min(3, meta.collection[c.id] ?? 0)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* resumen del mazo */}
        <div className="panel-dark p-5 lg:sticky lg:top-6">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-2xl text-bone-100">Mazo</p>
            <p className={`font-display text-3xl font-bold ${complete ? 'text-venom-400' : 'text-ember-400'}`}>{deck.length}<span className="text-base text-bone-500">/20</span></p>
          </div>
          {/* curva de coste */}
          <div className="mt-3 flex items-end gap-1.5 h-16">
            {curve.buckets.map((n, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: '3rem' }}>
                  <div className="w-full transition-all duration-300" style={{
                    height: `${(n / curve.max) * 100}%`, minHeight: n > 0 ? '5px' : '2px',
                    background: n > 0 ? `linear-gradient(180deg, hsl(${40 - i * 6} 80% 55%), hsl(${20 - i * 4} 70% 35%))` : 'rgba(168,151,122,0.15)',
                  }} />
                </div>
                <span className="font-body text-[0.6rem] text-bone-500">{i === 6 ? '7+' : i + 1}</span>
              </div>
            ))}
          </div>
          {/* lista */}
          <div className="mt-3 max-h-64 overflow-y-auto pr-1 space-y-0.5">
            {deckList.length === 0 && <p className="font-body text-xs italic text-bone-500 py-4 text-center">El mazo está vacío. Añade cartas de tu colección.</p>}
            {deckList.map(([id, n]) => {
              const c = cardById(id);
              return (
                <button key={id} onClick={() => remove(id)} title="Quitar una copia"
                  className="w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-ink-700/50 transition-colors group">
                  <span className="font-display text-sm w-5 text-frost-400">{c.cost}</span>
                  <span className="flex-1 font-body text-xs text-bone-300 group-hover:text-bone-100 truncate">{c.name}</span>
                  <span className="font-display text-sm text-gold-400">×{n}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={auto} className="btn-rune px-3 py-2 text-base text-bone-100 bg-ink-700 border border-bone-500/30">Al azar</button>
            <button onClick={() => { setDeck([]); sfx.click(); }} className="btn-rune px-3 py-2 text-base text-bone-300 bg-ink-700 border border-bone-500/30">Vaciar</button>
          </div>
          <button onClick={save} disabled={!complete}
            className="btn-rune mt-2 w-full px-4 py-2.5 text-xl font-bold text-bone-100"
            style={{ background: complete ? 'linear-gradient(160deg, #8e1526, #5c0d18)' : '#1e1729', border: '1px solid rgba(255,77,94,0.5)', boxShadow: complete ? '0 0 18px rgba(224,47,69,0.35)' : 'none' }}>
            {complete ? 'Guardar mazo' : `Faltan ${20 - deck.length} cartas`}
          </button>
          {meta.deck.length === 20 && !toast && (
            <p className="mt-2 font-body text-[0.62rem] uppercase tracking-widest text-venom-400 text-center">Mazo personalizado activo</p>
          )}
        </div>
      </div>
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 panel-dark px-6 py-3 anim-zoom-in">
          <p className="font-display text-xl text-gold-400 text-glow-gold">Mazo guardado — a la batalla</p>
        </div>
      )}
    </>
  );
}

/* ================= EL ABISMO (TIENDA PREMIUM) ================= */

function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function fmtCountdown(msLeft: number): string {
  if (msLeft <= 0) return '00:00:00';
  const s = Math.floor(msLeft / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function SectionTitle({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-gold-400" style={{ filter: 'drop-shadow(0 0 8px rgba(255,215,106,0.6))' }}><Sigil icon={icon} className="w-6 h-6" /></span>
      <div>
        <p className="font-display text-2xl text-bone-100 leading-none text-glow-ember">{title}</p>
        <p className="font-body text-[0.62rem] uppercase tracking-widest text-bone-500 mt-1">{sub}</p>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-gold-500/40 to-transparent" />
    </div>
  );
}

const RELIC_PRICE = 150;

export function PremiumScreen() {
  const { meta, dispatch } = useMeta();
  const now = useNow();
  const [err, setErr] = useState(false);
  const [caravan, setCaravan] = useState<string | null>(null);

  const fail = () => { sfx.error(); setErr(true); setTimeout(() => setErr(false), 500); };

  const midnight = useMemo(() => { const d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime(); }, []);
  const offerLeft = midnight - now;
  const seasonLeft = meta.seasonEnds - now;
  const offerTaken = meta.offerClaimedDate === todayKey();

  const buyDiamonds = (amount: number) => {
    sfx.unlock(); sfx.coin();
    dispatch({ type: 'buyDiamonds', amount });
  };

  const claimOffer = () => {
    sfx.unlock();
    if (offerTaken || meta.diamonds < DAILY_OFFER.diamonds) { fail(); return; }
    const r = Math.random();
    const card = r < 0.1 ? pick(SHOP_POOL_LEGENDARY) : r < 0.4 ? pick(SHOP_POOL_EPIC) : pick(SHOP_POOL_RARE);
    dispatch({ type: 'spendDiamonds', amount: DAILY_OFFER.diamonds });
    dispatch({ type: 'claimOffer', date: todayKey(), card });
    setCaravan(card);
    sfx.pack();
  };

  const unlockFrame = (id: string, price: number) => {
    sfx.unlock();
    if (meta.diamonds < price) { fail(); return; }
    dispatch({ type: 'spendDiamonds', amount: price });
    dispatch({ type: 'unlockFrame', id });
    sfx.epic();
  };

  const equipFrame = (id: string | null) => { sfx.click(); dispatch({ type: 'setFrame', id }); };

  const ownRelic = (id: string) => {
    sfx.unlock();
    if (meta.diamonds < RELIC_PRICE) { fail(); return; }
    dispatch({ type: 'spendDiamonds', amount: RELIC_PRICE });
    dispatch({ type: 'ownRelic', id });
    sfx.epic();
  };

  return (
    <>
      {/* saldo de diamantes */}
      <div className="relative z-10 flex justify-center mb-4">
        <div className={`panel-dark px-6 py-2 flex items-center gap-2 ${err ? 'anim-shake' : ''}`} style={{ borderColor: 'rgba(111,232,255,0.45)' }}>
          <Sigil icon="gem" className="w-5 h-5 text-frost-400" />
          <span className="font-display text-2xl text-frost-400" style={{ textShadow: '0 0 10px rgba(111,232,255,0.6)' }}>{meta.diamonds.toLocaleString()}</span>
          <span className="font-body text-[0.6rem] uppercase tracking-widest text-bone-500 ml-1">diamantes</span>
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 pb-16 space-y-10">

        {/* OFERTA DIARIA */}
        <section className="anim-slide-down">
          <SectionTitle icon="bag" title="Oferta Diaria" sub="Un cargamento al día, ni uno más" />
            <div className="panel-dark p-6 sm:p-8 text-center relative overflow-hidden" style={{ borderColor: 'rgba(255,215,106,0.5)' }}>
              <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: 'radial-gradient(60% 80% at 50% 0%, rgba(255,215,106,0.35), transparent 70%)' }} />
              <p className="font-body text-[0.62rem] uppercase tracking-[0.3em] text-gold-400 mb-1">Solo una vez al día</p>
              <h3 className="font-display text-4xl text-bone-100 text-glow-gold">{DAILY_OFFER.name}</h3>
              <p className="font-body italic text-bone-300/80 text-sm mt-2 max-w-md mx-auto">«{DAILY_OFFER.desc}»</p>
              <div className="flex items-center justify-center gap-5 mt-5">
                <div className="flex flex-col items-center gap-1">
                  <span className="flex items-center gap-1.5 font-display text-3xl text-gold-400"><Sigil icon="coin" className="w-6 h-6" />{DAILY_OFFER.gold}</span>
                  <span className="font-body text-[0.6rem] uppercase tracking-widest text-bone-500">oro</span>
                </div>
                <span className="font-display text-2xl text-bone-500">+</span>
                <div className="flex flex-col items-center gap-1">
                  <span className="flex items-center gap-1.5 font-display text-3xl text-venom-400"><Sigil icon="cards" className="w-6 h-6" />1</span>
                  <span className="font-body text-[0.6rem] uppercase tracking-widest text-bone-500">carta rara+</span>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-center gap-3">
                <span className="font-body text-[0.62rem] uppercase tracking-widest text-bone-500">Se reinicia en</span>
                <span className="font-display text-2xl text-blood-400 tabular-nums" style={{ textShadow: '0 0 10px rgba(224,47,69,0.6)' }}>{fmtCountdown(offerLeft)}</span>
              </div>
              <button onClick={claimOffer} disabled={offerTaken || meta.diamonds < DAILY_OFFER.diamonds}
                className="btn-rune mt-5 px-8 py-2.5 text-xl font-bold text-bone-100 flex items-center gap-2 mx-auto"
                style={{ background: offerTaken ? '#1e1729' : 'linear-gradient(160deg, #8e6a1f, #5c430f)', border: '1px solid rgba(232,182,76,0.5)', boxShadow: offerTaken ? 'none' : '0 0 18px rgba(232,182,76,0.35)' }}>
                <Sigil icon="gem" className="w-5 h-5 text-frost-400" />
                {offerTaken ? 'Caravana ya saqueada hoy' : `${DAILY_OFFER.diamonds} diamantes`}
              </button>
              {!offerTaken && meta.diamonds < DAILY_OFFER.diamonds && (
                <p className="font-body text-[0.62rem] text-blood-400 mt-2">Diamantes insuficientes — la sección de abajo puede solucionarlo</p>
              )}
            </div>
        </section>

        {/* DIAMANTES */}
        <section className="anim-slide-down" style={{ animationDelay: '0.05s' }}>
          <SectionTitle icon="gem" title="Diamantes" sub="Bonificación por volumen: el abismo premia la avaricia" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DIAMOND_PACKS.map((p, i) => {
              const total = p.diamonds + p.bonus;
              return (
                <div key={p.id} className="panel-dark p-5 text-center relative anim-slide-down" style={{ animationDelay: `${i * 0.05}s`, borderColor: `hsl(${p.hue} 60% 45% / 0.5)` }}>
                  {p.tag && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 font-body text-[0.55rem] uppercase tracking-widest text-ink-950" style={{ background: '#ffd76a' }}>{p.tag}</span>
                  )}
                  <div className="flex items-center justify-center gap-1.5" style={{ color: `hsl(${p.hue} 80% 62%)`, filter: `drop-shadow(0 0 8px hsl(${p.hue} 90% 55% / 0.7))` }}>
                    <Sigil icon={p.icon} className="w-8 h-8" />
                  </div>
                  <p className="font-display text-xl text-bone-100 mt-2">{p.name}</p>
                  <p className="font-display text-3xl text-frost-400 mt-1 flex items-center justify-center gap-1.5">
                    <Sigil icon="gem" className="w-5 h-5" />{total.toLocaleString()}
                  </p>
                  {p.bonus > 0 && <p className="font-body text-[0.62rem] text-venom-400 mt-0.5">+{p.bonus} de regalo</p>}
                  <button onClick={() => buyDiamonds(total)}
                    className="btn-rune mt-3 px-6 py-1.5 text-lg font-bold text-bone-100 mx-auto"
                    style={{ background: `linear-gradient(160deg, hsl(${p.hue} 45% 30%), hsl(${p.hue} 50% 16%))`, border: `1px solid hsl(${p.hue} 70% 50% / 0.6)` }}>
                    {p.priceUSD}
                  </button>
                </div>
              );
            })}
            <p className="sm:col-span-2 lg:col-span-3 font-body text-[0.62rem] italic text-bone-500 text-center">Demo sin pagos reales: cada compra acredita los diamantes al instante.</p>
          </div>
        </section>

        {/* COSMÉTICOS */}
        <section className="anim-slide-down" style={{ animationDelay: '0.1s' }}>
          <SectionTitle icon="crown" title="Marcos de Carta" sub="Puro estilo, cero ventaja. Equípalo y presúmelo en cada batalla" />
            {seasonLeft > 0 && (
              <p className="font-body text-center text-[0.62rem] uppercase tracking-widest text-blood-400 mb-5">
                Temporada de marcos limitados termina en <b className="font-display text-base tabular-nums">{fmtCountdown(seasonLeft)}</b>
              </p>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FRAMES.map((f, i) => {
                const owned = meta.unlockedFrames.includes(f.id);
                const active = meta.activeFrame === f.id;
                const gone = f.limited && seasonLeft <= 0;
                return (
                  <div key={f.id} className={`panel-dark p-4 text-center anim-slide-down relative ${gone ? 'opacity-40 saturate-0' : ''}`} style={{ animationDelay: `${i * 0.05}s`, borderColor: `${f.accent}88` }}>
                    {f.limited && !gone && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 font-body text-[0.55rem] uppercase tracking-widest text-ink-950" style={{ background: f.accent }}>Limitado</span>
                    )}
                    <div className="relative w-20 h-28 mx-auto mb-3">
                      <div className={`absolute inset-0 ${f.anim === 'flames' ? 'anim-frame-flames' : f.anim === 'embers' ? 'anim-frame-embers' : f.anim === 'frost' ? 'anim-frame-frost' : ''}`}
                        style={{ border: `2px solid ${f.accent}`, boxShadow: `0 0 16px ${f.glow}, inset 0 0 12px ${f.glow}`, background: 'linear-gradient(170deg, #1e1729, #0d0a12)' }} />
                      <div className="absolute inset-0 flex items-center justify-center" style={{ color: f.accent, filter: `drop-shadow(0 0 6px ${f.glow})` }}>
                        <Sigil icon={f.icon} className="w-8 h-8" />
                      </div>
                    </div>
                    <p className="font-display text-lg" style={{ color: f.accent }}>{f.name}</p>
                    <p className="font-body text-[0.62rem] text-bone-500 mt-1 min-h-10 leading-snug">{f.desc}</p>
                    {active ? (
                      <button onClick={() => equipFrame(null)} className="btn-rune mt-2 px-5 py-1.5 text-base text-gold-400 bg-ink-700 border border-gold-400/50">Equipado — quitar</button>
                    ) : owned ? (
                      <button onClick={() => equipFrame(f.id)} className="btn-rune mt-2 px-5 py-1.5 text-base text-bone-100 bg-ink-700 border border-bone-500/40">Equipar</button>
                    ) : gone ? (
                      <p className="font-body text-[0.62rem] uppercase tracking-widest text-bone-500 mt-3">Agotado esta temporada</p>
                    ) : (
                      <button onClick={() => unlockFrame(f.id, f.price)} disabled={meta.diamonds < f.price}
                        className="btn-rune mt-2 px-5 py-1.5 text-base font-bold text-bone-100 flex items-center gap-1.5 mx-auto"
                        style={{ background: meta.diamonds >= f.price ? 'linear-gradient(160deg, #155e6e, #0b3a45)' : '#1e1729', border: '1px solid rgba(111,232,255,0.5)' }}>
                        <Sigil icon="gem" className="w-4 h-4 text-frost-400" />{f.price}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
        </section>

        {/* RELICARIO */}
        <section className="anim-slide-down" style={{ animationDelay: '0.15s' }}>
          <SectionTitle icon="gem" title="Relicario Hueco" sub="Tus reliquias favoritas tras un marco dorado; aparecerán con prioridad en Supervivencia" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {RELICS.map((r, i) => {
                const owned = meta.relicsOwned.includes(r.id);
                return (
                  <div key={r.id} className={`panel-dark p-4 text-center anim-slide-down ${owned ? '' : 'opacity-70'}`} style={{ animationDelay: `${i * 0.04}s`, borderColor: owned ? 'rgba(255,215,106,0.6)' : 'rgba(168,151,122,0.25)' }}>
                    <div className={`relative w-14 h-14 mx-auto mb-2 flex items-center justify-center ${owned ? 'anim-glow' : ''}`}
                      style={{ border: owned ? '2px solid #ffd76a' : '1px dashed rgba(168,151,122,0.4)', boxShadow: owned ? '0 0 14px rgba(255,215,106,0.5), inset 0 0 10px rgba(255,215,106,0.25)' : 'none', background: owned ? 'radial-gradient(70% 70% at 50% 35%, rgba(255,215,106,0.15), transparent 75%)' : 'transparent' }}>
                      <span style={{ color: owned ? `hsl(${r.hue} 80% 62%)` : 'rgba(168,151,122,0.4)', filter: owned ? `drop-shadow(0 0 6px hsl(${r.hue} 90% 55% / 0.7))` : 'none' }}>
                        <Sigil icon={r.icon} className="w-7 h-7" />
                      </span>
                    </div>
                    <p className={`font-display text-base leading-tight ${owned ? 'text-gold-400' : 'text-bone-300'}`}>{r.name}</p>
                    <p className="font-body text-[0.58rem] text-bone-500 mt-1 min-h-8 leading-snug">{r.desc}</p>
                    {owned ? (
                      <p className="font-body text-[0.6rem] uppercase tracking-widest text-gold-400 mt-2">En exhibición</p>
                    ) : (
                      <button onClick={() => ownRelic(r.id)} disabled={meta.diamonds < RELIC_PRICE}
                        className="btn-rune mt-2 px-4 py-1 text-sm font-bold text-bone-100 flex items-center gap-1 mx-auto"
                        style={{ background: meta.diamonds >= RELIC_PRICE ? 'linear-gradient(160deg, #155e6e, #0b3a45)' : '#1e1729', border: '1px solid rgba(111,232,255,0.5)' }}>
                        <Sigil icon="gem" className="w-3.5 h-3.5 text-frost-400" />{RELIC_PRICE}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
        </section>
      </div>

      {/* revelación de la caravana */}
      {caravan && (
        <div className="fixed inset-0 z-50 bg-ink-950/94 flex items-center justify-center p-4">
          <div className="text-center anim-zoom-in">
            <p className="font-body text-[0.62rem] uppercase tracking-[0.35em] text-gold-400 mb-1">La caravana ha sido saqueada</p>
            <p className="font-display text-4xl text-bone-100 text-glow-gold mb-6">Tu botín</p>
            <div className="flex items-center justify-center gap-4 flex-wrap mb-6">
              <div className="flex items-center gap-2 font-display text-4xl text-gold-400 text-glow-gold anim-zoom-in" style={{ animationDelay: '0.1s' }}>
                <Sigil icon="coin" className="w-9 h-9" />+{DAILY_OFFER.gold}
              </div>
              <div className="anim-zoom-in" style={{ animationDelay: '0.35s' }}>
                <CardView card={cardById(caravan)} size="shop" />
              </div>
            </div>
            <p className="font-body text-[0.62rem] text-bone-500 mb-5">El oro y la carta ya están en tu poder. Vuelve mañana por más.</p>
            <button onClick={() => { sfx.coin(); setCaravan(null); }}
              className="btn-rune px-10 py-2.5 text-xl font-bold text-bone-100"
              style={{ background: 'linear-gradient(160deg, #8e6a1f, #5c430f)', border: '1px solid rgba(232,182,76,0.5)', boxShadow: '0 0 18px rgba(232,182,76,0.35)' }}>
              Reclamar botín
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= LOS 4 HUBS (secciones con pestañas) ================= */

export function BattleHub({ tab, onTab, onBack, onStory, onSurvival, onVersus, best }: {
  tab: string; onTab: (t: string) => void; onBack: () => void;
  onStory: (lv: number, pacts: string[]) => void; onSurvival: () => void; onVersus: (d: number) => void; best: number;
}) {
  return (
    <TabShell title="Campo de Batalla" sub="Elige dónde derramar la sangre" onBack={onBack} tab={tab} onTab={onTab}
      tabs={[
        { id: 'historia', label: 'Historia', icon: 'flag' },
        { id: 'supervivencia', label: 'Supervivencia', icon: 'infinity' },
        { id: 'versus', label: 'Versus', icon: 'swords' },
      ]}>
      {tab === 'historia' && <StoryScreen onBack={onBack} onPlay={onStory} />}
      {tab === 'supervivencia' && <SurvivalScreen onBack={onBack} onPlay={onSurvival} best={best} />}
      {tab === 'versus' && <VersusScreen onBack={onBack} onPlay={onVersus} />}
    </TabShell>
  );
}

export function FeatsHub({ tab, onTab, onBack }: { tab: string; onTab: (t: string) => void; onBack: () => void }) {
  return (
    <TabShell title="Hazañas" sub="Encargos del gremio y gloria grabada en hierro" onBack={onBack} tab={tab} onTab={onTab}
      tabs={[
        { id: 'desafios', label: 'Desafíos', icon: 'sun' },
        { id: 'logros', label: 'Logros', icon: 'crown' },
      ]}>
      {tab === 'desafios' && <ChallengesScreen onBack={onBack} />}
      {tab === 'logros' && <AchievementsScreen onBack={onBack} />}
    </TabShell>
  );
}

export function ArsenalHub({ tab, onTab, onBack }: { tab: string; onTab: (t: string) => void; onBack: () => void }) {
  return (
    <TabShell title="El Arsenal" sub="Forja tu mazo y contempla tu botín" onBack={onBack} tab={tab} onTab={onTab}
      tabs={[
        { id: 'forja', label: 'Forja', icon: 'hammer' },
        { id: 'coleccion', label: 'Colección', icon: 'cards' },
      ]}>
      {tab === 'forja' && <DeckScreen onBack={onBack} />}
      {tab === 'coleccion' && <CollectionScreen onBack={onBack} />}
    </TabShell>
  );
}

export function MarketHub({ tab, onTab, onBack }: { tab: string; onTab: (t: string) => void; onBack: () => void }) {
  return (
    <TabShell title="El Mercado" sub="Oro por acero, gemas por vanidad" onBack={onBack} tab={tab} onTab={onTab}
      tabs={[
        { id: 'mercader', label: 'Mercader', icon: 'bag' },
        { id: 'abismo', label: 'El Abismo', icon: 'gem' },
      ]}>
      {tab === 'mercader' && <ShopScreen onBack={onBack} />}
      {tab === 'abismo' && <PremiumScreen />}
    </TabShell>
  );
}
