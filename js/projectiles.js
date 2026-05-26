// Projectiles. Each has a position (cell coords), a velocity, and behaviour
// for what to do on hit / on expire.

class Projectile {
  constructor(opts) {
    this.x = opts.x;
    this.y = opts.y;
    this.vx = opts.vx || 0;
    this.vy = opts.vy || 0;
    this.target = opts.target || null;
    this.homing = opts.homing ?? false;
    this.speed = opts.speed ?? CONFIG.PROJECTILE_SPEED;
    this.damage = opts.damage || 0;
    this.splashRadius = opts.splashRadius || 0;
    this.pierce = opts.pierce || 0;
    this.color = opts.color || '#ffffff';
    this.radius = opts.radius || 0.22;
    this.life = opts.life ?? 2.5;
    this.t = 0;
    this.dead = false;
    this.hitSet = new Set(); // for pierce
    this.sourceRole = opts.sourceRole || null;
  }

  update(dt, game) {
    this.t += dt;
    if (this.t >= this.life) { this.dead = true; return; }

    if (this.homing && this.target && !this.target.dead) {
      const dx = this.target.x - this.x, dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.0001) {
        this.vx = (dx / dist) * this.speed;
        this.vy = (dy / dist) * this.speed;
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Out of bounds
    if (this.x < -1 || this.x > CONFIG.GRID_W + 1 || this.y < -1 || this.y > CONFIG.GRID_H + 1) {
      this.dead = true;
      return;
    }

    // Collide with enemies.
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (this.hitSet.has(e)) continue;
      const dx = e.x - this.x, dy = e.y - this.y;
      const r = (e.stats.radius || 0.4) + this.radius;
      if (dx * dx + dy * dy <= r * r) {
        // Hit.
        if (this.splashRadius > 0) {
          this.explode(game);
          this.dead = true;
          return;
        }
        e.takeDamage(this.damage, game, { sourceRole: this.sourceRole });
        this.hitSet.add(e);
        if (this.pierce > 0) {
          this.pierce--;
        } else {
          this.dead = true;
          return;
        }
      }
    }
  }

  explode(game) {
    game.effects.push({ type: 'splash', x: this.x, y: this.y, t: 0, life: 0.35, radius: this.splashRadius });
    for (const e of game.enemies) {
      if (e.dead) continue;
      const dx = e.x - this.x, dy = e.y - this.y;
      if (dx * dx + dy * dy <= this.splashRadius * this.splashRadius) {
        e.takeDamage(this.damage, game, { sourceRole: this.sourceRole });
      }
    }
  }
}
