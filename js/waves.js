// Wave composition and spawn schedule generation.
// Returns { schedule: [{type, at}], i, t } where 'at' is seconds from wave start.

function composeWave(n) {
  const count = 5 + Math.floor(n * 1.1);
  const schedule = [];

  // Composition curve.
  let walkerW = 1, bruteW = 0, flyerW = 0;
  if (n >= 4) bruteW = 0.25 + 0.02 * (n - 4);
  if (n >= 7) flyerW = 0.20 + 0.02 * (n - 7);
  // Cap weights so walkers are still common late.
  bruteW = Math.min(bruteW, 0.45);
  flyerW = Math.min(flyerW, 0.45);
  walkerW = Math.max(0.1, 1 - bruteW - flyerW);

  const isBossWave = n % 10 === 0;
  const totalW = walkerW + bruteW + flyerW;

  // Tighter spacing as waves go up.
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
  if (isBossWave) {
    schedule.push({ type: 'boss', at: t + 1.2 });
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

// Pure (no RNG) preview of a wave's expected enemy composition. Used to show
// the player what's coming during the build phase.
function previewWave(n) {
  const count = 5 + Math.floor(n * 1.1);
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
  const boss    = (n > 0 && n % 10 === 0) ? 1 : 0;
  return { walkers, brutes, flyers, boss, total: walkers + brutes + flyers + boss };
}
