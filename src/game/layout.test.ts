import { describe, expect, it } from "vitest";
import {
  FIELD_RADIUS,
  GRAB_MARGIN,
  GRAB_PAD_M,
  START_CLEARANCE,
  isTouching,
  placeSpawns
} from "./layout";

const dist = (p: { x: number; z: number }) => Math.hypot(p.x, p.z);

describe("placeSpawns", () => {
  it("입력 개수만큼 좌표를 낸다", () => {
    expect(placeSpawns([0.02, 0.07, 0.2])).toHaveLength(3);
  });

  it("빈 입력에는 빈 배열을 낸다", () => {
    expect(placeSpawns([])).toEqual([]);
  });

  it("모든 좌표가 시작 여유와 필드 반경 사이에 있다", () => {
    const sizes = Array.from({ length: 60 }, (_, i) => [0.02, 0.07, 0.2, 0.6][i % 4]);
    for (const p of placeSpawns(sizes)) {
      expect(dist(p)).toBeGreaterThanOrEqual(START_CLEARANCE - 1e-9);
      expect(dist(p)).toBeLessThanOrEqual(FIELD_RADIUS + 1e-9);
    }
  });

  it("작은 사물이 큰 사물보다 중앙에 가깝다", () => {
    // 섞인 순서로 줘도 크기순으로 자리가 배정돼야 한다.
    const sizes = [0.6, 0.02, 0.2, 0.07, 0.6, 0.02];
    const points = placeSpawns(sizes);
    const maxSmall = Math.max(
      ...sizes.map((sz, i) => (sz === 0.02 ? dist(points[i]) : -Infinity))
    );
    const minBig = Math.min(
      ...sizes.map((sz, i) => (sz === 0.6 ? dist(points[i]) : Infinity))
    );
    expect(maxSmall).toBeLessThan(minBig);
  });

  it("시작 지점 바로 옆에 가장 큰 사물을 두지 않는다", () => {
    const sizes = [0.6, 0.6, 0.02, 0.02, 0.07, 0.2];
    const points = placeSpawns(sizes);
    sizes.forEach((sz, i) => {
      if (sz !== 0.6) return;
      // 공(5cm)이 60cm 사물에 갇히지 않을 만큼 떨어져 있어야 한다
      expect(dist(points[i])).toBeGreaterThan(0.6);
    });
  });

  it("같은 자리에 두 사물을 놓지 않는다", () => {
    const sizes = Array.from({ length: 60 }, () => 0.02);
    const keys = placeSpawns(sizes).map((p) => `${p.x.toFixed(4)},${p.z.toFixed(4)}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("같은 입력에 같은 좌표를 낸다", () => {
    const sizes = [0.02, 0.07, 0.2, 0.6];
    expect(placeSpawns(sizes)).toEqual(placeSpawns(sizes));
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
