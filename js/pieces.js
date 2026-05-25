// Tetromino runtime that wraps a deck card. The piece's shape determines its
// matrix (used by Tetris movement/rotation), but it also carries the role,
// rarity, and stats from its source card so that on lock each cell inherits
// the card's behaviour.

class Piece {
  constructor(card) {
    if (!card) throw new Error('Piece requires a card');
    this.card = card;
    this.shape = card.shape;
    this.rotation = 0;
    this.x = Math.floor(CONFIG.GRID_W / 2) - 2;
    this.y = 0;
  }

  matrix() { return SHAPES[this.shape][this.rotation]; }

  cells(rotation = this.rotation, x = this.x, y = this.y) {
    const m = SHAPES[this.shape][rotation];
    const out = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (m[r][c]) out.push({ x: x + c, y: y + r });
      }
    }
    return out;
  }

  collides(grid, rotation = this.rotation, x = this.x, y = this.y) {
    for (const { x: cx, y: cy } of this.cells(rotation, x, y)) {
      if (cx < 0 || cx >= grid.w || cy >= grid.h) return true;
      if (cy < 0) continue;
      if (grid.cells[cy][cx] !== null) return true;
    }
    return false;
  }

  tryMove(grid, dx, dy) {
    if (!this.collides(grid, this.rotation, this.x + dx, this.y + dy)) {
      this.x += dx; this.y += dy;
      return true;
    }
    return false;
  }

  tryRotate(grid, dir) {
    const newRot = (this.rotation + dir + 4) % 4;
    const kicks = [0, -1, 1, -2, 2];
    for (const k of kicks) {
      if (!this.collides(grid, newRot, this.x + k, this.y)) {
        this.rotation = newRot;
        this.x += k;
        return true;
      }
    }
    return false;
  }

  ghostY(grid) {
    let y = this.y;
    while (!this.collides(grid, this.rotation, this.x, y + 1)) y++;
    return y;
  }

  hardDrop(grid) {
    this.y = this.ghostY(grid);
  }
}
