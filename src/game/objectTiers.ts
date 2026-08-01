export type ObjectTier = "XS" | "S" | "M" | "L";

export const OBJECT_TIERS: readonly ObjectTier[] = ["XS", "S", "M", "L"] as const;

/**
 * 티어별 크기 구간(미터). 스펙 §6.3의 구간을 그대로 쓴다.
 *
 * 구간이 중요하다. 티어마다 크기를 하나로 고정하면 사다리에 구멍이 생긴다.
 * 5cm 공이 7cm 사물을 먹으려면 6.36cm가 되어야 하는데, 2cm 사물만으로는
 * 필드에 있는 개수를 다 먹어도 그만큼 자라지 못해 판이 막힌다.
 * 구간 안에 크기를 퍼뜨리면 항상 조금 더 큰 다음 사물이 있다.
 */
export const TIER_RANGE_M: Record<ObjectTier, readonly [number, number]> = {
  XS: [0.01, 0.03],
  S: [0.04, 0.1],
  M: [0.11, 0.3],
  L: [0.31, 1.0]
};

/** 티어의 대표 크기. 표시나 개략 비교에만 쓴다. 실제 크기는 SpawnPlan.sizeM이다. */
export const TIER_DIAMETER_M: Record<ObjectTier, number> = {
  XS: 0.02,
  S: 0.07,
  M: 0.2,
  L: 0.6
};

/** 구간 안에서 0..1 위치에 해당하는 크기를 낸다. */
export function sizeInTier(tier: ObjectTier, t: number): number {
  const [lo, hi] = TIER_RANGE_M[tier];
  const clamped = Math.min(1, Math.max(0, t));
  return lo + (hi - lo) * clamped;
}

/** 크기가 어느 티어에 속하는지 본다. 크기가 먼저 정해질 때 라벨을 붙이는 용도. */
export function tierForSize(sizeM: number): ObjectTier {
  if (sizeM <= TIER_RANGE_M.XS[1]) return "XS";
  if (sizeM <= TIER_RANGE_M.S[1]) return "S";
  if (sizeM <= TIER_RANGE_M.M[1]) return "M";
  return "L";
}

/**
 * 오답 사물의 티어 배분. 작은 것에 크게 치우친다.
 *
 * 큰 오답이 많으면 작은 공에게 미로가 된다. M(11~30cm)·L(31cm~1m)은 6cm 공이
 * 넘을 수 없는 벽이고, 여러 개가 둘러싸면 공이 갇혀 판이 끝나 버린다.
 * 배경의 스케일감은 소수의 L만으로도 충분히 난다.
 */
export function tierForIndex(index: number, total: number): ObjectTier {
  const ratio = total <= 1 ? 0 : index / total;
  if (ratio < 0.5) return "XS";
  if (ratio < 0.8) return "S";
  if (ratio < 0.95) return "M";
  return "L";
}
