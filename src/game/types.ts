export type Side = 'player' | 'enemy';

export type Rarity = 'común' | 'rara' | 'épica' | 'legendaria';

export type SpellTarget =
  | 'enemyAny'      // unidad enemiga o héroe enemigo
  | 'enemyUnits'    // solo unidades enemigas
  | 'allyAny'       // unidad aliada o héroe propio
  | 'allyUnit'      // solo unidad aliada
  | 'allEnemyUnits' // AoE
  | 'allAllies';    // apoyo en masa

export type SpellSchool =
  | 'fire' | 'ice' | 'poison' | 'heal'
  | 'buffAtk' | 'buffDef' | 'buffHp'
  | 'aoe' | 'teamBuff';

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
  text: string;      // descripción de reglas
  quote?: string;    // frase de ambientación
  vamp?: boolean;    // vampirismo
  ranged?: boolean;  // a distancia: puede atacar al héroe con el tablero lleno
  taunt?: boolean;   // provocación: deben atacarla primero
  pierce?: boolean;  // perforación: ignora la armadura
  swift?: boolean;   // veloz: ataca la ronda que se despliega
  thorns?: number;   // espinas: daño al ser atacada
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
  maxRounds: number;
  enemyStatBonus: number;  // +X/+X a unidades enemigas
  enemyEnergyBonus: number;
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
  muted: boolean;
}
