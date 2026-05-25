// HUD + modal management. Handles the persistent deck panel and the
// shop-with-swap flow.
class UI {
  constructor(game) {
    this.game = game;
    this.elScore = document.getElementById('score');
    this.elWave = document.getElementById('wave');
    this.elTier = document.getElementById('speed-tier');
    this.elPieces = document.getElementById('pieces-left');
    this.elEnemies = document.getElementById('enemies-left');
    this.elWaveSpeed = document.getElementById('wave-speed');
    this.elWavePreview = document.getElementById('wave-preview');
    this.elPhase = document.getElementById('phase-indicator');
    this.elNextCanvas = document.getElementById('next-canvas');
    this.nextCtx = this.elNextCanvas.getContext('2d');
    this.elHoldCanvas = document.getElementById('hold-canvas');
    this.holdCtx = this.elHoldCanvas ? this.elHoldCanvas.getContext('2d') : null;
    this.elDeckChips = document.getElementById('deck-chips');
    this.elDeckCount = document.getElementById('deck-count');

    this.overlay = document.getElementById('overlay');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlayMessage = document.getElementById('overlay-message');
    this.overlayButton = document.getElementById('overlay-button');

    this.shopModal = document.getElementById('shop-modal');
    this.shopWave = document.getElementById('shop-wave');
    this.shopPoints = document.getElementById('shop-points');
    this.shopList = document.getElementById('shop-list');
    this.shopDeckGrid = document.getElementById('shop-deck-grid');
    this.shopDeckTitle = document.getElementById('shop-deck-title');
    this.shopDeckHint = document.getElementById('shop-deck-hint');
    this.shopClose = document.getElementById('shop-close');
    this.shopCancelBuy = document.getElementById('shop-cancel-buy');

    this.pendingBuyIndex = -1; // index into game.shopCards waiting for a deck swap

    this.shopClose.addEventListener('click', () => this.closeShop());
    this.shopCancelBuy.addEventListener('click', () => this.cancelPendingBuy());

    window.addEventListener('ttd-shop-open', (ev) => this.openShop(ev.detail.wave));
    window.addEventListener('ttd-game-end', (ev) => this.handleGameEnd(ev.detail));
  }

  showOverlay({ title, message, button = 'OK', onClick }) {
    this.overlayTitle.textContent = title;
    this.overlayMessage.textContent = message;
    this.overlayButton.textContent = button;
    this.overlay.classList.remove('hidden');
    this.overlayButton.onclick = onClick;
  }
  hideOverlay() { this.overlay.classList.add('hidden'); }

  handleGameEnd(detail) {
    const title = detail.win ? 'Victory!' : 'Game Over';
    const message = detail.win
      ? `You cleared all 100 waves. Final score: ${detail.score.toLocaleString()}.`
      : `${detail.reason || 'Run ended.'} Final score: ${detail.score.toLocaleString()}.`;
    this.showOverlay({
      title, message, button: 'Play Again',
      onClick: () => { this.hideOverlay(); this.game.startNewRun(); },
    });
  }

  openShop(wave) {
    this.shopWave.textContent = String(wave);
    this.pendingBuyIndex = -1;
    this.shopModal.classList.remove('hidden');
    this.renderShop();
  }
  closeShop() {
    this.shopModal.classList.add('hidden');
    this.pendingBuyIndex = -1;
    this.game.closeShop();
  }
  cancelPendingBuy() {
    this.pendingBuyIndex = -1;
    this.renderShop();
  }

  // Click "Buy" on a shop card. Switch the deck pane into "pick to remove" mode.
  beginPendingBuy(idx) {
    const sc = this.game.shopCards[idx];
    if (!sc || sc.bought) return;
    if (this.game.score < sc.cost) return;
    this.pendingBuyIndex = idx;
    this.renderShop();
  }

  // Click a deck card while a buy is pending. Confirm the swap.
  confirmSwap(deckCardId) {
    if (this.pendingBuyIndex < 0) return;
    const result = this.game.buyCard(this.pendingBuyIndex, deckCardId);
    if (!result.ok) {
      console.warn('buyCard failed:', result.reason);
      return;
    }
    this.pendingBuyIndex = -1;
    this.renderShop();
  }

  renderShop() {
    const game = this.game;
    this.shopPoints.textContent = String(game.score);

    // Top: shop offers.
    this.shopList.innerHTML = '';
    game.shopCards.forEach((sc, idx) => {
      const card = makeCardEl(sc, { showCost: true });
      const buyBtn = document.createElement('button');
      const canAfford = game.score >= sc.cost;
      const isPending = this.pendingBuyIndex === idx;
      if (sc.bought) {
        card.classList.add('bought');
        buyBtn.textContent = 'BOUGHT';
        buyBtn.disabled = true;
      } else if (isPending) {
        buyBtn.textContent = 'Pick deck card →';
        buyBtn.disabled = true;
      } else {
        buyBtn.textContent = canAfford ? `Buy — ${sc.cost}` : `Need ${sc.cost - game.score} more`;
        buyBtn.disabled = !canAfford;
        buyBtn.addEventListener('click', () => this.beginPendingBuy(idx));
      }
      card.querySelector('.footer').appendChild(buyBtn);
      this.shopList.appendChild(card);
    });

    // Bottom: deck panel. If a buy is pending, deck cards become "removable".
    this.shopDeckGrid.innerHTML = '';
    const isPending = this.pendingBuyIndex >= 0;
    if (isPending) {
      this.shopDeckTitle.textContent = 'Pick a card to REMOVE';
      this.shopDeckHint.textContent = 'Click any of your deck cards below to swap it for the shop card.';
      this.shopCancelBuy.classList.remove('hidden');
    } else {
      this.shopDeckTitle.textContent = `Your Deck (${game.deck ? game.deck.size() : 0})`;
      this.shopDeckHint.textContent = 'Click "Buy" on a shop card above to start a swap.';
      this.shopCancelBuy.classList.add('hidden');
    }
    if (game.deck) {
      for (const dc of game.deck.list()) {
        const card = makeCardEl(dc, { showCost: false });
        if (isPending) {
          card.classList.add('removable');
          card.title = 'Click to remove this card';
          card.addEventListener('click', () => this.confirmSwap(dc.id));
        }
        this.shopDeckGrid.appendChild(card);
      }
    }
  }

  sync(game) {
    this.elScore.textContent = game.score.toLocaleString();
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
    this.elPhase.textContent = phaseLabel(game.phase);
    this.drawNextPiece(game);
    this.drawHoldPiece(game);
    this.renderWavePreview(game);
    this.renderDeckChips(game);
    // Re-render shop if open and points changed (so cost-based affordability stays fresh).
    if (game.phase === 'SHOP' && !this.shopModal.classList.contains('hidden')) {
      this.shopPoints.textContent = String(game.score);
    }
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
      chip.textContent = c.shape;
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
    const sig = `w${targetWave}:${preview.walkers}-${preview.brutes}-${preview.flyers}-${preview.boss}`;
    if (this._lastWavePreviewSig === sig) return;
    this._lastWavePreviewSig = sig;
    const parts = [];
    if (preview.walkers > 0) parts.push(['walker', '●', preview.walkers]);
    if (preview.brutes > 0)  parts.push(['brute',  '■', preview.brutes]);
    if (preview.flyers > 0)  parts.push(['flyer',  '✦', preview.flyers]);
    if (preview.boss > 0)    parts.push(['boss',   '✶', preview.boss]);
    this.elWavePreview.innerHTML = parts
      .map(([type, sym, n]) => `<span class="enemy-pill" data-type="${type}"><span class="swatch"></span>${sym} ${n}</span>`)
      .join('');
  }

  drawNextPiece(game) {
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
  // Auto-size the cell so 4 cells fit comfortably with a 4px margin.
  const margin = 6;
  const cell = Math.floor(Math.min(w, h) - margin * 2) / 4;
  const ox = (w - 4 * cell) / 2;
  const oy = (h - 4 * cell) / 2;
  ctx.fillStyle = CONFIG.RARITY_GLOW[card.rarity] || 'rgba(0,0,0,0)';
  ctx.fillRect(2, 2, w - 4, h - 4);
  const roleColor = (CONFIG.ROLE_COLORS && CONFIG.ROLE_COLORS[card.role]) || CONFIG.COLORS[card.shape];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (m[r][c]) {
        const px = ox + c * cell + 1;
        const py = oy + r * cell + 1;
        const sz = cell - 2;
        ctx.fillStyle = roleColor;
        ctx.fillRect(px, py, sz, sz);
        const grad = ctx.createLinearGradient(0, py, 0, py + sz);
        grad.addColorStop(0, 'rgba(255,255,255,0.18)');
        grad.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = grad;
        ctx.fillRect(px, py, sz, sz);
      }
    }
  }
  if (opts.dimmed) {
    ctx.fillStyle = 'rgba(5,9,18,0.55)';
    ctx.fillRect(2, 2, w - 4, h - 4);
  }
  ctx.strokeStyle = CONFIG.RARITY_COLORS[card.rarity] || '#777';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${card.role}`, w / 2, h - 4);
}

function phaseLabel(phase) {
  switch (phase) {
    case 'PLACING_BASE': return 'Place Home Base';
    case 'BUILD':        return 'Build Phase';
    case 'WAVE':         return 'Wave Phase';
    case 'SHOP':         return 'Card Shop';
    case 'GAMEOVER':     return 'Game Over';
    case 'WIN':          return 'Victory';
    default:             return 'Idle';
  }
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
function makeCardEl(card, opts = {}) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.rarity = card.rarity;
  el.style.borderColor = CONFIG.RARITY_COLORS[card.rarity] || 'transparent';

  const rarity = document.createElement('div');
  rarity.className = 'rarity-tag';
  rarity.textContent = card.rarity;
  rarity.style.color = CONFIG.RARITY_COLORS[card.rarity];
  el.appendChild(rarity);

  const name = document.createElement('div');
  name.className = 'name';
  const shapeBadge = document.createElement('span');
  shapeBadge.className = 'shape-badge';
  shapeBadge.style.background = CONFIG.COLORS[card.shape];
  shapeBadge.textContent = card.shape;
  name.appendChild(shapeBadge);
  name.appendChild(document.createTextNode(card.name));
  el.appendChild(name);

  const roleLine = document.createElement('div');
  roleLine.className = 'role-line';
  roleLine.textContent = `${ROLE_GLYPHS[card.role] || ''} ${card.role}`;
  el.appendChild(roleLine);

  const stats = document.createElement('div');
  stats.className = 'stats';
  for (const part of formatStatsList(card.stats)) {
    const pill = document.createElement('span');
    pill.className = 'stat-pill';
    pill.textContent = part;
    stats.appendChild(pill);
  }
  el.appendChild(stats);

  const footer = document.createElement('div');
  footer.className = 'footer';
  if (opts.showCost) {
    const cost = document.createElement('span');
    cost.className = 'cost';
    cost.textContent = `${card.cost} pts`;
    footer.appendChild(cost);
  } else {
    footer.appendChild(document.createElement('span'));
  }
  el.appendChild(footer);
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
