import { describe, expect, it } from "vitest";
import { STUCK_SEC, STUCK_SPEED, createStuckState, updateStuck } from "./stuck";

const frame = 1 / 60;

/** n초 동안 밀면서 안 움직인 상태를 흘린다 */
function push(seconds: number, speed = 0) {
  let s = createStuckState();
  const escapes: number[] = [];
  const steps = Math.round(seconds / frame);
  for (let i = 0; i < steps; i += 1) {
    s = updateStuck(s, { pushing: true, speed, deltaSec: frame });
    if (s.escape) escapes.push(i * frame);
  }
  return { state: s, escapes };
}

describe("updateStuck", () => {
  it("빈 상태로 시작한다", () => {
    expect(createStuckState()).toEqual({ heldSec: 0, escape: false });
  });

  it("조작하지 않으면 끼인 것으로 보지 않는다", () => {
    let s = createStuckState();
    for (let i = 0; i < 300; i += 1) {
      s = updateStuck(s, { pushing: false, speed: 0, deltaSec: frame });
      expect(s.escape).toBe(false);
    }
  });

  it("움직이고 있으면 끼인 것으로 보지 않는다", () => {
    const { escapes } = push(3, 0.5);
    expect(escapes).toEqual([]);
  });

  it("밀고 있는데 안 움직이면 정해진 시간 뒤에 탈출한다", () => {
    const { escapes } = push(1.2);
    expect(escapes).toHaveLength(1);
    expect(escapes[0]).toBeGreaterThanOrEqual(STUCK_SEC - frame * 2);
    expect(escapes[0]).toBeLessThanOrEqual(STUCK_SEC + frame * 2);
  });

  it("탈출은 한 프레임만 켜지고 곧바로 꺼진다", () => {
    // 계속 켜져 있으면 공이 통제 불능으로 튄다
    const { escapes } = push(2.0);
    expect(escapes.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < escapes.length; i += 1) {
      expect(escapes[i] - escapes[i - 1]).toBeGreaterThan(STUCK_SEC * 0.8);
    }
  });

  it("아주 느리게라도 기준을 넘으면 끼인 것이 아니다", () => {
    const { escapes } = push(3, STUCK_SPEED + 0.001);
    expect(escapes).toEqual([]);
  });

  it("기준 아래로 기어가면 끼인 것으로 본다", () => {
    const { escapes } = push(1.2, STUCK_SPEED - 0.001);
    expect(escapes).toHaveLength(1);
  });

  it("도중에 움직이기 시작하면 타이머가 초기화된다", () => {
    let s = createStuckState();
    for (let i = 0; i < 40; i += 1) {
      s = updateStuck(s, { pushing: true, speed: 0, deltaSec: frame });
    }
    expect(s.heldSec).toBeGreaterThan(0);
    s = updateStuck(s, { pushing: true, speed: 1, deltaSec: frame });
    expect(s.heldSec).toBe(0);
  });
});
