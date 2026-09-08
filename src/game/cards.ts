import type { AchDef, CardDef, PactDef, Rarity, RelicDef } from './types';

/* ============ ARTE REAL DE CARTAS (opcional) ============
   Convención: coloca el archivo en public/cards/{id}.png y añade su id a
   WITH_ART (o pasa art: true / art: '/cards/ruta.jpg' por carta).
   Las cartas sin arte siguen usando su sigilo procedural: nada se rompe. */
const WITH_ART: string[] = [
  // p. ej.: 'p_cazadora', 'e_lican',
];

export const cardArtUrl = (id: string): string => `/cards/${id}.png`;

const resolveArt = (id: string, opt?: boolean | string): string | undefined => {
  if (typeof opt === 'string') return opt;
  return opt === true || WITH_ART.includes(id) ? cardArtUrl(id) : undefined;
};

const u = (
  id: string, name: string, side: CardDef['side'], cost: number,
  atk: number, hp: number, rarity: Rarity, icon: string, hue: number,
  tags: string[], text: string, quote?: string,
  extra?: Partial<Omit<CardDef, 'art'>> & { art?: boolean | string },
): CardDef => ({
  id, name, side, kind: 'unit', cost, atk, hp, def: extra?.def ?? 0, rarity, icon, hue,
  text: extra?.def ? `${text} · Defensa ${extra.def}` : text, quote, tags,
  vamp: extra?.vamp, ranged: extra?.ranged, taunt: extra?.taunt, pierce: extra?.pierce,
  swift: extra?.swift, thorns: extra?.thorns,
  poisonAtk: extra?.poisonAtk, freezeAtk: extra?.freezeAtk, onDeath: extra?.onDeath,
  onPlay: extra?.onPlay,
  art: resolveArt(id, extra?.art),
});

const s = (
  id: string, name: string, side: CardDef['side'], cost: number,
  rarity: Rarity, icon: string, hue: number, tags: string[],
  spell: NonNullable<CardDef['spell']>, text: string, quote?: string,
  art?: boolean | string,
): CardDef => ({ id, name, side, kind: 'spell', cost, rarity, icon, hue, tags, spell, text, quote, art: resolveArt(id, art) });

/* ================= CARTAS DEL JUGADOR ================= */

export const PLAYER_CARDS: CardDef[] = [
  // ---- Humanos ----
  u('p_escudero', 'Escudero Errante', 'player', 1, 2, 2, 'común', 'sword', 36,
    ['humanos'], 'Un soldado sin señor, fiel solo a su acero.', '«El camino es largo; la espada, corta.»'),
  u('p_cazadora', 'Cazadora de Bestias', 'player', 2, 3, 2, 'común', 'bow', 96,
    ['humanos'], 'Rastrea a la presa hasta el último latido.', '«Si sangra, puede morir.»', { ranged: true }),
  u('p_soldado', 'Soldado del Alba', 'player', 2, 2, 4, 'común', 'shield', 210,
    ['humanos'], 'Provocación: los enemigos deben atacarlo primero.', '«Ni un paso atrás.»',
    { taunt: true, art: 'https://image.qwenlm.ai/generated-images/0bde4cb7-13ed-460b-b5e0-af1c09923ebc/_result.png' }),
  u('p_caballero', 'Caballero de Hierro', 'player', 3, 3, 4, 'rara', 'helm', 220,
    ['humanos'], 'Provocación: deben atacarlo primero. Cien batallas en su armadura.', undefined, { def: 1, taunt: true }),
  u('p_verdugo', 'Verdugo Real', 'player', 5, 6, 4, 'rara', 'axe', 0,
    ['humanos'], 'Perforación: sus golpes ignoran la armadura.', '«Que hable el filo.»', { pierce: true }),
  u('p_capitana', 'Capitana Valeria', 'player', 4, 4, 3, 'épica', 'banner', 46,
    ['humanos'], 'Grito de batalla: tus otras unidades ganan +1 de ATK.', '«¡Conmigo, al alba!»',
    { onPlay: { kind: 'buffOtherAtk', amount: 1 } }),
  u('p_paladin', 'Paladín del Alba', 'player', 4, 4, 4, 'épica', 'sun', 48,
    ['humanos'], 'Grito de batalla: cura 4 a tu héroe.', '«La luz no se rinde.»',
    { onPlay: { kind: 'healHero', amount: 4 } }),

  // ---- Elfos ----
  u('p_arquero', 'Arquero del Bosque', 'player', 2, 2, 3, 'rara', 'bow', 130,
    ['elfos'], 'Disparo Certero: 2 de daño a una unidad enemiga al azar.', '«El bosque siempre ve.»',
    { onPlay: { kind: 'damageRandom', amount: 2 }, ranged: true }),
  u('p_elfalunar', 'Elfa Lunar', 'player', 3, 3, 3, 'épica', 'moon', 260,
    ['elfos'], 'Grito de batalla: congela 1 ronda a la unidad enemiga con más ATK.', '«Duerme bajo la luna pálida.»',
    { onPlay: { kind: 'freezeRandom', amount: 1 }, ranged: true, art: 'https://image.qwenlm.ai/generated-images/6d89809d-362c-4742-a0d6-cf6cc50882e7/_result.png' }),
  u('p_guardabosques', 'Guardabosques Élfico', 'player', 4, 4, 5, 'rara', 'leaf', 140,
    ['elfos'], 'A distancia: vigila los claros quemados y puede atacar al héroe.', '«Cada ceniza fue una hoja.»',
    { ranged: true }),

  // ---- Semihumanos ----
  u('p_gatuna', 'Gatuna Sombría', 'player', 1, 1, 2, 'común', 'paw', 300,
    ['semihumanos'], 'Grito de batalla: roba 1 carta.', '«Nueve vidas, un solo trato.»',
    { onPlay: { kind: 'draw', amount: 1 } }),
  u('p_cuerno', 'Semihumano Astado', 'player', 3, 4, 3, 'común', 'horn', 24,
    ['semihumanos'], 'Embiste primero, piensa después.', '«Mis cuernos no perdonan.»'),
  u('p_licia', 'Licia Colmillo Veloz', 'player', 3, 4, 2, 'rara', 'fang', 340,
    ['semihumanos'], 'Veloz: ataca la misma ronda en que se despliega.', '«La manada me enseñó a morder.»', { swift: true }),

  // ---- Enanos ----
  u('p_minero', 'Minero Rúnico', 'player', 2, 2, 3, 'común', 'gem', 190,
    ['enanos'], 'Las runas susurran bajo la piedra.', '«Oro o sangre: ambos brillan.»'),
  u('p_herrero', 'Herrero de Guerra', 'player', 3, 2, 5, 'rara', 'hammer', 30,
    ['enanos'], 'Grito de batalla: tus otras unidades ganan +1 de Defensa.', '«El yunque no miente.»',
    { onPlay: { kind: 'buffAllDef', amount: 1 } }),
  u('p_rompecraneos', 'Rompecráneos', 'player', 4, 3, 6, 'épica', 'hammer', 12,
    ['enanos'], 'Espinas 1: quien lo ataque sufre 1 de daño. Forjado con campanas fundidas.', undefined, { def: 2, thorns: 1 }),

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
  s('p_grito', 'Grito de los Caídos', 'player', 3, 'rara', 'banner', 40,
    ['apoyo'], { school: 'teamBuff', amount: 1, target: 'allAllies' },
    'Todas tus unidades ganan +1 de ATK y +1 de Vida.', '«¡Por los caídos!»'),
  s('p_lluvia', 'Lluvia de Fuego', 'player', 5, 'épica', 'flask', 14,
    ['apoyo'], { school: 'aoe', amount: 2, target: 'allEnemyUnits' },
    '2 de daño a TODAS las unidades enemigas. Ignora la armadura.', '«El cielo también odia.»'),

  // ---- Cartas especiales ----
  s('p_ceniza', 'Lluvia de Cenizas', 'player', 4, 'épica', 'fire', 14,
    ['apoyo'], { school: 'ashRain', amount: 3, amount2: 1, target: 'allEnemyUnits' },
    '3 de daño de fuego a TODAS las unidades enemigas y 1 al héroe enemigo. Ignora la armadura.', '«Lo que arde, vuelve.»'),
  u('p_cadaver', 'Cadáver Renacido', 'player', 1, 1, 1, 'común', 'skull', 100,
    ['nomuerto'], 'Al morir: envenena 2 a la unidad que lo mató.', '«La muerte es solo el principio.»',
    { onDeath: { kind: 'poisonKiller', amount: 2 } }),
  s('p_escudoespinas', 'Escudo de Espinas', 'player', 3, 'rara', 'shield', 215,
    ['mejoras'], { school: 'spikeShield', amount: 3, amount2: 2, target: 'allyUnit' },
    'Una unidad aliada gana +3 de Armadura y +2 de Espinas. Solo uno por unidad.', '«Tócame y sangra.»'),
  s('p_flechadestino', 'Flecha del Destino', 'player', 5, 'épica', 'bow', 260,
    ['apoyo'], { school: 'destinyArrow', amount: 4, amount2: 8, target: 'enemyHero' },
    '4 de daño al héroe enemigo. Si le quedan 10 de vida o menos, inflige 8 en su lugar.', '«El hilo ya está cortado.»'),
  s('p_dagasombras', 'Daga de las Sombras', 'player', 1, 'común', 'dagger', 290,
    ['mejoras'], { school: 'shadowDagger', amount: 3, target: 'allyUnit' },
    'Una unidad aliada gana +3 de ATK hasta el final de la ronda.', '«Un filo que no existe.»'),
  s('p_gritoveloz', 'Grito de Guerra', 'player', 4, 'épica', 'banner', 40,
    ['apoyo'], { school: 'warCry', amount: 1, target: 'allAllies' },
    'Todas tus unidades ganan Veloz y +1 de ATK. Atacan por sorpresa.', '«¡AHORA!»'),
  s('p_pergamino', 'Pergamino Prohibido', 'player', 2, 'común', 'book', 280,
    ['apoyo'], { school: 'forbidden', amount: 2, amount2: 2, target: 'allAllies' },
    'Roba 2 cartas. Tu héroe recibe 2 de daño.', '«El conocimiento cuesta sangre.»'),
  u('p_golem', 'Golem de Púrpura', 'player', 5, 4, 6, 'épica', 'fist', 275,
    ['constructos'], 'Al morir: invoca dos Esqueletos 1/1 en las líneas adyacentes.', '«La piedra recuerda.»',
    { onDeath: { kind: 'summonSkeletons', amount: 2 } }),
  u('p_familiar', 'Familiar Atado', 'player', 1, 0, 3, 'común', 'paw', 320,
    ['espiritus'], 'Provocación. Al morir: cura 5 a tu héroe.', '«Su último acto es protegerte.»',
    { taunt: true, onDeath: { kind: 'healHero', amount: 5 } }),
];

/* ================= CARTAS ENEMIGAS (IA) ================= */

export const ENEMY_CARDS: CardDef[] = [
  // ---- Bandidos y desertores ----
  u('e_bandido1', 'Bandido Novato', 'enemy', 1, 2, 1, 'común', 'dagger', 40, ['bandidos'], 'Un cuchillo oxidado y nada que perder.'),
  u('e_bandido2', 'Emboscador del Camino', 'enemy', 2, 3, 2, 'común', 'dagger', 55, ['bandidos'], 'Ataca donde el bosque es más oscuro.'),
  u('e_jefe', 'Jefe Bandido Garfio', 'enemy', 4, 5, 3, 'rara', 'skull', 48, ['bandidos'], 'Cada cicatriz, un peaje cobrado.'),
  u('e_desertor', 'Desertor del Reino', 'enemy', 2, 2, 3, 'común', 'bannerBroken', 220, ['desertores'], 'Provocación: debes atacarlo primero. Cambió el juramento por sobrevivir.', undefined, { taunt: true }),
  u('e_traidor', 'Traidor Juramentado', 'enemy', 4, 4, 4, 'rara', 'bannerBroken', 250, ['desertores'], 'Conoce las formaciones del alba mejor que nadie.'),

  // ---- Lobos y bestias ----
  u('e_lobo', 'Lobo Común', 'enemy', 1, 2, 2, 'común', 'wolf', 210, ['lobos'], 'Huele el miedo a tres leguas.'),
  u('e_alfa', 'Lobo Alfa', 'enemy', 3, 4, 3, 'rara', 'wolf', 230, ['lobos'], 'La manada se mueve como un solo colmillo.'),
  u('e_lobog', 'Lobo Gigante', 'enemy', 5, 6, 5, 'épica', 'wolf', 200, ['lobos'], 'Sus aullidos apagan las hogueras.'),
  u('e_bestia', 'Hombre Bestia', 'enemy', 3, 4, 4, 'común', 'claw', 30, ['bestias'], 'Mitad hombre, todo garra.'),
  u('e_bruto', 'Bruto Bestial', 'enemy', 5, 6, 4, 'rara', 'claw', 15, ['bestias'], 'Rompe escudos con los nudillos.'),
  u('e_lican', 'Licántropo de la Luna Roja', 'enemy', 4, 5, 3, 'épica', 'moonFang', 265, ['hombreslobo'], 'Veloz y vampirismo: ataca al desplegarse y drena vida.', undefined,
    { vamp: true, swift: true, art: 'https://image.qwenlm.ai/generated-images/3950c76e-7128-4f14-a7b8-0d86f0dd68d9/_result.png' }),

  // ---- Elfos oscuros ----
  u('e_elfaoscura', 'Elfa Oscura', 'enemy', 3, 3, 3, 'común', 'moon', 280, ['elfososcuros'], 'Grito de batalla: 2 de daño a una unidad tuya al azar.', undefined, { onPlay: { kind: 'damageRandom', amount: 2 } }),
  u('e_asesina', 'Asesina Umbría', 'enemy', 4, 4, 2, 'rara', 'dagger', 290, ['elfososcuros'], 'Perforación: ignora la armadura. Grito: congela 1 ronda a tu unidad con más ATK.', undefined, { onPlay: { kind: 'freezeRandom', amount: 1 }, pierce: true }),

  // ---- Gigantes ----
  u('e_gigante', 'Gigante de Piedra', 'enemy', 6, 5, 8, 'épica', 'fist', 30, ['gigantes'], 'Provocación: debes atacarlo primero. La montaña aprendió a caminar.', undefined,
    { def: 2, taunt: true, art: 'https://image.qwenlm.ai/generated-images/2bda5f17-9c5c-4927-a588-0b26b1f7b371/_result.png' }),
  u('e_giganteA', 'Gigante Ancestral', 'enemy', 7, 7, 9, 'legendaria', 'fist', 20, ['gigantes'], 'Espinas 1 y armadura. Los reinos caen como hojas.', undefined, { def: 2, thorns: 1 }),

  // ---- Serpientes (cuerpo a cuerpo: muerden y tragan) ----
  u('e_serp1', 'Serpiente Pequeña', 'enemy', 1, 1, 1, 'común', 'snake', 110, ['serpientes'], 'Rápida como un latigazo; su mordida adormece.'),
  u('e_serp2', 'Serpiente Gigante', 'enemy', 5, 5, 6, 'rara', 'snake', 95, ['serpientes'], 'Traga guerreros con armadura y todo.'),

  // ---- Vampiros ----
  u('e_vampiro', 'Vampiro Menor', 'enemy', 3, 3, 3, 'rara', 'bat', 320, ['vampiros'], 'Vampirismo: el daño que inflige lo cura.', undefined, { vamp: true }),
  u('e_lord', 'Lord Vampiro Strahd', 'enemy', 6, 5, 5, 'legendaria', 'bat', 335, ['vampiros'], 'Vampirismo. La noche tiene dueño.', undefined,
    { vamp: true, art: 'https://image.qwenlm.ai/generated-images/41cb17c7-c1e0-4c8c-891d-e2131ce1a633/_result.png' }),

  // ---- Sirenas ----
  u('e_sirena', 'Sirena del Abismo', 'enemy', 3, 2, 4, 'común', 'wave', 190, ['sirenas'], 'Su canto arrastra a los marineros al fondo.'),
  u('e_cantora', 'Cantora de las Mareas', 'enemy', 4, 3, 5, 'rara', 'wave', 175, ['sirenas'], 'Grito de batalla: 2 de daño a una unidad tuya al azar.', undefined, { onPlay: { kind: 'damageRandom', amount: 2 }, ranged: true }),

  // ---- Demonios ----
  u('e_diablillo', 'Diablillo', 'enemy', 2, 2, 2, 'común', 'imp', 350, ['demonios'], 'Escupe fuego vil desde lejos.', undefined, { ranged: true }),
  u('e_demonio', 'Demonio Mayor', 'enemy', 6, 6, 6, 'épica', 'demon', 355, ['demonios'], 'Cada jerarquía se gana con sangre.'),
  u('e_arqui', 'Archidemonio del Vacío', 'enemy', 7, 7, 7, 'legendaria', 'demon', 300, ['demonios'], 'Grito de batalla: 2 de daño a TODAS tus unidades.', undefined, { onPlay: { kind: 'aoe', amount: 2 }, ranged: true }),

  // ---- Aves gigantes ----
  u('e_ave', 'Ave de Presa Gigante', 'enemy', 4, 4, 4, 'común', 'feather', 45, ['aves'], 'Veloz: cae en picado la misma ronda en que llega.', undefined, { swift: true }),
  u('e_roc', 'Roc Sombrío', 'enemy', 6, 6, 5, 'épica', 'feather', 270, ['aves'], 'Su sombra anuncia la tormenta.'),

  // ---- Dragón ----
  u('e_dragon', 'Dragón de Ceniza Vharkar', 'enemy', 7, 7, 8, 'legendaria', 'dragon', 10, ['dragones'], 'Grito de batalla: 2 de daño a TODAS tus unidades.', '«Todo reino es yesca.»',
    { def: 1, onPlay: { kind: 'aoe', amount: 2 }, art: 'https://image.qwenlm.ai/generated-images/34cb9b41-2c44-4acd-a569-46f2f7ade790/_result.png' }),

  // ---- Hechizos enemigos ----
  s('e_aullido', 'Aullido de Manada', 'enemy', 2, 'común', 'wolf', 230, ['lobos'], { school: 'buffAtk', amount: 2, target: 'allyUnit' }, 'Una unidad enemiga gana +2 de ATK.'),
  s('e_piel', 'Piel de Piedra', 'enemy', 2, 'común', 'shield', 30, ['gigantes'], { school: 'buffDef', amount: 2, target: 'allyUnit' }, 'Una unidad enemiga gana +2 de Armadura.'),
  s('e_mordida', 'Mordida Infecta', 'enemy', 2, 'común', 'skull', 100, ['serpientes'], { school: 'poison', amount: 2, amount2: 3, target: 'enemyUnits' }, 'Envenena a una de tus unidades: 2 de daño por ronda (3 rondas).'),
  s('e_vil', 'Bola de Fuego Vil', 'enemy', 3, 'rara', 'flask', 320, ['demonios'], { school: 'fire', amount: 4, target: 'enemyAny' }, '4 de daño a una unidad tuya o a tu héroe. Ignora armadura.'),
  s('e_fria', 'Sangre Fría', 'enemy', 2, 'común', 'heart', 200, ['vampiros'], { school: 'heal', amount: 4, target: 'allyAny' }, 'Cura 4 a una unidad enemiga o a su héroe.'),

  // ---- Criaturas especiales (solo IA) ----
  u('e_parasito', 'Parásito de Almas', 'enemy', 5, 3, 5, 'épica', 'bat', 285, ['espiritus'],
    'A distancia y vampirismo: drena a tu héroe desde lejos.', '«Se alimenta de lo que más quieres.»',
    { ranged: true, vamp: true }),
  u('e_grifo', 'Grifo de las Tormentas', 'enemy', 4, 5, 2, 'rara', 'feather', 210, ['aves'],
    'Veloz y perforación: cae en picado ignorando la armadura.', '«El cielo ruge primero.»',
    { swift: true, pierce: true }),
  u('e_tejedor', 'Tejedor Carnicero', 'enemy', 5, 3, 7, 'épica', 'skull', 100, ['bestias'],
    'Provocación, espinas 2 y veneno al morder. Una trampa de ocho patas.', undefined,
    { taunt: true, thorns: 2, poisonAtk: 2 }),
  u('e_serpiente_petr', 'Serpiente Petrificante', 'enemy', 6, 4, 6, 'épica', 'snake', 130, ['serpientes'],
    'Su mirada congela y su veneno remata: envenena 3 y petrifica al impactar.', undefined,
    { poisonAtk: 3, freezeAtk: true }),

  // ---- Versiones enemigas de cartas duales ----
  u('e_cadaver', 'Cadáver Renacido', 'enemy', 1, 1, 1, 'común', 'skull', 100, ['nomuerto'],
    'Al morir: envenena 2 a la unidad que lo mató.', undefined,
    { onDeath: { kind: 'poisonKiller', amount: 2 } }),
  s('e_dagasombras', 'Daga de las Sombras', 'enemy', 1, 'común', 'dagger', 290, ['mejoras'],
    { school: 'shadowDagger', amount: 3, target: 'allyUnit' }, 'Una unidad enemiga gana +3 de ATK hasta el final de la ronda.'),
  u('e_golem', 'Golem de Púrpura', 'enemy', 5, 4, 6, 'épica', 'fist', 275, ['constructos'],
    'Al morir: invoca dos Esqueletos 1/1 en las líneas adyacentes.', undefined,
    { onDeath: { kind: 'summonSkeletons', amount: 2 } }),
  s('e_gritoabismo', 'Grito del Abismo', 'enemy', 4, 'épica', 'demon', 300, ['demonios'],
    { school: 'warCry', amount: 1, target: 'allAllies' }, 'Todas las unidades enemigas ganan Veloz y +1 de ATK.'),
];

/* ================= ÍNDICES Y MAZOS ================= */

export const ALL_CARDS: Record<string, CardDef> = Object.fromEntries(
  [...PLAYER_CARDS, ...ENEMY_CARDS].map((c) => [c.id, c]),
);

export const cardById = (id: string): CardDef => ALL_CARDS[id];

export const RARITY_COLOR: Record<Rarity, string> = {
  'común': '#a8a3b3',
  'rara': '#3ec9ff',
  'épica': '#b065ff',
  'legendaria': '#ffd76a',
};

export const RARITY_GLOW: Record<Rarity, string> = {
  'común': 'rgba(168,163,179,0)',
  'rara': 'rgba(62,201,255,0.55)',
  'épica': 'rgba(176,101,255,0.6)',
  'legendaria': 'rgba(255,215,106,0.65)',
};

export const RARITY_WIDTH: Record<Rarity, number> = {
  'común': 1, 'rara': 1.5, 'épica': 2, 'legendaria': 2,
};

export const RARITY_HALO: Record<Rarity, number> = {
  'común': 0, 'rara': 11, 'épica': 15, 'legendaria': 19,
};

export const RARITY_ORDER: Record<Rarity, number> = { 'común': 0, 'rara': 1, 'épica': 2, 'legendaria': 3 };

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
    deck: ['e_lobo','e_lobo','e_lobo','e_alfa','e_alfa','e_serp1','e_serp1','e_serp2','e_serpiente_petr','e_bestia','e_aullido','e_aullido','e_mordida','e_lobo','e_alfa','e_serp1','e_bestia','e_serpiente_petr'],
    bonus: 0, reward: 65,
  },
  {
    n: 3, title: 'Horda Bestial', place: 'Páramos Rojos',
    desc: 'Hombres bestia y desertores marchan juntos bajo una luna enferma.',
    hero: 'Urzak, Capataz', heroIcon: 'claw', hue: 25,
    deck: ['e_bestia','e_bestia','e_bruto','e_tejedor','e_alfa','e_lobo','e_lobo','e_desertor','e_traidor','e_bandido2','e_cadaver','e_aullido','e_piel','e_vil','e_bestia','e_bruto','e_traidor','e_tejedor'],
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
  p_cadaver: 1, p_dagasombras: 1, p_familiar: 1,
};

export const SHOP_POOL_COMMON = PLAYER_CARDS.filter((c) => c.rarity === 'común').map((c) => c.id);
export const SHOP_POOL_RARE = PLAYER_CARDS.filter((c) => c.rarity === 'rara').map((c) => c.id);
export const SHOP_POOL_EPIC = PLAYER_CARDS.filter((c) => c.rarity === 'épica').map((c) => c.id);
export const SHOP_POOL_LEGENDARY = PLAYER_CARDS.filter((c) => c.rarity === 'legendaria').map((c) => c.id);

export const PACK_COST = { recluta: 150, guerra: 320 };

export const DUPE_GOLD: Record<Rarity, number> = {
  'común': 15, 'rara': 30, 'épica': 55, 'legendaria': 100,
};

/* ================= RELIQUIAS (Supervivencia) ================= */

export const RELICS: RelicDef[] = [
  { id: 'rel_poder', name: 'Ídolo del Poder', desc: '+1 de energía máxima en cada ronda.', icon: 'gem', hue: 48 },
  { id: 'rel_muralla', name: 'Talismán de la Muralla', desc: 'Tus unidades ganan +1 de Armadura al desplegarse.', icon: 'shield', hue: 210 },
  { id: 'rel_estandarte', name: 'Estandarte de Guerra', desc: 'Tus unidades ganan +1 de ATK al desplegarse.', icon: 'banner', hue: 16 },
  { id: 'rel_vida', name: 'Pacto de Sangre', desc: 'Tus unidades ganan +2 de Vida al desplegarse.', icon: 'heart', hue: 345 },
  { id: 'rel_fuente', name: 'Fuente Sanadora', desc: 'Tu héroe recupera 2 de vida al fin de cada ronda.', icon: 'wave', hue: 175 },
  { id: 'rel_amuleto', name: 'Amuleto Rúnico', desc: 'Tu héroe recibe 1 menos de daño (mínimo 1).', icon: 'moon', hue: 265 },
  { id: 'rel_sabiduria', name: 'Ojo del Cuervo', desc: 'Robas 1 carta extra al inicio de cada ronda.', icon: 'feather', hue: 96 },
  { id: 'rel_bolsa', name: 'Bolsa del Mercenario', desc: '+5 de oro extra por cada victoria.', icon: 'coin', hue: 40 },
];

export const relicById = (id: string): RelicDef => RELICS.find((r) => r.id === id)!;

export const RELIC_PRICE = 150;

export const RELIC_LOOKUP: Record<string, string> = Object.fromEntries(RELICS.map((r) => [r.id, r.icon]));

/* Elige `count` reliquias que aún no portas; las del relicario tienen prioridad. */
export function randomRelicOptions(held: string[], count = 3, favorites: string[] = []): RelicDef[] {
  const pool = RELICS.filter((r) => !held.includes(r.id));
  const favs = pool.filter((r) => favorites.includes(r.id));
  const rest = pool.filter((r) => !favorites.includes(r.id));
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  for (let i = favs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [favs[i], favs[j]] = [favs[j], favs[i]];
  }
  return [...favs, ...rest].slice(0, count);
}

/* ================= PACTOS OSCUROS (Historia) ================= */

export const PACTS: PactDef[] = [
  { id: 'pacto_sangre', name: 'Sello de Sangre', desc: 'Empiezas con 15 de vida en vez de 25.', cost: '-10 vida', mult: 2, icon: 'heart' },
  { id: 'pacto_ceniza', name: 'Juramento de Ceniza', desc: 'Las unidades enemigas ganan +1/+1.', cost: 'Enemigos +1/+1', mult: 1.75, icon: 'fire' },
  { id: 'pacto_hambre', name: 'Pacto del Hambre', desc: 'El enemigo gana +1 de energía cada ronda.', cost: '+1 energía enemiga', mult: 2.5, icon: 'skull' },
];

export const pactById = (id: string): PactDef => PACTS.find((p) => p.id === id)!;

/* ================= LOGROS ================= */

export const ACHIEVEMENTS: AchDef[] = [
  { id: 'ach_primera', name: 'Primera Sangre', desc: 'Gana tu primera batalla.', icon: 'dagger', hue: 0, reward: 30 },
  { id: 'ach_ileso', name: 'Muralla Intacta', desc: 'Gana una batalla sin que tu héroe reciba daño.', icon: 'shield', hue: 210, reward: 60 },
  { id: 'ach_sacrificio', name: 'Victoria Pírrica', desc: 'Gana con tu héroe a 5 de vida o menos.', icon: 'heart', hue: 345, reward: 40 },
  { id: 'ach_nivel4', name: 'Mitad del Abismo', desc: 'Completa el nivel 4 de la campaña.', icon: 'flag', hue: 285, reward: 60 },
  { id: 'ach_campana', name: 'Salvador del Reino', desc: 'Completa la campaña entera (8 niveles).', icon: 'crown', hue: 48, reward: 200 },
  { id: 'ach_dragones', name: 'Matadragones', desc: 'Abate 3 dragones (Vharkar cuenta).', icon: 'dragon', hue: 12, reward: 120 },
  { id: 'ach_racha5', name: 'Cacería sin Fin', desc: 'Gana 5 cacerías seguidas en Supervivencia.', icon: 'infinity', hue: 130, reward: 80 },
  { id: 'ach_versus', name: 'Duelista de Hojas', desc: 'Gana 5 duelos en Versus.', icon: 'swords', hue: 20, reward: 60 },
  { id: 'ach_rico', name: 'Cofre de Guerra', desc: 'Acumula 1000 de oro.', icon: 'coin', hue: 40, reward: 50 },
  { id: 'ach_coleccionista', name: 'Arsenal Completo', desc: 'Reúne 15 cartas únicas distintas.', icon: 'cards', hue: 210, reward: 80 },
];

export const achById = (id: string): AchDef => ACHIEVEMENTS.find((a) => a.id === id)!;
