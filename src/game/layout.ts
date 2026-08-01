import { TIER_DIAMETER_M, type ObjectTier } from "./objectTiers";

/** 필드 반경(미터). 공이 5cm에서 시작해 90초 안에 훑을 수 있는 크기여야 한다. */
export const FIELD_RADIUS = 3.2;
/** 시작 지점 주변은 비워서 공이 큰 사물에 갇히지 않게 한다. */
export const START_CLEARANCE = 0.35;

export type SpawnPoint = { x: number; z: number };

/** 황금각 나선의 rank번째 고리 반지름. 뭉치지 않고 고르게 퍼진다. */
function ringRadius(rank: number, count: number): number {
  if (count <= 0) return START_CLEARANCE;
  const span = FIELD_RADIUS - START_CLEARANCE;
  return START_CLEARANCE + span * Math.sqrt((rank + 0.6) / count);
}

/**
 * 사물을 필드에 배치한다. 작은 것이 중앙, 큰 것이 바깥이다.
 *
 * planSpawns가 목록을 섞기 때문에 순번 그대로 반경을 주면 60cm 의자가 5cm 공
 * 옆에 놓여 시작부터 길을 막는다. 티어 크기순으로 자리를 배정해서 막는다.
 *
 * 반환 배열의 인덱스는 입력 tiers의 인덱스와 대응한다. 렌더와 부착 판정이
 * 같은 좌표를 써야 하므로 이 함수가 유일한 출처다.
 */
export function placeSpawns(tiers: readonly ObjectTier[]): SpawnPoint[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const order = tiers
    .map((tier, index) => ({ index, size: TIER_DIAMETER_M[tier] }))
    .sort((a, b) => a.size - b.size || a.index - b.index);

  const out: SpawnPoint[] = new Array(tiers.length);
  order.forEach(({ index }, rank) => {
    const r = ringRadius(rank, tiers.length);
    const a = rank * golden;
    out[index] = { x: Math.cos(a) * r, z: Math.sin(a) * r };
  });
  return out;
}

/**
 * 공이 사물에 닿았는지 본다. 수평 거리만 본다 — 사물은 바닥에 있고 공도
 * 바닥을 구르므로 높이 차는 판정에 넣지 않는다.
 *
 * 충돌 이벤트를 쓰지 않는 이유: 프레임당 이동거리(약 1.2cm)가 XS 사물 크기(2cm)와
 * 비슷해서 빠를 때 사물을 통과해 버린다. 거리 판정은 그 문제가 없다.
 */
export function isTouching(
  ball: { x: number; z: number; diameterM: number },
  object: SpawnPoint,
  objectDiameterM: number
): boolean {
  const reach = ball.diameterM / 2 + objectDiameterM / 2;
  return Math.hypot(ball.x - object.x, ball.z - object.z) <= reach;
}
