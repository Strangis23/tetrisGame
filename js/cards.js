// Card system for the deck-builder. Each card is a (shape, role, rarity, stats)
// tuple. Roles define behaviour, rarity drives stat magnitude and appearance in
// the shop's rarity-weighted distribution.

const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const RARITY_INDEX = Object.fromEntries(RARITIES.map((r, i) => [r, i]));

// Cost of buying a shop card by rarity.
const RARITY_COSTS = {
  common:    220,
  uncommon:  500,
  rare:      1100,
  epic:      2800,
  legendary: 7500,
};

// Allowed roles per rarity. Lower rarities are limited to basic roles; higher
// rarities unlock specialists and exotic effects.
const ROLES_BY_RARITY = {
  common:    ['wall', 'shooter'],
  uncommon:  ['wall', 'shooter'],
  rare:      ['wall', 'shooter', 'sniper', 'splash', 'slow', 'gunner'],
  epic:      ['wall', 'sniper', 'splash', 'slow', 'gunner', 'piercer', 'multishot'],
  legendary: ['sniper', 'splash', 'slow', 'gunner', 'piercer', 'multishot', 'wall'],
};

// Per-(role, rarity) stat templates. Missing entries mean the role is not
// available at that rarity. ATTACK STATS: range in cells, fireRate as seconds
// per shot (lower = faster), damage per shot.
const ROLE_TEMPLATES = {
  wall: {
    common:    { hp: 8,  passiveIncome: 2 },
    uncommon:  { hp: 14, passiveIncome: 3 },
    rare:      { hp: 22, passiveIncome: 4 },
    epic:      { hp: 35, passiveIncome: 6 },
    legendary: { hp: 60, passiveIncome: 9, baseHpBonus: 4 },
  },
  shooter: {
    common:    { hp: 3, range: 4.0,  damage: 7,  fireRate: 0.55 },
    uncommon:  { hp: 4, range: 5.0,  damage: 11, fireRate: 0.50 },
    rare:      { hp: 5, range: 6.0,  damage: 16, fireRate: 0.45 },
    epic:      { hp: 6, range: 7.0,  damage: 22, fireRate: 0.40 },
    legendary: { hp: 8, range: 8.0,  damage: 30, fireRate: 0.35 },
  },
  sniper: {
    rare:      { hp: 3, range: 9.0,  damage: 30, fireRate: 1.20 },
    epic:      { hp: 4, range: 11.0, damage: 50, fireRate: 1.00, pierce: 1 },
    legendary: { hp: 5, range: 13.0, damage: 80, fireRate: 0.85, pierce: 2 },
  },
  splash: {
    rare:      { hp: 3, range: 5.0,  damage: 14, fireRate: 1.0, splashRadius: 1.4 },
    epic:      { hp: 4, range: 5.5,  damage: 22, fireRate: 0.9, splashRadius: 1.8 },
    legendary: { hp: 5, range: 6.0,  damage: 35, fireRate: 0.8, splashRadius: 2.4 },
  },
  slow: {
    rare:      { hp: 4, range: 3.0,  slowFactor: 0.45 },
    epic:      { hp: 5, range: 3.5,  slowFactor: 0.60 },
    legendary: { hp: 6, range: 4.5,  slowFactor: 0.80, damage: 4, fireRate: 1.0 },
  },
  gunner: {
    rare:      { hp: 3, range: 5.0,  damage: 8,  fireRate: 0.30 },
    epic:      { hp: 4, range: 6.0,  damage: 11, fireRate: 0.22 },
    legendary: { hp: 5, range: 7.0,  damage: 14, fireRate: 0.16 },
  },
  piercer: {
    epic:      { hp: 3, range: 9.0,  damage: 16, fireRate: 0.7, pierce: 4 },
    legendary: { hp: 4, range: 12.0, damage: 26, fireRate: 0.55, pierce: 99 },
  },
  multishot: {
    epic:      { hp: 3, range: 6.0,  damage: 9,  fireRate: 0.65, multishot: 3 },
    legendary: { hp: 4, range: 7.0,  damage: 13, fireRate: 0.50, multishot: 5 },
  },
};

// Flavourful name templates per role+rarity.
const ROLE_NAMES = {
  wall:      { common: 'Brick',         uncommon: 'Reinforced Wall', rare: 'Bunker',     epic: 'Fortress',      legendary: 'Citadel' },
  shooter:   { common: 'Pellet Gun',    uncommon: 'Auto-Cannon',     rare: 'Heavy Gun',  epic: 'War Cannon',    legendary: 'Doom Cannon' },
  sniper:    { rare: 'Marksman',        epic: 'Long Rifle',          legendary: 'Apex Sniper' },
  splash:    { rare: 'Mortar',          epic: 'Howitzer',            legendary: 'Storm Caller' },
  slow:      { rare: 'Frost Tower',     epic: 'Glacial Aura',        legendary: 'Time Warp' },
  gunner:    { rare: 'Gatling',         epic: 'Vulcan',              legendary: 'Stormgun' },
  piercer:   { epic: 'Rail Gun',        legendary: 'Lance of Light' },
  multishot: { epic: 'Scattergun',      legendary: 'Quad Strike' },
};

// Rarity weight anchors at specific waves. Linearly interpolated between
// anchors. Each row sums to 100 (treated as a probability distribution).
const RARITY_WEIGHT_ANCHORS = [
  { wave: 1,   weights: [85, 15,  0,  0,  0] },
  { wave: 5,   weights: [70, 25,  5,  0,  0] },
  { wave: 25,  weights: [30, 35, 25,  9,  1] },
  { wave: 50,  weights: [12, 25, 33, 25,  5] },
  { wave: 75,  weights: [ 5, 15, 30, 35, 15] },
  { wave: 100, weights: [ 0,  5, 25, 40, 30] },
];

function rarityWeights(wave) {
  const anchors = RARITY_WEIGHT_ANCHORS;
  if (wave <= anchors[0].wave) return weightsToObj(anchors[0].weights);
  if (wave >= anchors[anchors.length - 1].wave) return weightsToObj(anchors[anchors.length - 1].weights);
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i], b = anchors[i + 1];
    if (wave >= a.wave && wave <= b.wave) {
      const t = (wave - a.wave) / (b.wave - a.wave);
      const out = a.weights.map((w, k) => w * (1 - t) + b.weights[k] * t);
      return weightsToObj(out);
    }
  }
  return weightsToObj(anchors[0].weights);
}

function weightsToObj(arr) {
  return { common: arr[0], uncommon: arr[1], rare: arr[2], epic: arr[3], legendary: arr[4] };
}

function sampleRarity(weights) {
  const total = RARITIES.reduce((s, r) => s + (weights[r] || 0), 0);
  let r = Math.random() * total;
  for (const rarity of RARITIES) {
    r -= weights[rarity] || 0;
    if (r <= 0) return rarity;
  }
  return 'common';
}

function rolesAvailableAtRarity(rarity) {
  const roles = ROLES_BY_RARITY[rarity] || [];
  // Filter to only roles that actually have a template at this rarity.
  return roles.filter((role) => ROLE_TEMPLATES[role] && ROLE_TEMPLATES[role][rarity]);
}

let _cardIdCounter = 0;
function nextCardId() { return 'card_' + (++_cardIdCounter); }

function makeCard(role, rarity, shape) {
  const template = ROLE_TEMPLATES[role] && ROLE_TEMPLATES[role][rarity];
  if (!template) throw new Error(`No template for role=${role} rarity=${rarity}`);
  const stats = { ...template };
  const namePool = ROLE_NAMES[role] || {};
  const baseName = namePool[rarity] || `${rarity} ${role}`;
  return {
    id: nextCardId(),
    shape,
    role,
    rarity,
    name: baseName,
    cost: RARITY_COSTS[rarity],
    stats,
  };
}

// Generate the player's starting deck: 10 walls + 10 shooters, all common,
// random shapes drawn uniformly from SHAPE_KEYS.
function makeStarterDeck() {
  const cards = [];
  for (let i = 0; i < 10; i++) {
    const shape = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
    cards.push(makeCard('wall', 'common', shape));
  }
  for (let i = 0; i < 10; i++) {
    const shape = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
    cards.push(makeCard('shooter', 'common', shape));
  }
  return cards;
}

// Generate `n` shop cards for the given wave. Each card's rarity is sampled
// from rarityWeights(wave); role is sampled uniformly from roles available at
// that rarity; shape is uniform across SHAPE_KEYS.
function generateShopCards(wave, n = CONFIG.SHOP_CARD_COUNT) {
  const weights = rarityWeights(wave);
  const cards = [];
  for (let i = 0; i < n; i++) {
    const rarity = sampleRarity(weights);
    const roles = rolesAvailableAtRarity(rarity);
    const role = roles[Math.floor(Math.random() * roles.length)];
    const shape = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
    cards.push(makeCard(role, rarity, shape));
  }
  return cards;
}

// Glyph used to render the role on a placed cell (1-2 chars, rendered centered).
const ROLE_GLYPHS = {
  wall:      '▧',
  shooter:   '•',
  sniper:    '⊙',
  splash:    '✺',
  slow:      '❄',
  gunner:    '⁂',
  piercer:   '➤',
  multishot: '✹',
};
