import { describe, expect, it } from "vitest";
import {
  FIELD_RADIUS,
  START_CLEARANCE,
  isTouching,
  placeSpawns
} from "./layout";
import { TIER_DIAMETER_M, type ObjectTier } from "./objectTiers";

const dist = (p: { x: number; z: number }) => Math.hypot(p.x, p.z);

describe("placeSpawns", () => {
  it("입력 개수만큼 좌표를 낸다", () => {
    expect(placeSpawns(["XS", "S", "M"])).toHaveLength(3);
  });

  it("빈 입력에는 빈 배열을 낸다", () => {
    expect(placeSpawns([])).toEqual([]);
  });

  it("모든 좌표가 시작 여유와 필드 반경 사이에 있다", () => {
    const tiers: ObjectTier[] = Array.from({ length: 60 }, (_, i) =>
      (["XS", "S", "M", "L"] as const)[i % 4]
    );
    for (const p of placeSpawns(tiers)) {
      expect(dist(p)).toBeGreaterThanOrEqual(START_CLEARANCE - 1e-9);
      expect(dist(p)).toBeLessThanOrEqual(FIELD_RADIUS + 1e-9);
    }
  });

  it("작은 사물이 큰 사물보다 중앙에 가깝다", () => {
    // 섞인 순서로 줘도 티어 크기순으로 자리가 배정돼야 한다.
    const tiers: ObjectTier[] = ["L", "XS", "M", "S", "L", "XS"];
    const points = placeSpawns(tiers);
    const maxXs = Math.max(
      ...tiers.map((t, i) => (t === "XS" ? dist(points[i]) : -Infinity))
    );
    const minL = Math.min(
      ...tiers.map((t, i) => (t === "L" ? dist(points[i]) : Infinity))
    );
    expect(maxXs).toBeLessThan(minL);
  });

  it("시작 지점 바로 옆에 L티어를 두지 않는다", () => {
    const tiers: ObjectTier[] = ["L", "L", "XS", "XS", "S", "M"];
    const points = placeSpawns(tiers);
    tiers.forEach((t, i) => {
      if (t !== "L") return;
      // 공(5cm)이 L(60cm)에 갇히지 않을 만큼 떨어져 있어야 한다
      expect(dist(points[i])).toBeGreaterThan(TIER_DIAMETER_M.L);
    });
  });

  it("같은 자리에 두 사물을 놓지 않는다", () => {
    const tiers: ObjectTier[] = Array.from({ length: 60 }, () => "XS");
    const keys = placeSpawns(tiers).map((p) => `${p.x.toFixed(4)},${p.z.toFixed(4)}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("같은 입력에 같은 좌표를 낸다", () => {
    const tiers: ObjectTier[] = ["XS", "S", "M", "L"];
    expect(placeSpawns(tiers)).toEqual(placeSpawns(tiers));
  });
});

describe("isTouching", () => {
  const ball = { x: 0, z: 0, diameterM: 0.05 };

  it("반지름 합 안에 있으면 닿는다", () => {
    expect(isTouching(ball, { x: 0.03, z: 0 }, 0.02)).toBe(true);
  });

  it("경계에서도 닿는다", () => {
    // 0.025 + 0.01 = 0.035
    expect(isTouching(ball, { x: 0.035, z: 0 }, 0.02)).toBe(true);
  });

  it("반지름 합보다 멀면 안 닿는다", () => {
    expect(isTouching(ball, { x: 0.036, z: 0 }, 0.02)).toBe(false);
  });

  it("대각선 거리도 본다", () => {
    expect(isTouching(ball, { x: 0.03, z: 0.03 }, 0.02)).toBe(false);
    expect(isTouching(ball, { x: 0.02, z: 0.02 }, 0.02)).toBe(true);
  });

  it("공이 커지면 닿는 범위가 넓어진다", () => {
    const big = { x: 0, z: 0, diameterM: 0.4 };
    expect(isTouching(big, { x: 0.2, z: 0 }, 0.02)).toBe(true);
  });
});
