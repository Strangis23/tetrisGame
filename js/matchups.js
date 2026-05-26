// Role vs enemy type damage multipliers.

function getMatchupEnemyType(enemy) {
  if (!enemy) return null;
  return enemy.eliteOf || enemy.type;
}

function getMatchupMultiplier(sourceRole, enemy) {
  if (!sourceRole || !enemy) return 1;
  const enemyType = getMatchupEnemyType(enemy);
  const table = CONFIG.ENEMY_MATCHUPS;
  if (!table || !enemyType) return 1;
  const entry = table[enemyType];
  if (!entry) return 1;
  const weak = CONFIG.MATCHUP_WEAK_MULT ?? 1.5;
  const resist = CONFIG.MATCHUP_RESIST_MULT ?? 0.55;
  if (entry.weak && entry.weak.includes(sourceRole)) return weak;
  if (entry.resist && entry.resist.includes(sourceRole)) return resist;
  return 1;
}
