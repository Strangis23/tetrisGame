// Lifetime stats + per-run stat helpers.

const LIFETIME_STATS_KEY = 'ttd-lifetime-stats';

function emptyLifetimeStats() {
  return {
    gamesPlayed: 0,
    wins: 0,
    totalKills: 0,
    totalLineClears: 0,
    totalPointsAccumulated: 0,
    bestWave: 0,
    rolePlacements: {},
  };
}

function loadLifetimeStats() {
  try {
    const raw = localStorage.getItem(LIFETIME_STATS_KEY);
    if (raw) return { ...emptyLifetimeStats(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return emptyLifetimeStats();
}

function saveLifetimeStats(stats) {
  const json = JSON.stringify(stats);
  if (typeof Platform !== 'undefined' && Platform.persistKey) {
    Platform.persistKey(LIFETIME_STATS_KEY, json);
  } else {
    localStorage.setItem(LIFETIME_STATS_KEY, json);
  }
}

function createRunStats() {
  return {
    totalKills: 0,
    lineClears: 0,
    linesCleared: 0,
    maxLinesAtOnce: 0,
    cardsBought: 0,
    baseUpgrades: 0,
    maxSynergyLinks: 0,
    totalPointsEarned: 0,
  };
}

function recordLifetimeRunEnd(detail, runStats) {
  const stats = loadLifetimeStats();
  stats.gamesPlayed += 1;
  if (detail.win) stats.wins += 1;
  stats.totalKills += runStats.totalKills || 0;
  stats.totalLineClears += runStats.lineClears || 0;
  stats.totalPointsAccumulated += runStats.totalPointsEarned || 0;
  stats.bestWave = Math.max(stats.bestWave, detail.wave || 0);
  saveLifetimeStats(stats);
}

function formatRunStatsBlock(runStats, detail) {
  if (!runStats) return '';
  const lines = [
    `Total earned: ${(runStats.totalPointsEarned || 0).toLocaleString()} pts`,
    `Points remaining: ${(detail.score ?? 0).toLocaleString()}`,
    `Kills: ${runStats.totalKills}`,
    `Line clears: ${runStats.lineClears} (${runStats.linesCleared} rows)`,
    `Shop swaps: ${runStats.cardsBought}`,
    `Base fortify: ${runStats.baseUpgrades}`,
    `Best synergy: ${runStats.maxSynergyLinks} links`,
  ];
  if (detail.difficulty && detail.difficulty !== 'normal') {
    lines.unshift(`Difficulty: ${detail.difficulty}`);
  }
  if (detail.dailySeed) {
    lines.unshift(`Daily seed: ${getDailySeedLabel()}`);
  }
  if (detail.gameMode && detail.gameMode !== 'classic' && typeof formatGameModeName === 'function') {
    lines.unshift(`Mode: ${formatGameModeName(detail.gameMode)}`);
  }
  return lines.join('\n');
}
