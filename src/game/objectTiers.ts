export type ObjectTier = "XS" | "S" | "M" | "L";

export const OBJECT_TIERS: readonly ObjectTier[] = ["XS", "S", "M", "L"] as const;

/** 각 티어의 대표 지름(미터). 스펙 §6.3의 크기 구간 중앙값. */
export const TIER_DIAMETER_M: Record<ObjectTier, number> = {
  XS: 0.02,
  S: 0.07,
  M: 0.2,
  L: 0.6
};

/**
 * 스폰 순번을 티어에 배분한다. 앞쪽(작은 공일 때 만나는 것)은 XS가 많고,
 * 뒤쪽은 L이 섞이도록 40% / 30% / 20% / 10%로 나눈다.
 */
export function tierForIndex(index: number, total: number): ObjectTier {
  const ratio = total <= 1 ? 0 : index / total;
  if (ratio < 0.4) return "XS";
  if (ratio < 0.7) return "S";
  if (ratio < 0.9) return "M";
  return "L";
}
