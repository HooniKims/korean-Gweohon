import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "./gameStore";
import type { SpawnPlan } from "@/game/words";
import type { StageDef } from "@/game/stages";

const stage: StageDef = {
  id: "test:명사",
  targetPos: "명사",
  targetCount: 2,
  decoyCount: 1,
  durationSec: 10
};

const spawns: SpawnPlan[] = [
  { entry: { text: "학교", pos: "명사" }, tier: "XS", isTarget: true },
  { entry: { text: "하늘", pos: "명사" }, tier: "XS", isTarget: true },
  { entry: { text: "매우", pos: "부사" }, tier: "XS", isTarget: false }
];

const s = () => useGameStore.getState();

describe("gameStore", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it("초기에는 ready 상태다", () => {
    expect(s().phase).toBe("ready");
  });

  it("스테이지를 시작하면 playing이 되고 지름이 5cm다", () => {
    s().startStage(stage, spawns);
    expect(s().phase).toBe("playing");
    expect(s().diameterM).toBe(0.05);
    expect(s().secondsLeft).toBe(10);
    expect(s().collected).toBe(0);
    expect(s().misfits).toBe(0);
  });

  it("목표 품사를 붙이면 수집이 늘고 점수가 오른다", () => {
    s().startStage(stage, spawns);
    s().pickUp(0);
    expect(s().collected).toBe(1);
    expect(s().misfits).toBe(0);
    expect(s().score.points).toBe(100);
    expect(s().attachedIds).toContain(0);
  });

  it("다른 품사를 붙이면 부착밀이 늘고 수집은 안 는다", () => {
    s().startStage(stage, spawns);
    s().pickUp(2);
    expect(s().collected).toBe(0);
    expect(s().misfits).toBe(1);
  });

  it("부착밀도 지름을 키운다", () => {
    s().startStage(stage, spawns);
    const before = s().diameterM;
    s().pickUp(2);
    expect(s().diameterM).toBeGreaterThan(before);
  });

  it("같은 것을 두 번 붙일 수 없다", () => {
    s().startStage(stage, spawns);
    s().pickUp(0);
    s().pickUp(0);
    expect(s().collected).toBe(1);
    expect(s().attachedIds).toHaveLength(1);
  });

  it("공보다 너무 큰 것은 붙지 않는다", () => {
    const bigSpawns: SpawnPlan[] = [
      { entry: { text: "의자", pos: "명사" }, tier: "L", isTarget: true }
    ];
    s().startStage(stage, bigSpawns);
    s().pickUp(0);
    expect(s().collected).toBe(0);
    expect(s().attachedIds).toHaveLength(0);
  });

  it("붙은 사물마다 표면 방향을 기록한다", () => {
    s().startStage(stage, spawns);
    s().pickUp(0);
    const dir = s().attachDirs[0];
    expect(dir).toBeDefined();
    expect(Math.hypot(dir[0], dir[1], dir[2])).toBeCloseTo(1, 6);
  });

  it("목표 수를 채우면 cleared가 된다", () => {
    s().startStage(stage, spawns);
    s().pickUp(0);
    s().pickUp(1);
    expect(s().phase).toBe("cleared");
  });

  it("clear 시 별을 계산해 둔다", () => {
    // 정답 2개·오답 0개 → 정확도 100%로 ★★. 이 스테이지는 10초짜리라
    // 30초 이상 남기는 ★★★ 조건은 만족할 수 없다.
    s().startStage(stage, spawns);
    s().pickUp(0);
    s().pickUp(1);
    expect(s().stars).toBe(2);
  });

  it("오답을 섞어 클리어하면 별이 깎인다", () => {
    s().startStage(stage, spawns);
    s().pickUp(2); // 부사 — 오답
    s().pickUp(0);
    s().pickUp(1);
    expect(s().phase).toBe("cleared");
    expect(s().stars).toBe(1); // 정확도 2/3 ≈ 67% < 85%
  });

  it("시간을 넉넉히 남기고 정확하게 끝내면 별 3개다", () => {
    const longStage: StageDef = { ...stage, durationSec: 90 };
    s().startStage(longStage, spawns);
    s().pickUp(0);
    s().pickUp(1);
    expect(s().stars).toBe(3);
  });

  it("tick이 남은 시간을 줄인다", () => {
    s().startStage(stage, spawns);
    s().tick(3);
    expect(s().secondsLeft).toBe(7);
  });

  it("초 단위 경계를 넘지 않는 tick은 스토어를 갱신하지 않는다", () => {
    // 매 프레임 스토어를 갱신하면 HUD가 프레임마다 리렌더된다.
    s().startStage(stage, spawns);
    const first = useGameStore.getState();
    s().tick(0.016);
    expect(useGameStore.getState()).toBe(first);
    expect(s().secondsLeft).toBe(10);
  });

  it("누적된 소수 시간이 1초를 넘으면 반영된다", () => {
    s().startStage(stage, spawns);
    for (let i = 0; i < 62; i += 1) s().tick(0.016); // 약 0.992초
    expect(s().secondsLeft).toBe(10);
    s().tick(0.016);
    expect(s().secondsLeft).toBe(9);
  });

  it("시간이 다 되면 failed가 된다", () => {
    s().startStage(stage, spawns);
    s().tick(20);
    expect(s().phase).toBe("failed");
    expect(s().secondsLeft).toBe(0);
  });

  it("clear 후에는 tick이 시간을 줄이지 않는다", () => {
    s().startStage(stage, spawns);
    s().pickUp(0);
    s().pickUp(1);
    const left = s().secondsLeft;
    s().tick(5);
    expect(s().secondsLeft).toBe(left);
  });

  it("playing이 아니면 붙지 않는다", () => {
    s().pickUp(0);
    expect(s().collected).toBe(0);
  });

  it("다시 시작하면 이전 판의 기록이 남지 않는다", () => {
    s().startStage(stage, spawns);
    s().pickUp(2);
    s().tick(4);
    s().startStage(stage, spawns);
    expect(s().misfits).toBe(0);
    expect(s().collected).toBe(0);
    expect(s().secondsLeft).toBe(10);
    expect(s().diameterM).toBe(0.05);
    expect(s().attachedIds).toHaveLength(0);
    expect(s().score.points).toBe(0);
  });
});
