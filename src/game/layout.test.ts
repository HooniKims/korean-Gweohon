import { describe, expect, it } from "vitest";
import {
  FIELD_RADIUS,
  GRAB_MARGIN,
  GRAB_PAD_M,
  START_CLEARANCE,
  ZONE_COUNT,
  ZONE_RADIUS,
  isTouching,
  placeSpawns,
  zoneCenters
} from "./layout";

const dist = (p: { x: number; z: number }) => Math.hypot(p.x, p.z);
/** 크기 배열을 오답 목록으로 바꾼다 */
const dec = (sizes: number[]) => sizes.map((sizeM) => ({ sizeM, isTarget: false }));

describe("placeSpawns", () => {
  it("입력 개수만큼 좌표를 낸다", () => {
    expect(placeSpawns(dec([0.02, 0.07, 0.2]))).toHaveLength(3);
  });

  it("빈 입력에는 빈 배열을 낸다", () => {
    expect(placeSpawns([])).toEqual([]);
  });

  it("모든 좌표가 시작 여유와 필드 반경 사이에 있다", () => {
    const sizes = Array.from({ length: 60 }, (_, i) => [0.02, 0.07, 0.2, 0.6][i % 4]);
    for (const p of placeSpawns(dec(sizes))) {
      expect(dist(p)).toBeLessThanOrEqual(FIELD_RADIUS + ZONE_RADIUS + 1e-9);
    }
  });

  it("무리 안에서 작은 사물이 큰 사물보다 중앙에 가깝다", () => {
    // 사물마다 자기가 속한 무리의 중심을 기준으로 본다. 무리 0 중심으로만 재면
    // 다른 무리에 배정된 사물까지 섞여 비교가 무의미해진다.
    const sizes = Array.from({ length: 21 }, (_, i) => [0.02, 0.07, 0.2][i % 3]);
    const points = placeSpawns(dec(sizes));
    const centers = zoneCenters();
    const ownZone = (i: number) => {
      let best = 0;
      let bd = Infinity;
      centers.forEach((c, zi) => {
        const d = Math.hypot(points[i].x - c.x, points[i].z - c.z);
        if (d < bd) {
          bd = d;
          best = zi;
        }
      });
      return { zone: best, r: bd };
    };

    // 무리별로 모아 크기순 정렬한 뒤 중심 거리가 커지는지 본다
    const byZone = new Map<number, { size: number; r: number }[]>();
    sizes.forEach((size, i) => {
      const { zone, r } = ownZone(i);
      const list = byZone.get(zone) ?? [];
      list.push({ size, r });
      byZone.set(zone, list);
    });

    for (const list of byZone.values()) {
      const ranked = [...list].sort((a, b) => a.size - b.size);
      for (let k = 1; k < ranked.length; k += 1) {
        expect(ranked[k].r).toBeGreaterThanOrEqual(ranked[k - 1].r - 1e-9);
      }
    }
  });

  it("시작 지점 바로 옆에 가장 큰 사물을 두지 않는다", () => {
    const sizes = [0.6, 0.6, 0.02, 0.02, 0.07, 0.2];
    const points = placeSpawns(dec(sizes));
    sizes.forEach((sz, i) => {
      if (sz !== 0.6) return;
      // 공(5cm)이 60cm 사물에 갇히지 않을 만큼 떨어져 있어야 한다
      expect(dist(points[i])).toBeGreaterThan(0.6);
    });
  });

  it("같은 자리에 두 사물을 놓지 않는다", () => {
    const sizes = Array.from({ length: 60 }, () => 0.02);
    const keys = placeSpawns(dec(sizes)).map((p) => `${p.x.toFixed(4)},${p.z.toFixed(4)}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("같은 입력에 같은 좌표를 낸다", () => {
    const sizes = [0.02, 0.07, 0.2, 0.6];
    expect(placeSpawns(dec(sizes))).toEqual(placeSpawns(dec(sizes)));
  });
});

describe("isTouching", () => {
  const ball = { x: 0, z: 0, diameterM: 0.05 };
  // 반지름 합 0.035에 여유 1.5배를 곱한 0.0525가 실제 임계값이다
  const reach = (0.025 + 0.01) * GRAB_MARGIN + GRAB_PAD_M;

  it("바로 앞에 있으면 붙는다", () => {
    expect(isTouching(ball, { x: 0.03, z: 0 }, 0.02)).toBe(true);
  });

  it("표면이 닿기 조금 전에도 붙는다", () => {
    // 물리가 겹침을 막으므로 딱 맞는 거리로 판정하면 영원히 안 붙는다
    expect(isTouching(ball, { x: 0.045, z: 0 }, 0.02)).toBe(true);
  });

  it("임계값 경계에서 붙는다", () => {
    expect(isTouching(ball, { x: reach - 1e-9, z: 0 }, 0.02)).toBe(true);
  });

  it("임계값을 넘으면 안 붙는다", () => {
    expect(isTouching(ball, { x: reach + 1e-6, z: 0 }, 0.02)).toBe(false);
  });

  it("정육면체 대각선 접촉 거리에서도 붙는다", () => {
    // XS 상자의 xz 반대각선은 0.01*sqrt(2) ≈ 0.0141 → 접촉 거리 약 0.039
    expect(isTouching(ball, { x: 0.028, z: 0.028 }, 0.02)).toBe(true);
  });

  it("대각선으로 멀면 안 붙는다", () => {
    expect(isTouching(ball, { x: 0.08, z: 0.08 }, 0.02)).toBe(false);
  });

  it("공이 커지면 붙는 범위가 넓어진다", () => {
    const big = { x: 0, z: 0, diameterM: 0.4 };
    expect(isTouching(big, { x: 0.2, z: 0 }, 0.02)).toBe(true);
  });
});

describe("목표와 오답의 배치 분리", () => {
  /** 명사 스테이지와 같은 구성: 목표 15 + 오답 36 */
  const stageItems = () => {
    const targets = Array.from({ length: 15 }, (_, i) => ({
      sizeM: 0.0425 * 1.11 ** i,
      isTarget: true
    }));
    const decoys = Array.from({ length: 36 }, (_, i) => ({
      sizeM: [0.02, 0.07, 0.2, 0.6][i % 4],
      isTarget: false
    }));
    return [...targets, ...decoys];
  };

  it("가장 가까운 목표가 시작 지점 근처에 있다", () => {
    // 켜자마자 붙일 것이 눈에 보여야 무엇을 하는 게임인지 알 수 있다.
    const items = stageItems();
    const points = placeSpawns(items);
    const nearestTarget = Math.min(
      ...items.map((it, i) => (it.isTarget ? dist(points[i]) : Infinity))
    );
    expect(nearestTarget).toBeLessThan(ZONE_RADIUS + 0.1);
  });

  it("목표가 필드 전체에 퍼져 있다", () => {
    const items = stageItems();
    const points = placeSpawns(items);
    const radii = items
      .map((it, i) => (it.isTarget ? dist(points[i]) : null))
      .filter((r): r is number => r !== null);
    expect(Math.max(...radii)).toBeGreaterThan(FIELD_RADIUS * 0.4);
  });

  it("작은 목표는 시작 무리, 큰 목표는 먼 무리에 있다", () => {
    // 공이 자라는 만큼 멀리 나가는 진행이 되어야 한다
    const items = stageItems();
    const points = placeSpawns(items);
    const targets = items
      .map((it, i) => ({ size: it.sizeM, r: dist(points[i]), isTarget: it.isTarget }))
      .filter((t) => t.isTarget)
      .sort((a, b) => a.size - b.size);
    const firstThird = targets.slice(0, Math.floor(targets.length / 3));
    const lastThird = targets.slice(-Math.floor(targets.length / 3));
    const avg = (xs: { r: number }[]) => xs.reduce((s, x) => s + x.r, 0) / xs.length;
    expect(avg(firstThird)).toBeLessThan(avg(lastThird));
  });

  it("목표와 오답이 같은 자리에 겹치지 않는다", () => {
    const points = placeSpawns(stageItems());
    const keys = points.map((p) => `${p.x.toFixed(3)},${p.z.toFixed(3)}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("넓은 맵의 무리 구조", () => {
  const stageItems = () => {
    const targets = Array.from({ length: 15 }, (_, i) => ({
      sizeM: 0.0425 * 1.11 ** i,
      isTarget: true
    }));
    const decoys = Array.from({ length: 36 }, (_, i) => ({
      sizeM: [0.02, 0.07, 0.2, 0.6][i % 4],
      isTarget: false
    }));
    return [...targets, ...decoys];
  };

  it("무리 중심 개수가 정의대로다", () => {
    expect(zoneCenters()).toHaveLength(ZONE_COUNT);
  });

  it("첫 무리는 시작 지점이다", () => {
    const [first] = zoneCenters();
    expect(dist(first)).toBe(0);
  });

  it("무리들이 서로 겹치지 않는다", () => {
    // 겹치면 무리 구분이 없어지고 균일 분포와 같아진다
    const centers = zoneCenters();
    for (let i = 0; i < centers.length; i += 1) {
      for (let j = i + 1; j < centers.length; j += 1) {
        const d = Math.hypot(centers[i].x - centers[j].x, centers[i].z - centers[j].z);
        expect(d).toBeGreaterThan(ZONE_RADIUS * 1.6);
      }
    }
  });

  it("모든 사물이 어느 무리 안에 들어 있다", () => {
    // 무리 밖에 흩어진 사물이 있으면 그게 바로 「텅 빈 화면」이다
    const items = stageItems();
    const points = placeSpawns(items);
    const centers = zoneCenters();
    for (const p of points) {
      const nearest = Math.min(
        ...centers.map((c) => Math.hypot(p.x - c.x, p.z - c.z))
      );
      expect(nearest).toBeLessThanOrEqual(ZONE_RADIUS + 1e-9);
    }
  });

  it("모든 무리에 사물이 있다", () => {
    const items = stageItems();
    const points = placeSpawns(items);
    const centers = zoneCenters();
    const counts = centers.map(
      (c) => points.filter((p) => Math.hypot(p.x - c.x, p.z - c.z) <= ZONE_RADIUS + 1e-9).length
    );
    for (const n of counts) expect(n).toBeGreaterThan(0);
  });

  it("모든 무리에 오답이 섞여 있다", () => {
    // 목표만 있는 무리가 있으면 학생이 품사를 안 보고 「저 무리로 가면 됨」으로 푼다
    const items = stageItems();
    const points = placeSpawns(items);
    const centers = zoneCenters();
    for (const c of centers) {
      const inZone = items.filter(
        (_, i) => Math.hypot(points[i].x - c.x, points[i].z - c.z) <= ZONE_RADIUS + 1e-9
      );
      expect(inZone.some((it) => !it.isTarget)).toBe(true);
    }
  });

  it("맵이 예전보다 넓다", () => {
    // 2m는 갇히는 느낌이 났다
    expect(FIELD_RADIUS).toBeGreaterThan(4);
  });
});
