import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMeta } from '../state/store';
import {
  ACHIEVEMENTS, DUPE_GOLD, PACK_COST, PACTS, PLAYER_CARDS, RARITY_COLOR, RELICS, RELIC_LOOKUP, RELIC_PRICE,
  SHOP_POOL_COMMON, SHOP_POOL_EPIC, SHOP_POOL_LEGENDARY, SHOP_POOL_RARE, STORY_LEVELS, cardById, pactById, relicById,
} from '../game/cards';
import type { CardDef, RelicDef } from '../game/types';
import { DIAMOND_PACKS, DAILY_OFFER, FRAMES, frameById } from '../game/premium';
import { challengeById, todayKey, weeklyCounter } from '../game/challenges';
import { sfx } from '../game/audio';
import CardView from './CardView';
import { Sigil, RuneRing } from './icons';

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

/* ================= PIEZAS COMPARTIDAS ================= */

export function Embers({ n = 12 }: { n?: number }) {
  const embers = useMemo(() => Array.from({ length: n }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    dur: 7 + Math.random() * 9,
    delay: Math.random() * 12,
    size: 2 + Math.random() * 3,
    ex: (Math.random() - 0.5) * 90,
    eo: 0.25 + Math.random() * 0.5,
  })), [n]);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {embers.map((e) => (
        <span key={e.id} className="ember" style={{
          left: `${e.left}%`, width: e.size, height: e.size,
          animationDuration: `${e.dur}s`, animationDelay: `${e.delay}s`,
          ['--ex' as never]: `${e.ex}px`, ['--eo' as never]: e.eo,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

export function Header({ title, sub, onBack, right }: { title: string; sub?: string; onBack: () => void; right?: ReactNode }) {
  const { meta } = useMeta();
  return (
    <header className="relative z-20 flex items-center justify-between gap-3 px-4 sm:px-8 py-4 border-b border-bone-500/15 bg-ink-950/60">
      <button onClick={() => { sfx.click(); onBack(); }}
        className="btn-rune px-3 py-1.5 text-base bg-ink-700 text-bone-300 border border-bone-500/25 flex items-center gap-1.5">
        <Sigil icon="back" className="w-4 h-4" /> Volver
      </button>
      <div className="text-center min-w-0">
        <p className="font-display text-2xl sm:text-3xl text-gold-400 text-glow-gold leading-none truncate">{title}</p>
        {sub && <p className="font-body text-[0.62rem] uppercase tracking-widest text-bone-500 truncate">{sub}</p>}
      </div>
      <div className="flex items-center gap-3">
        {right}
        <span className="flex items-center gap-1.5 font-display text-lg text-gold-400" title="Oro">
          <Sigil icon="coin" className="w-4 h-4" />{meta.gold}
        </span>
        <span className="flex items-center gap-1.5 font-display text-lg text-frost-400" title="Diamantes">
          <Sigil icon="gem" className="w-4 h-4" />{meta.diamonds.toLocaleString()}
        </span>
      </div>
    </header>
  );
}

export function SectionTitle({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h3 className="font-display text-2xl sm:text-3xl text-bone-100 flex items-center gap-2">
        <span className="text-gold-400"><Sigil icon={icon} className="w-6 h-6" /></span>{title}
      </h3>
      {sub && <p className="font-body text-[0.62rem] uppercase tracking-widest text-bone-500 mt-0.5">{sub}</p>}
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
    <div className="bg-arena min-h-screen relative overflow-hidden flex">
      <div className="bg-vignette absolute inset-0 pointer-events-none" />
      <Embers n={22} />
      <div className="absolute top-0 right-[12%] w-px h-10 bg-gradient-to-b from-blood-600 to-transparent anim-drip" />
      <div className="absolute top-0 right-[30%] w-px h-16 bg-gradient-to-b from-blood-600 to-transparent anim-drip" style={{ animationDelay: '1.1s' }} />

      <div className="relative z-10 flex flex-col justify-center px-6 sm:px-16 py-10 w-full max-w-2xl">
        <p className="font-body text-[0.7rem] uppercase tracking-[0.5em] text-blood-400 mb-2 anim-slide-down">Un reino en cenizas</p>
        <h1 className="font-display text-6xl sm:text-8xl leading-[0.9] text-bone-100 text-glow-ember anim-slide-down">
          Hierro <span className="text-blood-500">&amp;</span> Ceniza
        </h1>
        <p className="font-body italic text-bone-300/80 mt-3 max-w-md anim-slide-down" style={{ animationDelay: '0.1s' }}>
          «Las hordas no negocian. Tampoco el acero. Elige tus cartas, comandante, y que la ceniza caiga del lado correcto.»
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((it, i) => (
            <button key={it.id} onClick={() => { sfx.unlock(); sfx.click(); onNav(it.id); }}
              className="btn-rune group text-left px-5 py-4 anim-slide-down"
              style={{
                animationDelay: `${0.15 + i * 0.07}s`,
                background: `linear-gradient(155deg, hsl(${it.hue} 32% 16%) 0%, #15101d 75%)`,
                border: `1px solid hsl(${it.hue} 55% 45% / 0.45)`,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}>
              <span className="flex items-center gap-3">
                <span style={{ color: `hsl(${it.hue} 80% 62%)`, filter: `drop-shadow(0 0 8px hsl(${it.hue} 90% 55% / 0.7))` }}>
                  <Sigil icon={it.icon} className="w-7 h-7" />
                </span>
                <span>
                  <span className="block font-display text-2xl text-bone-100 group-hover:text-gold-400 transition-colors">{it.label}</span>
                  <span className="block font-body text-[0.6rem] uppercase tracking-wider text-bone-500">{it.desc}</span>
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-4 flex-wrap anim-slide-down" style={{ animationDelay: '0.45s' }}>
          <span className="flex items-center gap-1.5 font-display text-xl text-gold-400"><Sigil icon="coin" className="w-5 h-5" />{meta.gold}</span>
          <span className="flex items-center gap-1.5 font-display text-xl text-frost-400"><Sigil icon="gem" className="w-5 h-5" />{meta.diamonds.toLocaleString()}</span>
          <button onClick={() => { sfx.click(); dispatch({ type: 'toggleMute' }); }}
            className="btn-rune px-3 py-1.5 bg-ink-700 border border-bone-500/25 text-bone-300" title="Sonido">
            <Sigil icon={meta.muted ? 'soundOff' : 'sound'} className="w-4 h-4" />
          </button>
          <button onClick={() => { sfx.click(); dispatch({ type: 'toggleMusic' }); }}
            className="btn-rune px-3 py-1.5 bg-ink-700 border border-bone-500/25" title="Música ambiental"
            style={{ color: meta.musicOn ? '#ffd76a' : '#4a4358' }}>
            <Sigil icon="wave" className="w-4 h-4" />
          </button>
          {!confirmReset ? (
            <button onClick={() => { sfx.click(); setConfirmReset(true); }}
              className="btn-rune px-3 py-1.5 bg-ink-700 border border-bone-500/25 text-bone-500 text-sm">Reiniciar progreso</button>
          ) : (
            <span className="flex items-center gap-2">
              <span className="font-body text-[0.62rem] uppercase tracking-widest text-blood-400">¿Borrar todo?</span>
              <button onClick={() => { sfx.click(); dispatch({ type: 'reset' }); setConfirmReset(false); }} className="btn-rune px-3 py-1 text-sm text-bone-100" style={{ background: 'linear-gradient(160deg, #8e1526, #5c0d18)', border: '1px solid rgba(255,77,94,0.5)' }}>Sí, quemarlo</button>
              <button onClick={() => { sfx.click(); setConfirmReset(false); }} className="btn-rune px-3 py-1 text-sm bg-ink-700 border border-bone-500/30 text-bone-300">No</button>
            </span>
          )}
        </div>
        <p className="font-body text-[0.55rem] uppercase tracking-widest text-bone-500/60 mt-6 anim-slide-down" style={{ animationDelay: '0.55s' }}>
          Victorias {meta.totalWins} · Derrotas {meta.totalLosses} · Dragones {meta.dragonsSlain}
        </p>
      </div>

      <div className="hidden lg:flex relative z-10 flex-1 items-center justify-center" aria-hidden>
        <div className="relative w-[26rem] h-[26rem] text-blood-700/40">
          <RuneRing className="w-full h-full" />
          <div className="absolute inset-10 text-ember-500/25"><RuneRing className="w-full h-full" reverse /></div>
          <div className="absolute inset-0 flex items-center justify-center text-blood-600/70">
            <Sigil icon="dragon" className="w-40 h-40 anim-bob" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= HISTORIA ================= */

function StoryScreen({ onPlay }: { onPlay: (level: number, pacts: string[]) => void }) {
  const { meta } = useMeta();
  const [selLevel, setSelLevel] = useState<number | null>(null);
  const [pacts, setPacts] = useState<string[]>([]);

  const togglePact = (id: string) => {
    sfx.click();
    setPacts((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  return (
    <>
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 py-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STORY_LEVELS.map((lv, i) => {
            const unlocked = lv.n <= meta.storyUnlocked;
            const cleared = meta.storyCleared.includes(lv.n);
            return (
              <button key={lv.n} disabled={!unlocked}
                onClick={() => { sfx.click(); setSelLevel(lv.n); setPacts([]); }}
                className="btn-rune group text-left p-4 anim-slide-down"
                style={{
                  animationDelay: `${i * 0.05}s`,
                  background: unlocked ? `linear-gradient(160deg, hsl(${lv.hue} 30% 15%) 0%, #15101d 80%)` : 'rgba(21,16,29,0.6)',
                  border: `1px solid ${unlocked ? `hsl(${lv.hue} 55% 45% / 0.5)` : 'rgba(168,151,122,0.15)'}`,
                  boxShadow: unlocked ? '0 8px 22px rgba(0,0,0,0.5)' : 'none',
                  opacity: unlocked ? 1 : 0.45,
                }}>
                <div className="flex items-center justify-between">
                  <span className="font-display text-3xl text-bone-500/60">{String(lv.n).padStart(2, '0')}</span>
                  {cleared ? (
                    <span className="font-body text-[0.55rem] uppercase tracking-widest text-venom-400 border border-venom-400/40 px-1.5 py-0.5">Superado</span>
                  ) : !unlocked ? (
                    <span className="text-bone-500/60"><Sigil icon="lock" className="w-5 h-5" /></span>
                  ) : null}
                </div>
                <p className="font-display text-xl text-bone-100 group-hover:text-gold-400 transition-colors leading-tight mt-1">{lv.title}</p>
                <p className="font-body text-[0.62rem] uppercase tracking-widest mt-1" style={{ color: `hsl(${lv.hue} 60% 60%)` }}>{lv.place}</p>
                <p className="font-body text-[0.7rem] text-bone-300/80 mt-2 leading-snug min-h-10">{lv.desc}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="flex items-center gap-1 font-body text-[0.6rem] uppercase tracking-widest text-bone-500">
                    <span style={{ color: `hsl(${lv.hue} 70% 55%)` }}><Sigil icon={lv.heroIcon} className="w-5 h-5" /></span>
                    {lv.hero}
                  </span>
                  <span className="flex items-center gap-1 font-display text-lg text-gold-400"><Sigil icon="coin" className="w-4 h-4" />{lv.reward}</span>
                </div>
              </button>
            );
          })}
        </div>
        <p className="font-body italic text-bone-500 text-center text-sm mt-6">«Ocho estandartes, un trono de ceniza. Tumba cada uno.»</p>
      </div>

      {selLevel !== null && (
        <div className="fixed inset-0 z-50 bg-ink-950/92 flex items-center justify-center p-4" onClick={() => setSelLevel(null)}>
          <div className="panel-dark max-w-md w-full p-6 anim-zoom-in" onClick={(e) => e.stopPropagation()}>
            <p className="font-body text-[0.6rem] uppercase tracking-[0.3em] text-blood-400">Nivel {selLevel}</p>
            <h3 className="font-display text-3xl text-bone-100 leading-tight">{STORY_LEVELS[selLevel - 1].title}</h3>
            <p className="font-body text-sm text-bone-300/80 mt-2">{STORY_LEVELS[selLevel - 1].desc}</p>

            <p className="font-body text-[0.6rem] uppercase tracking-widest text-gold-400 mt-4 mb-2 flex items-center gap-1.5">
              <Sigil icon="skull" className="w-4 h-4" /> Pactos Oscuros — más riesgo, más oro
            </p>
            <div className="space-y-2">
              {PACTS.map((p) => {
                const on = pacts.includes(p.id);
                return (
                  <button key={p.id} onClick={() => togglePact(p.id)}
                    className="w-full text-left px-3 py-2 border transition-all"
                    style={{
                      background: on ? 'linear-gradient(160deg, rgba(142,21,38,0.4), rgba(92,13,24,0.4))' : 'rgba(30,23,41,0.5)',
                      borderColor: on ? 'rgba(224,47,69,0.6)' : 'rgba(168,151,122,0.2)',
                    }}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-display text-lg text-bone-100">{p.name}</span>
                      <span className="font-display text-base text-gold-400">×{p.mult}</span>
                    </span>
                    <span className="block font-body text-[0.62rem] text-bone-300/80">{p.desc}</span>
                    <span className="block font-body text-[0.55rem] uppercase tracking-widest text-blood-400 mt-0.5">{p.cost}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-center gap-3 mt-5">
              <button onClick={() => { sfx.click(); setSelLevel(null); }} className="btn-rune px-4 py-2 text-lg bg-ink-700 text-bone-300 border border-bone-500/30">Cancelar</button>
              <button onClick={() => { sfx.unlock(); onPlay(selLevel, pacts); }}
                className="btn-rune px-6 py-2 text-lg font-bold text-bone-100"
                style={{ background: 'linear-gradient(160deg, #8e1526, #5c0d18)', border: '1px solid rgba(255,77,94,0.5)', boxShadow: '0 0 18px rgba(224,47,69,0.35)' }}>
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

function SurvivalScreen({ onPlay, best }: { onPlay: () => void; best: number }) {
  return (
    <>
      <div className="relative z-10 flex items-center justify-center px-4 py-8">
        <div className="panel-dark max-w-xl w-full p-8 sm:p-10 text-center anim-zoom-in">
          <span className="text-blood-500 inline-block" style={{ filter: 'drop-shadow(0 0 12px rgba(224,47,69,0.6))' }}>
            <Sigil icon="skull" className="w-14 h-14 anim-bob" />
          </span>
          <h3 className="font-display text-4xl text-bone-100 text-glow-blood mt-3">La Horda Eterna</h3>
          <p className="font-body italic text-bone-300/80 mt-2 max-w-md mx-auto">
            «La siguiente horda ya huele la sangre.» Oleadas infinitas: tras cada victoria eliges una <b className="text-gold-400">reliquia</b> y el enemigo se vuelve más fuerte. Tu héroe sana 5 entre rondas… hasta que cae.
          </p>
          <p className="font-body text-[0.68rem] uppercase tracking-widest text-bone-500 mt-4">
            Mejor racha: <b className="text-gold-400 text-base font-display">{best}</b>
          </p>
          <button onClick={() => { sfx.unlock(); onPlay(); }}
            className="btn-rune mt-6 px-10 py-3 text-2xl font-bold text-bone-100 mx-auto"
            style={{ background: 'linear-gradient(160deg, #8e1526, #5c0d18)', border: '1px solid rgba(255,77,94,0.5)', boxShadow: '0 0 26px rgba(224,47,69,0.45)' }}>
            Entrar a la horda
          </button>
        </div>
      </div>
    </>
  );
}

/* ================= VERSUS ================= */

function VersusScreen({ onPlay }: { onPlay: (diff: number) => void }) {
  const { meta } = useMeta();
  const diffs = [
    { n: 0, name: 'Recluta', desc: 'Bandidos y lobos hambrientos. Calentamiento.', icon: 'dagger', hue: 45, reward: 30, bonus: 'Enemigos sin mejora' },
    { n: 1, name: 'Veterano', desc: 'Legiones curtidas con acero adicional.', icon: 'claw', hue: 20, reward: 60, bonus: 'Enemigos +1/+1' },
    { n: 2, name: 'Élite', desc: 'Lo peor del abismo, con energía extra.', icon: 'demon', hue: 340, reward: 100, bonus: 'Enemigos +2/+2 y +1 energía' },
  ];
  return (
    <>
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-8 grid sm:grid-cols-3 gap-5">
        {diffs.map((d, i) => (
          <button key={d.n} onClick={() => { sfx.unlock(); onPlay(d.n); }}
            className="btn-rune group text-left p-5 anim-slide-down"
            style={{
              animationDelay: `${i * 0.07}s`,
              background: `linear-gradient(160deg, hsl(${d.hue} 32% 15%) 0%, #15101d 80%)`,
              border: `1px solid hsl(${d.hue} 55% 45% / 0.5)`,
              boxShadow: '0 8px 22px rgba(0,0,0,0.5)',
            }}>
            <span className="inline-block" style={{ color: `hsl(${d.hue} 80% 60%)`, filter: `drop-shadow(0 0 8px hsl(${d.hue} 90% 55% / 0.7))` }}>
              <Sigil icon={d.icon} className="w-9 h-9" />
            </span>
            <p className="font-display text-2xl text-bone-100 group-hover:text-gold-400 transition-colors mt-2">{d.name}</p>
            <p className="font-body text-[0.7rem] text-bone-300/80 mt-1 leading-snug min-h-12">{d.desc}</p>
            <p className="font-body text-[0.6rem] uppercase tracking-widest text-bone-500 mt-2">Recompensa: <b className="text-gold-400">{d.reward} oro</b></p>
            <p className="font-body text-[0.6rem] uppercase tracking-widest mt-3" style={{ color: `hsl(${d.hue} 70% 60%)` }}>{d.bonus}</p>
          </button>
        ))}
      </div>
      <p className="relative z-10 text-center font-body text-[0.68rem] uppercase tracking-widest text-bone-500 pb-6">
        Duelos ganados: <b className="text-gold-400 font-display text-base">{meta.vsWins}</b>
      </p>
    </>
  );
}

/* ================= HUB: BATALLA ================= */

export function BattleHub({ tab, onTab, onBack, onStory, onSurvival, onVersus, best }: {
  tab: string; onTab: (t: string) => void; onBack: () => void;
  onStory: (level: number, pacts: string[]) => void; onSurvival: () => void; onVersus: (diff: number) => void; best: number;
}) {
  return (
    <TabShell title="Campos de Batalla" sub="Elige cómo quieres sangrar" onBack={onBack}
      tabs={[
        { id: 'historia', label: 'Historia', icon: 'flag' },
        { id: 'supervivencia', label: 'Supervivencia', icon: 'skull' },
        { id: 'versus', label: 'Versus', icon: 'swords' },
      ]} tab={tab} onTab={onTab}>
      {tab === 'historia' && <StoryScreen onPlay={onStory} />}
      {tab === 'supervivencia' && <SurvivalScreen onPlay={onSurvival} best={best} />}
      {tab === 'versus' && <VersusScreen onPlay={onVersus} />}
    </TabShell>
  );
}

/* ================= LOGROS ================= */

function AchievementsScreen() {
  const { meta } = useMeta();
  const unlockedCount = meta.achievements.length;
  return (
    <>
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-6">
        <p className="font-body text-[0.68rem] uppercase tracking-widest text-bone-500 mb-6">
          <b className="text-gold-400">{unlockedCount}</b> de <b className="text-bone-100">{ACHIEVEMENTS.length}</b> hazañas completadas
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {ACHIEVEMENTS.map((a, i) => {
            const done = meta.achievements.includes(a.id);
            return (
              <div key={a.id} className={`panel-dark p-4 flex items-center gap-3 anim-slide-down ${done ? '' : 'opacity-60 saturate-[0.6]'}`}
                style={{ animationDelay: `${i * 0.04}s`, borderColor: done ? `hsl(${a.hue} 60% 45% / 0.7)` : undefined }}>
                <span style={{ color: done ? `hsl(${a.hue} 80% 62%)` : '#4a4358', filter: done ? `drop-shadow(0 0 8px hsl(${a.hue} 90% 55% / 0.8))` : 'none' }}>
                  <Sigil icon={a.icon} className="w-8 h-8" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-lg leading-tight" style={{ color: done ? `hsl(${a.hue} 75% 70%)` : '#cbbda0' }}>{a.name}</p>
                  <p className="font-body text-[0.68rem] text-bone-300/80 leading-snug">{a.desc}</p>
                  <p className={`font-body text-[0.58rem] uppercase tracking-widest mt-1.5 ${done ? 'text-gold-400' : 'text-bone-500'}`}>
                    {done ? 'Completado' : 'Pendiente'} · +{a.reward} oro
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

/* ================= DESAFÍOS ================= */

function ChallengesScreen() {
  const { meta } = useMeta();
  const ch = meta.challenges;
  const dateLabel = useMemo(() => new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }), []);
  const weeklyDef = ch.weekly.id ? challengeById(ch.weekly.id) : null;
  const weeklyCounterDef = ch.weekly.id ? weeklyCounter(ch.weekly.id) : undefined;

  return (
    <>
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-6">
        <p className="font-body text-[0.68rem] uppercase tracking-widest text-bone-500 mb-1">
          Desafíos diarios · <b className="text-bone-300 capitalize">{dateLabel}</b>
        </p>
        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          {ch.daily.ids.map((id, i) => {
            const def = challengeById(id);
            const claimed = ch.daily.claimed.includes(id);
            return (
              <div key={id} className={`panel-dark p-4 text-center anim-slide-down ${claimed ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${i * 0.05}s`, borderColor: claimed ? 'rgba(157,255,87,0.5)' : `hsl(${def.hue} 50% 45% / 0.4)` }}>
                <span style={{ color: `hsl(${def.hue} 80% 62%)`, filter: `drop-shadow(0 0 8px hsl(${def.hue} 90% 55% / 0.7))` }}>
                  <Sigil icon={def.icon} className="w-8 h-8 mx-auto" />
                </span>
                <p className="font-display text-lg text-bone-100 mt-1">{def.name}</p>
                <p className="font-body text-[0.66rem] text-bone-300/80 leading-snug min-h-10">{def.desc}</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Sigil icon="coin" className="w-3.5 h-3.5 text-gold-400" />
                  <span className="font-display text-base text-gold-400">{def.reward}</span>
                </div>
                <p className={`font-body text-[0.58rem] uppercase tracking-widest mt-1 ${claimed ? 'text-venom-400' : 'text-bone-500'}`}>
                  {claimed ? 'Reclamado' : 'En curso'}
                </p>
              </div>
            );
          })}
        </div>

        <p className="font-body text-[0.68rem] uppercase tracking-widest text-bone-500 mb-1">Desafío semanal</p>
        {weeklyDef && (
          <div className={`panel-dark p-5 flex items-center gap-4 ${ch.weekly.claimed ? 'opacity-60' : ''}`}
            style={{ borderColor: ch.weekly.claimed ? 'rgba(157,255,87,0.5)' : `hsl(${weeklyDef.hue} 55% 45% / 0.6)` }}>
            <span style={{ color: `hsl(${weeklyDef.hue} 80% 62%)`, filter: `drop-shadow(0 0 10px hsl(${weeklyDef.hue} 90% 55% / 0.8))` }}>
              <Sigil icon={weeklyDef.icon} className="w-10 h-10" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-display text-2xl text-bone-100">{weeklyDef.name}</p>
              <p className="font-body text-sm text-bone-300/80">{weeklyDef.desc}</p>
              {weeklyCounterDef && (
                <div className="mt-2 h-1.5 bg-ink-950 max-w-xs">
                  <div className="hp-bar-fill h-full" style={{ width: `${Math.min(100, ((ch.weekly.counters[weeklyCounterDef.key] ?? 0) / weeklyCounterDef.need) * 100)}%`, background: `hsl(${weeklyDef.hue} 70% 50%)` }} />
                </div>
              )}
              {weeklyCounterDef && (
                <p className="font-body text-[0.58rem] uppercase tracking-widest text-bone-500 mt-1">
                  Progreso: {Math.min(ch.weekly.counters[weeklyCounterDef.key] ?? 0, weeklyCounterDef.need)}/{weeklyCounterDef.need}
                </p>
              )}
            </div>
            <div className="text-center shrink-0">
              <div className="flex items-center justify-center gap-1">
                <Sigil icon="coin" className="w-4 h-4 text-gold-400" />
                <span className="font-display text-xl text-gold-400">{weeklyDef.reward}</span>
              </div>
              <span className={`font-body text-[0.6rem] uppercase tracking-widest ${ch.weekly.claimed ? 'text-venom-400' : 'text-bone-500'}`}>
                {ch.weekly.claimed ? 'Reclamado' : 'En curso'}
              </span>
            </div>
          </div>
        )}
        <p className="font-body italic text-bone-500 text-center text-sm mt-6">Los encargos se completan solos al terminar cada batalla; el oro llega directo a tu bolsa.</p>
      </div>
    </>
  );
}

/* ================= HUB: HAZAÑAS ================= */

export function FeatsHub({ tab, onTab, onBack }: { tab: string; onTab: (t: string) => void; onBack: () => void }) {
  return (
    <TabShell title="Hazañas" sub="Lo que el reino recordará de ti" onBack={onBack}
      tabs={[
        { id: 'desafios', label: 'Desafíos', icon: 'flag' },
        { id: 'logros', label: 'Logros', icon: 'crown' },
      ]} tab={tab} onTab={onTab}>
      {tab === 'desafios' && <ChallengesScreen />}
      {tab === 'logros' && <AchievementsScreen />}
    </TabShell>
  );
}

/* ================= TIENDA ================= */

type PackKind = 'recluta' | 'guerra';

function ShopScreen() {
  const { meta, dispatch } = useMeta();
  const [err, setErr] = useState(false);
  const [opening, setOpening] = useState<{ cards: string[]; revealed: number; saved: boolean; base: Record<string, number> } | null>(null);

  const fail = () => { sfx.error(); setErr(true); setTimeout(() => setErr(false), 500); };

  /* Probabilidades nerfeadas: las cartas fuertes (épica/legendaria) son mucho más escasas. */
  const genPack = (kind: PackKind): string[] => {
    if (kind === 'recluta') {
      const third = Math.random() < 0.3 ? pick(SHOP_POOL_RARE) : pick(SHOP_POOL_COMMON);
      return [pick(SHOP_POOL_COMMON), pick(SHOP_POOL_COMMON), third];
    }
    // guerra: 1 rara garantizada + 2 slots con épica/legendaria escasas
    const slot = () => {
      const r = Math.random();
      if (r < 0.07) return pick(SHOP_POOL_LEGENDARY);
      if (r < 0.25) return pick(SHOP_POOL_EPIC);
      return pick(SHOP_POOL_RARE);
    };
    return [pick(SHOP_POOL_RARE), slot(), slot()];
  };

  const buy = (kind: PackKind) => {
    sfx.unlock();
    const cost = PACK_COST[kind];
    if (meta.gold < cost) { fail(); return; }
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

  const isDupe = (o: { cards: string[]; base: Record<string, number> }, id: string, idx: number) =>
    (o.base[id] ?? 0) + o.cards.slice(0, idx).filter((x) => x === id).length > 0;

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
        <div className="grid sm:grid-cols-2 gap-5">
          {packs.map((p, i) => (
            <div key={p.kind} className={`panel-dark p-6 text-center anim-slide-down ${err ? 'anim-shake' : ''}`}
              style={{ animationDelay: `${i * 0.06}s`, borderColor: `hsl(${p.hue} 55% 45% / 0.5)` }}>
              <span className="inline-block" style={{ color: `hsl(${p.hue} 80% 62%)`, filter: `drop-shadow(0 0 10px hsl(${p.hue} 90% 55% / 0.7))` }}>
                <Sigil icon={p.icon} className="w-12 h-12 anim-bob" />
              </span>
              <p className="font-display text-3xl text-bone-100 mt-2">{p.name}</p>
              <p className="font-body text-[0.7rem] text-bone-300/80 mt-1 min-h-10">{p.desc}</p>
              <p className="font-body text-[0.58rem] uppercase tracking-widest text-bone-500 mt-1">{p.odds}</p>
              <button onClick={() => buy(p.kind)} disabled={meta.gold < p.cost}
                className="btn-rune mt-4 px-8 py-2 text-xl font-bold text-bone-100 flex items-center gap-2 mx-auto"
                style={{ background: meta.gold >= p.cost ? 'linear-gradient(160deg, #8e6a1f, #5c430f)' : '#1e1729', border: '1px solid rgba(232,182,76,0.5)', boxShadow: meta.gold >= p.cost ? '0 0 16px rgba(232,182,76,0.3)' : 'none' }}>
                <Sigil icon="coin" className="w-5 h-5 text-gold-400" />{p.cost}
              </button>
            </div>
          ))}
        </div>
        <p className="font-body text-[0.62rem] uppercase tracking-widest text-bone-500 text-center mt-6">
          Cartas repetidas → oro: común 15 · rara 30 · épica 55 · legendaria 100
        </p>
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

function CollectionScreen() {
  const { meta } = useMeta();
  const deckSize = Object.values(meta.collection).reduce((a, b) => a + b, 0);
  const sorted = [...PLAYER_CARDS].sort((a, b) => a.cost - b.cost);
  return (
    <>
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <p className="font-body text-[0.68rem] uppercase tracking-widest text-bone-500">
            En batalla se usan <b className="text-bone-100">20 cartas</b>: tu mazo de la Forja, o un barajado de tu colección ({deckSize} copias)
          </p>
          <div className="flex items-center gap-2">
            {(Object.keys(RARITY_COLOR) as (keyof typeof RARITY_COLOR)[]).map((r) => (
              <span key={r} className="flex items-center gap-1 font-body text-[0.58rem] uppercase tracking-widest" style={{ color: RARITY_COLOR[r] }}>
                <span className="w-2 h-2 rotate-45 inline-block" style={{ background: RARITY_COLOR[r] }} />{r}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          {sorted.map((c, i) => {
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

/* ================= FORJA (armador de mazo) ================= */

function DeckScreen() {
  const { meta, dispatch } = useMeta();
  const [draft, setDraft] = useState<string[]>(meta.deck);
  const [toast, setToast] = useState(false);

  const owned = PLAYER_CARDS.filter((c) => (meta.collection[c.id] ?? 0) > 0)
    .sort((a, b) => a.cost - b.cost);
  const countOf = (id: string) => draft.filter((x) => x === id).length;
  const full = draft.length >= 20;

  const add = (id: string) => {
    sfx.click();
    if (full || countOf(id) >= Math.min(3, meta.collection[id] ?? 0)) { sfx.error(); return; }
    setDraft([...draft, id]);
  };
  const remove = (id: string) => {
    sfx.click();
    const i = draft.lastIndexOf(id);
    if (i >= 0) setDraft([...draft.slice(0, i), ...draft.slice(i + 1)]);
  };
  const curve = [1, 2, 3, 4, 5, 6, 7].map((c) => ({
    c, n: draft.filter((id) => (c === 7 ? cardById(id).cost >= 7 : cardById(id).cost === c)).length,
  }));
  const maxCurve = Math.max(1, ...curve.map((x) => x.n));

  return (
    <>
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-6 grid lg:grid-cols-[1fr_21rem] gap-6 items-start">
        <div className="panel-dark p-4">
          <SectionTitle icon="cards" title="Tu colección" sub="Clic para añadir (máx. 3 copias)" />
          <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-2">
            {owned.map((c) => {
              const inDeck = countOf(c.id);
              const ownedN = meta.collection[c.id] ?? 0;
              const atCap = inDeck >= Math.min(3, ownedN);
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
                  <span className={`font-body text-[0.6rem] uppercase ${atCap && inDeck > 0 ? 'text-gold-400' : 'text-bone-500'}`}>{inDeck}/{Math.min(3, ownedN)}</span>
                  {inDeck > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); remove(c.id); }}
                      className="shrink-0 w-6 h-6 flex items-center justify-center font-display text-lg leading-none text-bone-300 hover:text-blood-400 border border-bone-500/30 hover:border-blood-500/60 transition-colors"
                      title="Quitar una copia">−</button>
                  )}
                </div>
              );
            })}
            {owned.length === 0 && <p className="font-body text-sm text-bone-500 text-center py-8">Aún no tienes cartas. Visita el Mercado.</p>}
          </div>
        </div>

        <div className="panel-dark p-4 lg:sticky lg:top-4">
          <SectionTitle icon="helm" title="Mazo de guerra" sub={`${draft.length}/20 cartas`} />
          <div className="flex items-end gap-1 h-16 mb-4">
            {curve.map((c) => (
              <div key={c.c} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full bg-ink-950 flex items-end" style={{ height: '3.2rem' }}>
                  <div className="w-full hp-bar-fill" style={{ height: `${(c.n / maxCurve) * 100}%`, background: 'linear-gradient(180deg, #ffd76a, #8e6a1f)' }} />
                </div>
                <span className="font-body text-[0.55rem] text-bone-500">{c.c === 7 ? '7+' : c.c}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 max-h-56 overflow-y-auto mb-4">
            {draft.map((id, i) => {
              const c = cardById(id);
              return (
                <button key={`${id}-${i}`} onClick={() => remove(id)} title={c.name}
                  className="px-1.5 py-0.5 font-body text-[0.6rem] uppercase border"
                  style={{ borderColor: `${RARITY_COLOR[c.rarity]}66`, color: RARITY_COLOR[c.rarity], background: 'rgba(13,10,18,0.6)' }}>
                  {c.cost}·{c.name.split(' ')[0]}
                </button>
              );
            })}
            {draft.length === 0 && <p className="font-body text-[0.68rem] text-bone-500">Vacío: en batalla se barajará tu colección.</p>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => { sfx.click(); setDraft([]); }} className="btn-rune px-2 py-1.5 text-sm bg-ink-700 text-bone-300 border border-bone-500/30">Vaciar</button>
            <button onClick={() => {
              sfx.click();
              const pool: string[] = [];
              owned.forEach((c) => { for (let i = 0; i < Math.min(3, meta.collection[c.id] ?? 0); i++) pool.push(c.id); });
              const d: string[] = [];
              const copy = [...pool];
              while (d.length < 20 && copy.length > 0) d.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
              if (d.length < 20) { sfx.error(); return; }
              setDraft(d);
            }} className="btn-rune px-2 py-1.5 text-sm bg-ink-700 text-bone-300 border border-bone-500/30">Al azar</button>
            <button onClick={() => {
              sfx.coin();
              dispatch({ type: 'setDeck', deck: draft });
              setToast(true); setTimeout(() => setToast(false), 1600);
            }} disabled={draft.length !== 20 && draft.length !== 0}
              className="btn-rune px-2 py-1.5 text-sm font-bold text-bone-100"
              style={{ background: (draft.length === 20 || draft.length === 0) ? 'linear-gradient(160deg, #8e1526, #5c0d18)' : '#1e1729', border: '1px solid rgba(255,77,94,0.5)' }}>
              Guardar
            </button>
          </div>
          {meta.deck.length === 20 && (
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

/* ================= HUB: ARSENAL ================= */

export function ArsenalHub({ tab, onTab, onBack }: { tab: string; onTab: (t: string) => void; onBack: () => void }) {
  return (
    <TabShell title="El Arsenal" sub="Tu acero, tus reglas" onBack={onBack}
      tabs={[
        { id: 'forja', label: 'Forja', icon: 'helm' },
        { id: 'coleccion', label: 'Colección', icon: 'cards' },
      ]} tab={tab} onTab={onTab}>
      {tab === 'forja' && <DeckScreen />}
      {tab === 'coleccion' && <CollectionScreen />}
    </TabShell>
  );
}

/* ================= EL ABISMO (premium) ================= */

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

function PremiumScreen() {
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
    sfx.epic();
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
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-10">
        {/* OFERTA DIARIA */}
        <section className="anim-slide-down">
          <SectionTitle icon="bag" title="Oferta Diaria" sub="Un cargamento al día, ni uno más" />
          <div className={`panel-dark p-6 sm:p-8 text-center relative overflow-hidden ${err ? 'anim-shake' : ''}`} style={{ borderColor: 'rgba(255,215,106,0.5)' }}>
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
          <SectionTitle icon="crown" title="Marcos de Carta" sub="Puro estilo, cero ventaja. La rareza sigue mandando el borde" />
          {seasonLeft > 0 && (
            <p className="font-body text-center text-[0.62rem] uppercase tracking-widest text-blood-400 mb-5 -mt-2">
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
        <div className="fixed inset-0 z-50 bg-ink-950/92 flex items-center justify-center p-4">
          <div className="text-center anim-zoom-in">
            <p className="font-display text-4xl text-gold-400 text-glow-gold anim-slide-down">La caravana era tuya</p>
            <p className="font-body text-sm text-bone-300/80 mt-2 anim-slide-down" style={{ animationDelay: '0.05s' }}>
              +{DAILY_OFFER.gold} de oro · entre la paja brillaba…
            </p>
            <div className="mt-5 flex justify-center anim-slide-down" style={{ animationDelay: '0.35s' }}>
              <CardView card={cardById(caravan)} size="shop" />
            </div>
            <button onClick={() => { sfx.coin(); setCaravan(null); }}
              className="btn-rune mt-6 px-8 py-2.5 text-xl font-bold text-bone-100 anim-slide-down"
              style={{ animationDelay: '0.5s', background: 'linear-gradient(160deg, #8e6a1f, #5c430f)', border: '1px solid rgba(232,182,76,0.5)', boxShadow: '0 0 18px rgba(232,182,76,0.35)' }}>
              Reclamar botín
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= HUB: MERCADO ================= */

export function MarketHub({ tab, onTab, onBack }: { tab: string; onTab: (t: string) => void; onBack: () => void }) {
  return (
    <TabShell title="El Mercado" sub="Oro y gemas, sangre y vanidad" onBack={onBack}
      tabs={[
        { id: 'mercader', label: 'Mercader', icon: 'bag' },
        { id: 'abismo', label: 'El Abismo', icon: 'gem' },
      ]} tab={tab} onTab={onTab}>
      {tab === 'mercader' && <ShopScreen />}
      {tab === 'abismo' && <PremiumScreen />}
    </TabShell>
  );
}

/* ================= SELECTOR DE RELIQUIAS ================= */

export function RelicPicker({ options, held, onPick }: {
  options: RelicDef[];
  held: string[];
  onPick: (id: string | null) => void;
}) {
  return (
    <div className="fixed inset-0 z-[55] bg-ink-950/94 flex items-center justify-center p-4">
      <div className="text-center max-w-3xl w-full anim-zoom-in">
        <p className="font-body text-[0.62rem] uppercase tracking-[0.3em] text-blood-400">La horda se reagrupa</p>
        <h3 className="font-display text-4xl text-gold-400 text-glow-gold mt-1">Elige una reliquia</h3>
        <p className="font-body text-sm text-bone-300/80 mt-1">Te acompañará el resto de la cacería.</p>
        <div className="flex justify-center gap-4 flex-wrap mt-6">
          {options.map((r, i) => (
            <button key={r.id} onClick={() => { sfx.epic(); onPick(r.id); }}
              className="btn-rune panel-dark w-48 p-5 text-center anim-slide-down hover:scale-105 transition-transform"
              style={{ animationDelay: `${i * 0.1}s`, borderColor: `hsl(${r.hue} 55% 45% / 0.6)` }}>
              <span className="inline-block anim-bob" style={{ color: `hsl(${r.hue} 80% 62%)`, filter: `drop-shadow(0 0 10px hsl(${r.hue} 90% 55% / 0.7))` }}>
                <Sigil icon={r.icon} className="w-10 h-10" />
              </span>
              <p className="font-display text-xl text-bone-100 mt-2 leading-tight">{r.name}</p>
              <p className="font-body text-[0.68rem] text-bone-300/80 mt-1 min-h-10">{r.desc}</p>
            </button>
          ))}
        </div>
        {held.length > 0 && (
          <div className="flex justify-center items-center gap-2 mt-5 flex-wrap">
            <span className="font-body text-[0.6rem] uppercase tracking-widest text-bone-500">Portas:</span>
            {held.map((id) => (
              <span key={id} className="text-gold-400" title={relicById(id).name}>
                <Sigil icon={RELIC_LOOKUP[id] ?? 'gem'} className="w-5 h-5" />
              </span>
            ))}
          </div>
        )}
        <button onClick={() => { sfx.click(); onPick(null); }}
          className="btn-rune mt-6 px-6 py-2 text-lg bg-ink-700 text-bone-300 border border-bone-500/30">
          Seguir sin reliquia
        </button>
      </div>
    </div>
  );
}
