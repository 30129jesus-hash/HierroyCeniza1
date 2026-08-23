import { useMemo, useState } from 'react';
import { useMeta } from '../state/store';
import { DUPE_GOLD, PACK_COST, PLAYER_CARDS, RARITY_COLOR, SHOP_POOL_COMMON, SHOP_POOL_EPIC, SHOP_POOL_RARE, STORY_LEVELS, cardById } from '../game/cards';
import type { CardDef } from '../game/types';
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
      <div className="flex items-center gap-1.5 font-display text-lg text-gold-400 text-glow-gold">
        <Sigil icon="coin" className="w-5 h-5" /> {meta.gold}
      </div>
    </div>
  );
}

/* ================= TÍTULO ================= */

export function TitleScreen({ onNav }: { onNav: (s: string) => void }) {
  const { meta, dispatch } = useMeta();
  const [confirmReset, setConfirmReset] = useState(false);

  const items = [
    { id: 'story', label: 'Modo Historia', desc: '8 estandartes, 8 jefes', icon: 'flag', hue: 46 },
    { id: 'survival', label: 'Supervivencia', desc: `Récord: ${meta.survivalBest} rondas`, icon: 'infinity', hue: 0 },
    { id: 'versus', label: 'Versus', desc: `${meta.vsWins} duelos ganados`, icon: 'swords', hue: 20 },
    { id: 'shop', label: 'Tienda', desc: 'Sobres de recluta y de guerra', icon: 'bag', hue: 130 },
    { id: 'collection', label: 'Colección', desc: `${Object.values(meta.collection).reduce((a, b) => a + b, 0)} cartas reunidas`, icon: 'cards', hue: 210 },
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

export function StoryScreen({ onBack, onPlay }: { onBack: () => void; onPlay: (level: number) => void }) {
  const { meta } = useMeta();
  return (
    <div className="bg-arena min-h-screen relative">
      <div className="bg-vignette absolute inset-0 pointer-events-none" />
      <Embers n={10} />
      <Header title="La Campaña" sub="Ocho estandartes, un trono de ceniza" onBack={onBack} />
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 py-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STORY_LEVELS.map((lv, i) => {
            const unlocked = i + 1 <= meta.storyUnlocked;
            const cleared = meta.storyCleared.includes(i + 1);
            return (
              <button key={lv.n} disabled={!unlocked}
                onClick={() => { sfx.click(); onPlay(i + 1); }}
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
    </div>
  );
}

/* ================= SUPERVIVENCIA ================= */

export function SurvivalScreen({ onBack, onPlay, best }: { onBack: () => void; onPlay: () => void; best: number }) {
  return (
    <div className="bg-arena min-h-screen relative flex flex-col">
      <div className="bg-vignette absolute inset-0 pointer-events-none" />
      <Embers n={14} />
      <Header title="Supervivencia" sub="La horda no tiene fin" onBack={onBack} />
      <div className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="panel-dark max-w-xl w-full p-8 sm:p-10 text-center anim-zoom-in">
          <div className="w-20 h-20 mx-auto relative mb-4" style={{ color: 'rgba(224,47,69,0.8)' }}>
            <RuneRing className="absolute inset-0 w-full h-full" />
            <div className="absolute inset-0 flex items-center justify-center text-blood-500"><Sigil icon="skull" className="w-9 h-9" /></div>
          </div>
          <h3 className="font-display text-4xl text-bone-100 text-glow-blood">Hasta la última gota</h3>
          <p className="font-body text-bone-300 mt-3 text-sm leading-relaxed">
            Oleadas infinitas de enemigos cada vez más fuertes. Cada victoria te da oro y tu héroe sana sus heridas;
            la derrota lo termina todo. ¿Cuántas rondas aguantarás?
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
    </div>
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
    <div className="bg-arena min-h-screen relative">
      <div className="bg-vignette absolute inset-0 pointer-events-none" />
      <Embers n={10} />
      <Header title="Versus" sub="Duelo contra la máquina" onBack={onBack} />
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-10 grid sm:grid-cols-3 gap-5">
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
    </div>
  );
}

/* ================= TIENDA ================= */

type PackKind = 'recluta' | 'guerra';

export function ShopScreen({ onBack }: { onBack: () => void }) {
  const { meta, dispatch } = useMeta();
  const [opening, setOpening] = useState<{ cards: string[]; revealed: number; saved: boolean; base: Record<string, number> } | null>(null);
  const [err, setErr] = useState(false);

  const genPack = (kind: PackKind): string[] => {
    if (kind === 'recluta') {
      const third = Math.random() < 0.3 ? pick(SHOP_POOL_RARE) : pick(SHOP_POOL_COMMON);
      return [pick(SHOP_POOL_COMMON), pick(SHOP_POOL_COMMON), third];
    }
    const second = Math.random() < 0.45 ? pick(SHOP_POOL_EPIC) : pick(SHOP_POOL_RARE);
    const third = Math.random() < 0.25 ? pick(SHOP_POOL_EPIC) : pick(SHOP_POOL_RARE);
    return [pick(SHOP_POOL_RARE), second, third];
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
    { kind: 'guerra' as PackKind, name: 'Sobre de Guerra', cost: PACK_COST.guerra, desc: '3 cartas forjadas en batalla. Rara garantizada, posible épica.', icon: 'dragon', hue: 12, odds: '55% rara · 45% épica o legendaria' },
  ];

  return (
    <div className="bg-arena min-h-screen relative">
      <div className="bg-vignette absolute inset-0 pointer-events-none" />
      <Embers n={8} />
      <Header title="Tienda" sub="El mercader de la puerta negra" onBack={onBack} />
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-10">
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
    </div>
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
    <div className="bg-arena min-h-screen relative">
      <div className="bg-vignette absolute inset-0 pointer-events-none" />
      <Embers n={8} />
      <Header title="Colección" sub="El arsenal del comandante" onBack={onBack} />
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-8">
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
            Mazo de batalla: <b className="text-bone-100">{deckSize} cartas</b> (todas tus copias entran; se barajan 20 al azar)
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
    </div>
  );
}
