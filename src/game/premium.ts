import type { DiamondPackDef, FrameDef } from './types';

/* ================= MARCOS DE CARTA (cosméticos) =================
   Cosmético puro: no alteran estadísticas. Solo cambian el aspecto
   de tus cartas en batalla, colección y sobres. */

export const FRAMES: FrameDef[] = [
  { id: 'frame_sangre', name: 'Sello de Sangre', desc: 'Un marco carmesí que late con la furia del combate. Tus cartas se ven oscuras y hambrientas.', price: 300, icon: 'heart', accent: '#e02f45', glow: 'rgba(224,47,69,0.65)', anim: 'none' },
  { id: 'frame_oro', name: 'Oro de Medianoche', desc: 'Oro viejo sobre negro absoluto. Para quien ya lo ganó todo y quiere que se note.', price: 300, icon: 'coin', accent: '#ffd76a', glow: 'rgba(255,215,106,0.6)', anim: 'none' },
  { id: 'frame_hielo', name: 'Escarcha Eterna', desc: 'Un filo de hielo que nunca se derrite. Sereno, letal, hermoso.', price: 300, icon: 'ice', accent: '#6fe8ff', glow: 'rgba(111,232,255,0.6)', anim: 'frost' },
  { id: 'frame_abismo', name: 'Demonio del Abismo', desc: 'Llamas vivas lamen el borde de cada carta. Solo existe mientras dure la temporada.', price: 450, icon: 'demon', accent: '#ff8c3b', glow: 'rgba(255,140,59,0.85)', anim: 'flames', limited: true },
  { id: 'frame_ceniza', name: 'Ceniza Inmortal', desc: 'Brasas que nunca se apagan, como el rencor de un reino caído. Marco de temporada.', price: 450, icon: 'fire', accent: '#c22536', glow: 'rgba(194,37,54,0.8)', anim: 'embers', limited: true },
];

export const frameById = (id: string | null): FrameDef | undefined =>
  id ? FRAMES.find((f) => f.id === id) : undefined;

/* ================= PAQUETES DE DIAMANTES =================
   Bonificación por volumen: nunca se vende al precio justo. */

export const DIAMOND_PACKS: DiamondPackDef[] = [
  { id: 'pack_rata', name: 'Rata de Alcantarilla', diamonds: 100, bonus: 0, priceUSD: '$0.99', icon: 'dagger', hue: 210 },
  { id: 'pack_mercenario', name: 'Mercenario', diamonds: 550, bonus: 50, priceUSD: '$4.99', icon: 'sword', hue: 40, tag: 'Más popular' },
  { id: 'pack_senior', name: 'Señor de la Guerra', diamonds: 1200, bonus: 200, priceUSD: '$9.99', icon: 'axe', hue: 0, tag: 'Mejor valor' },
  { id: 'pack_heraldo', name: 'Heraldo del Abismo', diamonds: 3500, bonus: 700, priceUSD: '$24.99', icon: 'demon', hue: 285 },
  { id: 'pack_horda', name: 'La Horda Eterna', diamonds: 7500, bonus: 1700, priceUSD: '$49.99', icon: 'dragon', hue: 345, tag: 'Para leyendas' },
];

/* ================= OFERTA DIARIA =================
   No vendemos "oro": vendemos una caravana limitada con reloj. */

export const DAILY_OFFER = {
  diamonds: 500,
  gold: 1000,
  bonusCard: true,        // +1 carta rara o mejor
  name: 'Caravana de Suministros',
  desc: 'Un cargamento oscuro interceptado en el camino. Oro, y algo que brilla entre la paja.',
} as const;

/* Días que dura una "temporada" de marcos limitados (FOMO). */
export const SEASON_DAYS = 3;
