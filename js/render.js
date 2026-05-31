// Canvas renderer. All drawing happens in pixel coords; cell size = CONFIG.CELL_PX.

class Renderer {
  constructor(ctx, canvas) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.cellPx = CONFIG.CELL_PX;
  }

  draw(game) {
    const ctx = this.ctx;
    ctx.save();
    if (game.screenShake && !(typeof getSetting === 'function' && getSetting('reduceMotion'))) {
      const s = game.screenShake;
      const prog = 1 - s.t / s.life;
      const amp = s.amp * prog;
      ctx.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
    }
    ctx.fillStyle = CONFIG.COLORS.BG;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawSpawnBuffer(game);
    this.drawGridLines();
    this.drawCells(game.grid);
    if (
      (game.phase === 'BUILD' || game.phase === 'PLACING_BASE') &&
      typeof getSetting === 'function' &&
      getSetting('pathPreview') !== false
    ) {
      this.drawPathPreview(game);
    }
    this.drawHoverRange(game);
    if (game.activePiece && (game.phase === 'BUILD' || game.phase === 'PLACING_BASE')) {
      this.drawGhost(game);
      this.drawActivePiece(game.activePiece, game.phase === 'PLACING_BASE');
    }
    if (game.phase === 'WAVE') {
      this.drawEnemies(game);
      this.drawProjectiles(game);
      this.drawCombatEffects(game);
    }
    this.drawBuildEffects(game);
    this.drawWaveBanner(game);
    ctx.restore();
  }

  drawPathPreview(game) {
    const bases = game.grid.baseCells();
    if (!bases.length) return;
    const sx = Math.floor(game.grid.w / 2);
    const sy = 0;
    const path = pathfind(game.grid, sx, sy, bases, { mode: 'walker' });
    if (!path || path.length < 2) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo((sx + 0.5) * this.cellPx, (sy + 0.5) * this.cellPx);
    for (const step of path.slice(0, 12)) {
      ctx.lineTo((step.x + 0.5) * this.cellPx, (step.y + 0.5) * this.cellPx);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawSpawnBuffer(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255, 80, 80, 0.05)';
    ctx.fillRect(0, 0, this.canvas.width, CONFIG.SPAWN_BUFFER_ROWS * this.cellPx);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, CONFIG.SPAWN_BUFFER_ROWS * this.cellPx);
    ctx.lineTo(this.canvas.width, CONFIG.SPAWN_BUFFER_ROWS * this.cellPx);
    ctx.stroke();
  }

  drawGridLines() {
    const ctx = this.ctx;
    ctx.strokeStyle = CONFIG.COLORS.GRID_LINE;
    ctx.lineWidth = 1;
    for (let x = 0; x <= CONFIG.GRID_W; x++) {
      ctx.beginPath();
      ctx.moveTo(x * this.cellPx + 0.5, 0);
      ctx.lineTo(x * this.cellPx + 0.5, this.canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= CONFIG.GRID_H; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * this.cellPx + 0.5);
      ctx.lineTo(this.canvas.width, y * this.cellPx + 0.5);
      ctx.stroke();
    }
  }

  drawCells(grid) {
    grid.forEachCell((cell, x, y) => {
      this.drawCell(x, y, cell);
    });
  }

  drawCell(x, y, cell) {
    const ctx = this.ctx;
    const px = x * this.cellPx;
    const py = y * this.cellPx;
    const damageRatio = (cell.hp < cell.maxHp && cell.maxHp > 0)
      ? 1 - Math.max(0, cell.hp / cell.maxHp)
      : 0;

    drawBlockCell(ctx, px, py, this.cellPx, {
      role: cell.role,
      shape: cell.shape,
      isBase: cell.isBase,
      rarity: cell.rarity,
      damageRatio,
      synergyMult: cell.synergyMult || 1,
    });

    // HP bar (only when damaged)
    if (cell.hp < cell.maxHp) {
      const ratio = Math.max(0, cell.hp / cell.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(px + 2, py + this.cellPx - 6, this.cellPx - 4, 3);
      ctx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#facc15' : '#ef4444';
      ctx.fillRect(px + 2, py + this.cellPx - 6, (this.cellPx - 4) * ratio, 3);
    }
  }

  drawActivePiece(piece, isBase) {
    const role = piece.card && piece.card.role;
    const rarity = piece.card && piece.card.rarity;
    drawBlockShape(this.ctx, piece.cells(), this.cellPx, {
      role,
      shape: piece.shape,
      isBase,
      rarity,
      showSynergy: false,
    });
  }

  drawGhost(game) {
    const piece = game.activePiece;
    const gy = piece.ghostY(game.grid);
    if (gy === piece.y) return;
    const role = piece.card && piece.card.role;
    drawBlockShape(this.ctx, piece.cells(piece.rotation, piece.x, gy), this.cellPx, {
      role,
      shape: piece.shape,
      alpha: 0.35,
      showRarity: false,
      showSynergy: false,
    });
  }

  drawHoverRange(game) {
    if (!CONFIG.HOVER_RANGE_INDICATOR) return;
    const m = game.input?.mouseGrid;
    if (!m) return;
    const cell = game.grid.get(m.x, m.y);
    if (!cell || !cell.stats || !cell.stats.range || cell.stats.range <= 0) return;
    const ctx = this.ctx;
    const cx = (m.x + 0.5) * this.cellPx;
    const cy = (m.y + 0.5) * this.cellPx;
    ctx.beginPath();
    ctx.arc(cx, cy, cell.stats.range * this.cellPx, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(34, 211, 238, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  drawEnemies(game) {
    const ctx = this.ctx;
    for (const e of game.enemies) {
      const cx = e.x * this.cellPx;
      const cy = e.y * this.cellPx;
      const r = e.stats.radius * this.cellPx;

      drawEnemy(ctx, cx, cy, this.cellPx, e);

      // HP bar
      if (e.hp < e.maxHp) {
        const w = this.cellPx * 0.7;
        const ratio = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(cx - w/2, cy - r - 6, w, 3);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(cx - w/2, cy - r - 6, w * ratio, 3);
      }
      if (e.maxShieldHp > 0 && e.shieldHp > 0) {
        const w = this.cellPx * 0.7;
        const ratio = Math.max(0, e.shieldHp / e.maxShieldHp);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(cx - w/2, cy - r - 11, w, 3);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(cx - w/2, cy - r - 11, w * ratio, 3);
      }
      if (e.slowTimer > 0) {
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  drawProjectiles(game) {
    const ctx = this.ctx;
    for (const p of game.projectiles) {
      // Position is stored in cell-center float coords.
      const cx = p.x * this.cellPx;
      const cy = p.y * this.cellPx;
      const r = p.radius * this.cellPx;
      const color = p.color || '#ffffff';
      // Trail behind the projectile (in the opposite direction of motion).
      const speed = Math.hypot(p.vx, p.vy) || 1;
      const tx = cx - (p.vx / speed) * r * 4;
      const ty = cy - (p.vy / speed) * r * 4;
      const grad = ctx.createLinearGradient(cx, cy, tx, ty);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + '00');
      ctx.strokeStyle = grad;
      ctx.lineWidth = r * 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      // Soft outer glow.
      ctx.fillStyle = color + '44';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 2.4, 0, Math.PI * 2);
      ctx.fill();
      // Bright core.
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      // Coloured ring.
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawCombatEffects(game) {
    const ctx = this.ctx;
    for (const fx of game.effects) {
      if (fx.type === 'lineClear') continue;
      this.drawEffect(ctx, fx);
    }
  }

  drawBuildEffects(game) {
    const ctx = this.ctx;
    for (const fx of game.effects) {
      if (fx.type === 'lineClear') this.drawEffect(ctx, fx);
    }
  }

  drawEffect(ctx, fx) {
      // All effect positions are cell-center floats (or row index for lineClear).
      const cx = fx.x * this.cellPx;
      const cy = fx.y * this.cellPx;
      const t = fx.t / fx.life;
      const alpha = 1 - t;
      if (fx.type === 'splash') {
        ctx.beginPath();
        ctx.arc(cx, cy, fx.radius * this.cellPx * (0.4 + t * 0.9), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = `rgba(168, 85, 247, ${alpha * 0.25})`;
        ctx.fill();
      } else if (fx.type === 'spark') {
        ctx.fillStyle = `rgba(255, 200, 100, ${alpha})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 5 * (1 - t * 0.5), 0, Math.PI * 2);
        ctx.fill();
      } else if (fx.type === 'muzzle') {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(cx, cy, this.cellPx * 0.35 * (1 - t * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `${fx.color || '#ffffff'}`;
        ctx.globalAlpha = alpha * 0.7;
        ctx.beginPath();
        ctx.arc(cx, cy, this.cellPx * 0.55 * (1 - t * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (fx.type === 'lineClear') {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
        ctx.fillRect(0, fx.y * this.cellPx, this.canvas.width, this.cellPx);
      }
  }

  drawWaveBanner(game) {
    if (!game.banner) return;
    const ctx = this.ctx;
    const t = game.banner.t / game.banner.life;
    const alpha = t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1;
    ctx.fillStyle = `rgba(0, 0, 0, ${0.5 * alpha})`;
    ctx.fillRect(0, this.canvas.height / 2 - 40, this.canvas.width, 80);
    ctx.fillStyle = `rgba(34, 211, 238, ${alpha})`;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(game.banner.text, this.canvas.width / 2, this.canvas.height / 2);
  }
}

