import { beforeEach, describe, expect, it } from "vitest";
import { clearLivePositions, livePosition, setLivePosition } from "./spawnPositions";

const origin = { x: 0, z: 0 };

describe("spawnPositions", () => {
  beforeEach(() => {
    clearLivePositions();
  });

  it("보고된 적 없으면 최초 좌표를 쓴다", () => {
    expect(livePosition(3, { x: 1, z: 2 })).toEqual({ x: 1, z: 2 });
  });

  it("보고하면 그 위치를 쓴다", () => {
    setLivePosition(3, 5, 6);
    expect(livePosition(3, origin)).toEqual({ x: 5, z: 6 });
  });

  it("사물이 밀려 움직여도 따라간다", () => {
    // 최초 좌표로 판정하면 밀린 뒤로는 화면에서 밀고 있어도 안 붙는다
    setLivePosition(0, 1, 1);
    setLivePosition(0, 1.4, 1.2);
    expect(livePosition(0, origin)).toEqual({ x: 1.4, z: 1.2 });
  });

  it("서로 다른 사물이 섞이지 않는다", () => {
    setLivePosition(0, 1, 1);
    setLivePosition(7, 9, 9);
    expect(livePosition(0, origin)).toEqual({ x: 1, z: 1 });
    expect(livePosition(7, origin)).toEqual({ x: 9, z: 9 });
  });

  it("갱신할 때 새 객체를 만들지 않는다", () => {
    // 매 프레임 51개가 갱신되므로 할당이 쌓이면 안 된다
    setLivePosition(2, 1, 1);
    const first = livePosition(2, origin);
    setLivePosition(2, 2, 2);
    expect(livePosition(2, origin)).toBe(first);
  });

  it("새 판을 시작하면 비워진다", () => {
    setLivePosition(0, 5, 5);
    clearLivePositions();
    expect(livePosition(0, origin)).toEqual(origin);
  });
});
