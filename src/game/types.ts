export type Side = 'player' | 'enemy';

export type Rarity = 'común' | 'rara' | 'épica' | 'legendaria';

export type SpellTarget =
  | 'enemyAny'      // unidad enemiga o héroe enemigo
  | 'enemyUnits'    // solo unidades enemigas
  | 'enemyHero'     // solo héroe enemigo
  | 'allyAny'       // unidad aliada o héroe propio
  | 'allyUnit'      // solo unidad aliada
  | 'allEnemyUnits' // AoE
  | 'allAllies';    // apoyo en masa / sin selección

export type SpellSchool =
  | 'fire' | 'ice' | 'poison' | 'heal'
  | 'buffAtk' | 'buffDef' | 'buffHp'
  | 'aoe' | 'teamBuff'
  | 'ashRain' | 'spikeShield' | 'shadowDagger' | 'warCry' | 'forbidden' | 'destinyArrow';

export interface SpellEffect {
  school: SpellSchool;
  amount: number;
  amount2?: number; // duración de veneno / congelación, etc.
  target: SpellTarget;
}

export type OnPlayKind =
  | 'damageRandom' | 'healHero' | 'freezeRandom'
  | 'aoe' | 'buffAllDef' | 'draw' | 'buffOtherAtk';

export interface OnPlay { kind: OnPlayKind; amount: number; }

export interface CardDef {
  id: string;
  name: string;
  side: Side;
  kind: 'unit' | 'spell';
  cost: number;
  atk?: number;
  hp?: number;
  def?: number;
  rarity: Rarity;
  icon: string;      // clave del sigilo SVG
  hue: number;       // tinte principal del arte
  art?: string;      // ruta al arte real (public/cards); sin ella se usa el sigilo
  text: string;      // descripción de reglas
  quote?: string;    // frase de ambientación
  vamp?: boolean;    // vampirismo
  ranged?: boolean;  // a distancia: puede atacar al héroe con el tablero lleno
  taunt?: boolean;   // provocación: deben atacarla primero
  pierce?: boolean;  // perforación: ignora la armadura
  swift?: boolean;   // veloz: ataca la ronda que se despliega
  thorns?: number;   // espinas: daño al ser atacada
  poisonAtk?: number;  // veneno que aplica al golpear en combate
  freezeAtk?: boolean; // congela al objetivo al golpear en combate
  onDeath?: { kind: 'poisonKiller' | 'summonSkeletons' | 'healHero'; amount: number };
  onPlay?: OnPlay;
  spell?: SpellEffect;
  tags: string[];    // facción: humanos, elfos, lobos...
}

/* ---------- motor de batalla ---------- */

export interface UnitInst {
  uid: number;
  def: CardDef;
  atk: number;
  hp: number;
  maxHp: number;
  defv: number;      // armadura restante (absorbe daño)
  frozen: number;    // rondas de congelación
  poison: number;    // daño de veneno por ronda
  poisonT: number;   // rondas restantes de veneno
  vamp: boolean;
  ranged: boolean;
  taunt: boolean;
  pierce: boolean;
  swift: boolean;
  thorns: number;
  poisonAtk: number;   // veneno que aplica al golpear
  freezeAtk: boolean;  // congela al golpear
  tempAtk: number;     // ATK temporal (se limpia al fin de ronda)
  hasEscudo: boolean;  // ya tiene Escudo de Espinas (no apila)
  lastHitBy: { side: Side; lane: number } | null; // quién asestó el último golpe
  ready: boolean;    // puede atacar esta fase
  fresh: boolean;    // desplegada esta ronda: no ataca
}

export type Target =
  | { kind: 'hero'; side: Side }
  | { kind: 'lane'; side: Side; lane: number };

export interface BattleConfig {
  mode: 'historia' | 'supervivencia' | 'versus';
  level?: number;
  title: string;
  enemyHeroName: string;
  enemyIcon: string;
  enemyHue: number;
  playerDeck: CardDef[];
  enemyDeck: CardDef[];
  heroHp: number;
  enemyHeroHp?: number;    // vida del jefe (Pactos Oscuros) — por defecto = heroHp
  maxRounds: number;
  enemyStatBonus: number;  // +X/+X a unidades enemigas
  enemyEnergyBonus: number;
  playerEnergyPenalty?: number; // Pactos: -X energía máxima del jugador
  relics?: string[];       // reliquias activas (supervivencia)
  pacts?: string[];        // Pactos Oscuros activos (historia)
}

export type BattlePhase = 'deployPlayer' | 'deployEnemy' | 'attackPlayer' | 'attackEnemy' | 'done';

export interface LogEntry { id: number; text: string; tone: 'info' | 'good' | 'bad' | 'sys'; }

export interface BattleState {
  cfg: BattleConfig;
  round: number;
  phase: BattlePhase;
  winner: Side | null;
  // carriles 0..2 jugador, 3..5 enemigo
  units: (UnitInst | null)[];
  hands: { player: CardDef[]; enemy: CardDef[] };
  decks: { player: CardDef[]; enemy: CardDef[] };
  baseDecks: { player: CardDef[]; enemy: CardDef[] }; // pozo para rearmar el mazo al agotarse
  energy: { player: { cur: number; max: number }; enemy: { cur: number; max: number } };
  heroHp: { player: number; enemy: number };
  heroMaxHp: { player: number; enemy: number };
  log: LogEntry[];
  logSeq: number;
  uidSeq: number;
  kills: number;
  dragonKills: number;     // dragones abatidos (para logros)
  heroDamageTaken: number; // daño recibido por tu héroe (para logros)
  heroDamageDealt: number; // daño infligido al héroe enemigo (desafíos)
  maxCostPlayed: number;   // coste máximo de carta jugada por el jugador (desafíos)
  spellsPlayed: number;    // pociones/mejoras jugadas por el jugador (desafíos)
}

export type BattleEvent =
  | { t: 'summon'; side: Side; lane: number; uid: number }
  | { t: 'armor'; side: Side; lane: number; amount: number; broke: boolean }
  | { t: 'damageUnit'; side: Side; lane: number; amount: number; kind: 'hit' | 'fire' | 'ice' | 'poison' }
  | { t: 'damageHero'; side: Side; amount: number }
  | { t: 'healUnit'; side: Side; lane: number; amount: number }
  | { t: 'healHero'; side: Side; amount: number }
  | { t: 'freeze'; side: Side; lane: number }
  | { t: 'poisonApply'; side: Side; lane: number }
  | { t: 'death'; side: Side; lane: number }
  | { t: 'buff'; side: Side; lane: number; label: string }
  | { t: 'draw'; side: Side }
  | { t: 'attack'; side: Side; lane: number; tSide: Side; tLane: number | null }
  | { t: 'log'; text: string; tone: LogEntry['tone'] }
  | { t: 'victory'; winner: Side };

export interface PlayResult { state: BattleState; events: BattleEvent[]; }

export interface AiAction {
  handIdx: number;
  target: Target | null;
}

export interface AiAttack {
  slot: number;        // 3..5
  target: Target;
}

/* ---------- metajuego ---------- */

export interface MetaState {
  gold: number;
  collection: Record<string, number>;
  deck: string[];        // mazo personalizado (20 ids) o vacío = automático
  storyUnlocked: number;   // nivel máximo desbloqueado (1..8)
  storyCleared: number[];  // niveles completados
  survivalBest: number;
  vsWins: number;
  totalWins: number;
  totalLosses: number;
  achievements: string[];  // ids de logros desbloqueados
  dragonsSlain: number;    // dragones abatidos acumulados
  challenges: {
    daily: { date: string; ids: string[]; claimed: string[] };
    weekly: { key: string; id: string; claimed: boolean; counters: Record<string, number> };
  };
  muted: boolean;
  musicOn: boolean;
  /* ---- economía premium (El Abismo) ---- */
  diamonds: number;          // moneda premium
  unlockedFrames: string[];  // marcos de carta desbloqueados
  activeFrame: string | null; // marco equipado (cosmético)
  relicsOwned: string[];     // reliquias "favoritas" del Relicario Hueco
  seasonEnds: number;        // timestamp: fin de la temporada de marcos limitados (FOMO)
  offerClaimedDate: string;  // fecha (YYYY-MM-DD) en que se reclamó la oferta diaria
}

export interface FrameDef {
  id: string;
  name: string;
  desc: string;
  price: number;           // en diamantes
  icon: string;
  accent: string;          // color del borde
  glow: string;            // color del halo
  anim?: 'flames' | 'embers' | 'frost' | 'none'; // animación del marco
  limited?: boolean;       // marco de temporada (FOMO)
}

export interface DiamondPackDef {
  id: string;
  name: string;
  diamonds: number;   // base
  bonus: number;      // extra de regalo
  priceUSD: string;   // etiqueta de precio
  icon: string;
  hue: number;
  tag?: string;       // "Más popular", "Mejor valor"...
}

export interface PactDef {
  id: string;
  name: string;
  desc: string;
  cost: string;   // penalización
  mult: number;   // multiplicador de recompensa
  icon: string;
}

export interface ChallengeDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  hue: number;
  reward: number;
}

export interface RelicDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  hue: number;
}

export interface AchDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  hue: number;
  reward: number;
}
