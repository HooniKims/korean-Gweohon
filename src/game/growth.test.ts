import { describe, expect, it } from "vitest";
import {
  GROWTH_K,
  MASS_PENALTY_PER_MISFIT,
  PICKUP_RATIO,
  START_DIAMETER_M,
  canPickUp,
  grow,
  shrink,
  speedMultiplier
} from "./growth";

describe("상수", () => {
  it("스펙 값을 그대로 쓴다", () => {
    expect(START_DIAMETER_M).toBe(0.05);
    expect(PICKUP_RATIO).toBe(1.1);
    expect(GROWTH_K).toBe(0.6);
    expect(MASS_PENALTY_PER_MISFIT).toBe(0.12);
  });
});

describe("canPickUp", () => {
  it("공보다 작으면 붙는다", () => {
    expect(canPickUp(0.05, 0.02)).toBe(true);
  });

  it("공의 1.1배까지 붙는다 (경계 포함)", () => {
    expect(canPickUp(0.1, 0.11)).toBe(true);
  });

  it("1.1배를 넘으면 붙지 않는다", () => {
    expect(canPickUp(0.1, 0.1101)).toBe(false);
  });

  it("같은 크기는 붙는다", () => {
    expect(canPickUp(0.1, 0.1)).toBe(true);
  });

  it("시작 지름 5cm는 XS(2cm)를 붙이고 M(20cm)은 못 붙인다", () => {
    expect(canPickUp(START_DIAMETER_M, 0.02)).toBe(true);
    expect(canPickUp(START_DIAMETER_M, 0.2)).toBe(false);
  });
});

describe("grow", () => {
  it("부피를 합산해 지름을 키운다", () => {
    const result = grow(0.05, 0.05);
    const expected = Math.cbrt(0.05 ** 3 + 0.6 * 0.05 ** 3);
    expect(result).toBeCloseTo(expected, 10);
  });

  it("작은 것을 붙여도 반드시 커진다", () => {
    expect(grow(0.5, 0.01)).toBeGreaterThan(0.5);
  });

  it("붙인 것이 클수록 더 커진다", () => {
    expect(grow(0.1, 0.08)).toBeGreaterThan(grow(0.1, 0.02));
  });
});

describe("shrink", () => {
  it("grow의 역연산이다", () => {
    const grown = grow(0.2, 0.07);
    expect(shrink(grown, 0.07)).toBeCloseTo(0.2, 10);
  });

  it("전체 부피보다 큰 것을 빼도 0 미만이 되지 않는다", () => {
    expect(shrink(0.05, 10)).toBe(0);
  });
});

describe("speedMultiplier", () => {
  it("부착밀이 없으면 1이다", () => {
    expect(speedMultiplier(0)).toBe(1);
  });

  it("1개당 12%씩 깎는다", () => {
    expect(speedMultiplier(1)).toBeCloseTo(0.88, 10);
    expect(speedMultiplier(2)).toBeCloseTo(0.76, 10);
  });

  it("아무리 쌓여도 0.2 미만으로는 떨어지지 않는다", () => {
    expect(speedMultiplier(50)).toBe(0.2);
  });
});

describe("너무 큰 것은 튕긴다 (괴혼 규칙)", () => {
  it("5cm 공은 5.5cm까지 먹고 그 위는 못 먹는다", () => {
    expect(canPickUp(0.05, 0.055)).toBe(true);
    expect(canPickUp(0.05, 0.056)).toBe(false);
  });

  it("공을 키우면 전에 못 먹던 것을 먹을 수 있다", () => {
    const target = 0.2;
    let d = START_DIAMETER_M;
    expect(canPickUp(d, target)).toBe(false);
    // 자기 크기의 85%짜리를 계속 먹으며 자란다
    for (let i = 0; i < 40 && !canPickUp(d, target); i += 1) {
      d = grow(d, d * 0.85);
    }
    expect(canPickUp(d, target)).toBe(true);
  });

  it("먹을 수 있는 크기와 못 먹는 크기를 나누는 기준은 하나다", () => {
    // 판정이 여러 곳에 흩어지면 화면 신호와 실제 부착이 어긋난다
    for (const d of [0.05, 0.1, 0.3, 1]) {
      const limit = d * PICKUP_RATIO;
      expect(canPickUp(d, limit)).toBe(true);
      expect(canPickUp(d, limit * 1.001)).toBe(false);
    }
  });
});
