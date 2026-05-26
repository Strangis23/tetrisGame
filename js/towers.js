// Tower behaviour driven by cell.role. Per-cell runtime state lives on
// cell.tower; per-cell stats live on cell.stats (set at lock-time from the
// originating card). Some role tick functions vary by sub-stat (e.g. snipers
// with pierce > 0 fire pierce-bullets, shooters with multishot fire spreads).

// Proximity damage system: each enemy continuously chips at every non-base cell
// within PROX_RANGE. Adjacent walls preferentially soak damage that would
// otherwise hit a non-wall (so walls are an explicit meat shield).
const PROX_DPS = { walker: 1.5, brute: 4.0, flyer: 0.8, boss: 8.0 };
const PROX_RANGE = 1.1;
const WALL_ABSORB_FRACTION = 0.6;
const PROX_SPARK_INTERVAL = 0.4;

function _findAdjacentWall(grid, x, y) {
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dx, dy] of dirs) {
    const c = grid.get(x + dx, y + dy);
    if (c && c.role === 'wall' && c.hp > 0) return { x: x + dx, y: y + dy, cell: c };
  }
  return null;
}

function applyHpDamage(game, x, y, cell, dmg) {
  if (!cell || cell.isBase || dmg <= 0) return;
  const defMult = cell.synergyMult || 1;
  let remaining = dmg / defMult;
  if (cell.role !== 'wall') {
    const wall = _findAdjacentWall(game.grid, x, y);
    if (wall) {
      const soak = remaining * WALL_ABSORB_FRACTION;
      remaining -= soak;
      game.grid.damageCell(wall.x, wall.y, soak);
    }
  }
  if (remaining > 0) {
    game.grid.damageCell(x, y, remaining);
  }
}

function applyProximityDamage(game, dt) {
  if (!game || !game.enemies || !game.grid || dt <= 0) return;
  for (const e of game.enemies) {
    if (e.dead) continue;
    const dps = PROX_DPS[e.type] || 0;
    if (dps <= 0) continue;
    const grid = game.grid;
    const minX = Math.max(0, Math.floor(e.x - PROX_RANGE));
    const maxX = Math.min(grid.w - 1, Math.floor(e.x + PROX_RANGE));
    const minY = Math.max(0, Math.floor(e.y - PROX_RANGE));
    const maxY = Math.min(grid.h - 1, Math.floor(e.y + PROX_RANGE));
    let touched = false;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const c = grid.get(x, y);
        if (!c || c.isBase) continue;
        const dx = (x + 0.5) - e.x, dy = (y + 0.5) - e.y;
        if (dx*dx + dy*dy > PROX_RANGE * PROX_RANGE) continue;
        applyHpDamage(game, x, y, c, dps * dt);
        touched = true;
      }
    }
    if (touched) {
      e._proxSparkTimer = (e._proxSparkTimer || 0) + dt;
      if (e._proxSparkTimer >= PROX_SPARK_INTERVAL) {
        e._proxSparkTimer = 0;
        game.effects.push({ type: 'spark', x: e.x, y: e.y, t: 0, life: 0.25 });
      }
    }
  }
}

// HP-driven effectiveness multiplier. At full HP a tower fires at 100%; at 0 HP
// it still works at 40% (the floor). Wraps damage / fireRate / slow strength.
const EFFECTIVENESS_FLOOR = 0.4;
function effectiveness(cell) {
  if (!cell || !cell.maxHp) return cell?.synergyMult || 1;
  const ratio = Math.max(0, Math.min(1, cell.hp / cell.maxHp));
  const base = EFFECTIVENESS_FLOOR + (1 - EFFECTIVENESS_FLOOR) * ratio;
  return base * (cell.synergyAttackMult || cell.synergyMult || 1);
}

function updateTowers(game, dt) {
  const enemies = game.enemies;
  game.grid.forEachCell((cell, x, y) => {
    if (!cell.role || !cell.tower) return;
    const stats = cell.stats || {};
    const t = cell.tower;
    const cx = x + 0.5, cy = y + 0.5;

    if (t.cooldown > 0) t.cooldown -= dt;

    switch (cell.role) {
      case 'wall':      /* income paid at wave start */ break;
      case 'shooter':   shooterTick(game, cell, cx, cy, stats, enemies); break;
      case 'sniper':    sniperTick(game, cell, cx, cy, stats, enemies); break;
      case 'splash':    splashTick(game, cell, cx, cy, stats, enemies); break;
      case 'slow':      slowTick(game, cell, cx, cy, stats, enemies, dt); break;
      case 'gunner':    gunnerTick(game, cell, cx, cy, stats, enemies); break;
      case 'piercer':   piercerTick(game, cell, cx, cy, stats, enemies); break;
      case 'multishot': multishotTick(game, cell, cx, cy, stats, enemies); break;
      default: break;
    }
  });
}

function rarityProjectileColor(cell) {
  return CONFIG.RARITY_COLORS[cell.rarity] || '#ffffff';
}

function nearestEnemy(cx, cy, range, enemies, predicate = null) {
  let best = null, bestD = range * range;
  for (const e of enemies) {
    if (e.dead) continue;
    if (predicate && !predicate(e)) continue;
    const dx = e.x - cx, dy = e.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestD) { bestD = d2; best = e; }
  }
  return best;
}

function muzzleFlash(game, cx, cy, color) {
  game.effects.push({ type: 'muzzle', x: cx, y: cy, t: 0, life: 0.12, color });
}

function fireProjectile(game, cx, cy, target, opts) {
  const dx = target.x - cx, dy = target.y - cy;
  const d = Math.hypot(dx, dy) || 1;
  const speed = opts.speed || CONFIG.PROJECTILE_SPEED;
  game.projectiles.push(new Projectile({
    x: cx, y: cy,
    vx: (dx / d) * speed,
    vy: (dy / d) * speed,
    speed,
    target,
    homing: !!opts.homing,
    damage: opts.damage,
    splashRadius: opts.splashRadius || 0,
    pierce: opts.pierce || 0,
    color: opts.color || '#ffffff',
    radius: opts.radius || 0.20,
    life: opts.life || 1.4,
    sourceRole: opts.sourceRole || null,
  }));
}

function shooterTick(game, cell, cx, cy, stats, enemies) {
  if (cell.tower.cooldown > 0) return;
  const target = nearestEnemy(cx, cy, stats.range || 0, enemies);
  if (!target) return;
  const eff = effectiveness(cell);
  fireProjectile(game, cx, cy, target, {
    speed: CONFIG.PROJECTILE_SPEED * 1.15,
    damage: stats.damage * eff,
    color: rarityProjectileColor(cell),
    radius: 0.16,
    life: 1.0,
    sourceRole: 'shooter',
  });
  muzzleFlash(game, cx, cy, rarityProjectileColor(cell));
  cell.tower.cooldown = (stats.fireRate || 1.0) / eff;
}

function sniperTick(game, cell, cx, cy, stats, enemies) {
  if (cell.tower.cooldown > 0) return;
  // Prefer enemy with highest HP within range.
  let target = null, bestHp = -1;
  const range = stats.range || 0;
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.x - cx, dy = e.y - cy;
    if (dx*dx + dy*dy <= range * range) {
      if (e.hp > bestHp) { bestHp = e.hp; target = e; }
    }
  }
  if (!target) return;
  const eff = effectiveness(cell);
  fireProjectile(game, cx, cy, target, {
    speed: CONFIG.PROJECTILE_SPEED * 1.7,
    damage: stats.damage * eff,
    pierce: stats.pierce || 0,
    color: CONFIG.COLORS.I,
    radius: 0.20,
    life: 1.4,
    sourceRole: 'sniper',
  });
  muzzleFlash(game, cx, cy, CONFIG.COLORS.I);
  cell.tower.cooldown = (stats.fireRate || 1.0) / eff;
}

function splashTick(game, cell, cx, cy, stats, enemies) {
  if (cell.tower.cooldown > 0) return;
  const target = nearestEnemy(cx, cy, stats.range || 0, enemies);
  if (!target) return;
  const eff = effectiveness(cell);
  fireProjectile(game, cx, cy, target, {
    speed: CONFIG.PROJECTILE_SPEED,
    damage: stats.damage * eff,
    splashRadius: stats.splashRadius || 1.4,
    homing: true,
    color: CONFIG.COLORS.T,
    radius: 0.28,
    life: 2.0,
    sourceRole: 'splash',
  });
  muzzleFlash(game, cx, cy, CONFIG.COLORS.T);
  cell.tower.cooldown = (stats.fireRate || 1.0) / eff;
}

function gunnerTick(game, cell, cx, cy, stats, enemies) {
  if (cell.tower.cooldown > 0) return;
  // Omnidirectional fast fire — no facing.
  const target = nearestEnemy(cx, cy, stats.range || 0, enemies);
  if (!target) return;
  const eff = effectiveness(cell);
  fireProjectile(game, cx, cy, target, {
    speed: CONFIG.PROJECTILE_SPEED * 1.3,
    damage: stats.damage * eff,
    color: CONFIG.COLORS.L,
    radius: 0.16,
    life: 0.9,
    sourceRole: 'gunner',
  });
  muzzleFlash(game, cx, cy, CONFIG.COLORS.L);
  cell.tower.cooldown = (stats.fireRate || 0.3) / eff;
}

function slowTick(game, cell, cx, cy, stats, enemies, dt) {
  // Aura slow refreshed each frame on every enemy in range.
  const eff = effectiveness(cell);
  const r2 = (stats.range || 0) * (stats.range || 0);
  const slowFactor = (stats.slowFactor || 0.4) * eff;
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.x - cx, dy = e.y - cy;
    if (dx*dx + dy*dy <= r2) {
      e.applySlow(slowFactor, 0.3);
    }
  }
  // Legendary slows also damage. Treat damage+fireRate as a periodic AoE pulse.
  if (stats.damage && stats.fireRate) {
    if (cell.tower.cooldown > 0) return;
    let hit = 0;
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = e.x - cx, dy = e.y - cy;
      if (dx*dx + dy*dy <= r2) { e.takeDamage(stats.damage * eff, game, { sourceRole: 'slow' }); hit++; }
    }
    if (hit > 0) {
      game.effects.push({ type: 'splash', x: cx, y: cy, t: 0, life: 0.3, radius: stats.range });
    }
    cell.tower.cooldown = stats.fireRate / eff;
  }
}

function piercerTick(game, cell, cx, cy, stats, enemies) {
  if (cell.tower.cooldown > 0) return;
  const target = nearestEnemy(cx, cy, stats.range || 0, enemies);
  if (!target) return;
  const eff = effectiveness(cell);
  fireProjectile(game, cx, cy, target, {
    speed: CONFIG.PROJECTILE_SPEED * 2.0,
    damage: stats.damage * eff,
    pierce: stats.pierce || 99,
    color: CONFIG.COLORS.I,
    radius: 0.16,
    life: 1.5,
    sourceRole: 'piercer',
  });
  muzzleFlash(game, cx, cy, CONFIG.COLORS.I);
  cell.tower.cooldown = (stats.fireRate || 0.7) / eff;
}

function multishotTick(game, cell, cx, cy, stats, enemies) {
  if (cell.tower.cooldown > 0) return;
  const target = nearestEnemy(cx, cy, stats.range || 0, enemies);
  if (!target) return;
  const eff = effectiveness(cell);
  const n = stats.multishot || 3;
  const baseDx = target.x - cx, baseDy = target.y - cy;
  const baseAng = Math.atan2(baseDy, baseDx);
  const spread = Math.PI / 9; // ~20 degrees total spread per side
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) - 0.5; // -0.5..0.5
    const ang = baseAng + t * spread * 2;
    const speed = CONFIG.PROJECTILE_SPEED * 1.3;
    game.projectiles.push(new Projectile({
      x: cx, y: cy,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      speed,
      damage: stats.damage * eff,
      color: CONFIG.COLORS.S,
      radius: 0.14,
      life: 1.0,
      sourceRole: 'multishot',
    }));
  }
  muzzleFlash(game, cx, cy, CONFIG.COLORS.S);
  cell.tower.cooldown = (stats.fireRate || 0.6) / eff;
}
