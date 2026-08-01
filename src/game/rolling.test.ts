import { describe, expect, it } from "vitest";
import { rotateInput, torqueForInput } from "./rolling";

/**
 * 토크에서 실제 이동 방향을 되돌려 계산한다.
 * v_center = −(ω × r_contact), r_contact = (0, −r, 0)
 */
function velocityFromTorque(t: { x: number; y: number; z: number }) {
  const r = 1;
  // ω ∝ t (같은 방향). ω × (0,−r,0)
  const cross = {
    x: t.y * 0 - t.z * -r,
    y: t.z * 0 - t.x * 0,
    z: t.x * -r - t.y * 0
  };
  return { x: -cross.x, y: -cross.y, z: -cross.z };
}

describe("torqueForInput", () => {
  it("입력이 없으면 토크도 없다", () => {
    // -0이 나올 수 있다. 물리에는 무해하므로 크기로 본다.
    const t = torqueForInput({ x: 0, y: 0 }, 5);
    expect(Math.abs(t.x)).toBe(0);
    expect(Math.abs(t.y)).toBe(0);
    expect(Math.abs(t.z)).toBe(0);
  });

  it("화면 위로 밀면 카메라 반대편(-Z)으로 간다", () => {
    const v = velocityFromTorque(torqueForInput({ x: 0, y: -1 }, 1));
    expect(v.z).toBeLessThan(0);
    expect(v.x).toBeCloseTo(0, 10);
  });

  it("화면 아래로 밀면 카메라 쪽(+Z)으로 간다", () => {
    const v = velocityFromTorque(torqueForInput({ x: 0, y: 1 }, 1));
    expect(v.z).toBeGreaterThan(0);
  });

  it("화면 오른쪽으로 밀면 +X로 간다", () => {
    const v = velocityFromTorque(torqueForInput({ x: 1, y: 0 }, 1));
    expect(v.x).toBeGreaterThan(0);
    expect(v.z).toBeCloseTo(0, 10);
  });

  it("화면 왼쪽으로 밀면 -X로 간다", () => {
    const v = velocityFromTorque(torqueForInput({ x: -1, y: 0 }, 1));
    expect(v.x).toBeLessThan(0);
  });

  it("대각선 입력은 두 방향 성분을 모두 만든다", () => {
    const v = velocityFromTorque(torqueForInput({ x: 0.7, y: -0.7 }, 1));
    expect(v.x).toBeGreaterThan(0);
    expect(v.z).toBeLessThan(0);
  });

  it("y축 토크는 주지 않는다. 제자리 회전은 조작에 넣지 않는다", () => {
    expect(torqueForInput({ x: 1, y: 1 }, 3).y).toBe(0);
  });

  it("세기에 비례한다", () => {
    const a = torqueForInput({ x: 0, y: -1 }, 1);
    const b = torqueForInput({ x: 0, y: -1 }, 4);
    expect(b.x).toBeCloseTo(a.x * 4, 10);
  });
});

describe("rotateInput", () => {
  it("yaw가 0이면 그대로 둔다", () => {
    const v = rotateInput({ x: 0.3, y: -0.7 }, 0);
    expect(v.x).toBeCloseTo(0.3, 10);
    expect(v.y).toBeCloseTo(-0.7, 10);
  });

  it("카메라가 90도 돌면 입력도 90도 돈다", () => {
    // yaw=90°: 카메라가 +X 쪽에 있고 화면 위는 -X를 향한다
    const v = rotateInput({ x: 0, y: -1 }, Math.PI / 2);
    expect(v.x).toBeCloseTo(-1, 10);
    expect(v.y).toBeCloseTo(0, 10);
  });

  it("180도 돌면 앞뒤가 뒤집힌다", () => {
    const v = rotateInput({ x: 0, y: -1 }, Math.PI);
    expect(v.x).toBeCloseTo(0, 10);
    expect(v.y).toBeCloseTo(1, 10);
  });

  it("크기를 바꾸지 않는다", () => {
    const src = { x: 0.6, y: -0.8 };
    for (const yaw of [0, 0.7, 2.1, -1.3, 5.5]) {
      const v = rotateInput(src, yaw);
      expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 10);
    }
  });

  it("입력이 없으면 회전해도 없다", () => {
    const v = rotateInput({ x: 0, y: 0 }, 1.2);
    expect(Math.abs(v.x)).toBeCloseTo(0, 10);
    expect(Math.abs(v.y)).toBeCloseTo(0, 10);
  });
});
