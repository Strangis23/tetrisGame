// 1x1 block sprite loader — each tetromino cell tiles the role's module art.

const BLOCK_SPRITE_PATHS = {
  wall:      'assets/blocks/wall.png',
  shooter:   'assets/blocks/shooter.png',
  sniper:    'assets/blocks/sniper.png',
  splash:    'assets/blocks/splash.png',
  slow:      'assets/blocks/slow.png',
  gunner:    'assets/blocks/gunner.png',
  piercer:   'assets/blocks/piercer.png',
  multishot: 'assets/blocks/multishot.png',
};

const blockSprites = {};
let blockSpritesLoadPromise = null;

function loadBlockSprites() {
  if (blockSpritesLoadPromise) return blockSpritesLoadPromise;
  blockSpritesLoadPromise = Promise.all(
    Object.entries(BLOCK_SPRITE_PATHS).map(([role, path]) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { blockSprites[role] = img; resolve(); };
        img.onerror = () => { console.warn('Block sprite failed to load:', path); resolve(); };
        img.src = path;
      })
    )
  );
  return blockSpritesLoadPromise;
}

function getBlockSprite(role) {
  return blockSprites[role] || null;
}

function blockCellFallbackColor(role, shape, isBase) {
  if (isBase) {
    const roleColor = (CONFIG.ROLE_COLORS && role && CONFIG.ROLE_COLORS[role]) || CONFIG.COLORS[shape];
    return roleColor || CONFIG.COLORS.BASE;
  }
  return (CONFIG.ROLE_COLORS && role && CONFIG.ROLE_COLORS[role]) || CONFIG.COLORS[shape];
}

function drawRolePatternFallback(ctx, role, px, py, cellPx) {
  const inset = 2;
  const w = cellPx - inset * 2;
  const cx = px + cellPx / 2;
  const cy = py + cellPx / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px + inset, py + inset, w, cellPx - inset * 2);
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

function drawBlockCellFallback(ctx, px, py, cellPx, role, shape) {
  const color = blockCellFallbackColor(role, shape, false);
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, cellPx - 2, cellPx - 2);
  const grad = ctx.createLinearGradient(px, py, px, py + cellPx);
  grad.addColorStop(0, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(px + 1, py + 1, cellPx - 2, cellPx - 2);
  drawRolePatternFallback(ctx, role, px, py, cellPx);
  const glyph = ROLE_GLYPHS && ROLE_GLYPHS[role];
  if (glyph) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = `bold ${Math.floor(cellPx * 0.5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, px + cellPx / 2, py + cellPx / 2);
  }
}

function drawBlockCell(ctx, px, py, cellPx, opts = {}) {
  const {
    role,
    shape = null,
    isBase = false,
    rarity = null,
    damageRatio = 0,
    synergyMult = 1,
    dimmed = false,
    alpha = 1,
    showRarity = true,
    showSynergy = true,
  } = opts;

  ctx.save();
  if (alpha < 1) ctx.globalAlpha = alpha;

  const sprite = getBlockSprite(role);
  if (sprite) {
    ctx.drawImage(sprite, px, py, cellPx, cellPx);
  } else {
    drawBlockCellFallback(ctx, px, py, cellPx, role, shape);
  }

  if (isBase) {
    ctx.fillStyle = 'rgba(253, 224, 71, 0.28)';
    ctx.fillRect(px, py, cellPx, cellPx);
    ctx.strokeStyle = CONFIG.COLORS.BASE;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(px + 1.5, py + 1.5, cellPx - 3, cellPx - 3);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = `bold ${Math.floor(cellPx * 0.42)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('★', px + cellPx - 3, py + 2);
  }

  if (damageRatio > 0) {
    ctx.fillStyle = `rgba(0,0,0,${0.45 * damageRatio})`;
    ctx.fillRect(px, py, cellPx, cellPx);
  }

  const synThreshold = (CONFIG.SYNERGY && CONFIG.SYNERGY.VISUAL_THRESHOLD) || 1.001;
  if (showSynergy && synergyMult > synThreshold) {
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.95)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(px + 2, py + 2, cellPx - 4, cellPx - 4);
  }

  if (showRarity && rarity && rarity !== 'common') {
    const rarityColor = CONFIG.RARITY_COLORS[rarity];
    if (rarityColor) {
      ctx.strokeStyle = rarityColor;
      ctx.lineWidth = rarity === 'legendary' ? 2.5 : rarity === 'epic' ? 2 : 1.5;
      ctx.strokeRect(px + 1.5, py + 1.5, cellPx - 3, cellPx - 3);
      if (rarity === 'legendary' || rarity === 'epic') {
        ctx.strokeStyle = CONFIG.RARITY_GLOW[rarity] || rarityColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, cellPx - 1, cellPx - 1);
      }
    }
  }

  if (dimmed) {
    ctx.fillStyle = 'rgba(5,9,18,0.55)';
    ctx.fillRect(px, py, cellPx, cellPx);
  }

  ctx.restore();
}

function drawBlockShape(ctx, cells, cellPx, opts = {}) {
  for (const { x, y } of cells) {
    if (y < 0) continue;
    drawBlockCell(ctx, x * cellPx, y * cellPx, cellPx, opts);
  }
}

function drawBlockMatrix(ctx, matrix, ox, oy, cellPx, opts = {}) {
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue;
      drawBlockCell(ctx, ox + c * cellPx, oy + r * cellPx, cellPx, opts);
    }
  }
}

// Enemy sprites — base units plus boss variants (used for wave-10 elites).

const ENEMY_SPRITE_PATHS = {
  walker:         'assets/enemies/walker.png?v=3',
  brute:          'assets/enemies/brute.png?v=3',
  flyer:          'assets/enemies/flyer.png?v=3',
  rusher:         'assets/enemies/rusher.png?v=3',
  shielded:       'assets/enemies/shielded.png?v=3',
  walker_boss:    'assets/enemies/walker_boss.png?v=3',
  brute_boss:     'assets/enemies/brute_boss.png?v=3',
  flyer_boss:     'assets/enemies/flyer_boss.png?v=3',
  rusher_boss:    'assets/enemies/rusher_boss.png?v=3',
  shielded_boss:  'assets/enemies/shielded_boss.png?v=3',
};

const enemySprites = {};
let enemySpritesLoadPromise = null;

function loadEnemySprites() {
  if (enemySpritesLoadPromise) return enemySpritesLoadPromise;
  enemySpritesLoadPromise = Promise.all(
    Object.entries(ENEMY_SPRITE_PATHS).map(([key, path]) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { enemySprites[key] = img; resolve(); };
        img.onerror = () => { console.warn('Enemy sprite failed to load:', path); resolve(); };
        img.src = path;
      })
    )
  );
  return enemySpritesLoadPromise;
}

function getEnemySpriteKey(enemy) {
  if (enemy.isElite) {
    const base = enemy.eliteOf || enemy.type;
    return `${base}_boss`;
  }
  if (enemy.type === 'boss') return 'brute_boss';
  return enemy.type;
}

function getEnemySprite(enemy) {
  return enemySprites[getEnemySpriteKey(enemy)] || null;
}

function drawEnemyFallback(ctx, cx, cy, r, enemy) {
  ctx.fillStyle = enemy.stats.color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `${Math.floor(r)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const sym = enemy.isElite ? '✶'
    : (enemy.type === 'flyer' ? '✦' : enemy.type === 'brute' ? '■' : enemy.type === 'boss' ? '✶'
    : enemy.type === 'shielded' ? '◆' : enemy.type === 'rusher' ? '»' : '●');
  ctx.fillText(sym, cx, cy);
}

function drawEnemy(ctx, cx, cy, cellPx, enemy) {
  const r = enemy.stats.radius * cellPx;
  const size = r * 2.1;
  const sprite = getEnemySprite(enemy);

  if (enemy.isElite) {
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (sprite) {
    ctx.save();
    ctx.translate(cx, cy);
    if (typeof enemy.facing === 'number') ctx.rotate(enemy.facing);
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    ctx.restore();
  } else {
    drawEnemyFallback(ctx, cx, cy, r, enemy);
  }

  if (enemy.isElite) {
    ctx.fillStyle = 'rgba(251, 191, 36, 0.95)';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('BOSS', cx, cy - size * 0.52);
  }
}
