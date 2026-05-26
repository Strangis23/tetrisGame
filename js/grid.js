// Grid of cells. Each cell is null (empty) or { shape, hp, isBase, towerData }.
class Grid {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.cells = Array.from({ length: h }, () => Array(w).fill(null));
  }

  inBounds(x, y) {
    return x >= 0 && x < this.w && y >= 0 && y < this.h;
  }

  isEmpty(x, y) {
    if (!this.inBounds(x, y)) return false;
    return this.cells[y][x] === null;
  }

  get(x, y) {
    if (!this.inBounds(x, y)) return undefined;
    return this.cells[y][x];
  }

  set(x, y, cell) {
    if (!this.inBounds(x, y)) return;
    this.cells[y][x] = cell;
  }

  // Returns true if any solid cell sits in the top SPAWN_BUFFER_ROWS (top-out).
  isToppedOut() {
    for (let y = 0; y < CONFIG.SPAWN_BUFFER_ROWS; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.cells[y][x] !== null) return true;
      }
    }
    return false;
  }

  // Find full rows. Returns array of row indices (top-to-bottom).
  findFullRows() {
    const full = [];
    for (let y = 0; y < this.h; y++) {
      let allFilled = true;
      for (let x = 0; x < this.w; x++) {
        if (this.cells[y][x] === null) { allFilled = false; break; }
      }
      if (allFilled) full.push(y);
    }
    return full;
  }

  // Clear specified rows and apply true Tetris gravity (rows above fall down).
  // Returns the cells destroyed (so caller can refund/log them).
  clearRows(rows) {
    if (rows.length === 0) return [];
    const destroyed = [];
    const rowSet = new Set(rows);
    // Collect destroyed cells.
    for (const y of rows) {
      for (let x = 0; x < this.w; x++) {
        if (this.cells[y][x] !== null) {
          destroyed.push({ x, y, cell: this.cells[y][x] });
        }
      }
    }
    // Build the new grid by stacking the rows that survive at the bottom.
    const newRows = [];
    for (let y = this.h - 1; y >= 0; y--) {
      if (!rowSet.has(y)) newRows.push(this.cells[y]);
    }
    while (newRows.length < this.h) newRows.push(Array(this.w).fill(null));
    // newRows is bottom-up; reverse so index 0 is the top row.
    newRows.reverse();
    // The first (this.h - rows.length) entries are the original top rows; we need
    // them shifted DOWN by rows.length. The above construction already does that.
    this.cells = newRows;
    if (destroyed.length > 0 && typeof recalculateGridSynergy === 'function') {
      recalculateGridSynergy(this);
    }
    return destroyed;
  }

  // For every cell of a piece that just locked, register a Cell object derived
  // from the piece's underlying card. Each cell carries its own shape, role,
  // stats, rarity and a tower runtime block.
  // `placedCells` is array of { x, y } in grid coords. `card` is the deck card.
  // `isBase` only true for the very first lock of a run.
  registerPlacement(placedCells, card, isBase) {
    const baseHp = card.stats.hp || 1;
    for (const { x, y } of placedCells) {
      if (!this.inBounds(x, y)) continue;
      const cell = {
        shape: card.shape,
        role: card.role,
        rarity: card.rarity,
        stats: { ...card.stats },
        cardId: card.id,   // for diagnostics only
        baseMaxHp: baseHp,
        hp: baseHp,
        maxHp: baseHp,
        isBase: !!isBase,
        tower: { cooldown: 0 },
        synergyMult: 1,
      };
      this.cells[y][x] = cell;
    }
    if (typeof recalculateGridSynergy === 'function') {
      recalculateGridSynergy(this);
    }
  }

  // Iterate every solid cell (for tower update / rendering).
  forEachCell(cb) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.cells[y][x];
        if (c) cb(c, x, y);
      }
    }
  }

  // Damage a cell; if hp <= 0 remove it (does NOT apply gravity; brute kills are
  // structural holes, intentionally — this rewards stacking and punishes brutes
  // that punch through the lower layers).
  damageCell(x, y, dmg) {
    const c = this.get(x, y);
    if (!c) return false;
    c.hp -= dmg;
    if (c.hp <= 0) {
      this.cells[y][x] = null;
      if (typeof recalculateGridSynergy === 'function') {
        recalculateGridSynergy(this);
      }
      return true;
    }
    return false;
  }

  // True if (x,y) is occupied (used by pathfinding as a wall test).
  isSolid(x, y) {
    if (!this.inBounds(x, y)) return false;
    return this.cells[y][x] !== null;
  }

  // Collect all base cells (for pathfinding goal set).
  baseCells() {
    const out = [];
    this.forEachCell((c, x, y) => { if (c.isBase) out.push({ x, y }); });
    return out;
  }

  countBaseCells() {
    return this.baseCells().length;
  }

  // Mirror aggregate base HP pool onto each base cell for HP bars.
  syncBaseHpDisplay(baseHp, baseMaxHp) {
    const bases = this.baseCells();
    if (bases.length === 0) return;
    const perCellMax = Math.max(1, baseMaxHp / bases.length);
    const ratio = baseMaxHp > 0 ? Math.max(0, Math.min(1, baseHp / baseMaxHp)) : 0;
    for (const { x, y } of bases) {
      const c = this.get(x, y);
      if (c && c.isBase) {
        c.maxHp = perCellMax;
        c.hp = Math.max(0, perCellMax * ratio);
      }
    }
  }
}
