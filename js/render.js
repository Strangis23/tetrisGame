// Canvas renderer. All drawing happens in pixel coords; cell size = CONFIG.CELL_PX.

function cellRoleColor(role, shape, isBase) {
  if (isBase) {
    const roleColor = (CONFIG.ROLE_COLORS && role && CONFIG.ROLE_COLORS[role]) || CONFIG.COLORS[shape];
    return roleColor || CONFIG.COLORS.BASE;
  }
  return (CONFIG.ROLE_COLORS && role && CONFIG.ROLE_COLORS[role]) || CONFIG.COLORS[shape];
}

function drawRolePattern(ctx, role, px, py, cellPx) {
  const inset = 2;
  const w = cellPx - inset * 2;
  const h = cellPx - inset * 2;
  const cx = px + cellPx / 2;
  const cy = py + cellPx / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px + inset, py + inset, w, h);
  ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;

  switch (role) {
    case 'wall':
      for (let i = -cellPx; i < cellPx * 2; i += 5) {
        ctx.beginPath();
        ctx.moveTo(px + i, py + inset);
        ctx.lineTo(px + i + cellPx, py + cellPx - inset);
        ctx.stroke();
      }
      break;
    case 'shooter':
      ctx.beginPath();
      ctx.arc(cx, cy, cellPx * 0.22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, cellPx * 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'sniper':
      ctx.beginPath();
      ctx.moveTo(cx - cellPx * 0.28, cy);
      ctx.lineTo(cx + cellPx * 0.28, cy);
      ctx.moveTo(cx, cy - cellPx * 0.28);
      ctx.lineTo(cx, cy + cellPx * 0.28);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, cellPx * 0.12, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'splash':
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * cellPx * 0.32, cy + Math.sin(ang) * cellPx * 0.32);
        ctx.stroke();
      }
      break;
    case 'slow':
      for (let r = 1; r <= 3; r++) {
        ctx.beginPath();
        ctx.arc(cx, cy, cellPx * 0.1 * r, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    case 'gunner':
      ctx.beginPath();
      ctx.moveTo(cx - cellPx * 0.3, cy);
      ctx.lineTo(cx + cellPx * 0.3, cy);
      ctx.moveTo(cx, cy - cellPx * 0.3);
      ctx.lineTo(cx, cy + cellPx * 0.3);
      ctx.stroke();
      break;
    case 'piercer':
      ctx.beginPath();
      ctx.moveTo(cx - cellPx * 0.25, cy);
      ctx.lineTo(cx + cellPx * 0.3, cy);
      ctx.moveTo(cx + cellPx * 0.15, cy - cellPx * 0.12);
      ctx.lineTo(cx + cellPx * 0.3, cy);
      ctx.lineTo(cx + cellPx * 0.15, cy + cellPx * 0.12);
      ctx.stroke();
      break;
    case 'multishot':
      for (let a = 0; a < 5; a++) {
        const ang = -Math.PI / 2 + (a - 2) * 0.35;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * cellPx * 0.3, cy + Math.sin(ang) * cellPx * 0.3);
        ctx.stroke();
      }
      break;
    default:
      break;
  }
  ctx.restore();
}

function drawRoleMarker(ctx, role, px, py, cellPx, opts = {}) {
  const { isBase = false } = opts;
  if (role) drawRolePattern(ctx, role, px, py, cellPx);

  const glyph = ROLE_GLYPHS && ROLE_GLYPHS[role];
  if (glyph) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = `bold ${Math.floor(cellPx * 0.5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, px + cellPx / 2, py + cellPx / 2);
  }

  if (!isBase && role) {
    const roleColor = (CONFIG.ROLE_COLORS && CONFIG.ROLE_COLORS[role]) || '#64748b';
    ctx.fillStyle = roleColor;
    ctx.beginPath();
    ctx.moveTo(px + 1, py + 1);
    ctx.lineTo(px + cellPx * 0.32, py + 1);
    ctx.lineTo(px + 1, py + cellPx * 0.32);
    ctx.closePath();
    ctx.fill();
  }

  if (isBase) {
    ctx.strokeStyle = CONFIG.COLORS.BASE;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(px + 1.5, py + 1.5, cellPx - 3, cellPx - 3);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = `bold ${Math.floor(cellPx * 0.42)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('★', px + cellPx - 3, py + 2);
  }
}

class Renderer {
  constructor(ctx, canvas) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.cellPx = CONFIG.CELL_PX;
  }

  draw(game) {
    const ctx = this.ctx;
    ctx.fillStyle = CONFIG.COLORS.BG;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawSpawnBuffer(game);
    this.drawGridLines();
    this.drawCells(game.grid);
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
    const roleColor = cellRoleColor(cell.role, cell.shape, false);
    // Body
    ctx.fillStyle = roleColor;
    ctx.fillRect(px + 1, py + 1, this.cellPx - 2, this.cellPx - 2);
    if (cell.isBase) {
      ctx.fillStyle = 'rgba(253, 224, 71, 0.35)';
      ctx.fillRect(px + 1, py + 1, this.cellPx - 2, this.cellPx - 2);
    }
    // Inner shading
    const grad = ctx.createLinearGradient(px, py, px, py + this.cellPx);
    grad.addColorStop(0, 'rgba(255,255,255,0.18)');
    grad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(px + 1, py + 1, this.cellPx - 2, this.cellPx - 2);

    // Damage tint: damaged cells fire at reduced effectiveness, so we darken
    // them proportional to (1 - hp/maxHp). Mirrors the HP bar visually.
    if (cell.hp < cell.maxHp && cell.maxHp > 0) {
      const damageRatio = 1 - Math.max(0, cell.hp / cell.maxHp);
      ctx.fillStyle = `rgba(0,0,0,${0.45 * damageRatio})`;
      ctx.fillRect(px + 1, py + 1, this.cellPx - 2, this.cellPx - 2);
    }

    const synThreshold = (CONFIG.SYNERGY && CONFIG.SYNERGY.VISUAL_THRESHOLD) || 1.001;
    if (cell.synergyMult && cell.synergyMult > synThreshold) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.95)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(px + 2, py + 2, this.cellPx - 4, this.cellPx - 4);
    }

    // Rarity outline.
    const rarityColor = (cell.rarity && CONFIG.RARITY_COLORS[cell.rarity]) || null;
    if (rarityColor && cell.rarity !== 'common') {
      ctx.strokeStyle = rarityColor;
      ctx.lineWidth = cell.rarity === 'legendary' ? 2.5 : cell.rarity === 'epic' ? 2 : 1.5;
      ctx.strokeRect(px + 1.5, py + 1.5, this.cellPx - 3, this.cellPx - 3);
      // Outer glow for high rarities.
      if (cell.rarity === 'legendary' || cell.rarity === 'epic') {
        ctx.strokeStyle = CONFIG.RARITY_GLOW[cell.rarity] || rarityColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, this.cellPx - 1, this.cellPx - 1);
      }
    }

    drawRoleMarker(ctx, cell.role, px, py, this.cellPx, { isBase: cell.isBase });

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
    const cells = piece.cells();
    const role = piece.card && piece.card.role;
    const color = cellRoleColor(role, piece.shape, false);
    const rarity = piece.card && piece.card.rarity;
    const rarityColor = rarity && CONFIG.RARITY_COLORS[rarity];
    const ctx = this.ctx;
    for (const { x, y } of cells) {
      if (y < 0) continue;
      const px = x * this.cellPx;
      const py = y * this.cellPx;
      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py + 1, this.cellPx - 2, this.cellPx - 2);
      if (isBase) {
        ctx.fillStyle = 'rgba(253, 224, 71, 0.35)';
        ctx.fillRect(px + 1, py + 1, this.cellPx - 2, this.cellPx - 2);
      }
      if (rarityColor && rarity !== 'common') {
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = rarity === 'legendary' ? 2.5 : 2;
        ctx.strokeRect(px + 1.5, py + 1.5, this.cellPx - 3, this.cellPx - 3);
      } else if (!isBase) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 1.5, py + 1.5, this.cellPx - 3, this.cellPx - 3);
      }
      drawRoleMarker(ctx, role, px, py, this.cellPx, { isBase });
    }
  }

  drawGhost(game) {
    const piece = game.activePiece;
    const gy = piece.ghostY(game.grid);
    if (gy === piece.y) return;
    const ctx = this.ctx;
    const cells = piece.cells(piece.rotation, piece.x, gy);
    ctx.fillStyle = CONFIG.COLORS.GHOST;
    for (const { x, y } of cells) {
      if (y < 0) continue;
      ctx.fillRect(x * this.cellPx + 2, y * this.cellPx + 2, this.cellPx - 4, this.cellPx - 4);
    }
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
      // e.x / e.y are already cell-center floats (e.g. col + 0.5).
      const cx = e.x * this.cellPx;
      const cy = e.y * this.cellPx;
      const r = e.stats.radius * this.cellPx;
      if (e.isElite) {
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Body
      ctx.fillStyle = e.stats.color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      // Outline
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Type indicator
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `${Math.floor(r)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const sym = e.isElite ? '✶'
        : (e.type === 'flyer' ? '✦' : e.type === 'brute' ? '■' : e.type === 'boss' ? '✶' : '●');
      ctx.fillText(sym, cx, cy);
      if (e.isElite) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('BOSS', cx, cy - r - 10);
      }
      // HP bar
      if (e.hp < e.maxHp) {
        const w = this.cellPx * 0.7;
        const ratio = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(cx - w/2, cy - r - 6, w, 3);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(cx - w/2, cy - r - 6, w * ratio, 3);
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

