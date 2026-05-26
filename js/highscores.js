// Local high score leaderboard: sorted by wave (level), then points remaining.

const HIGHSCORES_STORAGE_KEY = 'ttd-highscores';
const HIGHSCORES_MAX_ENTRIES = 20;
const HIGHSCORES_TOP_N = 10;

function compareScores(a, b) {
  const waveA = a.wave ?? 0;
  const waveB = b.wave ?? 0;
  if (waveB !== waveA) return waveB - waveA;
  const scoreA = a.score ?? 0;
  const scoreB = b.score ?? 0;
  if (scoreB !== scoreA) return scoreB - scoreA;
  return (b.at || '').localeCompare(a.at || '');
}

function loadHighScores() {
  try {
    const raw = localStorage.getItem(HIGHSCORES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const list = parsed
      .filter((e) => e && typeof e.wave === 'number' && typeof e.score === 'number')
      .map((e) => ({
        wave: Math.floor(e.wave),
        score: Math.floor(e.score),
        win: !!e.win,
        at: e.at || new Date().toISOString(),
        reason: e.reason || '',
      }));
    list.sort(compareScores);
    return list.slice(0, HIGHSCORES_MAX_ENTRIES);
  } catch {
    return [];
  }
}

function saveHighScores(list) {
  const trimmed = list.slice().sort(compareScores).slice(0, HIGHSCORES_MAX_ENTRIES);
  localStorage.setItem(HIGHSCORES_STORAGE_KEY, JSON.stringify(trimmed));
  return trimmed;
}

function addHighScore({ wave, score, win, reason }) {
  const entry = {
    wave: Math.max(0, Math.floor(wave ?? 0)),
    score: Math.max(0, Math.floor(score ?? 0)),
    win: !!win,
    at: new Date().toISOString(),
    reason: reason ? String(reason) : '',
  };
  const list = loadHighScores();
  list.push(entry);
  const saved = saveHighScores(list);
  const rank = getRankForEntry(entry, saved);
  return { entry, list: saved, rank };
}

function getRankForEntry(entry, list) {
  const sorted = (list || loadHighScores()).slice().sort(compareScores);
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
  const hypothetical = { wave, score, at: new Date().toISOString() };
  const merged = [hypothetical, ...list].sort(compareScores);
  const rank = getRankForEntry(hypothetical, merged);
  return rank <= topN;
}

function clearHighScores() {
  localStorage.removeItem(HIGHSCORES_STORAGE_KEY);
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

function formatBestHighScoreLine() {
  const list = loadHighScores();
  if (list.length === 0) return '';
  const best = list[0];
  return `Best: Wave ${best.wave} · ${best.score.toLocaleString()} pts`;
}
