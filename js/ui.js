// HUD + modal management. Handles the persistent deck panel and the
// shop-with-swap flow.
class UI {
  constructor(game) {
    this.game = game;
    this.elScore = document.getElementById('score');
    this.elTotalEarned = document.getElementById('total-earned');
    this.elBaseHp = document.getElementById('base-hp');
    this.elWave = document.getElementById('wave');
    this.elTier = document.getElementById('speed-tier');
    this.elPieces = document.getElementById('pieces-left');
    this.elEnemies = document.getElementById('enemies-left');
    this.elWaveSpeed = document.getElementById('wave-speed');
    this.elWavePreview = document.getElementById('wave-preview');
    this.elPhase = document.getElementById('phase-indicator');
    this.elNextCanvas = document.getElementById('next-canvas');
    this.nextCtx = this.elNextCanvas ? this.elNextCanvas.getContext('2d') : null;
    this.elHoldCanvas = document.getElementById('hold-canvas');
    this.holdCtx = this.elHoldCanvas ? this.elHoldCanvas.getContext('2d') : null;
    this.elDeckChips = document.getElementById('deck-chips');
    this.elDeckCount = document.getElementById('deck-count');

    this.helpModal = document.getElementById('help-modal');
    this.helpBtn = document.getElementById('help-btn');
    this.helpClose = document.getElementById('help-close');

    this.overlay = document.getElementById('overlay');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlayMessage = document.getElementById('overlay-message');
    this.overlayButton = document.getElementById('overlay-button');

    this.titleScreen = document.getElementById('title-screen');
    this.titlePlayBtn = document.getElementById('title-play-btn');
    this.titleSettingsBtn = document.getElementById('title-settings-btn');
    this.modeGrid = document.getElementById('mode-grid');
    this.selectedGameMode = 'classic';

    this.shopModal = document.getElementById('shop-modal');
    this.shopWave = document.getElementById('shop-wave');
    this.shopPoints = document.getElementById('shop-points');
    this.shopList = document.getElementById('shop-list');
    this.shopDeckGrid = document.getElementById('shop-deck-grid');
    this.shopDeckHint = document.getElementById('shop-deck-hint');
    this.shopClose = document.getElementById('shop-close');
    this.shopPause = document.getElementById('shop-pause');
    this.shopCancelBuy = document.getElementById('shop-cancel-buy');
    this.shopStepBrowse = document.getElementById('shop-step-browse');
    this.shopStepSwap = document.getElementById('shop-step-swap');
    this.shopStepLabel = document.getElementById('shop-step-label');
    this.shopPendingCard = document.getElementById('shop-pending-card');
    this.shopUpgrades = document.getElementById('shop-upgrades');
    this.deckSortBar = document.getElementById('deck-sort-bar');
    this.sortDirectionBtn = document.getElementById('sort-direction');
    this.shopBaseUpgrade = document.getElementById('shop-base-upgrade');
    this.shopBaseHpLabel = document.getElementById('shop-base-hp-label');

    this.settingsModal = document.getElementById('settings-modal');
    this.settingsBtn = document.getElementById('settings-btn');
    this.settingsClose = document.getElementById('settings-close');
    this.settingsQuit = document.getElementById('settings-quit');
    this.settingsForm = document.getElementById('settings-form');
    this.settingsDisplaySection = document.getElementById('settings-display-section');
    this.settingsFullscreenBtn = document.getElementById('settings-fullscreen-btn');
    this.settingsMaximizeBtn = document.getElementById('settings-maximize-btn');

    this.shopDeckSort = { key: 'shape', asc: true };
    this._lastShopScore = null;
    this._lastPresenceSig = null;

    if (this.shopClose) {
      this.shopClose.addEventListener('click', () => this.closeShop());
    }
    if (this.shopCancelBuy) {
      this.shopCancelBuy.addEventListener('click', () => this.cancelPendingBuy());
    }
    if (this.shopPause) {
      this.shopPause.addEventListener('click', () => this.game.togglePause());
    }
    if (this.deckSortBar) {
      this.deckSortBar.addEventListener('click', (e) => this.onDeckSortClick(e));
    }
    if (this.shopBaseUpgrade) {
      this.shopBaseUpgrade.addEventListener('click', () => this.onBaseUpgradeClick());
    }

    window.addEventListener('ttd-shop-open', (ev) => this.openShop(ev.detail.wave));
    window.addEventListener('ttd-game-end', (ev) => this.handleGameEnd(ev.detail));

    if (this.helpBtn) {
      this.helpBtn.addEventListener('click', () => this.openHelp());
    }
    if (this.helpClose) {
      this.helpClose.addEventListener('click', () => this.closeHelp());
    }
    if (this.helpModal) {
      this.helpModal.addEventListener('click', (e) => {
        if (e.target === this.helpModal) this.closeHelp();
      });
    }
    if (this.settingsBtn) {
      this.settingsBtn.addEventListener('click', () => this.openSettings());
    }
    if (this.settingsClose) {
      this.settingsClose.addEventListener('click', () => this.closeSettings());
    }
    if (this.settingsQuit) {
      if (typeof Platform !== 'undefined' && Platform.isDesktop) {
        this.settingsQuit.classList.remove('hidden');
      }
      this.settingsQuit.addEventListener('click', () => {
        if (typeof Platform !== 'undefined' && Platform.quitApp) Platform.quitApp();
      });
    }
    if (this.settingsModal) {
      this.settingsModal.addEventListener('click', (e) => {
        if (e.target === this.settingsModal) this.closeSettings();
      });
    }
    if (this.settingsForm) {
      this.settingsForm.addEventListener('change', () => {
        readSettingsFromForm(this.settingsForm);
        if (typeof AudioEngine !== 'undefined') AudioEngine.applyVolumes();
      });
    }
    if (typeof Platform !== 'undefined' && Platform.canControlWindow) {
      if (this.settingsDisplaySection) this.settingsDisplaySection.classList.remove('hidden');
      if (this.settingsFullscreenBtn) {
        this.settingsFullscreenBtn.addEventListener('click', () => this.onToggleFullscreen());
      }
      if (this.settingsMaximizeBtn) {
        this.settingsMaximizeBtn.addEventListener('click', () => this.onToggleMaximize());
      }
      Platform.onWindowDisplayChange(() => this.syncDisplayButtons());
    }

    if (this.modeGrid) {
      this.modeGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.mode-card');
        if (!btn) return;
        this.selectGameMode(btn.dataset.mode);
      });
    }
    if (this.titlePlayBtn) {
      this.titlePlayBtn.addEventListener('click', () => this.startFromTitle());
    }
    if (this.titleScreen) {
      this.titleScreen.addEventListener('click', () => {
        if (typeof AudioEngine !== 'undefined') AudioEngine.unlock();
      });
    }
    if (this.titleSettingsBtn) {
      this.titleSettingsBtn.addEventListener('click', () => this.openSettings());
    }
    document.querySelectorAll('[data-action="music-mute"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof AudioEngine !== 'undefined') {
          AudioEngine.unlock();
          AudioEngine.toggleMusicMuted();
        }
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'F11' && typeof Platform !== 'undefined' && Platform.canControlWindow) {
        e.preventDefault();
        this.onToggleFullscreen();
        return;
      }
      if (e.code !== 'Escape') return;
      const settingsOpen = this.settingsModal && !this.settingsModal.classList.contains('hidden');
      if (settingsOpen) {
        e.preventDefault();
        this.closeSettings();
        return;
      }
      if (this.game.helpOpen) {
        e.preventDefault();
        this.closeHelp();
        return;
      }
      const shopOpen = this.shopModal && !this.shopModal.classList.contains('hidden');
      if (this.game.phase === 'SHOP' && shopOpen && this.game.hasPendingShopBuy()) {
        e.preventDefault();
        this.cancelPendingBuy();
      }
    });

    this.initHudCollapsible();
    if (typeof AudioEngine !== 'undefined') AudioEngine._syncMuteButtons();
  }

  initHudCollapsible() {
    const wideMq = window.matchMedia('(min-width: 901px)');
    const sync = () => {
      for (const el of document.querySelectorAll('details.hud-collapsible')) {
        if (wideMq.matches) el.setAttribute('open', '');
      }
    };
    sync();
    wideMq.addEventListener('change', sync);
  }

  openHelp() {
    if (!this.helpModal) return;
    this.game.openHelp();
    this.helpModal.classList.remove('hidden');
    if (this.helpBtn) this.helpBtn.setAttribute('aria-expanded', 'true');
  }

  closeHelp() {
    if (!this.helpModal) return;
    this.game.closeHelp();
    this.helpModal.classList.add('hidden');
    if (this.helpBtn) this.helpBtn.setAttribute('aria-expanded', 'false');
  }

  openSettings() {
    if (!this.settingsModal || !this.settingsForm) return;
    applySettingsToForm(this.settingsForm);
    this.syncDisplayButtons();
    this.settingsModal.classList.remove('hidden');
    if (typeof AudioEngine !== 'undefined') AudioEngine.unlock();
  }

  async syncDisplayButtons() {
    if (typeof Platform === 'undefined' || !Platform.canControlWindow) return;
    const state = await Platform.getWindowDisplayState();
    if (this.settingsFullscreenBtn) {
      this.settingsFullscreenBtn.textContent = state.fullscreen ? 'Exit fullscreen' : 'Fullscreen';
    }
    if (this.settingsMaximizeBtn) {
      this.settingsMaximizeBtn.textContent = state.maximized ? 'Restore window' : 'Maximize';
    }
  }

  async onToggleFullscreen() {
    if (typeof Platform === 'undefined' || !Platform.toggleFullscreen) return;
    await Platform.toggleFullscreen();
    this.syncDisplayButtons();
    requestAnimationFrame(() => window.TTD?.fitGameCanvas?.());
  }

  async onToggleMaximize() {
    if (typeof Platform === 'undefined' || !Platform.toggleMaximize) return;
    await Platform.toggleMaximize();
    this.syncDisplayButtons();
    requestAnimationFrame(() => window.TTD?.fitGameCanvas?.());
  }

  closeSettings() {
    if (!this.settingsModal) return;
    this.settingsModal.classList.add('hidden');
  }

  getRunStartOptions() {
    const diffEl = document.querySelector('input[name="run-difficulty"]:checked');
    const dailyEl = document.getElementById('run-daily-seed');
    return {
      difficulty: diffEl ? diffEl.value : 'normal',
      dailySeed: dailyEl ? dailyEl.checked : false,
      gameMode: this.selectedGameMode || 'classic',
    };
  }

  selectGameMode(id) {
    this.selectedGameMode = id || 'classic';
    if (!this.modeGrid) return;
    this.modeGrid.querySelectorAll('.mode-card').forEach((el) => {
      el.classList.toggle('active', el.dataset.mode === this.selectedGameMode);
    });
  }

  showTitleScreen() {
    if (this.game.phase === 'GAMEOVER' || this.game.phase === 'WIN') {
      this.game.reset();
    }
    this.updateTitleBestLine();
    this.selectGameMode(this.selectedGameMode || 'classic');
    if (this.titleScreen) this.titleScreen.classList.remove('hidden');
    document.body.classList.add('title-visible');
    if (typeof AudioEngine !== 'undefined') {
      AudioEngine.setMusicPhase('menu');
    }
  }

  hideTitleScreen() {
    if (this.titleScreen) this.titleScreen.classList.add('hidden');
    document.body.classList.remove('title-visible');
  }

  startFromTitle() {
    if (typeof AudioEngine !== 'undefined') AudioEngine.unlock();
    this.hideTitleScreen();
    this.game.startNewRun(this.getRunStartOptions());
    requestAnimationFrame(() => window.TTD?.fitGameCanvas?.());
  }

  updateTitleBestLine() {
    const el = document.getElementById('title-best-score');
    if (!el) return;
    const parts = [];
    if (typeof formatBestHighScoreLine === 'function') {
      const best = formatBestHighScoreLine();
      if (best) parts.push(best);
    }
    if (typeof formatLifetimePointsLine === 'function') {
      const lifetime = formatLifetimePointsLine();
      if (lifetime) parts.push(lifetime);
    }
    el.textContent = parts.join(' · ');
    el.classList.toggle('hidden', parts.length === 0);
  }

  updateIntroBestLine() {
    this.updateTitleBestLine();
  }

  showOverlay({ title, message, button = 'OK', onClick }) {
    if (!this.overlay || !this.overlayTitle || !this.overlayMessage || !this.overlayButton) return;
    this.overlayTitle.textContent = title;
    this.overlayMessage.textContent = message;
    this.overlayButton.textContent = button;
    this.overlay.classList.remove('hidden');
    this.overlayButton.onclick = onClick;
  }
  hideOverlay() { this.overlay.classList.add('hidden'); }

  handleGameEnd(detail) {
    const wave = detail.wave ?? 0;
    const score = detail.score ?? 0;
    let rank = null;
    if (typeof addHighScore === 'function') {
      const result = addHighScore({
        wave,
        score,
        totalEarned: detail.runStats?.totalPointsEarned ?? 0,
        win: !!detail.win,
        reason: detail.reason,
        difficulty: detail.difficulty,
        dailySeed: detail.dailySeed,
        gameMode: detail.gameMode,
      });
      rank = result.rank;
    }
    const title = detail.win ? 'Victory!' : 'Game Over';
    let message = detail.win
      ? `You cleared all 100 waves.\nWave ${wave} · ${score.toLocaleString()} points remaining.`
      : `${detail.reason || 'Run ended.'}\nWave ${wave} · ${score.toLocaleString()} points remaining.`;
    const totalEarned = detail.runStats?.totalPointsEarned ?? 0;
    if (totalEarned > 0) {
      message += `\nTotal earned this run: ${totalEarned.toLocaleString()} pts`;
    }

    if (typeof formatRunStatsBlock === 'function' && detail.runStats) {
      const block = formatRunStatsBlock(detail.runStats, detail);
      if (block) message += `\n\n--- Run stats ---\n${block}`;
    }

    const topN = typeof HIGHSCORES_TOP_N !== 'undefined' ? HIGHSCORES_TOP_N : 10;
    if (rank != null && rank <= topN) {
      message += `\n\nNew high score! Rank #${rank} on your leaderboard.`;
    } else if (rank != null) {
      message += `\n\nRank #${rank} on your leaderboard.`;
    }

    if (detail.newAchievements && detail.newAchievements.length > 0) {
      message += '\n\nAchievements unlocked:';
      for (const a of detail.newAchievements) {
        message += `\n• ${a.title} — ${a.desc}`;
      }
    }

    this.updateTitleBestLine();
    this.showOverlay({
      title, message, button: 'Back to Title',
      onClick: () => {
        this.hideOverlay();
        this.showTitleScreen();
      },
    });
  }

  openShop(wave) {
    if (this.shopWave) this.shopWave.textContent = String(wave);
    this.game.clearPendingShopBuy();
    this._lastShopScore = null;
    if (this.shopModal) this.shopModal.classList.remove('hidden');
    this.renderShop();
  }

  onDeckSortClick(e) {
    const btn = e.target.closest('.sort-btn');
    if (!btn) return;
    if (btn.id === 'sort-direction') {
      this.shopDeckSort.asc = !this.shopDeckSort.asc;
    } else if (btn.dataset.sort) {
      if (this.shopDeckSort.key === btn.dataset.sort) {
        this.shopDeckSort.asc = !this.shopDeckSort.asc;
      } else {
        this.shopDeckSort.key = btn.dataset.sort;
        this.shopDeckSort.asc = true;
      }
    }
    this.updateSortButtons();
    this.renderShop();
  }

  updateSortButtons() {
    if (!this.deckSortBar) return;
    for (const btn of this.deckSortBar.querySelectorAll('.sort-btn[data-sort]')) {
      btn.classList.toggle('active', btn.dataset.sort === this.shopDeckSort.key);
    }
    if (this.sortDirectionBtn) {
      this.sortDirectionBtn.textContent = this.shopDeckSort.asc ? '↑' : '↓';
      this.sortDirectionBtn.title = this.shopDeckSort.asc ? 'Ascending — click to reverse' : 'Descending — click to reverse';
    }
  }
  closeShop() {
    if (this.game.hasPendingShopBuy()) {
      const leave = window.confirm(
        'You selected a card to buy but have not picked one to remove.\n\nLeave the shop without swapping? (No points will be charged)'
      );
      if (!leave) return;
      this.game.clearPendingShopBuy();
    }
    if (this.shopModal) this.shopModal.classList.add('hidden');
    this.game.closeShop();
  }
  cancelPendingBuy() {
    this.game.clearPendingShopBuy();
    this.renderShop();
  }

  onBaseUpgradeClick() {
    if (this.game.hasPendingShopBuy()) {
      this.game.setBanner('Finish or cancel your card swap first', 1.2);
      return;
    }
    const result = this.game.buyBaseUpgrade();
    if (!result.ok) {
      this.game.setBanner(result.reason || 'Cannot upgrade', 1.0);
      return;
    }
    const hp = CONFIG.BASE_UPGRADE?.hpPerPurchase ?? 30;
    this.game.setBanner(`Base fortified (+${hp} HP)`, 1.2);
    this.renderShop();
  }

  renderShopUpgrades(game) {
    if (!this.shopBaseUpgrade) return;
    const hpPer = CONFIG.BASE_UPGRADE?.hpPerPurchase ?? 30;
    if (this.shopBaseHpLabel) {
      if (game.baseMaxHp > 0) {
        this.shopBaseHpLabel.textContent = `Base HP: ${Math.ceil(game.baseHp)} / ${game.baseMaxHp}`;
      } else {
        this.shopBaseHpLabel.textContent = 'Place your base first';
      }
    }
    const can = game.canBuyBaseUpgrade();
    const cost = game.baseUpgradeCost();
    const afford = game.score >= cost;
    if (!can) {
      this.shopBaseUpgrade.textContent = 'Max fortify level';
      this.shopBaseUpgrade.disabled = true;
    } else if (!afford) {
      this.shopBaseUpgrade.textContent = `Fortify (+${hpPer} HP) — need ${cost - game.score}`;
      this.shopBaseUpgrade.disabled = true;
    } else {
      this.shopBaseUpgrade.textContent = `Fortify (+${hpPer} HP) — ${cost} pts`;
      this.shopBaseUpgrade.disabled = false;
    }
  }

  // Click "Buy" on a shop card. Switch the deck pane into "pick to remove" mode.
  beginPendingBuy(idx) {
    const sc = this.game.shopCards[idx];
    if (!sc || sc.bought) return;
    if (this.game.score < sc.cost) return;
    this.game.setPendingShopBuy(idx);
    this.renderShop();
    this.game.setBanner('Pick a deck card to remove (cost not charged yet)', 1.4);
    if (this.shopStepSwap) {
      this.shopStepSwap.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    const shopBody = document.getElementById('shop-body');
    if (shopBody) shopBody.scrollTop = 0;
  }

  // Click a deck card while a buy is pending. Confirm the swap.
  confirmSwap(deckCardId) {
    const pendingIdx = this.game.pendingShopBuyIndex;
    if (pendingIdx < 0) return;
    const result = this.game.buyCard(pendingIdx, deckCardId);
    if (!result.ok) {
      this.game.setBanner(result.reason || 'Swap failed', 1.0);
      return;
    }
    this.game.setBanner('Card swapped!', 1.0);
    if (typeof unlockAchievement === 'function') unlockAchievement('shop_swap');
    this._lastShopScore = null;
    this.renderShop();
  }

  renderShop() {
    const game = this.game;
    if (this.shopPoints) this.shopPoints.textContent = String(game.score);
    const isPending = game.hasPendingShopBuy();

    if (this.shopStepLabel) {
      this.shopStepLabel.textContent = isPending ? 'Pick a card to remove' : 'Pick a card to buy';
      this.shopStepLabel.dataset.step = isPending ? 'swap' : 'browse';
    }
    if (this.shopClose) {
      this.shopClose.textContent = isPending ? 'Leave shop' : 'Next wave';
    }
    if (this.shopUpgrades) {
      this.shopUpgrades.classList.toggle('hidden', isPending);
    }
    if (this.shopStepBrowse) {
      this.shopStepBrowse.classList.toggle('hidden', isPending);
    }
    if (this.shopStepSwap) {
      this.shopStepSwap.classList.toggle('hidden', !isPending);
    }
    if (this.shopCancelBuy) {
      this.shopCancelBuy.classList.toggle('hidden', !isPending);
    }

    if (!isPending) {
      this.renderShopUpgrades(game);
      this.renderShopBrowse(game);
      return;
    }

    this.renderShopSwap(game);
  }

  renderShopBrowse(game) {
    if (!this.shopList) return;
    this.shopList.innerHTML = '';
    game.shopCards.forEach((sc, idx) => {
      const card = makeCardEl(sc, { layout: 'tile' });
      const buyBtn = document.createElement('button');
      buyBtn.type = 'button';
      const canAfford = game.score >= sc.cost;
      if (sc.bought) {
        card.classList.add('bought');
        buyBtn.textContent = 'Bought';
        buyBtn.disabled = true;
      } else {
        buyBtn.textContent = canAfford ? `Buy · ${sc.cost}` : `Need ${sc.cost - game.score}`;
        buyBtn.disabled = !canAfford;
        if (canAfford) {
          card.classList.add('shop-selectable');
          card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            this.beginPendingBuy(idx);
          });
        } else {
          card.classList.add('disabled');
        }
        buyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.beginPendingBuy(idx);
        });
      }
      card.querySelector('.footer').appendChild(buyBtn);
      this.shopList.appendChild(card);
    });
  }

  renderShopSwap(game) {
    const pendingIdx = game.pendingShopBuyIndex;
    if (this.shopPendingCard) {
      this.shopPendingCard.innerHTML = '';
      const sc = game.shopCards[pendingIdx];
      if (sc) {
        const summary = document.createElement('p');
        summary.className = 'shop-pending-label';
        summary.textContent = 'Buying';
        this.shopPendingCard.appendChild(summary);
        const card = makeCardEl(sc, { layout: 'tile' });
        card.classList.add('shop-pending-tile');
        const footer = card.querySelector('.footer');
        if (footer) footer.remove();
        this.shopPendingCard.appendChild(card);
      }
    }

    if (!this.shopDeckGrid) return;
    this.shopDeckGrid.innerHTML = '';
    if (this.shopDeckHint) {
      this.shopDeckHint.textContent = 'Tap a card below to remove it from your deck.';
    }
    if (game.deck) {
      const sorted = sortDeckCards(game.deck.list(), this.shopDeckSort.key, this.shopDeckSort.asc);
      for (const dc of sorted) {
        this.shopDeckGrid.appendChild(makeShopDeckChip(dc, () => this.confirmSwap(dc.id)));
      }
    }
    this.updateSortButtons();
  }

  sync(game) {
    this.elScore.textContent = game.score.toLocaleString();
    if (this.elTotalEarned) {
      const earned = game.runStats?.totalPointsEarned ?? 0;
      this.elTotalEarned.textContent = earned.toLocaleString();
    }
    if (this.elBaseHp) {
      if (game.baseMaxHp > 0) {
        this.elBaseHp.textContent = `${Math.ceil(game.baseHp)} / ${game.baseMaxHp}`;
      } else {
        this.elBaseHp.textContent = '--';
      }
    }
    this.elWave.textContent = `${Math.max(0, game.wave)} / ${CONFIG.TOTAL_WAVES}`;
    this.elTier.textContent = String(game.speedTier() + 1);
    this.elPieces.textContent = (game.phase === 'BUILD' || game.phase === 'PLACING_BASE')
      ? String(game.piecesLeftThisBuild) : '--';
    if (game.phase === 'WAVE') {
      const remaining = (game.waveSpawner ? (game.waveSpawner.schedule.length - game.waveSpawner.i) : 0) + game.enemies.length;
      this.elEnemies.textContent = String(remaining);
    } else {
      this.elEnemies.textContent = '--';
    }
    if (this.elWaveSpeed) {
      this.elWaveSpeed.textContent = game.phase === 'WAVE' ? `${game.waveSpeed}x` : `${game.waveSpeed}x (idle)`;
    }
    this.elPhase.textContent = phaseLabel(game.phase, game.gameMode);
    if (this.elPhase) {
      this.elPhase.dataset.phase = game.phase;
    }
    this.drawNextPiece(game);
    this.drawHoldPiece(game);
    this.renderWavePreview(game);
    this.renderDeckChips(game);
    if (this.helpBtn) {
      const canHelp = game.phase !== 'IDLE' && game.phase !== 'GAMEOVER' && game.phase !== 'WIN';
      this.helpBtn.disabled = !canHelp;
    }
    if (window.TTD?.mobileControls) {
      window.TTD.mobileControls.syncVisibility();
    }
    this._updateRichPresence(game);
    // Re-render shop if open and points changed (so cost-based affordability stays fresh).
    if (game.phase === 'SHOP' && this.shopModal && !this.shopModal.classList.contains('hidden')) {
      if (this.shopPoints) this.shopPoints.textContent = String(game.score);
      if (this._lastShopScore !== game.score) {
        this._lastShopScore = game.score;
        if (!game.hasPendingShopBuy()) {
          this.renderShop();
        }
      }
    }
  }

  _updateRichPresence(game) {
    if (typeof Platform === 'undefined' || !Platform.setRichPresence) return;
    if (game.phase === 'IDLE' || game.phase === 'GAMEOVER' || game.phase === 'WIN') return;
    const sig = `${game.phase}:${game.wave}:${game.gameMode?.id || 'classic'}`;
    if (this._lastPresenceSig === sig) return;
    this._lastPresenceSig = sig;
    const label = phaseLabel(game.phase, game.gameMode);
    Platform.setRichPresence(`${label} · Wave ${Math.max(0, game.wave)}`);
  }

  renderDeckChips(game) {
    if (!this.elDeckChips) return;
    if (!game.deck) {
      this.elDeckChips.innerHTML = '';
      if (this.elDeckCount) this.elDeckCount.textContent = '';
      return;
    }
    const cards = game.deck.list();
    if (this.elDeckCount) this.elDeckCount.textContent = `(${cards.length})`;
    // Avoid wholesale rebuilds when the chip set hasn't changed.
    const sig = cards.map((c) => `${c.id}:${c.rarity}:${c.role}:${c.shape}`).join('|');
    if (this._lastDeckSig === sig) return;
    this._lastDeckSig = sig;
    this.elDeckChips.innerHTML = '';
    for (const c of cards) {
      const chip = document.createElement('div');
      chip.className = 'deck-chip';
      chip.dataset.rarity = c.rarity;
      chip.dataset.shape = c.shape;
      const label = document.createElement('span');
      label.className = 'deck-chip-shape';
      label.textContent = c.shape;
      chip.appendChild(label);
      const mark = document.createElement('span');
      mark.className = 'role-mark';
      mark.textContent = (ROLE_GLYPHS[c.role] || c.role[0]).slice(0, 1);
      chip.appendChild(mark);
      chip.dataset.tooltip = `${c.name}\n${c.role} • ${c.rarity}\n${formatStats(c.stats)}`;
      this.elDeckChips.appendChild(chip);
    }
  }

  renderWavePreview(game) {
    if (!this.elWavePreview) return;
    // While a wave is active, the HUD already tells the player what's left.
    // Show the preview before the wave starts (BUILD / PLACING_BASE) or in shop.
    const showPreview =
      game.phase === 'BUILD' ||
      game.phase === 'PLACING_BASE' ||
      game.phase === 'SHOP';
    if (!showPreview || game.wave > CONFIG.TOTAL_WAVES) {
      const sig = `hidden:${game.phase}`;
      if (this._lastWavePreviewSig === sig) return;
      this._lastWavePreviewSig = sig;
      this.elWavePreview.innerHTML = '<span class="muted">--</span>';
      return;
    }
    const targetWave = Math.max(1, game.wave);
    const preview = (typeof previewWave === 'function') ? previewWave(targetWave) : null;
    if (!preview) return;
    const sig = `w${targetWave}:${preview.walkers}-${preview.brutes}-${preview.flyers}-${preview.rushers || 0}-${preview.shielded || 0}-${preview.boss}-${preview.bossLabel || ''}`;
    if (this._lastWavePreviewSig === sig) return;
    this._lastWavePreviewSig = sig;
    const parts = [];
    if (preview.isBossWave) {
      parts.push(['boss', '✶', `BOSS ${preview.bossLabel || ''}`]);
    }
    if (preview.walkers > 0) parts.push(['walker', '●', preview.walkers]);
    if (preview.brutes > 0)  parts.push(['brute',  '■', preview.brutes]);
    if (preview.flyers > 0)  parts.push(['flyer',  '✦', preview.flyers]);
    if (preview.rushers > 0) parts.push(['rusher', '»', preview.rushers]);
    if (preview.shielded > 0) parts.push(['shielded', '◆', preview.shielded]);
    if (preview.boss > 0 && !preview.isBossWave) parts.push(['boss', '✶', preview.boss]);
    this.elWavePreview.innerHTML = parts
      .map(([type, sym, n]) => `<span class="enemy-pill" data-type="${type}"><span class="swatch"></span>${sym} ${n}</span>`)
      .join('');
  }

  drawNextPiece(game) {
    if (!this.nextCtx || !this.elNextCanvas) return;
    const ctx = this.nextCtx;
    const w = this.elNextCanvas.width, h = this.elNextCanvas.height;
    ctx.fillStyle = CONFIG.COLORS.BG;
    ctx.fillRect(0, 0, w, h);
    if (game.phase !== 'BUILD' && game.phase !== 'PLACING_BASE') return;
    if (!game.deck) return;
    const peek = game.deck.peek(1);
    if (peek.length === 0) return;
    drawCardPreview(ctx, w, h, peek[0]);
  }

  drawHoldPiece(game) {
    if (!this.holdCtx || !this.elHoldCanvas) return;
    const ctx = this.holdCtx;
    const w = this.elHoldCanvas.width, h = this.elHoldCanvas.height;
    ctx.fillStyle = CONFIG.COLORS.BG;
    ctx.fillRect(0, 0, w, h);
    if (game.phase !== 'BUILD' && game.phase !== 'PLACING_BASE') return;
    if (!game.heldCard) {
      ctx.fillStyle = '#475569';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('empty', w / 2, h / 2);
      return;
    }
    drawCardPreview(ctx, w, h, game.heldCard, { dimmed: game.holdUsedThisPiece });
  }
}

// Shared canvas card preview used by Next and Hold panels.
function drawCardPreview(ctx, w, h, card, opts = {}) {
  if (!card) return;
  const m = SHAPES[card.shape][0];
  const margin = 6;
  const cell = Math.floor(Math.min(w, h) - margin * 2) / 4;
  const ox = (w - 4 * cell) / 2;
  const oy = (h - 4 * cell) / 2;
  ctx.fillStyle = CONFIG.RARITY_GLOW[card.rarity] || 'rgba(0,0,0,0)';
  ctx.fillRect(2, 2, w - 4, h - 4);
  drawBlockMatrix(ctx, m, ox, oy, cell, {
    role: card.role,
    shape: card.shape,
    rarity: card.rarity,
    showSynergy: false,
    dimmed: !!opts.dimmed,
  });
  ctx.strokeStyle = CONFIG.RARITY_COLORS[card.rarity] || '#777';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${card.role}`, w / 2, h - 4);
}

function phaseLabel(phase, gameMode) {
  let label;
  switch (phase) {
    case 'PLACING_BASE': label = 'Place Home Base'; break;
    case 'BUILD':        label = 'Build Phase'; break;
    case 'WAVE':         label = 'Wave Phase'; break;
    case 'SHOP':         label = 'Card Shop'; break;
    case 'GAMEOVER':     label = 'Game Over'; break;
    case 'WIN':          label = 'Victory'; break;
    default:             label = 'Idle';
  }
  if (gameMode && gameMode.id !== 'classic' && phase !== 'IDLE' && phase !== 'GAMEOVER' && phase !== 'WIN') {
    return `${gameMode.name} · ${label}`;
  }
  return label;
}

function formatStats(stats) {
  const parts = [];
  if (stats.hp) parts.push(`hp:${stats.hp}`);
  if (stats.range) parts.push(`rng:${stats.range}`);
  if (stats.damage) parts.push(`dmg:${stats.damage}`);
  if (stats.fireRate) parts.push(`rate:${stats.fireRate.toFixed(2)}s`);
  if (stats.splashRadius) parts.push(`aoe:${stats.splashRadius}`);
  if (stats.slowFactor) parts.push(`slow:${Math.round(stats.slowFactor * 100)}%`);
  if (stats.pierce) parts.push(`pierce:${stats.pierce}`);
  if (stats.multishot) parts.push(`x${stats.multishot}`);
  if (stats.passiveIncome) parts.push(`+${stats.passiveIncome}/wave`);
  return parts.join(' ');
}

// Build a card UI element used by both the shop and the deck-pick panes.
function makeShopDeckChip(card, onPick) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'deck-chip shop-deck-chip';
  chip.dataset.rarity = card.rarity;
  chip.dataset.shape = card.shape;
  chip.title = `${card.name} — ${card.role} (${card.rarity})`;
  const label = document.createElement('span');
  label.className = 'deck-chip-shape';
  label.textContent = card.shape;
  chip.appendChild(label);
  const mark = document.createElement('span');
  mark.className = 'role-mark';
  mark.textContent = (ROLE_GLYPHS[card.role] || card.role[0]).slice(0, 1);
  chip.appendChild(mark);
  chip.addEventListener('click', onPick);
  return chip;
}

function makeCardEl(card, opts = {}) {
  const isTile = opts.layout === 'tile';
  const isRow = opts.layout === 'row';
  const el = document.createElement('div');
  el.className = 'card' + (isTile ? ' card-tile' : isRow ? ' card-row' : '');
  el.dataset.rarity = card.rarity;
  el.style.borderColor = CONFIG.RARITY_COLORS[card.rarity] || 'transparent';

  const rarity = document.createElement('div');
  rarity.className = 'rarity-tag';
  rarity.textContent = card.rarity;
  rarity.style.color = CONFIG.RARITY_COLORS[card.rarity];
  el.appendChild(rarity);

  const shapeBadge = document.createElement('span');
  shapeBadge.className = isRow ? 'shape-badge shape-badge-lg' : 'shape-badge';
  shapeBadge.style.background = CONFIG.COLORS[card.shape];
  shapeBadge.textContent = card.shape;

  const name = document.createElement('div');
  name.className = 'name';
  if (!isRow) name.appendChild(shapeBadge);
  name.appendChild(document.createTextNode(card.name));

  const roleLine = document.createElement('div');
  roleLine.className = 'role-line';
  roleLine.textContent = `${ROLE_GLYPHS[card.role] || ''} ${card.role}`;

  const stats = document.createElement('div');
  stats.className = 'stats';
  for (const part of formatStatsList(card.stats)) {
    const pill = document.createElement('span');
    pill.className = 'stat-pill';
    pill.textContent = part;
    stats.appendChild(pill);
  }

  const footer = document.createElement('div');
  footer.className = isRow ? 'card-row-actions' : 'footer';
  if (opts.showCost && !isTile) {
    const cost = document.createElement('span');
    cost.className = 'cost';
    cost.textContent = `${card.cost} pts`;
    footer.appendChild(cost);
  } else if (!isRow && !isTile) {
    footer.appendChild(document.createElement('span'));
  }

  if (isRow) {
    const shapeCol = document.createElement('div');
    shapeCol.className = 'card-row-shape';
    shapeCol.appendChild(shapeBadge);
    const body = document.createElement('div');
    body.className = 'card-row-body';
    body.appendChild(name);
    body.appendChild(roleLine);
    body.appendChild(stats);
    el.appendChild(shapeCol);
    el.appendChild(body);
    if (opts.showCost) el.appendChild(footer);
  } else if (isTile) {
    el.appendChild(name);
    el.appendChild(roleLine);
    el.appendChild(stats);
    el.appendChild(footer);
  } else {
    el.appendChild(name);
    el.appendChild(roleLine);
    el.appendChild(stats);
    el.appendChild(footer);
  }
  return el;
}

function formatStatsList(stats) {
  const parts = [];
  if (stats.hp)            parts.push(`HP ${stats.hp}`);
  if (stats.range)         parts.push(`Rng ${stats.range}`);
  if (stats.damage)        parts.push(`Dmg ${stats.damage}`);
  if (stats.fireRate)      parts.push(`${stats.fireRate.toFixed(2)}s`);
  if (stats.splashRadius)  parts.push(`AoE ${stats.splashRadius}`);
  if (stats.slowFactor)    parts.push(`Slow ${Math.round(stats.slowFactor * 100)}%`);
  if (stats.pierce)        parts.push(`Pierce ${stats.pierce}`);
  if (stats.multishot)     parts.push(`x${stats.multishot}`);
  if (stats.passiveIncome) parts.push(`+${stats.passiveIncome}/wave`);
  if (stats.baseHpBonus)   parts.push(`+${stats.baseHpBonus} base HP`);
  return parts;
}

const SHAPE_SORT_ORDER = Object.fromEntries(SHAPE_KEYS.map((s, i) => [s, i]));
const ROLE_SORT_ORDER = {
  wall: 0, shooter: 1, gunner: 2, sniper: 3, splash: 4, slow: 5, piercer: 6, multishot: 7,
};

function sortDeckCards(cards, sortKey, asc) {
  const copy = cards.slice();
  copy.sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'shape':
        cmp = (SHAPE_SORT_ORDER[a.shape] ?? 99) - (SHAPE_SORT_ORDER[b.shape] ?? 99);
        if (cmp === 0) cmp = a.shape.localeCompare(b.shape);
        break;
      case 'role':
        cmp = (ROLE_SORT_ORDER[a.role] ?? 99) - (ROLE_SORT_ORDER[b.role] ?? 99);
        if (cmp === 0) cmp = a.role.localeCompare(b.role);
        break;
      case 'rarity':
        cmp = (RARITY_INDEX[a.rarity] ?? 0) - (RARITY_INDEX[b.rarity] ?? 0);
        break;
      case 'name':
        cmp = a.name.localeCompare(b.name);
        break;
      case 'cost':
        cmp = (a.cost ?? 0) - (b.cost ?? 0);
        break;
      default:
        cmp = 0;
    }
    if (cmp === 0) cmp = a.id.localeCompare(b.id);
    return asc ? cmp : -cmp;
  });
  return copy;
}
