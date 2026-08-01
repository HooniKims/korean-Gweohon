/**
 * 필드 반경(미터).
 *
 * 넓으면 사물이 흩어져 화면에 한두 개만 보이고, 학생은 목표를 찾지 못한다.
 * 괴혼의 시작 구간은 자잘한 물건으로 빽빽하다. 5cm 공의 시야(약 1m)에 사물이
 * 서너 개 들어오도록 좁게 잡는다.
 */
export const FIELD_RADIUS = 2.0;
/** 시작 지점 주변은 비워서 공이 큰 사물에 갇히지 않게 한다. */
export const START_CLEARANCE = 0.22;

export type SpawnPoint = { x: number; z: number };

/** 황금각 나선의 rank번째 고리 반지름. 뭉치지 않고 고르게 퍼진다. */
function ringRadius(rank: number, count: number): number {
  if (count <= 0) return START_CLEARANCE;
  const span = FIELD_RADIUS - START_CLEARANCE;
  return START_CLEARANCE + span * Math.sqrt((rank + 0.6) / count);
}

export type Placeable = { sizeM: number; isTarget: boolean };

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/**
 * 사물을 필드에 배치한다.
 *
 * 목표와 오답을 각각 별도 나선에 올린다. 하나의 나선에 크기순으로 올리면 작은
 * 오답이 중앙을 다 차지해서 첫 목표가 1m 넘게 떨어진다. 학생이 시작하자마자
 * 오답만 마주치면 무엇을 하는 게임인지 알 수 없다.
 *
 * 각 무리 안에서는 작은 것이 중앙, 큰 것이 바깥이다. 공이 자라는 순서와 이동
 * 방향이 맞아떨어져서 자연스럽게 밖으로 퍼져 나간다.
 *
 * 반환 배열의 인덱스는 입력 인덱스와 대응한다. 렌더와 부착 판정이 같은 좌표를
 * 써야 하므로 이 함수가 유일한 출처다.
 */
export function placeSpawns(items: readonly Placeable[]): SpawnPoint[] {
  const out: SpawnPoint[] = new Array(items.length);

  const groups: { indices: number[]; angleOffset: number }[] = [
    { indices: [], angleOffset: 0 },
    { indices: [], angleOffset: Math.PI }
  ];
  items.forEach((it, i) => groups[it.isTarget ? 0 : 1].indices.push(i));

  for (const group of groups) {
    const ordered = group.indices
      .map((index) => ({ index, size: items[index].sizeM }))
      .sort((a, b) => a.size - b.size || a.index - b.index);

    ordered.forEach(({ index }, rank) => {
      const r = ringRadius(rank, ordered.length);
      const a = rank * GOLDEN + group.angleOffset;
      out[index] = { x: Math.cos(a) * r, z: Math.sin(a) * r };
    });
  }

  return out;
}

/**
 * 부착 여유 배수. 표면이 닿기 조금 전에 붙는다.
 *
 * 딱 맞는 거리로 판정하면 영원히 안 붙는다. 물리 콜라이더가 겹침을 막으므로
 * 공은 사물을 밀어내기만 하고, 사물이 정육면체라 대각선 접촉 거리가 반지름 합보다
 * 멀어서 임계값에 닿지 못한다. 조작 관용도 측면에서도 이쪽이 낫다.
 */
export const GRAB_MARGIN = 1.5;

/**
 * 부착 반경에 더하는 절대 여유(미터).
 *
 * 배수만으로는 작은 공에서 창이 너무 좁다. 5cm 공이 2cm 사물을 먹는 창이 5cm인데
 * 초당 0.8m로 굴러가면 한 프레임에 1.3cm를 지나므로 조준이 바늘구멍이 된다.
 * 절대값을 더해 작은 공에서도 사람이 겨눌 수 있는 창을 만든다.
 */
export const GRAB_PAD_M = 0.015;

/**
 * 공이 사물을 붙일 만큼 가까운지 본다. 수평 거리만 본다 — 사물은 바닥에 있고
 * 공도 바닥을 구르므로 높이 차는 판정에 넣지 않는다.
 *
 * 충돌 이벤트를 쓰지 않는 이유: 프레임당 이동거리(약 1.2cm)가 XS 사물 크기(2cm)와
 * 비슷해서 빠를 때 사물을 통과해 버린다. 거리 판정은 그 문제가 없다.
 */
export function isTouching(
  ball: { x: number; z: number; diameterM: number },
  object: SpawnPoint,
  objectDiameterM: number
): boolean {
  const reach = (ball.diameterM / 2 + objectDiameterM / 2) * GRAB_MARGIN + GRAB_PAD_M;
  return Math.hypot(ball.x - object.x, ball.z - object.z) <= reach;
}
