// Game-wide tunable constants. All times in seconds, distances in cells.
const CONFIG = {
  GRID_W: 14,
  GRID_H: 22,
  CELL_PX: 28,
  SPAWN_BUFFER_ROWS: 2, // top rows reserved (top-out zone)

  PIECES_PER_WAVE: 4,        // tighter than before — must spend cards wisely
  WAVES_PER_SHOP: 5,
  WAVES_PER_SPEEDUP: 10,
  TOTAL_WAVES: 100,
  DECK_SIZE: 20,
  SHOP_CARD_COUNT: 10,

  // Seconds per cell of gravity, indexed by speed tier (every 10 waves).
  // Mapped to NES / Guideline levels 0–9 at 60 fps (frames ÷ 60).
  FALL_SPEEDS: [0.80, 0.717, 0.633, 0.550, 0.467, 0.383, 0.300, 0.217, 0.133, 0.100],
  SOFT_DROP_FACTOR: 20, // ~20 cells/s soft drop, matching Guideline feel
  LOCK_DELAY: 0.50,     // Guideline lock delay

  // Enemy speed multiplier per speed tier (every 10 waves). Mirrors fall speed.
  ENEMY_SPEED_MUL: [1.05, 1.12, 1.20, 1.28, 1.36, 1.44, 1.53, 1.62, 1.72, 1.84],

  // Player-controlled wave time-scale options. Cycled by pressing F during waves.
  WAVE_SPEED_STEPS: [1, 2, 3],

  // Click-to-repair during BUILD / PLACING_BASE: cost in points per missing HP.
  REPAIR_COST_PER_HP: 10,
  REPAIR_BASE_MULTIPLIER: 4,
  REPAIR_RARITY_MULT: {
    common: 1,
    uncommon: 1.3,
    rare: 1.6,
    epic: 2.2,
    legendary: 3.0,
  },

  // Per-shape colours (now used purely for visuals, not behaviour).
  COLORS: {
    I: '#22d3ee',
    O: '#facc15',
    T: '#a855f7',
    L: '#fb923c',
    J: '#3b82f6',
    S: '#22c55e',
    Z: '#ef4444',
    BASE: '#fde047',
    GHOST: 'rgba(255,255,255,0.18)',
    GRID_LINE: '#152033',
    BG: '#050912',
  },

  // Rarity colours (used for card borders and cell outlines).
  RARITY_COLORS: {
    common:    '#9ca3af', // gray
    uncommon:  '#22c55e', // green
    rare:      '#3b82f6', // blue
    epic:      '#a855f7', // purple
    legendary: '#fbbf24', // gold
  },
  // Per-role colours. The board now reads function (wall vs. sniper vs. splash)
  // at a glance, instead of the random tetromino origin of each card.
  ROLE_COLORS: {
    wall:      '#64748b', // slate
    shooter:   '#a78b5a', // brass
    sniper:    '#38bdf8', // ice
    splash:    '#c084fc', // amethyst
    slow:      '#67e8f9', // frost
    gunner:    '#fb923c', // ember
    piercer:   '#e2e8f0', // chrome
    multishot: '#34d399', // emerald
  },

  RARITY_GLOW: {
    common:    'rgba(156, 163, 175, 0.4)',
    uncommon:  'rgba(34, 197, 94, 0.5)',
    rare:      'rgba(59, 130, 246, 0.55)',
    epic:      'rgba(168, 85, 247, 0.65)',
    legendary: 'rgba(251, 191, 36, 0.75)',
  },

  // Enemy stats. Speed in cells/second (multiplied by ENEMY_SPEED_MUL[tier]).
  ENEMY_STATS: {
    walker: { hp: 28, speed: 2.2, reward: 8, color: '#dc2626', radius: 0.36 },
    flyer:  { hp: 16, speed: 3.2, reward: 10, color: '#f472b6', radius: 0.32 },
    brute:  { hp: 100, speed: 0.95, reward: 19, color: '#7c2d12', radius: 0.46, attackDmg: 1, attackRate: 0.7 },
    boss:   { hp: 700, speed: 0.85, reward: 185, color: '#581c87', radius: 0.7, attackDmg: 2, attackRate: 0.5 },
  },
  ENEMY_HP_GROWTH: 0.07, // hp = base * (1 + (wave - 1) * GROWTH)
  // Kill reward scales with wave: reward * (1 + (wave - 1) * SCALE)
  KILL_REWARD_WAVE_SCALE: 0.015,

  // Elite boss multipliers applied on top of the base enemy type every 10 waves.
  ELITE_BOSS: {
    hp: 12,
    speed: 1.25,
    reward: 5,
    radius: 1.5,
    attackDmg: 2.5,
    attackRateMul: 0.65,
    tierHpBonus: 0.22, // extra HP per boss tier (wave 10, 20, 30…)
  },
  // Per-type elite overrides (flyer elites were overtuned).
  ELITE_MODS: {
    default: { hp: 12, speed: 1.25, radius: 1.5, reward: 5, attackDmg: 2.5, attackRateMul: 0.65 },
    flyer:   { hp: 5, speed: 1.08, radius: 1.25, reward: 3, attackDmg: 1.8, attackRateMul: 0.75 },
  },
  BOSS_WAVE_TYPES: ['brute', 'flyer', 'walker'],

  // Home base HP pool and shop fortify.
  BASE_UPGRADE: {
    hpPerPurchase: 30,
    baseCost: 180,
    costScale: 1.4,
    maxPurchases: 15,
  },
  // Siege DPS when enemy is on a base cell (types without attackDmg use these).
  BASE_SIEGE: {
    walker: { dmg: 0.6, rate: 0.75 },
    flyer:  { dmg: 0.4, rate: 0.85 },
  },

  // Tower role vs enemy type: weak = bonus damage, resist = reduced damage.
  ENEMY_MATCHUPS: {
    walker: { weak: ['gunner', 'shooter'], resist: ['splash', 'slow'] },
    flyer:  { weak: ['sniper', 'piercer'], resist: ['shooter', 'splash'] },
    brute:  { weak: ['piercer', 'splash'], resist: ['sniper', 'gunner'] },
    boss:   { weak: ['multishot', 'slow'], resist: ['shooter', 'gunner'] },
  },
  MATCHUP_WEAK_MULT: 1.5,
  MATCHUP_RESIST_MULT: 0.55,

  // Tetris-style line clear bonuses (1/2/3/4 lines).
  LINE_BONUS: { 1: 50, 2: 150, 3: 250, 4: 400 },

  // Spawn schedule.
  WAVE_SPAWN_INTERVAL: 0.55,
  WAVE_PRE_DELAY: 0.20,
  // Spawn interval also tightens with wave: max(FLOOR, BASE - wave * COMPRESS)
  WAVE_INTERVAL_COMPRESS: 0.018,
  WAVE_INTERVAL_FLOOR: 0.14,

  // Visuals
  PROJECTILE_SPEED: 12,
  HOVER_RANGE_INDICATOR: true,

  // Adjacency synergy: same-role links + cluster density.
  SYNERGY: {
    ROLE_BONUS_PER_LINK: 0.12,
    ROLE_LINK_CAP: 4,
    CLUSTER_BONUS_PER_NEIGHBOR: 0.05,
    CLUSTER_CAP: 4,
    MAX_MULT: 1.75,
    VISUAL_THRESHOLD: 1.001,
  },
};

// Tetromino shape definitions (4 rotation states each, 4x4 grids of 0/1).
// Using approximate SRS layouts.
const SHAPES = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  O: [
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
  ],
  T: [
    [[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,1,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
  L: [
    [[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,1,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[1,0,0,0],[0,0,0,0]],
    [[1,1,0,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
  J: [
    [[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[0,0,1,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[1,1,0,0],[0,0,0,0]],
  ],
  S: [
    [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,1,0],[0,0,1,0],[0,0,0,0]],
    [[0,0,0,0],[0,1,1,0],[1,1,0,0],[0,0,0,0]],
    [[1,0,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
  Z: [
    [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,0,0],[0,1,1,0],[0,0,0,0]],
    [[0,1,0,0],[1,1,0,0],[1,0,0,0],[0,0,0,0]],
  ],
};

const SHAPE_KEYS = ['I','O','T','L','J','S','Z'];
