// total xp needed to reach each level in 42cursus (level 0 to 30)
export const XP_TABLE = [
  0, 462, 2688, 5885, 11777, 29217, 46255, 63559, 74340, 85483, 95000, 105630, 124446, 145782, 169932, 197316,
  228354, 263508, 303366, 348516, 399672, 457632, 523320, 597756, 682104, 777684, 885996, 1008738, 1147842,
  1305486, 1484148,
];
export const MAX_LEVEL = XP_TABLE.length - 1;
export const COALITION_BONUS = 1.042;

export function levelToXp(level: number) {
  level = Math.min(MAX_LEVEL, Math.max(0, level));
  const i = Math.min(MAX_LEVEL - 1, Math.floor(level));
  return XP_TABLE[i] + (level - i) * (XP_TABLE[i + 1] - XP_TABLE[i]);
}

export function xpToLevel(xp: number) {
  for (let i = 0; i < MAX_LEVEL; i++) {
    if (xp < XP_TABLE[i + 1]) return i + (xp - XP_TABLE[i]) / (XP_TABLE[i + 1] - XP_TABLE[i]);
  }
  return MAX_LEVEL;
}
