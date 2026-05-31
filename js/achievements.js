// localStorage achievements — cosmetic/meta only, no gameplay boosts.

const ACHIEVEMENTS_STORAGE_KEY = 'ttd-achievements';

const ACHIEVEMENT_DEFS = [
  { id: 'first_win', title: 'Centurion', desc: 'Clear all 100 waves.' },
  { id: 'wave_50', title: 'Halfway There', desc: 'Reach wave 50 in a run.' },
  { id: 'tetris', title: 'Quad Clear!', desc: 'Clear 4 lines at once.' },
  { id: 'shop_swap', title: 'Deck Doctor', desc: 'Complete a shop card swap.' },
  { id: 'fortify_3', title: 'Bunker Mindset', desc: 'Fortify base 3 times in one run.' },
  { id: 'daily_run', title: 'Daily Defender', desc: 'Finish a daily seeded run (win or lose).' },
  { id: 'brutal_win', title: 'Iron Stack', desc: 'Win on Brutal difficulty.' },
  { id: 'kills_500', title: 'Exterminator', desc: 'Score 500+ kills in one run.' },
  { id: 'win_classic', title: 'Classic Victor', desc: 'Win on Classic mode.' },
  { id: 'win_straights', title: 'Line Rider', desc: 'Win Straights Only mode.' },
  { id: 'win_bendy', title: 'Snake Charmer', desc: 'Win Bendy Only mode.' },
  { id: 'win_lebron', title: 'Lebron James', desc: 'Win Lebron James mode.' },
  { id: 'win_big_o', title: 'Big O Energy', desc: 'Win Big O mode.' },
  { id: 'win_t_piece', title: 'T Marks the Spot', desc: 'Win T-piece mode.' },
  { id: 'win_random', title: 'Chaos Theory', desc: 'Win Random mode.' },
];

const MODE_WIN_ACHIEVEMENT_IDS = [
  'win_classic',
  'win_straights',
  'win_bendy',
  'win_lebron',
  'win_big_o',
  'win_t_piece',
  'win_random',
];

function loadAchievements() {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveAchievements(map) {
  const json = JSON.stringify(map);
  if (typeof Platform !== 'undefined' && Platform.persistKey) {
    Platform.persistKey(ACHIEVEMENTS_STORAGE_KEY, json);
  } else {
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, json);
  }
}

function unlockAchievement(id) {
  const map = loadAchievements();
  if (map[id]) return null;
  const def = ACHIEVEMENT_DEFS.find((a) => a.id === id);
  if (!def) return null;
  map[id] = { at: new Date().toISOString() };
  saveAchievements(map);
  if (typeof Platform !== 'undefined' && Platform.unlockAchievement) {
    Platform.unlockAchievement(id);
  }
  return def;
}

function checkRunAchievements(ctx) {
  const unlocked = [];
  const tryUnlock = (id) => {
    const def = unlockAchievement(id);
    if (def) unlocked.push(def);
  };
  if (ctx.win) tryUnlock('first_win');
  if (ctx.wave >= 50) tryUnlock('wave_50');
  if (ctx.maxLinesAtOnce >= 4) tryUnlock('tetris');
  if (ctx.cardsBought >= 1) tryUnlock('shop_swap');
  if (ctx.baseUpgrades >= 3) tryUnlock('fortify_3');
  if (ctx.dailySeed) tryUnlock('daily_run');
  if (ctx.win && ctx.difficulty === 'brutal') tryUnlock('brutal_win');
  if (ctx.totalKills >= 500) tryUnlock('kills_500');
  if (ctx.win && ctx.gameMode) tryUnlock(`win_${ctx.gameMode}`);
  return unlocked;
}

function getAchievementProgress() {
  const map = loadAchievements();
  return ACHIEVEMENT_DEFS.map((def) => ({
    ...def,
    unlocked: !!map[def.id],
    at: map[def.id]?.at || null,
  }));
}

function getModeWinAchievementProgress() {
  const map = loadAchievements();
  return MODE_WIN_ACHIEVEMENT_IDS.map((id) => {
    const def = ACHIEVEMENT_DEFS.find((a) => a.id === id);
    if (!def) return null;
    return {
      ...def,
      unlocked: !!map[id],
      at: map[id]?.at || null,
    };
  }).filter(Boolean);
}

function countUnlockedAchievements() {
  return getAchievementProgress().filter((a) => a.unlocked).length;
}
