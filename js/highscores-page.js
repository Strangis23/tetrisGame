// Standalone high scores page (highscores.html).

(function () {
  const hero = document.getElementById('highscore-hero');
  const none = document.getElementById('highscore-none');
  const heroWave = document.getElementById('hero-wave');
  const heroPoints = document.getElementById('hero-points');
  const heroResult = document.getElementById('hero-result');
  const heroDate = document.getElementById('hero-date');
  const listEl = document.getElementById('highscores-list');
  const emptyList = document.getElementById('highscores-empty-list');
  const clearBtn = document.getElementById('highscores-clear');
  const allRuns = document.getElementById('highscores-all-runs');

  function render() {
    const list = typeof loadHighScores === 'function' ? loadHighScores() : [];
    const hasScores = list.length > 0;

    if (hero) hero.classList.toggle('hidden', !hasScores);
    if (none) none.classList.toggle('hidden', hasScores);
    if (allRuns) allRuns.classList.toggle('hidden', !hasScores);

    if (hasScores) {
      const best = list[0];
      if (heroWave) heroWave.textContent = String(best.wave);
      if (heroPoints) heroPoints.textContent = best.score.toLocaleString();
      if (heroResult) {
        heroResult.textContent = best.win ? 'Victory — cleared all waves' : 'Run ended';
      }
      if (heroDate) {
        heroDate.textContent = ` · ${formatHighScoreDate(best.at)}`;
      }
    }

    if (listEl) {
      listEl.innerHTML = '';
      list.forEach((entry, i) => {
        const row = document.createElement('tr');
        const result = entry.win ? 'Victory' : 'Defeat';
        row.innerHTML = `
          <td>${i + 1}</td>
          <td>${entry.wave}</td>
          <td>${entry.score.toLocaleString()}</td>
          <td>${result}</td>
          <td>${formatHighScoreDate(entry.at)}</td>
        `;
        listEl.appendChild(row);
      });
    }
    if (emptyList) emptyList.classList.toggle('hidden', list.length > 0);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!confirm('Clear all high scores? This cannot be undone.')) return;
      if (typeof clearHighScores === 'function') clearHighScores();
      render();
    });
  }

  render();
})();
