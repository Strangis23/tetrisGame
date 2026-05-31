// Local high score leaderboard with sort + filter helpers.

const HIGHSCORES_STORAGE_KEY = 'ttd-highscores';
const HIGHSCORES_PREFS_KEY = 'ttd-highscores-prefs';
const HIGHSCORES_MAX_ENTRIES = 100;
const HIGHSCORES_TOP_N = 10;

const HIGHSCORE_SORTS = {
  wave: 'Wave reached',
  score: 'Points remaining',
  totalEarned: 'Total earned',
  date: 'Date',
};

function compareByWave(a, b) {
  const waveA = a.wave ?? 0;
  const waveB = b.wave ?? 0;
  if (waveB !== waveA) return waveB - waveA;
  const scoreA = a.score ?? 0;
  const scoreB = b.score ?? 0;
  if (scoreB !== scoreA) return scoreB - scoreA;
  const earnedA = a.totalEarned ?? 0;
  const earnedB = b.totalEarned ?? 0;
  if (earnedB !== earnedA) return earnedB - earnedA;
  return (b.at || '').localeCompare(a.at || '');
}

function compareByScore(a, b) {
  const scoreA = a.score ?? 0;
  const scoreB = b.score ?? 0;
  if (scoreB !== scoreA) return scoreB - scoreA;
  const waveA = a.wave ?? 0;
  const waveB = b.wave ?? 0;
  if (waveB !== waveA) return waveB - waveA;
  const earnedA = a.totalEarned ?? 0;
  const earnedB = b.totalEarned ?? 0;
  if (earnedB !== earnedA) return earnedB - earnedA;
  return (b.at || '').localeCompare(a.at || '');
}

function compareByTotalEarned(a, b) {
  const earnedA = a.totalEarned ?? 0;
  const earnedB = b.totalEarned ?? 0;
  if (earnedB !== earnedA) return earnedB - earnedA;
  const waveA = a.wave ?? 0;
  const waveB = b.wave ?? 0;
  if (waveB !== waveA) return waveB - waveA;
  const scoreA = a.score ?? 0;
  const scoreB = b.score ?? 0;
  if (scoreB !== scoreA) return scoreB - scoreA;
  return (b.at || '').localeCompare(a.at || '');
}

function compareByDate(a, b) {
  const dateCmp = (b.at || '').localeCompare(a.at || '');
  if (dateCmp !== 0) return dateCmp;
  return compareByWave(a, b);
}

const HIGHSCORE_SORT_FNS = {
  wave: compareByWave,
  score: compareByScore,
  totalEarned: compareByTotalEarned,
  date: compareByDate,
};

function compareScores(a, b) {
  return compareByWave(a, b);
}

function normalizeHighScoreEntry(e) {
  return {
    wave: Math.floor(e.wave ?? 0),
    score: Math.floor(e.score ?? 0),
    totalEarned: Math.floor(e.totalEarned ?? 0),
    win: !!e.win,
    at: e.at || new Date().toISOString(),
    reason: e.reason || '',
    difficulty: e.difficulty || 'normal',
    dailySeed: !!e.dailySeed,
    gameMode: e.gameMode || 'classic',
  };
}

function loadHighScores() {
  try {
    const raw = localStorage.getItem(HIGHSCORES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.wave === 'number' && typeof e.score === 'number')
      .map(normalizeHighScoreEntry);
  } catch {
    return [];
  }
}

function saveHighScores(list) {
  const trimmed = list
    .slice()
    .sort((a, b) => (b.at || '').localeCompare(a.at || ''))
    .slice(0, HIGHSCORES_MAX_ENTRIES);
  const json = JSON.stringify(trimmed);
  if (typeof Platform !== 'undefined' && Platform.persistKey) {
    Platform.persistKey(HIGHSCORES_STORAGE_KEY, json);
  } else {
    localStorage.setItem(HIGHSCORES_STORAGE_KEY, json);
  }
  return trimmed;
}

function sortHighScores(list, sortBy = 'wave') {
  const cmp = HIGHSCORE_SORT_FNS[sortBy] || compareByWave;
  return list.slice().sort(cmp);
}

function filterHighScores(list, filters = {}) {
  return list.filter((entry) => {
    if (filters.gameMode && filters.gameMode !== 'all' && entry.gameMode !== filters.gameMode) return false;
    if (filters.difficulty && filters.difficulty !== 'all' && entry.difficulty !== filters.difficulty) return false;
    if (filters.dailySeed === 'daily' && !entry.dailySeed) return false;
    if (filters.dailySeed === 'standard' && entry.dailySeed) return false;
    return true;
  });
}

function loadHighScorePrefs() {
  try {
    const raw = localStorage.getItem(HIGHSCORES_PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { sortBy: 'wave', gameMode: 'all', difficulty: 'all', dailySeed: 'all' };
}

function saveHighScorePrefs(prefs) {
  const next = { ...loadHighScorePrefs(), ...prefs };
  const json = JSON.stringify(next);
  if (typeof Platform !== 'undefined' && Platform.persistKey) {
    Platform.persistKey(HIGHSCORES_PREFS_KEY, json);
  } else {
    localStorage.setItem(HIGHSCORES_PREFS_KEY, json);
  }
  return next;
}

function queryHighScores(filters, sortBy) {
  const prefs = {
    ...loadHighScorePrefs(),
    ...(filters || {}),
    ...(sortBy ? { sortBy } : {}),
  };
  const filtered = filterHighScores(loadHighScores(), prefs);
  return sortHighScores(filtered, prefs.sortBy);
}

function addHighScore({ wave, score, totalEarned, win, reason, difficulty, dailySeed, gameMode }) {
  const entry = normalizeHighScoreEntry({
    wave,
    score,
    totalEarned,
    win,
    reason,
    difficulty,
    dailySeed,
    gameMode,
    at: new Date().toISOString(),
  });
  const list = loadHighScores();
  list.push(entry);
  const saved = saveHighScores(list);
  const rank = getRankForEntry(entry, sortHighScores(saved, 'wave'));
  return { entry, list: saved, rank };
}

function getRankForEntry(entry, list) {
  const sorted = list || sortHighScores(loadHighScores(), 'wave');
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    if (s.wave === entry.wave && s.score === entry.score && s.at === entry.at) {
      return i + 1;
    }
  }
  return sorted.length;
}

function isNewTopScore({ wave, score }, topN = HIGHSCORES_TOP_N) {
  const list = loadHighScores();
  const hypothetical = normalizeHighScoreEntry({ wave, score, at: new Date().toISOString() });
  const merged = sortHighScores([hypothetical, ...list], 'wave');
  const rank = getRankForEntry(hypothetical, merged);
  return rank <= topN;
}

function clearHighScores() {
  if (typeof Platform !== 'undefined' && Platform.persistRemove) {
    Platform.persistRemove(HIGHSCORES_STORAGE_KEY);
  } else {
    localStorage.removeItem(HIGHSCORES_STORAGE_KEY);
  }
}

function formatHighScoreDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

function formatDifficultyLabel(id) {
  if (!id || id === 'normal') return 'Normal';
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function formatRunSummary(entry) {
  let text = entry.win ? 'Victory' : 'Defeat';
  if (entry.difficulty && entry.difficulty !== 'normal') text += ` · ${formatDifficultyLabel(entry.difficulty)}`;
  if (entry.gameMode && entry.gameMode !== 'classic' && typeof formatGameModeName === 'function') {
    text += ` · ${formatGameModeName(entry.gameMode)}`;
  }
  if (entry.dailySeed) text += ' · daily';
  return text;
}

function formatBestHighScoreLine() {
  const list = sortHighScores(loadHighScores(), 'wave');
  if (list.length === 0) return '';
  const best = list[0];
  return `Best: Wave ${best.wave} · ${best.score.toLocaleString()} pts left`;
}

function formatLifetimePointsLine() {
  if (typeof loadLifetimeStats !== 'function') return '';
  const total = loadLifetimeStats().totalPointsAccumulated || 0;
  if (total <= 0) return '';
  return `Lifetime earned: ${total.toLocaleString()} pts`;
}
