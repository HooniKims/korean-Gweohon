import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Hud } from "./Hud";
import { useGameStore } from "@/store/gameStore";
import type { StageDef } from "@/game/stages";
import type { SpawnPlan } from "@/game/words";

const stage: StageDef = {
  id: "test:명사",
  targetPos: "명사",
  targetCount: 3,
  decoyCount: 1,
  durationSec: 90
};

const spawns: SpawnPlan[] = [
  { entry: { text: "학교", pos: "명사" }, tier: "XS", isTarget: true },
  { entry: { text: "매우", pos: "부사" }, tier: "XS", isTarget: false }
];

describe("Hud", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().startStage(stage, spawns);
  });

  it("목표 품사를 보여준다", () => {
    render(<Hud />);
    expect(screen.getByText(/명사/)).toBeTruthy();
  });

  it("수집 진행을 N / M으로 보여준다", () => {
    render(<Hud />);
    expect(screen.getByText("0 / 3")).toBeTruthy();
  });

  it("지름을 밀리미터까지 보여준다", () => {
    render(<Hud />);
    expect(screen.getByText("5cm")).toBeTruthy();
  });

  it("남은 시간을 초로 보여준다", () => {
    render(<Hud />);
    expect(screen.getByText("90")).toBeTruthy();
  });

  it("부착밀이 없으면 경고를 보이지 않는다", () => {
    render(<Hud />);
    expect(screen.queryByText(/부착밀/)).toBeNull();
  });

  it("부착밀이 생기면 개수를 보여준다", () => {
    useGameStore.getState().pickUp(1);
    render(<Hud />);
    expect(screen.getByText(/부착밀 1/)).toBeTruthy();
  });

  it("정답을 붙이면 수집 수가 오른다", () => {
    useGameStore.getState().pickUp(0);
    render(<Hud />);
    expect(screen.getByText("1 / 3")).toBeTruthy();
  });

  it("스테이지가 없으면 아무것도 그리지 않는다", () => {
    useGameStore.getState().reset();
    const { container } = render(<Hud />);
    expect(container.firstChild).toBeNull();
  });
});
