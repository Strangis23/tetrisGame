// Wave composition and spawn schedule generation.
// Returns { schedule: [{type, at, elite?}], i, t } where 'at' is seconds from wave start.

const BOSS_TYPE_LABELS = { walker: 'Walker', brute: 'Brute', flyer: 'Flyer' };

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

function composeWave(n) {
  const bossWave = isBossWave(n);
  let count = 5 + Math.floor(n * 1.1);
  if (bossWave) count = Math.max(3, Math.floor(count * 0.28));
  const schedule = [];

  // Composition curve.
  let walkerW = 1, bruteW = 0, flyerW = 0;
  if (n >= 4) bruteW = 0.25 + 0.02 * (n - 4);
  if (n >= 7) flyerW = 0.20 + 0.02 * (n - 7);
  bruteW = Math.min(bruteW, 0.45);
  flyerW = Math.min(flyerW, 0.45);
  walkerW = Math.max(0.1, 1 - bruteW - flyerW);

  const totalW = walkerW + bruteW + flyerW;

  const interval = Math.max(
    CONFIG.WAVE_INTERVAL_FLOOR ?? 0.18,
    CONFIG.WAVE_SPAWN_INTERVAL - n * (CONFIG.WAVE_INTERVAL_COMPRESS ?? 0.014)
  );
  let t = CONFIG.WAVE_PRE_DELAY;

  for (let i = 0; i < count; i++) {
    let r = Math.random() * totalW;
    let type;
    if (r < walkerW) type = 'walker';
    else if (r < walkerW + bruteW) type = 'brute';
    else type = 'flyer';
    schedule.push({ type, at: t });
    t += interval * (0.7 + Math.random() * 0.6);
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

function makeWaveSpawner(n) {
  return {
    schedule: composeWave(n),
    i: 0,
    t: 0,
  };
}

function previewWave(n) {
  const bossWave = isBossWave(n);
  let count = 5 + Math.floor(n * 1.1);
  if (bossWave) count = Math.max(3, Math.floor(count * 0.28));
  let walkerW = 1, bruteW = 0, flyerW = 0;
  if (n >= 4) bruteW = 0.25 + 0.02 * (n - 4);
  if (n >= 7) flyerW = 0.20 + 0.02 * (n - 7);
  bruteW = Math.min(bruteW, 0.45);
  flyerW = Math.min(flyerW, 0.45);
  walkerW = Math.max(0.1, 1 - bruteW - flyerW);
  const total = walkerW + bruteW + flyerW;
  const walkers = Math.round(count * walkerW / total);
  const brutes  = Math.round(count * bruteW / total);
  const flyers  = Math.max(0, count - walkers - brutes);
  const bossInfo = getBossWaveInfo(n);
  const bossCount = bossWave ? (n >= 50 ? 2 : 1) : 0;
  return {
    walkers, brutes, flyers,
    boss: bossCount,
    bossType: bossInfo ? bossInfo.baseType : null,
    bossLabel: bossInfo ? bossInfo.label : null,
    isBossWave: bossWave,
    total: walkers + brutes + flyers + bossCount,
  };
}
