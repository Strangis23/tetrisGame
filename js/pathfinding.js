// A* pathfinding on a grid, with two cost models:
//   walker mode: solid cells are walls (impassable).
//   brute mode:  solid cells are passable but cost a lot (so brute prefers
//                going around, but breaks through if it's clearly shorter).
//
// Returns array of {x,y} from (after) start to (including) goal, or null if no
// path found. Targets is an array of goal cells; we path to the closest.

function pathfind(grid, sx, sy, targets, opts = {}) {
  if (!targets || targets.length === 0) return null;
  const mode = opts.mode || 'walker';
  const breakCost = opts.breakCost ?? 12; // brute: extra cost per solid cell
  const W = grid.w, H = grid.h;

  // Multi-target Manhattan heuristic.
  const heuristic = (x, y) => {
    let best = Infinity;
    for (const t of targets) {
      const d = Math.abs(t.x - x) + Math.abs(t.y - y);
      if (d < best) best = d;
    }
    return best;
  };

  const goalSet = new Set(targets.map(t => t.x + ',' + t.y));

  // Open set as binary heap (min-heap on f).
  const open = new MinHeap();
  const startKey = sx + ',' + sy;
  open.push({ x: sx, y: sy, g: 0, f: heuristic(sx, sy), parent: null });

  const best = new Map();
  best.set(startKey, 0);

  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

  let iters = 0;
  const maxIters = W * H * 6;

  while (open.size() > 0 && iters++ < maxIters) {
    const cur = open.pop();
    const k = cur.x + ',' + cur.y;
    if (cur.g > (best.get(k) ?? Infinity)) continue;
    if (goalSet.has(k)) {
      // Reconstruct
      const path = [];
      let n = cur;
      while (n) { path.push({ x: n.x, y: n.y }); n = n.parent; }
      path.reverse();
      return path;
    }
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const isSolid = grid.cells[ny][nx] !== null;
      if (mode === 'walker' && isSolid && !goalSet.has(nx + ',' + ny)) continue;
      const stepCost = (mode === 'brute' && isSolid && !goalSet.has(nx + ',' + ny)) ? 1 + breakCost : 1;
      const ng = cur.g + stepCost;
      const nk = nx + ',' + ny;
      if (ng < (best.get(nk) ?? Infinity)) {
        best.set(nk, ng);
        open.push({ x: nx, y: ny, g: ng, f: ng + heuristic(nx, ny), parent: cur });
      }
    }
  }
  return null;
}

class MinHeap {
  constructor() { this.data = []; }
  size() { return this.data.length; }
  push(v) {
    this.data.push(v);
    let i = this.data.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[p].f <= this.data[i].f) break;
      [this.data[i], this.data[p]] = [this.data[p], this.data[i]];
      i = p;
    }
  }
  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length) {
      this.data[0] = last;
      let i = 0; const n = this.data.length;
      while (true) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < n && this.data[l].f < this.data[m].f) m = l;
        if (r < n && this.data[r].f < this.data[m].f) m = r;
        if (m === i) break;
        [this.data[i], this.data[m]] = [this.data[m], this.data[i]];
        i = m;
      }
    }
    return top;
  }
}
