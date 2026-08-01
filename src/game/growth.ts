/** 시작 지름 5cm */
export const START_DIAMETER_M = 0.05;
/** 공 지름의 이 배수까지 붙는다 */
export const PICKUP_RATIO = 1.1;
/** 부피 합산 성장 계수. 플레이테스트로 조율한다. */
export const GROWTH_K = 0.6;
/** 부착밀 1개당 최대 속도 감소율 */
export const MASS_PENALTY_PER_MISFIT = 0.12;
/** 부착밀이 아무리 많아도 이 배수 아래로는 안 내려간다. 정화 지대까지 갈 수 있어야 한다. */
const MIN_SPEED_MULTIPLIER = 0.2;

export function canPickUp(ballDiameterM: number, objectDiameterM: number): boolean {
  return objectDiameterM <= ballDiameterM * PICKUP_RATIO;
}

/** newD = cbrt(D³ + k·objD³). 부피를 합산하므로 붙일수록 성장이 완만해진다. */
export function grow(ballDiameterM: number, objectDiameterM: number): number {
  const volume = ballDiameterM ** 3 + GROWTH_K * objectDiameterM ** 3;
  return Math.cbrt(volume);
}

/** 정화 지대에서 부착밀을 털어낼 때 쓴다. grow의 역연산. */
export function shrink(ballDiameterM: number, objectDiameterM: number): number {
  const volume = ballDiameterM ** 3 - GROWTH_K * objectDiameterM ** 3;
  if (volume <= 0) return 0;
  return Math.cbrt(volume);
}

export function speedMultiplier(misfitCount: number): number {
  const raw = 1 - misfitCount * MASS_PENALTY_PER_MISFIT;
  return Math.max(MIN_SPEED_MULTIPLIER, raw);
}
