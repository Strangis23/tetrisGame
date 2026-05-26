// Enemy entities. Coordinates are in cell units (floats). Movement uses
// cells/second so it scales with grid size.
class Enemy {
  constructor(type, x, y, wave) {
    this.type = type;
    const base = CONFIG.ENEMY_STATS[type];
    const hpScale = 1 + Math.max(0, wave - 1) * (CONFIG.ENEMY_HP_GROWTH || 0.07);
    const speedMulTable = CONFIG.ENEMY_SPEED_MUL || [1];
    const tier = Math.min(speedMulTable.length - 1, Math.max(0, Math.floor((wave - 1) / 10)));
    const speedMul = speedMulTable[tier];
    this.stats = {
      ...base,
      hp: Math.floor(base.hp * hpScale),
      speed: base.speed * speedMul,
    };
    this.maxHp = this.stats.hp;
    this.hp = this.stats.hp;
    this.x = x; this.y = y;
    this.dead = false;
    this.reachedBase = false;
    this.atBase = false;
    this.path = null;
    this.pathTargetSig = null; // grid signature when path was computed
    this.repathTimer = 0;
    this.attackTimer = 0;
    this.slowTimer = 0;
    this.slowFactor = 0; // strongest active slow
    // Stuck handling: track last position; if we don't make ground for too long
    // (e.g. player walled the base perfectly), self-destruct so the wave ends.
    this._lastX = x; this._lastY = y;
    this._stuckTime = 0;
    this._lifetime = 0;
  }

  // Override
  update(dt, game) {}

  takeDamage(amount, game, opts = {}) {
    let dmg = amount;
    if (opts.sourceRole && typeof getMatchupMultiplier === 'function') {
      dmg *= getMatchupMultiplier(opts.sourceRole, this);
    }
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.dead = true;
    }
  }

  siegeBase(dt, game) {
    if (!this.atBase || this.dead) return;
    this.siegeTimer = (this.siegeTimer || 0) + dt;
    let dmg = this.stats.attackDmg;
    let rate = this.stats.attackRate;
    if (dmg == null || rate == null) {
      const siege = (CONFIG.BASE_SIEGE && CONFIG.BASE_SIEGE[this.type]) || { dmg: 0.5, rate: 0.8 };
      dmg = siege.dmg;
      rate = siege.rate;
    }
    if (this.siegeTimer >= rate) {
      this.siegeTimer = 0;
      game.damageBase(dmg);
      game.effects.push({ type: 'spark', x: this.x, y: this.y, t: 0, life: 0.2 });
    }
  }

  enterBase(game) {
    this.atBase = true;
    this.path = null;
    this.siegeTimer = 0;
  }

  applySlow(factor, duration) {
    if (factor > this.slowFactor) this.slowFactor = factor;
    if (duration > this.slowTimer) this.slowTimer = duration;
  }

  // Call once per frame in subclass update(). Samples movement every ~1s and
  // counts time spent without making meaningful progress.
  trackStuck(dt) {
    this._lifetime += dt;
    this._stuckCheckTimer = (this._stuckCheckTimer || 0) + dt;
    if (this._stuckCheckTimer >= 1.0) {
      const moved = Math.hypot(this.x - this._lastX, this.y - this._lastY);
      if (moved < 0.5) {
        this._stuckTime += this._stuckCheckTimer;
      } else {
        this._stuckTime = 0;
      }
      this._lastX = this.x; this._lastY = this.y;
      this._stuckCheckTimer = 0;
    }
    // If stuck for 8 seconds, despawn quietly (no reward) — keeps wave-end
    // detection working even when the player has perfectly walled off the base.
    if (this._stuckTime > 8) {
      this.despawned = true;
      this.dead = true;
    }
  }
}

class Walker extends Enemy {
  constructor(x, y, wave) { super('walker', x, y, wave); this.pathMode = 'walker'; }

  update(dt, game) {
    if (this.dead || this.atBase) return;
    // Slow tick.
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowFactor = 0;
    }
    const speed = this.stats.speed * (1 - this.slowFactor);
    // Maintain path.
    this.repathTimer -= dt;
    const cx = Math.floor(this.x), cy = Math.floor(this.y);
    if (!this.path || this.repathTimer <= 0 || this.path.length === 0) {
      this.path = pathfind(game.grid, cx, cy, game.grid.baseCells(), { mode: this.pathMode });
      this.repathTimer = 0.6 + Math.random() * 0.4;
    }
    if (!this.path || this.path.length === 0) {
      // Fallback: drift toward the nearest base in a straight line at half speed,
      // ignoring walls. Guarantees the wave makes progress even in pathological
      // cases (e.g. pathfind hiccup, perfect wall) and gives the player visible
      // feedback that the enemy is still alive.
      this.moveStraightToBase(dt, speed * 0.5, game);
      this.trackStuck(dt);
      return;
    }
    // Walk toward next waypoint (skip the cell we're standing in).
    let target = this.path[0];
    if (target && Math.floor(this.x) === target.x && Math.floor(this.y) === target.y) {
      this.path.shift();
      target = this.path[0];
    }
    if (!target) { this.checkReachedBase(game); return; }
    const tx = target.x + 0.5, ty = target.y + 0.5;
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    const step = speed * dt;
    if (dist <= step) {
      this.x = tx; this.y = ty;
      this.path.shift();
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
    this.trackStuck(dt);
    this.checkReachedBase(game);
  }

  moveStraightToBase(dt, speed, game) {
    const bases = game.grid.baseCells();
    if (bases.length === 0) return;
    let best = bases[0], bestD = Infinity;
    for (const b of bases) {
      const d = Math.hypot(b.x + 0.5 - this.x, b.y + 0.5 - this.y);
      if (d < bestD) { bestD = d; best = b; }
    }
    const tx = best.x + 0.5, ty = best.y + 0.5;
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) return;
    const step = speed * dt;
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.checkReachedBase(game);
  }

  checkReachedBase(game) {
    const cx = Math.floor(this.x), cy = Math.floor(this.y);
    const c = game.grid.get(cx, cy);
    if (c && c.isBase) this.enterBase(game);
  }
}

class Brute extends Walker {
  constructor(x, y, wave) {
    super(x, y, wave);
    this.type = 'brute';
    const base = CONFIG.ENEMY_STATS.brute;
    const hpScale = 1 + Math.max(0, wave - 1) * (CONFIG.ENEMY_HP_GROWTH || 0.07);
    const speedMulTable = CONFIG.ENEMY_SPEED_MUL || [1];
    const tier = Math.min(speedMulTable.length - 1, Math.max(0, Math.floor((wave - 1) / 10)));
    this.stats = { ...base, hp: Math.floor(base.hp * hpScale), speed: base.speed * speedMulTable[tier] };
    this.maxHp = this.stats.hp;
    this.hp = this.stats.hp;
    this.pathMode = 'brute';
  }

  update(dt, game) {
    if (this.dead || this.atBase) return;
    // Slow tick.
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowFactor = 0;
    }
    const speed = this.stats.speed * (1 - this.slowFactor);

    // Repath periodically.
    this.repathTimer -= dt;
    const cx = Math.floor(this.x), cy = Math.floor(this.y);
    if (!this.path || this.repathTimer <= 0 || this.path.length === 0) {
      this.path = pathfind(game.grid, cx, cy, game.grid.baseCells(), { mode: 'brute' });
      this.repathTimer = 0.5 + Math.random() * 0.3;
    }
    if (!this.path || this.path.length === 0) {
      this.moveStraightToBase(dt, speed * 0.5, game);
      this.trackStuck(dt);
      return;
    }
    let target = this.path[0];
    if (target && Math.floor(this.x) === target.x && Math.floor(this.y) === target.y) {
      this.path.shift();
      target = this.path[0];
    }
    if (!target) { this.checkReachedBase(game); return; }

    // If next waypoint is a solid (non-base) cell, attack it instead of moving.
    const nextCell = game.grid.get(target.x, target.y);
    if (nextCell && !nextCell.isBase) {
      this.attackTimer += dt;
      if (this.attackTimer >= this.stats.attackRate) {
        this.attackTimer = 0;
        const destroyed = game.grid.damageCell(target.x, target.y, this.stats.attackDmg);
        game.effects.push({ type: 'spark', x: target.x + 0.5, y: target.y + 0.5, t: 0, life: 0.25 });
        if (destroyed) {
          this.path = null; // repath next tick
        }
      }
      // Treat attacking as progress so we don't get despawned.
      this._stuckTime = 0;
      this._lifetime += dt;
      return;
    }

    const tx = target.x + 0.5, ty = target.y + 0.5;
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    const step = speed * dt;
    if (dist <= step) {
      this.x = tx; this.y = ty;
      this.path.shift();
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
    this.trackStuck(dt);
    this.checkReachedBase(game);
  }
}

class Flyer extends Enemy {
  constructor(x, y, wave) { super('flyer', x, y, wave); }

  update(dt, game) {
    if (this.dead || this.atBase) return;
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowFactor = 0;
    }
    const speed = this.stats.speed * (1 - this.slowFactor);
    const bases = game.grid.baseCells();
    if (bases.length === 0) { this.dead = true; return; }
    // Pick closest base.
    let best = bases[0], bestD = Infinity;
    for (const b of bases) {
      const d = Math.hypot(b.x + 0.5 - this.x, b.y + 0.5 - this.y);
      if (d < bestD) { bestD = d; best = b; }
    }
    const tx = best.x + 0.5, ty = best.y + 0.5;
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    const step = speed * dt;
    if (dist <= step) {
      this.x = tx; this.y = ty;
      this.enterBase(game);
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
  }
}

class Boss extends Brute {
  constructor(x, y, wave) {
    super(x, y, wave);
    this.type = 'boss';
    const base = CONFIG.ENEMY_STATS.boss;
    const hpScale = 1 + Math.max(0, wave - 10) * 0.11;
    const speedMulTable = CONFIG.ENEMY_SPEED_MUL || [1];
    const tier = Math.min(speedMulTable.length - 1, Math.max(0, Math.floor((wave - 1) / 10)));
    this.stats = { ...base, hp: Math.floor(base.hp * hpScale), speed: base.speed * speedMulTable[tier] };
    this.maxHp = this.stats.hp;
    this.hp = this.stats.hp;
  }
}

function makeEnemy(type, grid, wave, opts = {}) {
  const col = Math.floor(Math.random() * grid.w);
  const x = col + 0.5, y = 0.4;
  let enemy;
  switch (type) {
    case 'walker': enemy = new Walker(x, y, wave); break;
    case 'flyer':  enemy = new Flyer(x, y, wave); break;
    case 'brute':  enemy = new Brute(x, y, wave); break;
    case 'boss':   enemy = new Boss(x, y, wave); break;
    default: enemy = new Walker(x, y, wave);
  }
  if (opts.elite) applyEliteStats(enemy, wave, type);
  return enemy;
}

function applyEliteStats(enemy, wave, baseType) {
  const legacy = CONFIG.ELITE_BOSS || {};
  const modsTable = CONFIG.ELITE_MODS || {};
  const mods = modsTable[baseType] || modsTable.default || {};
  const tier = Math.max(1, Math.floor(wave / 10));
  const tierBonus = 1 + (tier - 1) * (legacy.tierHpBonus || 0.22);
  const hpMult = mods.hp ?? legacy.hp ?? 12;
  const speedMult = mods.speed ?? legacy.speed ?? 1.25;
  const radiusMult = mods.radius ?? legacy.radius ?? 1.5;
  const rewardMult = mods.reward ?? legacy.reward ?? 5;
  const atkMult = mods.attackDmg ?? legacy.attackDmg ?? 2.5;
  const atkRateMul = mods.attackRateMul ?? legacy.attackRateMul ?? 0.65;

  enemy.isElite = true;
  enemy.eliteOf = baseType;
  enemy.stats.hp = Math.floor(enemy.stats.hp * hpMult * tierBonus);
  enemy.stats.speed *= speedMult;
  enemy.stats.reward = Math.floor(enemy.stats.reward * rewardMult * Math.sqrt(tierBonus));
  enemy.stats.radius *= radiusMult;
  if (enemy.stats.attackDmg) {
    enemy.stats.attackDmg = Math.ceil(enemy.stats.attackDmg * atkMult);
    if (enemy.stats.attackRate) {
      enemy.stats.attackRate *= atkRateMul;
    }
  }
  enemy.maxHp = enemy.stats.hp;
  enemy.hp = enemy.stats.hp;
  enemy.stats.color = '#fbbf24';
}
