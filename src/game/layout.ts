/**
 * 필드 반경(미터).
 *
 * 넓은 필드에 사물을 균일하게 뿌리면 화면이 텅 비어 목표를 못 찾는다. 처음에
 * 9m로 잡았다가 그 문제로 2m까지 줄였는데, 이번에는 좁아서 갇히는 느낌이 났다.
 *
 * 그래서 넓히되 균일하게 뿌리지 않는다. 사물을 여러 무리(zone)로 뭉쳐 두고 그
 * 사이를 이동하게 한다. 무리 안은 빽빽하고 사이는 비어서, 넓으면서도 「지금
 * 여기」는 채워져 있다.
 */
export const FIELD_RADIUS = 7.0;
/** 시작 지점 주변은 비워서 공이 큰 사물에 갇히지 않게 한다. */
export const START_CLEARANCE = 0.22;
/** 무리 하나의 반경. 이 안에 사물이 몰려 있다. */
export const ZONE_RADIUS = 1.15;
/** 무리 개수. 첫 무리는 시작 지점이고 나머지는 바깥으로 퍼진다. */
export const ZONE_COUNT = 7;

export type SpawnPoint = { x: number; z: number };

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/**
 * 무리의 중심들. 첫 무리는 시작 지점(원점)이고 나머지는 바깥으로 퍼진다.
 *
 * 시작 무리가 원점에 있어야 학생이 켜자마자 붙일 것을 만난다. 나머지를 두 겹
 * 고리로 두면 한 무리를 비운 뒤 다음 무리가 눈에 들어온다.
 */
export function zoneCenters(): SpawnPoint[] {
  const centers: SpawnPoint[] = [{ x: 0, z: 0 }];
  const outer = ZONE_COUNT - 1;
  for (let i = 0; i < outer; i += 1) {
    // 안쪽 고리와 바깥 고리를 번갈아 둬서 이동 거리가 들쭉날쭉해진다
    const ring = i % 2 === 0 ? 0.55 : 0.88;
    const angle = (i / outer) * Math.PI * 2 + GOLDEN;
    const r = FIELD_RADIUS * ring;
    centers.push({ x: Math.cos(angle) * r, z: Math.sin(angle) * r });
  }
  return centers;
}

/** 무리 안에서 rank번째 자리의 중심 거리 */
function inZoneRadius(rank: number, count: number): number {
  if (count <= 1) return 0;
  return ZONE_RADIUS * Math.sqrt((rank + 0.4) / count);
}

/**
 * 부착 여유 배수.
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

export type Placeable = { sizeM: number; isTarget: boolean };

/**
 * 사물을 필드에 배치한다.
 *
 * 목표와 오답을 무리마다 섞어 넣는다. 목표만 모아 두면 학생이 품사를 보지 않고
 * 「저 무리로 가면 된다」로 풀어 버리고, 오답만 있는 무리는 갈 이유가 없다.
 *
 * 목표는 크기순으로 무리에 나눠 담는다. 작은 목표가 시작 무리에 오고 큰 목표가
 * 먼 무리에 있어야, 공이 자라는 만큼 멀리 나가는 진행이 된다.
 *
 * 무리 안에서는 작은 것이 중앙, 큰 것이 바깥이다. 공이 자라는 순서와 이동 방향이
 * 맞아떨어져 자연스럽게 무리 밖으로 퍼져 나간다.
 *
 * 반환 배열의 인덱스는 입력 인덱스와 대응한다. 렌더와 부착 판정이 같은 좌표를
 * 써야 하므로 이 함수가 유일한 출처다.
 */
export function placeSpawns(items: readonly Placeable[]): SpawnPoint[] {
  const out: SpawnPoint[] = new Array(items.length);
  const centers = zoneCenters();

  const indexed = items.map((it, index) => ({ index, size: it.sizeM, isTarget: it.isTarget }));
  const targets = indexed.filter((x) => x.isTarget).sort((a, b) => a.size - b.size);
  const decoys = indexed.filter((x) => !x.isTarget).sort((a, b) => a.size - b.size);

  const buckets: { index: number; size: number }[][] = centers.map(() => []);

  // 목표는 작은 것부터 무리 순서대로. 시작 무리에 가장 작은 것이 온다.
  targets.forEach((t, i) => {
    const zone =
      targets.length <= 1
        ? 0
        : Math.min(centers.length - 1, Math.floor((i / targets.length) * centers.length));
    buckets[zone].push(t);
  });
  // 오답은 고르게 흩는다. 어느 무리든 오답이 섞여 있어야 품사를 보게 된다.
  decoys.forEach((d, i) => {
    buckets[i % centers.length].push(d);
  });

  buckets.forEach((bucket, zi) => {
    const center = centers[zi];
    const ordered = [...bucket].sort((a, b) => a.size - b.size || a.index - b.index);
    ordered.forEach((item, rank) => {
      const floor = zi === 0 ? START_CLEARANCE : 0;
      const r = Math.max(floor, inZoneRadius(rank, ordered.length));
      const a = rank * GOLDEN + zi * 1.7;
      out[item.index] = {
        x: center.x + Math.cos(a) * r,
        z: center.z + Math.sin(a) * r
      };
    });
  });

  return out;
}

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
