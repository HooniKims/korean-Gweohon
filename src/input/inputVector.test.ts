import { describe, expect, it } from "vitest";
import { vectorFromKeys, vectorFromStick } from "./inputVector";

describe("vectorFromKeys", () => {
  it("아무 키도 없으면 0이다", () => {
    expect(vectorFromKeys(new Set())).toEqual({ x: 0, y: 0 });
  });

  it("위쪽은 y가 -1이다", () => {
    expect(vectorFromKeys(new Set(["ArrowUp"]))).toEqual({ x: 0, y: -1 });
  });

  it("WASD도 방향키와 같게 동작한다", () => {
    expect(vectorFromKeys(new Set(["KeyW"]))).toEqual({ x: 0, y: -1 });
    expect(vectorFromKeys(new Set(["KeyD"]))).toEqual({ x: 1, y: 0 });
    expect(vectorFromKeys(new Set(["KeyS"]))).toEqual({ x: 0, y: 1 });
    expect(vectorFromKeys(new Set(["KeyA"]))).toEqual({ x: -1, y: 0 });
  });

  it("대각선은 크기가 1로 정규화된다", () => {
    const v = vectorFromKeys(new Set(["ArrowUp", "ArrowRight"]));
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 10);
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBeLessThan(0);
  });

  it("반대 방향이 함께 눌리면 상쇄된다", () => {
    expect(vectorFromKeys(new Set(["ArrowLeft", "ArrowRight"]))).toEqual({ x: 0, y: 0 });
  });

  it("모르는 키는 무시한다", () => {
    expect(vectorFromKeys(new Set(["KeyZ", "ArrowDown"]))).toEqual({ x: 0, y: 1 });
  });

  it("방향키와 WASD를 같이 눌러도 크기가 1을 넘지 않는다", () => {
    const v = vectorFromKeys(new Set(["ArrowUp", "KeyW"]));
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 10);
  });
});

describe("vectorFromStick", () => {
  const center = { x: 100, y: 100 };

  it("중심에 있으면 0이다", () => {
    expect(vectorFromStick(center, { x: 100, y: 100 }, 60)).toEqual({ x: 0, y: 0 });
  });

  it("반경의 절반이면 크기가 0.5다", () => {
    const v = vectorFromStick(center, { x: 130, y: 100 }, 60);
    expect(v.x).toBeCloseTo(0.5, 10);
    expect(v.y).toBeCloseTo(0, 10);
  });

  it("반경을 넘으면 1로 클램프된다", () => {
    const v = vectorFromStick(center, { x: 400, y: 100 }, 60);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 10);
  });

  it("화면 아래로 끌면 y가 양수다", () => {
    const v = vectorFromStick(center, { x: 100, y: 160 }, 60);
    expect(v.y).toBeCloseTo(1, 10);
  });

  it("반경이 0이면 0을 낸다", () => {
    expect(vectorFromStick(center, { x: 200, y: 200 }, 0)).toEqual({ x: 0, y: 0 });
  });
});
