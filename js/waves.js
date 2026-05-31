// Wave composition and spawn schedule generation.
// Returns { schedule: [{type, at, elite?}], i, t } where 'at' is seconds from wave start.

const BOSS_TYPE_LABELS = {
  walker: 'Heavy Walker',
  brute: 'Siege Brute',
  flyer: 'Flyer Flagship',
  rusher: 'Swarm Rusher',
  shielded: 'Citadel Shielded',
};

function getBossWaveInfo(wave) {
  if (wave <= 0 || wave % 10 !== 0) return null;
  const types = CONFIG.BOSS_WAVE_TYPES || ['brute', 'flyer', 'walker'];
  const baseType = types[(Math.floor(wave / 10) - 1) % types.length];
  return {
    baseType,
    label: BOSS_TYPE_LABELS[baseType] || baseType,
    tier: Math.floor(wave / 10),
  };
}

function isBossWave(n) {
  return n > 0 && n % 10 === 0;
}

function sampleEnemyType(n, rngFn) {
  const rng = typeof rngFn === 'function' ? rngFn : Math.random;
  let walkerW = 1, bruteW = 0, flyerW = 0, rusherW = 0, shieldedW = 0;
  if (n >= 4) bruteW = 0.25 + 0.02 * (n - 4);
  if (n >= 7) flyerW = 0.20 + 0.02 * (n - 7);
  if (n >= 8) rusherW = 0.08 + 0.008 * (n - 8);
  if (n >= 12) shieldedW = 0.06 + 0.006 * (n - 12);
  bruteW = Math.min(bruteW, 0.4);
  flyerW = Math.min(flyerW, 0.4);
  rusherW = Math.min(rusherW, 0.18);
  shieldedW = Math.min(shieldedW, 0.16);
  walkerW = Math.max(0.08, 1 - bruteW - flyerW - rusherW - shieldedW);
  const weights = [
    ['walker', walkerW],
    ['brute', bruteW],
    ['flyer', flyerW],
    ['rusher', rusherW],
    ['shielded', shieldedW],
  ];
  const totalW = weights.reduce((s, [, w]) => s + w, 0);
  let r = rng() * totalW;
  for (const [type, w] of weights) {
    r -= w;
    if (r <= 0) return type;
  }
  return 'walker';
}

function composeWave(n, rngFn) {
  const bossWave = isBossWave(n);
  let count = 5 + Math.floor(n * 1.1);
  if (bossWave) count = Math.max(3, Math.floor(count * 0.28));
  const schedule = [];
  const rng = typeof rngFn === 'function' ? rngFn : Math.random;

  const interval = Math.max(
    CONFIG.WAVE_INTERVAL_FLOOR ?? 0.18,
    CONFIG.WAVE_SPAWN_INTERVAL - n * (CONFIG.WAVE_INTERVAL_COMPRESS ?? 0.014)
  );
  let t = CONFIG.WAVE_PRE_DELAY;

  for (let i = 0; i < count; i++) {
    const type = sampleEnemyType(n, rng);
    schedule.push({ type, at: t });
    t += interval * (0.7 + rng() * 0.6);
  }

  if (bossWave) {
    const boss = getBossWaveInfo(n);
    schedule.push({ type: boss.baseType, elite: true, at: t + 1.2 });
    if (n >= 50) {
      schedule.push({ type: boss.baseType, elite: true, at: t + 3.0 });
    }
  }
  return schedule;
}

function makeWaveSpawner(n, rngFn) {
  return {
    schedule: composeWave(n, rngFn),
    i: 0,
    t: 0,
  };
}

function previewWave(n) {
  const bossWave = isBossWave(n);
  let count = 5 + Math.floor(n * 1.1);
  if (bossWave) count = Math.max(3, Math.floor(count * 0.28));
  let walkerW = 1, bruteW = 0, flyerW = 0, rusherW = 0, shieldedW = 0;
  if (n >= 4) bruteW = 0.25 + 0.02 * (n - 4);
  if (n >= 7) flyerW = 0.20 + 0.02 * (n - 7);
  if (n >= 8) rusherW = 0.08 + 0.008 * (n - 8);
  if (n >= 12) shieldedW = 0.06 + 0.006 * (n - 12);
  bruteW = Math.min(bruteW, 0.4);
  flyerW = Math.min(flyerW, 0.4);
  rusherW = Math.min(rusherW, 0.18);
  shieldedW = Math.min(shieldedW, 0.16);
  walkerW = Math.max(0.08, 1 - bruteW - flyerW - rusherW - shieldedW);
  const total = walkerW + bruteW + flyerW + rusherW + shieldedW;
  const walkers = Math.round(count * walkerW / total);
  const brutes = Math.round(count * bruteW / total);
  const flyers = Math.round(count * flyerW / total);
  const rushers = Math.round(count * rusherW / total);
  const shielded = Math.max(0, count - walkers - brutes - flyers - rushers);
  const bossInfo = getBossWaveInfo(n);
  const bossCount = bossWave ? (n >= 50 ? 2 : 1) : 0;
  return {
    walkers, brutes, flyers, rushers, shielded,
    boss: bossCount,
    bossType: bossInfo ? bossInfo.baseType : null,
    bossLabel: bossInfo ? bossInfo.label : null,
    isBossWave: bossWave,
    total: walkers + brutes + flyers + rushers + shielded + bossCount,
  };
}
