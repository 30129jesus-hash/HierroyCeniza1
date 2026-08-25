import type { CardDef } from '../game/types';
import { RARITY_COLOR, RARITY_GLOW, RARITY_HALO, RARITY_WIDTH } from '../game/cards';
import { Sigil, RuneRing } from './icons';
import { useMeta } from '../state/store';
import { frameById } from '../game/premium';

interface Props {
  card: CardDef;
  size?: 'hand' | 'shop' | 'tiny';
  playable?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  count?: number;
  onClick?: () => void;
}

const SCHOOL_ICON: Record<string, string> = {
  fire: 'fire', ice: 'ice', poison: 'skull', heal: 'heart',
  buffAtk: 'up', buffDef: 'shield', buffHp: 'heart', aoe: 'fire', teamBuff: 'banner',
};

export default function CardView({ card, size = 'hand', playable = true, selected = false, dimmed = false, count, onClick }: Props) {
  const { meta } = useMeta();
  const frame = frameById(meta.activeFrame);
  // La rareza SIEMPRE manda el borde y el brillo: es lo primero que ve el jugador.
  const rarC = RARITY_COLOR[card.rarity];
  const rarGlow = RARITY_GLOW[card.rarity];
  const rarHalo = RARITY_HALO[card.rarity];
  const rarW = RARITY_WIDTH[card.rarity];
  const legendary = card.rarity === 'legendaria';
  const frameAnim = frame?.anim && frame.anim !== 'none' ? `anim-frame-${frame.anim}` : '';
  const isUnit = card.kind === 'unit';
  const w = size === 'shop' ? 'w-40 h-56' : size === 'tiny' ? 'w-24 h-32' : 'w-[7.2rem] h-[10.2rem] sm:w-32 sm:h-44';

  // drop-shadow se pinta sobre la silueta recortada: el halo de rareza se ve por fuera del clip-path
  const dimFilter = dimmed || !playable ? ' saturate(0.35) brightness(0.55)' : '';
  const glowFilter = rarHalo > 0 && !dimmed && playable ? `drop-shadow(0 0 ${rarHalo}px ${rarGlow})` : '';

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`${w} relative shrink-0 text-left no-select transition-transform duration-150 ${onClick ? 'cursor-pointer' : 'cursor-default'} ${selected ? '-translate-y-4 scale-105 z-30' : ''}`}
      style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)', filter: `${glowFilter}${dimFilter}`.trim() || undefined }}
      aria-label={card.name}
    >
      {/* halo del marco cosmético equipado (capa exterior, no pisa la rareza) */}
      {frame && (
        <div className={`absolute inset-0 pointer-events-none z-20 ${frameAnim}`}
          style={{ border: `1px solid ${frame.accent}`, boxShadow: `inset 0 0 12px ${frame.glow}`, opacity: 0.95 }} />
      )}
      {/* marco: borde = rareza */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(170deg, hsl(${card.hue} 28% ${card.rarity === 'común' ? 14 : 17}%) 0%, #0d0a12 70%)`,
          border: `${rarW}px solid ${selected ? '#ffd76a' : rarC}`,
          boxShadow: selected
            ? `inset 0 0 22px rgba(255,215,106,0.35), inset 0 0 18px rgba(0,0,0,0.8)`
            : `0 6px 18px rgba(0,0,0,0.6), inset 0 0 14px rgba(0,0,0,0.65), inset 0 0 ${rarHalo > 0 ? 10 : 0}px ${rarGlow}`,
        }}
      />
      {/* brillo de legendaria */}
      {legendary && <div className="absolute inset-0 pointer-events-none anim-sheen z-10" />}
      {/* costo */}
      <div className="absolute -top-0.5 -left-0.5 z-10 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)', background: 'linear-gradient(135deg, #2b2138, #15101d)', borderBottom: '1px solid rgba(168,151,122,0.4)', borderRight: '1px solid rgba(168,151,122,0.4)' }}>
        <span className="font-display font-bold text-lg sm:text-xl" style={{ color: playable ? '#6fe8ff' : '#a8977a', textShadow: '0 0 8px rgba(111,232,255,0.5)' }}>{card.cost}</span>
      </div>

      {/* arte: imagen real (si existe) o sigilo sobre círculo rúnico */}
      <div className="absolute inset-x-2 top-6 sm:top-7 bottom-[38%] flex items-center justify-center overflow-hidden"
        style={{ background: `radial-gradient(80% 80% at 50% 45%, hsl(${card.hue} 65% 22% / 0.9), hsl(${card.hue} 40% 8% / 0.95) 75%)`, border: `1px solid ${rarC}44` }}>
        {card.art ? (
          <>
            <img src={card.art} alt={card.name} draggable={false} loading="lazy"
              className="absolute inset-0 w-full h-full object-cover" />
            {/* viñeta + tinte: el nombre y la rareza siguen leyéndose sobre la imagen */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: `linear-gradient(180deg, hsl(${card.hue} 50% 12% / 0.18) 0%, rgba(13,10,18,0) 42%, hsl(${card.hue} 42% 6% / 0.82) 100%)`, boxShadow: 'inset 0 0 16px rgba(0,0,0,0.5)' }} />
          </>
        ) : (
          <>
            <div className="absolute inset-0 flex items-center justify-center" style={{ color: `hsl(${card.hue} 80% 65% / 0.35)` }}>
              <RuneRing className="w-[130%] h-[130%]" />
            </div>
            <div className="relative anim-bob" style={{ color: `hsl(${card.hue} 85% 68%)`, filter: `drop-shadow(0 0 8px hsl(${card.hue} 90% 55% / 0.7))` }}>
              <Sigil icon={isUnit ? card.icon : (SCHOOL_ICON[card.spell?.school ?? 'fire'] ?? 'flask')} className={size === 'tiny' ? 'w-8 h-8' : 'w-10 h-10 sm:w-12 sm:h-12'} />
            </div>
          </>
        )}
        {card.ranged && isUnit && (
          <div className="absolute top-0.5 left-1 text-gold-400" title="A distancia: puede atacar al héroe">
            <Sigil icon="bow" className="w-3 h-3" />
          </div>
        )}
        <div className="absolute bottom-0.5 right-1 w-1.5 h-1.5 rotate-45" style={{ background: rarC, boxShadow: `0 0 6px ${rarC}` }} />
        {count !== undefined && count > 1 && (
          <div className="absolute top-0.5 right-1 font-display text-xs text-bone-300 bg-ink-900/80 px-1 leading-tight">×{count}</div>
        )}
      </div>

      {/* nombre */}
      <div className="absolute inset-x-1 bottom-[30%] text-center leading-none">
        <span className="font-display font-semibold text-[0.68rem] sm:text-[0.78rem] text-bone-100" style={{ textShadow: '0 1px 2px #000' }}>
          {card.name}
        </span>
      </div>

      {/* texto */}
      <div className="absolute inset-x-1.5 bottom-6 sm:bottom-7 top-[72%] overflow-hidden">
        <p className="font-body text-[0.5rem] sm:text-[0.58rem] leading-[1.15] text-bone-300/90">{card.text}</p>
      </div>

      {/* stats */}
      {isUnit ? (
        <div className="absolute bottom-0.5 inset-x-1 flex items-center justify-center gap-1.5">
          <span className="flex items-center gap-0.5 font-display font-bold text-[0.8rem] sm:text-base" style={{ color: '#ff8c3b' }}>
            <Sigil icon="sword" className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{card.atk}
          </span>
          {(card.def ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 font-display font-bold text-[0.8rem] sm:text-base" style={{ color: '#6fe8ff' }}>
              <Sigil icon="shield" className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{card.def}
            </span>
          )}
          <span className="flex items-center gap-0.5 font-display font-bold text-[0.8rem] sm:text-base" style={{ color: '#ff4d5e' }}>
            <Sigil icon="heart" className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{card.hp}
          </span>
        </div>
      ) : (
        <div className="absolute bottom-0.5 inset-x-1 text-center font-display text-[0.6rem] tracking-widest uppercase" style={{ color: rarC }}>
          {card.spell?.school === 'heal' ? 'Apoyo' : card.spell?.school.startsWith('buff') || card.spell?.school === 'teamBuff' ? 'Mejora' : 'Ítem'}
        </div>
      )}
    </button>
  );
}
