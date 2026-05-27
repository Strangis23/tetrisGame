// Central game state + phase FSM.
// Phases:
//   PLACING_BASE -> BUILD -> WAVE -> [SHOP every 5 waves] -> next BUILD
//   GAMEOVER, WIN are terminal. Pieces and enemies never share field at once.
class Game {
  constructor() {
    this.reset();
  }

  reset() {
    this.grid = new Grid(CONFIG.GRID_W, CONFIG.GRID_H);
    this.deck = null; // populated in startNewRun()
    this.activePiece = null;
    this.phase = 'IDLE';
    this.score = 0;
    this.wave = 0;
    this.piecesLeftThisBuild = 0;
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.fallTimer = 0;
    this.lockTimer = 0;
    this.softDropping = false;
    this.paused = false;
    this.helpOpen = false;
    this._wasPausedBeforeHelp = false;
    this.banner = null;
    this.waveSpawner = null;
    this.input = null;
    this.shopCards = []; // currently offered shop cards (each annotated with .bought boolean)
    this.pendingShopBuyIndex = -1; // shop card awaiting deck swap (-1 = none)
    this.waveSpeed = 1;  // player-controlled wave time-scale (1x / 2x / 3x)
    this.waveStats = { kills: 0, points: 0, income: 0 };
    this.heldCard = null;          // Tetris-style hold slot
    this.holdUsedThisPiece = false; // reset on lock so each spawn allows one hold
    this.baseHp = 0;
    this.baseMaxHp = 0;
    this.baseHpLevel = 0;
    this.baseHpBonus = 0;       // shop fortify purchases
    this.baseWallBonus = 0;     // legendary wall passive (stacked per placed cell)
    this._basePieceHp = 0;      // sum of card HP on base cells at placement
  }

  // Swap the active piece with the held card (or draw a new one if hold is empty).
  // Limited to one swap per piece to prevent stalling.
  holdSwap() {
    if (this.phase !== 'BUILD' && this.phase !== 'PLACING_BASE') return false;
    if (!this.activePiece) return false;
    if (this.holdUsedThisPiece) return false;
    const currentCard = this.activePiece.card;
    if (this.heldCard) {
      this.activePiece = new Piece(this.heldCard);
      this.heldCard = currentCard;
    } else {
      this.heldCard = currentCard;
      const next = this.deck.draw();
      this.activePiece = new Piece(next);
    }
    this.fallTimer = 0;
    this.lockTimer = 0;
    this.holdUsedThisPiece = true;
    if (this.activePiece.collides(this.grid)) {
      this.lose('Top-out: blocks reached the spawn area.');
      return false;
    }
    return true;
  }

  // Compute repair cost for a placed cell. Returns { cost, missing, isBase }.
  repairCost(cell) {
    const perHp = CONFIG.REPAIR_COST_PER_HP || 10;
    if (cell.isBase) {
      const missing = Math.max(0, this.baseMaxHp - this.baseHp);
      const mult = CONFIG.REPAIR_BASE_MULTIPLIER || 4;
      const cost = Math.max(1, Math.ceil(missing * perHp * mult));
      return { cost, missing, isBase: true };
    }
    const missing = Math.max(0, cell.maxHp - cell.hp);
    const rarityMult = (CONFIG.REPAIR_RARITY_MULT && CONFIG.REPAIR_RARITY_MULT[cell.rarity]) || 1;
    const cost = Math.max(1, Math.ceil(missing * perHp * rarityMult));
    return { cost, missing, isBase: false };
  }

  // Spend points to fully restore a damaged cell. Returns { ok, spent, reason }.
  repairCell(x, y) {
    if (this.phase !== 'BUILD' && this.phase !== 'PLACING_BASE') {
      return { ok: false, reason: 'Repairs only available during the build phase' };
    }
    const cell = this.grid.get(x, y);
    if (!cell) return { ok: false, reason: 'No block here' };
    const { cost, missing, isBase } = this.repairCost(cell);
    if (missing <= 0) return { ok: false, reason: 'Already at full HP' };
    if (this.score < cost) return { ok: false, reason: `Need ${cost - this.score} more points` };
    this.score -= cost;
    if (isBase) {
      this.baseHp = this.baseMaxHp;
      this.grid.syncBaseHpDisplay(this.baseHp, this.baseMaxHp);
      this.setBanner(`Base repaired (-${cost})`, 0.6);
    } else {
      cell.hp = cell.maxHp;
      const name = (ROLE_NAMES[cell.role] && ROLE_NAMES[cell.role][cell.rarity]) || cell.role;
      this.setBanner(`${name} repaired (-${cost})`, 0.6);
    }
    return { ok: true, spent: cost };
  }

  cycleWaveSpeed() {
    const steps = CONFIG.WAVE_SPEED_STEPS || [1, 2, 3];
    const idx = Math.max(0, steps.indexOf(this.waveSpeed));
    this.waveSpeed = steps[(idx + 1) % steps.length];
    if (this.phase === 'WAVE') this.setBanner(`${this.waveSpeed}x`, 0.5);
  }

  startNewRun() {
    this.reset();
    this.deck = new Deck(makeStarterDeck());
    this.phase = 'PLACING_BASE';
    this.piecesLeftThisBuild = 1;
    this.spawnNextPiece();
    this.setBanner('Place Your Home Base', 1.6);
  }

  setBanner(text, life = 1.4) {
    this.banner = { text, t: 0, life };
  }

  togglePause() {
    if (this.phase === 'GAMEOVER' || this.phase === 'WIN' || this.phase === 'IDLE') return;
    if (this.helpOpen) {
      this.closeHelp();
      return;
    }
    this.paused = !this.paused;
    if (this.paused) this.setBanner('Paused', 99); else this.banner = null;
  }

  openHelp() {
    if (this.phase === 'GAMEOVER' || this.phase === 'WIN' || this.phase === 'IDLE') return;
    if (this.helpOpen) return;
    this._wasPausedBeforeHelp = this.paused;
    this.helpOpen = true;
    this.paused = true;
    this.banner = null;
  }

  closeHelp() {
    if (!this.helpOpen) return;
    this.helpOpen = false;
    this.paused = this._wasPausedBeforeHelp;
    if (!this.paused) this.banner = null;
  }

  recomputeBasePool() {
    this.baseMaxHp = Math.max(1, this._basePieceHp + this.baseHpBonus + this.baseWallBonus);
    if (this.baseHp > this.baseMaxHp) this.baseHp = this.baseMaxHp;
    if (this.baseMaxHp > 0 && this.baseHp <= 0) this.baseHp = 0;
    this.grid.syncBaseHpDisplay(this.baseHp, this.baseMaxHp);
  }

  initBasePoolFromPlacement(card, cellCount) {
    const perCell = card.stats.hp || 1;
    this._basePieceHp = perCell * cellCount;
    this.baseHp = Math.max(1, this._basePieceHp + this.baseHpBonus + this.baseWallBonus);
    this.baseMaxHp = this.baseHp;
    this.grid.syncBaseHpDisplay(this.baseHp, this.baseMaxHp);
  }

  applyWallBaseHpBonus(amount) {
    if (!amount || amount <= 0) return;
    this.baseWallBonus += amount;
    const prevMax = this.baseMaxHp;
    this.recomputeBasePool();
    if (this.baseMaxHp > prevMax) {
      this.baseHp += this.baseMaxHp - prevMax;
      this.recomputeBasePool();
    }
  }

  damageBase(dmg) {
    if (dmg <= 0 || this.baseMaxHp <= 0) return;
    this.baseHp = Math.max(0, this.baseHp - dmg);
    this.grid.syncBaseHpDisplay(this.baseHp, this.baseMaxHp);
    if (this.baseHp <= 0) {
      this.lose('Your home base was destroyed!');
    }
  }

  baseUpgradeCost() {
    const cfg = CONFIG.BASE_UPGRADE || {};
    const base = cfg.baseCost ?? 180;
    const scale = cfg.costScale ?? 1.4;
    return Math.floor(base * Math.pow(scale, this.baseHpLevel));
  }

  canBuyBaseUpgrade() {
    const cfg = CONFIG.BASE_UPGRADE || {};
    const max = cfg.maxPurchases ?? 15;
    return this.baseMaxHp > 0 && this.baseHpLevel < max;
  }

  setPendingShopBuy(index) {
    this.pendingShopBuyIndex = index;
  }

  clearPendingShopBuy() {
    this.pendingShopBuyIndex = -1;
  }

  hasPendingShopBuy() {
    return this.pendingShopBuyIndex >= 0;
  }

  buyBaseUpgrade() {
    if (this.phase !== 'SHOP') return { ok: false, reason: 'Shop closed' };
    if (this.hasPendingShopBuy()) return { ok: false, reason: 'Finish or cancel card swap first' };
    if (!this.canBuyBaseUpgrade()) return { ok: false, reason: 'Max upgrades reached' };
    const cost = this.baseUpgradeCost();
    if (this.score < cost) return { ok: false, reason: 'Not enough points' };
    const cfg = CONFIG.BASE_UPGRADE || {};
    const hpGain = cfg.hpPerPurchase ?? 30;
    this.score -= cost;
    this.baseHpLevel += 1;
    this.baseHpBonus += hpGain;
    this.baseHp += hpGain;
    this.recomputeBasePool();
    return { ok: true, spent: cost, hpGain };
  }

  speedTier() {
    const w = Math.max(1, this.wave);
    return Math.min(CONFIG.FALL_SPEEDS.length - 1, Math.floor((w - 1) / CONFIG.WAVES_PER_SPEEDUP));
  }

  fallInterval() {
    return CONFIG.FALL_SPEEDS[this.speedTier()];
  }

  piecesPerBuild() {
    return CONFIG.PIECES_PER_WAVE;
  }

  spawnNextPiece() {
    const card = this.deck.draw();
    this.activePiece = new Piece(card);
    this.fallTimer = 0;
    this.lockTimer = 0;
    this.holdUsedThisPiece = false;
    if (this.activePiece.collides(this.grid)) {
      this.lose('Top-out: blocks reached the spawn area.');
    }
  }

  // ---------- input handlers ----------
  movePiece(dx, dy) {
    if (!this.activePiece) return;
    if (this.activePiece.tryMove(this.grid, dx, dy)) this.lockTimer = 0;
  }
  rotatePiece(dir) {
    if (!this.activePiece) return;
    if (this.activePiece.tryRotate(this.grid, dir)) this.lockTimer = 0;
  }
  softDrop(on) { this.softDropping = on; }
  hardDrop() {
    if (!this.activePiece) return;
    this.activePiece.hardDrop(this.grid);
    this.lockPiece();
  }

  // ---------- main update ----------
  update(dt) {
    if (this.phase !== 'WAVE' && this.projectiles.length > 0) {
      this.projectiles = [];
    }
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.life) this.banner = null;
    }
    for (const fx of this.effects) fx.t += dt;
    this.effects = this.effects.filter((fx) => fx.t < fx.life);

    switch (this.phase) {
      case 'PLACING_BASE': this.updateBuildOrPlacing(dt, true); break;
      case 'BUILD':        this.updateBuildOrPlacing(dt, false); break;
      case 'WAVE':         this.updateWave(dt); break;
      case 'SHOP':         break;
      default: break;
    }
  }

  updateBuildOrPlacing(dt) {
    if (!this.activePiece) return;
    const interval = this.softDropping ? this.fallInterval() / CONFIG.SOFT_DROP_FACTOR : this.fallInterval();
    this.fallTimer += dt;
    if (this.fallTimer >= interval) {
      this.fallTimer = 0;
      if (!this.activePiece.tryMove(this.grid, 0, 1)) {
        this.lockTimer += interval;
        if (this.lockTimer >= CONFIG.LOCK_DELAY) this.lockPiece();
      } else {
        this.lockTimer = 0;
      }
    }
  }

  lockPiece() {
    const piece = this.activePiece;
    if (!piece) return;
    const placed = piece.cells();
    const isBase = this.phase === 'PLACING_BASE';

    this.grid.registerPlacement(placed, piece.card, isBase);

    if (isBase) {
      this.initBasePoolFromPlacement(piece.card, placed.length);
    } else if (piece.card.stats && piece.card.stats.baseHpBonus) {
      this.applyWallBaseHpBonus(piece.card.stats.baseHpBonus);
    }

    this.activePiece = null;
    if (this.grid.isToppedOut()) {
      this.lose('Top-out: blocks reached the spawn area.');
      return;
    }

    const fullRows = this.grid.findFullRows();
    if (fullRows.length > 0) {
      for (const y of fullRows) {
        this.effects.push({ type: 'lineClear', x: 0, y, t: 0, life: 0.4 });
      }
      const destroyed = this.grid.clearRows(fullRows);
      const baseDestroyed = destroyed.some((d) => d.cell.isBase);
      const bonus = CONFIG.LINE_BONUS[fullRows.length] || (fullRows.length * 200);
      this.score += bonus;
      if (baseDestroyed) {
        this.lose('Your home base was cleared away with the line!');
        return;
      }
      if (typeof recalculateGridSynergy === 'function') {
        recalculateGridSynergy(this.grid);
      }
    }

    if (isBase) {
      this.phase = 'BUILD';
      this.wave = 1;
      this.piecesLeftThisBuild = this.piecesPerBuild();
      this.setBanner(`Wave ${this.wave} — Build`, 1.4);
      this.spawnNextPiece();
      return;
    }

    this.piecesLeftThisBuild--;
    if (this.piecesLeftThisBuild <= 0) {
      this.startWave();
    } else {
      this.spawnNextPiece();
    }
  }

  // ---------- wave phase ----------
  startWave() {
    this.activePiece = null;
    this.phase = 'WAVE';
    this.enemies = [];
    this.clearCombatVisuals();
    this.waveSpawner = makeWaveSpawner(this.wave);
    const bossInfo = typeof getBossWaveInfo === 'function' ? getBossWaveInfo(this.wave) : null;
    if (bossInfo) {
      this.setBanner(`BOSS — Elite ${bossInfo.label}!`, 2.2);
    } else {
      this.setBanner(`Wave ${this.wave} — Defend!`, 1.6);
    }
    this.waveStats = { kills: 0, points: 0, income: 0 };
    // Wall passive income at the start of each wave (scaled by per-cell effectiveness).
    let income = 0;
    this.grid.forEachCell((cell) => {
      if (cell.role === 'wall' && cell.stats && cell.stats.passiveIncome) {
        const eff = typeof effectiveness === 'function' ? effectiveness(cell) : 1;
        income += Math.floor(cell.stats.passiveIncome * eff);
      }
    });
    if (income > 0) {
      this.score += income;
      this.waveStats.income = income;
    }
  }

  updateWave(dt) {
    const dtScaled = dt * (this.waveSpeed || 1);
    const sp = this.waveSpawner;
    if (sp && sp.i < sp.schedule.length) {
      sp.t += dtScaled;
      while (sp.i < sp.schedule.length && sp.t >= sp.schedule[sp.i].at) {
        const item = sp.schedule[sp.i];
        this.enemies.push(makeEnemy(item.type, this.grid, this.wave, { elite: !!item.elite }));
        sp.i++;
      }
    }

    for (const e of this.enemies) {
      try { e.update(dtScaled, this); }
      catch (err) { console.error('enemy.update threw:', err, e); e.dead = true; }
    }
    for (const e of this.enemies) {
      if (e.atBase && !e.dead) {
        try { e.siegeBase(dtScaled, this); }
        catch (err) { console.error('siegeBase threw:', err, e); }
      }
    }
    const killed = this.enemies.filter((e) => e.dead && !e.despawned);
    for (const e of killed) {
      const scale = CONFIG.KILL_REWARD_WAVE_SCALE ?? 0.012;
      const pts = Math.floor(e.stats.reward * (1 + (this.wave - 1) * scale));
      this.score += pts;
      this.waveStats.kills += 1;
      this.waveStats.points += pts;
    }
    this.enemies = this.enemies.filter((e) => !e.dead);

    try { applyProximityDamage(this, dtScaled); }
    catch (err) { console.error('applyProximityDamage threw:', err); }

    try { updateTowers(this, dtScaled); }
    catch (err) { console.error('updateTowers threw:', err); }

    for (const p of this.projectiles) {
      try { p.update(dtScaled, this); }
      catch (err) { console.error('projectile.update threw:', err, p); p.dead = true; }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);

    if (sp && sp.i >= sp.schedule.length && this.enemies.length === 0) {
      this.endWave();
    }
  }

  endWave() {
    this.clearCombatVisuals();
    const stats = this.waveStats || { kills: 0, points: 0, income: 0 };
    const summary = `Wave ${this.wave} cleared — ${stats.kills} kills • +${stats.points + stats.income} pts`;
    if (this.wave >= CONFIG.TOTAL_WAVES) {
      this.phase = 'WIN';
      this.setBanner(`Victory! Final score: ${this.score}`, 99);
      window.dispatchEvent(new CustomEvent('ttd-game-end', {
        detail: { win: true, score: this.score, wave: this.wave },
      }));
      return;
    }
    this.setBanner(summary, 2.0);
    if (this.wave % CONFIG.WAVES_PER_SHOP === 0) {
      this.openShop();
      return;
    }
    this.advanceToNextBuild();
  }

  openShop() {
    this.clearCombatVisuals();
    this.phase = 'SHOP';
    this.clearPendingShopBuy();
    this.shopCards = generateShopCards(this.wave, CONFIG.SHOP_CARD_COUNT).map((c) => ({ ...c, bought: false }));
    window.dispatchEvent(new CustomEvent('ttd-shop-open', { detail: { wave: this.wave } }));
  }

  // Buy a shop card and replace one deck card. Returns { ok, reason }.
  buyCard(shopIndex, removeDeckCardId) {
    if (this.phase !== 'SHOP') return { ok: false, reason: 'Shop closed' };
    if (this.pendingShopBuyIndex >= 0 && this.pendingShopBuyIndex !== shopIndex) {
      return { ok: false, reason: 'Another card purchase is pending' };
    }
    const sc = this.shopCards[shopIndex];
    if (!sc) return { ok: false, reason: 'Bad shop index' };
    if (sc.bought) return { ok: false, reason: 'Already bought' };
    if (this.score < sc.cost) return { ok: false, reason: 'Not enough points' };
    if (!this.deck.has(removeDeckCardId)) return { ok: false, reason: 'Deck card not found' };
    const newCard = { id: nextCardId(), shape: sc.shape, role: sc.role, rarity: sc.rarity, name: sc.name, cost: sc.cost, stats: { ...sc.stats } };
    if (!this.deck.replace(removeDeckCardId, newCard)) return { ok: false, reason: 'Replace failed' };
    this.score -= sc.cost;
    sc.bought = true;
    this.clearPendingShopBuy();
    return { ok: true };
  }

  advanceToNextBuild() {
    this.clearCombatVisuals();
    this.wave += 1;
    if (this.wave > CONFIG.TOTAL_WAVES) {
      this.phase = 'WIN';
      this.setBanner(`Victory! Final score: ${this.score}`, 99);
      return;
    }
    this.phase = 'BUILD';
    this.piecesLeftThisBuild = this.piecesPerBuild();
    if ((this.wave - 1) % CONFIG.WAVES_PER_SPEEDUP === 0 && this.wave > 1) {
      this.setBanner(`Speed Up! Tier ${this.speedTier() + 1}`, 1.4);
    }
    // No generic "Wave N — Build" banner: the end-of-wave summary banner is more
    // useful, and the phase indicator + wave counter already convey the rest.
    this.spawnNextPiece();
  }

  closeShop() {
    if (this.phase !== 'SHOP') return;
    this.clearPendingShopBuy();
    this.advanceToNextBuild();
  }

  lose(reason) {
    this.phase = 'GAMEOVER';
    this.clearCombatVisuals();
    this.setBanner('Game Over', 99);
    window.dispatchEvent(new CustomEvent('ttd-game-end', {
      detail: { win: false, reason, score: this.score, wave: this.wave },
    }));
  }

  // Strip in-flight projectiles and combat VFX when leaving the wave phase.
  clearCombatVisuals() {
    this.projectiles = [];
    this.enemies = [];
    this.waveSpawner = null;
    const combatFx = new Set(['muzzle', 'spark', 'splash']);
    this.effects = this.effects.filter((fx) => !combatFx.has(fx.type));
  }
}
