import type { CardDef, Rarity } from './types';

const u = (
  id: string, name: string, side: CardDef['side'], cost: number,
  atk: number, hp: number, rarity: Rarity, icon: string, hue: number,
  tags: string[], text: string, quote?: string,
  extra?: Partial<CardDef>,
): CardDef => ({
  id, name, side, kind: 'unit', cost, atk, hp, def: extra?.def ?? 0, rarity, icon, hue,
  text: extra?.def ? `${text} · Defensa ${extra.def}` : text, quote, tags,
  vamp: extra?.vamp, ranged: extra?.ranged, onPlay: extra?.onPlay,
});

const s = (
  id: string, name: string, side: CardDef['side'], cost: number,
  rarity: Rarity, icon: string, hue: number, tags: string[],
  spell: NonNullable<CardDef['spell']>, text: string, quote?: string,
): CardDef => ({ id, name, side, kind: 'spell', cost, rarity, icon, hue, tags, spell, text, quote });

/* ================= CARTAS DEL JUGADOR ================= */

export const PLAYER_CARDS: CardDef[] = [
  // ---- Humanos ----
  u('p_escudero', 'Escudero Errante', 'player', 1, 2, 2, 'común', 'sword', 36,
    ['humanos'], 'Un soldado sin señor, fiel solo a su acero.', '«El camino es largo; la espada, corta.»'),
  u('p_cazadora', 'Cazadora de Bestias', 'player', 2, 3, 2, 'común', 'bow', 96,
    ['humanos'], 'Rastrea a la presa hasta el último latido.', '«Si sangra, puede morir.»', { ranged: true }),
  u('p_soldado', 'Soldado del Alba', 'player', 2, 2, 4, 'común', 'shield', 210,
    ['humanos'], 'Muro de hierro entre el reino y la noche.', '«Ni un paso atrás.»'),
  u('p_caballero', 'Caballero de Hierro', 'player', 3, 3, 4, 'rara', 'helm', 220,
    ['humanos'], 'Su armadura guarda las marcas de cien batallas.', undefined, { def: 1 }),
  u('p_verdugo', 'Verdugo Real', 'player', 5, 6, 4, 'rara', 'axe', 0,
    ['humanos'], 'El hacha no pregunta; el verdugo tampoco.', '«Que hable el filo.»'),
  u('p_capitana', 'Capitana Valeria', 'player', 4, 4, 3, 'épica', 'banner', 46,
    ['humanos'], 'Grito de batalla: tus otras unidades ganan +1 de ATK.', '«¡Conmigo, al alba!»',
    { onPlay: { kind: 'buffOtherAtk', amount: 1 } }),
  u('p_paladin', 'Paladín del Alba', 'player', 4, 4, 4, 'épica', 'sun', 48,
    ['humanos'], 'Grito de batalla: cura 4 a tu héroe.', '«La luz no se rinde.»',
    { onPlay: { kind: 'healHero', amount: 4 } }),

  // ---- Elfos ----
  u('p_arquero', 'Arquero del Bosque', 'player', 2, 2, 3, 'rara', 'bow', 130,
    ['elfos'], 'Grito de batalla: 2 de daño a una unidad enemiga al azar.', '«El bosque siempre ve.»',
    { onPlay: { kind: 'damageRandom', amount: 2 }, ranged: true }),
  u('p_elfalunar', 'Elfa Lunar', 'player', 3, 3, 3, 'épica', 'moon', 260,
    ['elfos'], 'Grito de batalla: congela 1 ronda a la unidad enemiga con más ATK.', '«Duerme bajo la luna pálida.»',
    { onPlay: { kind: 'freezeRandom', amount: 1 }, ranged: true }),
  u('p_guardabosques', 'Guardabosques Élfico', 'player', 4, 4, 5, 'rara', 'leaf', 140,
    ['elfos'], 'Centinela de los claros quemados.', '«Cada ceniza fue una hoja.»'),

  // ---- Semihumanos ----
  u('p_gatuna', 'Gatuna Sombría', 'player', 1, 1, 2, 'común', 'paw', 300,
    ['semihumanos'], 'Grito de batalla: roba 1 carta.', '«Nueve vidas, un solo trato.»',
    { onPlay: { kind: 'draw', amount: 1 } }),
  u('p_cuerno', 'Semihumano Astado', 'player', 3, 4, 3, 'común', 'horn', 24,
    ['semihumanos'], 'Embiste primero, piensa después.', '«Mis cuernos no perdonan.»'),
  u('p_licia', 'Licia Colmillo Veloz', 'player', 3, 4, 2, 'rara', 'fang', 340,
    ['semihumanos'], 'Medio loba, toda tormenta.', '«La manada me enseñó a morder.»'),

  // ---- Enanos ----
  u('p_minero', 'Minero Rúnico', 'player', 2, 2, 3, 'común', 'gem', 190,
    ['enanos'], 'Las runas susurran bajo la piedra.', '«Oro o sangre: ambos brillan.»'),
  u('p_herrero', 'Herrero de Guerra', 'player', 3, 2, 5, 'rara', 'hammer', 30,
    ['enanos'], 'Grito de batalla: tus otras unidades ganan +1 de Defensa.', '«El yunque no miente.»',
    { onPlay: { kind: 'buffAllDef', amount: 1 } }),
  u('p_rompecraneos', 'Rompecráneos', 'player', 4, 3, 6, 'épica', 'hammer', 12,
    ['enanos'], 'Su martillo fue forjado con campanas fundidas.', undefined, { def: 2 }),

  // ---- Hechizos: pociones e ítems ----
  s('p_fuego1', 'Poción de Fuego', 'player', 1, 'común', 'flask', 18,
    ['pociones'], { school: 'fire', amount: 2, target: 'enemyAny' },
    '2 de daño a una unidad enemiga o al héroe enemigo. Ignora la armadura.', '«Arde incluso mojada.»'),
  s('p_fuego2', 'Poción de Fuego Mayor', 'player', 3, 'rara', 'flask', 8,
    ['pociones'], { school: 'fire', amount: 5, target: 'enemyAny' },
    '5 de daño a una unidad enemiga o al héroe enemigo. Ignora la armadura.', '«Vidrio soplado con aliento de dragón.»'),
  s('p_hielo', 'Poción de Hielo', 'player', 2, 'rara', 'ice', 195,
    ['pociones'], { school: 'ice', amount: 2, amount2: 1, target: 'enemyUnits' },
    '2 de daño (ignora armadura) a una unidad enemiga y la congela 1 ronda.', '«El invierno en un corcho.»'),
  s('p_veneno', 'Veneno de Víbora', 'player', 2, 'común', 'skull', 100,
    ['pociones'], { school: 'poison', amount: 2, amount2: 3, target: 'enemyUnits' },
    'Envenena a una unidad enemiga: 2 de daño al fin de cada ronda (3 rondas). Ignora armadura.', '«Una gota basta.»'),
  s('p_vida', 'Poción de Vida', 'player', 2, 'común', 'heart', 350,
    ['pociones'], { school: 'heal', amount: 4, target: 'allyAny' },
    'Cura 4 a una unidad aliada o a tu héroe.', '«Sabe a cobre y a esperanza.»'),
  s('p_elixir', 'Elixir de Sangre', 'player', 4, 'rara', 'heart', 335,
    ['pociones'], { school: 'heal', amount: 7, target: 'allyAny' },
    'Cura 7 a una unidad aliada o a tu héroe.', '«Robado a un alquimista vampiro.»'),

  // ---- Hechizos: mejoras y apoyo ----
  s('p_furia', 'Piedra de Furia', 'player', 2, 'común', 'up', 20,
    ['mejoras'], { school: 'buffAtk', amount: 2, target: 'allyUnit' },
    'Una unidad aliada gana +2 de ATK permanente.', '«La ira también se talla.»'),
  s('p_runa', 'Escudo Rúnico', 'player', 2, 'común', 'shield', 215,
    ['mejoras'], { school: 'buffDef', amount: 2, target: 'allyUnit' },
    'Una unidad aliada gana +2 de Armadura.', '«Runas viejas, muros nuevos.»'),
  s('p_roble', 'Corazón de Roble', 'player', 3, 'común', 'heart', 140,
    ['mejoras'], { school: 'buffHp', amount: 3, target: 'allyUnit' },
    'Una unidad aliada gana +3 de Vida (y se cura 3).', '«Raíces en vez de costillas.»'),
  s('p_grito', 'Grito de Guerra', 'player', 3, 'rara', 'banner', 40,
    ['apoyo'], { school: 'teamBuff', amount: 1, target: 'allAllies' },
    'Todas tus unidades ganan +1 de ATK y +1 de Vida.', '«¡Por los caídos!»'),
  s('p_lluvia', 'Lluvia de Fuego', 'player', 5, 'épica', 'flask', 14,
    ['apoyo'], { school: 'aoe', amount: 2, target: 'allEnemyUnits' },
    '2 de daño a TODAS las unidades enemigas. Ignora la armadura.', '«El cielo también odia.»'),
];

/* ================= CARTAS ENEMIGAS (IA) ================= */

export const ENEMY_CARDS: CardDef[] = [
  // ---- Bandidos y desertores ----
  u('e_bandido1', 'Bandido Novato', 'enemy', 1, 2, 1, 'común', 'dagger', 40, ['bandidos'], 'Un cuchillo oxidado y nada que perder.'),
  u('e_bandido2', 'Emboscador del Camino', 'enemy', 2, 3, 2, 'común', 'dagger', 55, ['bandidos'], 'Ataca donde el bosque es más oscuro.'),
  u('e_jefe', 'Jefe Bandido Garfio', 'enemy', 4, 5, 3, 'rara', 'skull', 48, ['bandidos'], 'Cada cicatriz, un peaje cobrado.'),
  u('e_desertor', 'Desertor del Reino', 'enemy', 2, 2, 3, 'común', 'bannerBroken', 220, ['desertores'], 'Cambió el juramento por la supervivencia.'),
  u('e_traidor', 'Traidor Juramentado', 'enemy', 4, 4, 4, 'rara', 'bannerBroken', 250, ['desertores'], 'Conoce las formaciones del alba mejor que nadie.'),

  // ---- Lobos y bestias ----
  u('e_lobo', 'Lobo Común', 'enemy', 1, 2, 2, 'común', 'wolf', 210, ['lobos'], 'Huele el miedo a tres leguas.'),
  u('e_alfa', 'Lobo Alfa', 'enemy', 3, 4, 3, 'rara', 'wolf', 230, ['lobos'], 'La manada se mueve como un solo colmillo.'),
  u('e_lobog', 'Lobo Gigante', 'enemy', 5, 6, 5, 'épica', 'wolf', 200, ['lobos'], 'Sus aullidos apagan las hogueras.'),
  u('e_bestia', 'Hombre Bestia', 'enemy', 3, 4, 4, 'común', 'claw', 30, ['bestias'], 'Mitad hombre, todo garra.'),
  u('e_bruto', 'Bruto Bestial', 'enemy', 5, 6, 4, 'rara', 'claw', 15, ['bestias'], 'Rompe escudos con los nudillos.'),
  u('e_lican', 'Licántropo de la Luna Roja', 'enemy', 4, 5, 3, 'épica', 'moonFang', 265, ['hombreslobo'], 'Vampirismo: el daño que inflige lo cura.', undefined, { vamp: true }),

  // ---- Elfos oscuros ----
  u('e_elfaoscura', 'Elfa Oscura', 'enemy', 3, 3, 3, 'común', 'moon', 280, ['elfososcuros'], 'Grito de batalla: 2 de daño a una unidad tuya al azar.', undefined, { onPlay: { kind: 'damageRandom', amount: 2 } }),
  u('e_asesina', 'Asesina Umbría', 'enemy', 4, 4, 2, 'rara', 'dagger', 290, ['elfososcuros'], 'Grito de batalla: congela 1 ronda a tu unidad con más ATK.', undefined, { onPlay: { kind: 'freezeRandom', amount: 1 } }),

  // ---- Gigantes ----
  u('e_gigante', 'Gigante de Piedra', 'enemy', 6, 5, 8, 'épica', 'fist', 30, ['gigantes'], 'La montaña aprendió a caminar.', undefined, { def: 2 }),
  u('e_giganteA', 'Gigante Ancestral', 'enemy', 7, 7, 9, 'legendaria', 'fist', 20, ['gigantes'], 'Los reinos caen como hojas.', undefined, { def: 2 }),

  // ---- Serpientes (cuerpo a cuerpo: muerden y tragan) ----
  u('e_serp1', 'Serpiente Pequeña', 'enemy', 1, 1, 1, 'común', 'snake', 110, ['serpientes'], 'Rápida como un latigazo; su mordida adormece.'),
  u('e_serp2', 'Serpiente Gigante', 'enemy', 5, 5, 6, 'rara', 'snake', 95, ['serpientes'], 'Traga guerreros con armadura y todo.'),

  // ---- Vampiros ----
  u('e_vampiro', 'Vampiro Menor', 'enemy', 3, 3, 3, 'rara', 'bat', 320, ['vampiros'], 'Vampirismo: el daño que inflige lo cura.', undefined, { vamp: true }),
  u('e_lord', 'Lord Vampiro Strahd', 'enemy', 6, 5, 5, 'legendaria', 'bat', 335, ['vampiros'], 'Vampirismo. La noche tiene dueño.', undefined, { vamp: true }),

  // ---- Sirenas ----
  u('e_sirena', 'Sirena del Abismo', 'enemy', 3, 2, 4, 'común', 'wave', 190, ['sirenas'], 'Su canto arrastra a los marineros al fondo.'),
  u('e_cantora', 'Cantora de las Mareas', 'enemy', 4, 3, 5, 'rara', 'wave', 175, ['sirenas'], 'Grito de batalla: 2 de daño a una unidad tuya al azar.', undefined, { onPlay: { kind: 'damageRandom', amount: 2 }, ranged: true }),

  // ---- Demonios ----
  u('e_diablillo', 'Diablillo', 'enemy', 2, 2, 2, 'común', 'imp', 350, ['demonios'], 'Escupe fuego vil desde lejos.', undefined, { ranged: true }),
  u('e_demonio', 'Demonio Mayor', 'enemy', 6, 6, 6, 'épica', 'demon', 355, ['demonios'], 'Cada jerarquía se gana con sangre.'),
  u('e_arqui', 'Archidemonio del Vacío', 'enemy', 7, 7, 7, 'legendaria', 'demon', 300, ['demonios'], 'Grito de batalla: 2 de daño a TODAS tus unidades.', undefined, { onPlay: { kind: 'aoe', amount: 2 }, ranged: true }),

  // ---- Aves gigantes ----
  u('e_ave', 'Ave de Presa Gigante', 'enemy', 4, 4, 4, 'común', 'feather', 45, ['aves'], 'Sus garras parten yelmos como nueces.'),
  u('e_roc', 'Roc Sombrío', 'enemy', 6, 6, 5, 'épica', 'feather', 270, ['aves'], 'Su sombra anuncia la tormenta.'),

  // ---- Dragón ----
  u('e_dragon', 'Dragón de Ceniza Vharkar', 'enemy', 7, 7, 8, 'legendaria', 'dragon', 10, ['dragones'], 'Grito de batalla: 2 de daño a TODAS tus unidades.', '«Todo reino es yesca.»', { def: 1, onPlay: { kind: 'aoe', amount: 2 } }),

  // ---- Hechizos enemigos ----
  s('e_aullido', 'Aullido de Manada', 'enemy', 2, 'común', 'wolf', 230, ['lobos'], { school: 'buffAtk', amount: 2, target: 'allyUnit' }, 'Una unidad enemiga gana +2 de ATK.'),
  s('e_piel', 'Piel de Piedra', 'enemy', 2, 'común', 'shield', 30, ['gigantes'], { school: 'buffDef', amount: 2, target: 'allyUnit' }, 'Una unidad enemiga gana +2 de Armadura.'),
  s('e_mordida', 'Mordida Infecta', 'enemy', 2, 'común', 'skull', 100, ['serpientes'], { school: 'poison', amount: 2, amount2: 3, target: 'enemyUnits' }, 'Envenena a una de tus unidades: 2 de daño por ronda (3 rondas).'),
  s('e_vil', 'Bola de Fuego Vil', 'enemy', 3, 'rara', 'flask', 320, ['demonios'], { school: 'fire', amount: 4, target: 'enemyAny' }, '4 de daño a una unidad tuya o a tu héroe. Ignora armadura.'),
  s('e_fria', 'Sangre Fría', 'enemy', 2, 'común', 'heart', 200, ['vampiros'], { school: 'heal', amount: 4, target: 'allyAny' }, 'Cura 4 a una unidad enemiga o a su héroe.'),
];

/* ================= ÍNDICES Y MAZOS ================= */

export const ALL_CARDS: Record<string, CardDef> = Object.fromEntries(
  [...PLAYER_CARDS, ...ENEMY_CARDS].map((c) => [c.id, c]),
);

export const cardById = (id: string): CardDef => ALL_CARDS[id];

export const RARITY_COLOR: Record<Rarity, string> = {
  'común': '#a8977a',
  'rara': '#35c8e8',
  'épica': '#b065ff',
  'legendaria': '#ffd76a',
};

export const RARITY_ORDER: Record<Rarity, number> = { 'común': 0, 'rara': 1, 'épica': 2, 'legendaria': 3 };

const D = (ids: string[]) => ids.map(cardById);
void D;

export interface StoryLevel {
  n: number;
  title: string;
  place: string;
  desc: string;
  hero: string;
  heroIcon: string;
  hue: number;
  deck: string[];
  bonus: number;
  reward: number;
}

export const STORY_LEVELS: StoryLevel[] = [
  {
    n: 1, title: 'Campamento de Bandidos', place: 'Camino del Norte',
    desc: 'Una banda de salteadores corta la ruta de los mercaderes. Limpia el camino.',
    hero: 'Garfio el Tuerto', heroIcon: 'dagger', hue: 45,
    deck: ['e_bandido1','e_bandido1','e_bandido2','e_bandido2','e_lobo','e_lobo','e_desertor','e_desertor','e_jefe','e_aullido','e_mordida','e_vil','e_bandido1','e_lobo','e_bandido2','e_desertor'],
    bonus: 0, reward: 55,
  },
  {
    n: 2, title: 'Bosque Aullante', place: 'Linde de Grauvale',
    desc: 'Los lobos bajan de las colinas hambrientos, y algo silba entre la maleza.',
    hero: 'Colmillo Gris', heroIcon: 'wolf', hue: 215,
    deck: ['e_lobo','e_lobo','e_lobo','e_alfa','e_alfa','e_serp1','e_serp1','e_serp2','e_bestia','e_aullido','e_aullido','e_mordida','e_lobo','e_alfa','e_serp1','e_bestia'],
    bonus: 0, reward: 65,
  },
  {
    n: 3, title: 'Horda Bestial', place: 'Páramos Rojos',
    desc: 'Hombres bestia y desertores marchan juntos bajo una luna enferma.',
    hero: 'Urzak, Capataz', heroIcon: 'claw', hue: 25,
    deck: ['e_bestia','e_bestia','e_bruto','e_alfa','e_lobo','e_lobo','e_desertor','e_traidor','e_bandido2','e_aullido','e_piel','e_vil','e_bestia','e_bruto','e_traidor','e_alfa'],
    bonus: 1, reward: 75,
  },
  {
    n: 4, title: 'Elfos de la Sombra', place: 'Ruinas de Sylhaven',
    desc: 'Los elfos oscuros reclaman las ruinas quemadas. Sus dagas no perdonan.',
    hero: 'Vhaerys Umbría', heroIcon: 'moon', hue: 285,
    deck: ['e_elfaoscura','e_elfaoscura','e_asesina','e_asesina','e_desertor','e_traidor','e_serp1','e_serp2','e_vampiro','e_vil','e_mordida','e_aullido','e_elfaoscura','e_asesina','e_traidor','e_vampiro'],
    bonus: 1, reward: 90,
  },
  {
    n: 5, title: 'Costa de las Sirenas', place: 'Bahía del Naufragio',
    desc: 'Cantos desde la niebla. Los barcos no vuelven; los marineros tampoco.',
    hero: 'Nerethia', heroIcon: 'wave', hue: 185,
    deck: ['e_sirena','e_sirena','e_cantora','e_cantora','e_serp1','e_serp2','e_serp2','e_vampiro','e_lobo','e_fria','e_mordida','e_vil','e_sirena','e_cantora','e_serp2','e_vampiro'],
    bonus: 2, reward: 100,
  },
  {
    n: 6, title: 'Nido del Roc', place: 'Picos Quebrados',
    desc: 'Aves del tamaño de torres anidan entre los picos. Licántropos cazan abajo.',
    hero: 'Kharzun, el Nido', heroIcon: 'feather', hue: 50,
    deck: ['e_ave','e_ave','e_roc','e_lican','e_lican','e_alfa','e_lobog','e_bandido2','e_jefe','e_aullido','e_piel','e_vil','e_ave','e_roc','e_lican','e_lobog'],
    bonus: 2, reward: 110,
  },
  {
    n: 7, title: 'Legión Demoníaca', place: 'La Grieta',
    desc: 'La jerarquía del abismo marcha en columna: diablillos primero, horrores detrás.',
    hero: 'Malphas', heroIcon: 'demon', hue: 345,
    deck: ['e_diablillo','e_diablillo','e_diablillo','e_demonio','e_arqui','e_desertor','e_traidor','e_lican','e_vampiro','e_vil','e_vil','e_piel','e_diablillo','e_demonio','e_traidor','e_vampiro'],
    bonus: 3, reward: 130,
  },
  {
    n: 8, title: 'Trono del Dragón', place: 'Caldera de Vharkar',
    desc: 'Sobre un trono de escoria espera Vharkar. El reino entero cabe en su boca.',
    hero: 'Vharkar, Dragón de Ceniza', heroIcon: 'dragon', hue: 12,
    deck: ['e_dragon','e_demonio','e_lican','e_lobog','e_roc','e_vampiro','e_lord','e_arqui','e_traidor','e_vil','e_aullido','e_piel','e_demonio','e_lican','e_lord','e_roc'],
    bonus: 3, reward: 170,
  },
];

export const survivalDeck = (n: number): string[] => {
  const base = STORY_LEVELS[Math.min(n, 8) - 1].deck;
  const extra = n > 8 ? ['e_dragon','e_arqui','e_lord','e_giganteA'] : [];
  return [...base, ...extra.slice(0, Math.min(extra.length, n - 8))];
};

export const vsDeck = (diff: number): { deck: string[]; bonus: number; energy: number } => {
  const pools = [
    STORY_LEVELS[Math.floor(Math.random() * 3)].deck,
    STORY_LEVELS[3 + Math.floor(Math.random() * 3)].deck,
    STORY_LEVELS[5 + Math.floor(Math.random() * 3)].deck,
  ];
  return { deck: pools[diff], bonus: diff, energy: diff >= 2 ? 1 : 0 };
};

export const STARTER_COLLECTION: Record<string, number> = {
  p_escudero: 2, p_cazadora: 2, p_soldado: 2, p_gatuna: 2, p_cuerno: 1,
  p_minero: 2, p_arquero: 1, p_licia: 1, p_caballero: 1, p_rompecraneos: 1,
  p_fuego1: 2, p_hielo: 1, p_veneno: 2, p_vida: 2, p_furia: 1, p_runa: 1, p_roble: 1,
};

export const SHOP_POOL_COMMON = PLAYER_CARDS.filter((c) => c.rarity === 'común').map((c) => c.id);
export const SHOP_POOL_RARE = PLAYER_CARDS.filter((c) => c.rarity === 'rara').map((c) => c.id);
export const SHOP_POOL_EPIC = PLAYER_CARDS.filter((c) => c.rarity === 'épica' || c.rarity === 'legendaria').map((c) => c.id);

/* ---------- economía ---------- */

export const PACK_COST = { recluta: 150, guerra: 320 } as const;

export const DUPE_GOLD: Record<Rarity, number> = {
  'común': 15, 'rara': 30, 'épica': 55, 'legendaria': 100,
};
