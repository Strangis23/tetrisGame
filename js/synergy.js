// Adjacency synergy: same-role links + cluster density boost HP and tower power.

const ORTHO_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function synergyCfg() {
  return CONFIG.SYNERGY || {};
}

function countOrthoNeighbors(grid, x, y, cell) {
  let total = 0;
  let sameRole = 0;
  for (const [dx, dy] of ORTHO_DIRS) {
    const n = grid.get(x + dx, y + dy);
    if (!n) continue;
    total++;
    if (n.role === cell.role) sameRole++;
  }
  return { total, sameRole };
}

function computeSynergyMult(cell, counts) {
  const cfg = synergyCfg();
  const roleCap = cfg.ROLE_LINK_CAP ?? 4;
  const clusterCap = cfg.CLUSTER_CAP ?? 4;
  const roleBonus = cfg.ROLE_BONUS_PER_LINK ?? 0.12;
  const clusterBonus = cfg.CLUSTER_BONUS_PER_NEIGHBOR ?? 0.05;
  const maxMult = cfg.MAX_MULT ?? 1.75;

  const roleLinks = Math.min(counts.sameRole, roleCap);
  const clusterLinks = Math.min(counts.total, clusterCap);
  const roleMult = 1 + roleLinks * roleBonus;
  const clusterMult = 1 + clusterLinks * clusterBonus;
  const hpMult = Math.min(roleMult * clusterMult, maxMult);
  const attackMult = Math.min(roleMult, maxMult);

  return {
    hpMult,
    attackMult,
    roleLinks,
    clusterLinks,
  };
}

function applySynergyToCell(cell, info) {
  if (!cell) return;
  const baseMaxHp = cell.baseMaxHp ?? cell.maxHp ?? 1;
  if (cell.baseMaxHp == null) cell.baseMaxHp = baseMaxHp;

  const oldMax = cell.maxHp || baseMaxHp;
  const newMax = Math.max(1, Math.floor(baseMaxHp * info.hpMult));
  const oldHp = cell.hp ?? oldMax;

  cell.synergyMult = info.hpMult;
  cell.synergyAttackMult = info.attackMult;
  cell.synergyRoleLinks = info.roleLinks;
  cell.synergyClusterLinks = info.clusterLinks;
  cell.maxHp = newMax;

  if (oldMax > 0) {
    cell.hp = Math.min(newMax, Math.max(1, Math.round((oldHp / oldMax) * newMax)));
  } else {
    cell.hp = newMax;
  }
}

function recalculateGridSynergy(grid) {
  if (!grid) return;
  const pending = [];
  grid.forEachCell((cell, x, y) => {
    const counts = countOrthoNeighbors(grid, x, y, cell);
    const info = computeSynergyMult(cell, counts);
    pending.push({ cell, info });
  });
  for (const { cell, info } of pending) {
    applySynergyToCell(cell, info);
  }
}
