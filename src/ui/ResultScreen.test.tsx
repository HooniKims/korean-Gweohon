import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResultScreen } from "./ResultScreen";
import { useGameStore } from "@/store/gameStore";
import type { StageDef } from "@/game/stages";
import type { SpawnPlan } from "@/game/words";

const stage: StageDef = {
  id: "test:명사",
  targetPos: "명사",
  targetCount: 1,
  decoyCount: 1,
  durationSec: 90
};

const spawns: SpawnPlan[] = [
  { entry: { text: "학교", pos: "명사" }, tier: "XS", isTarget: true },
  { entry: { text: "매우", pos: "부사" }, tier: "XS", isTarget: false }
];

describe("ResultScreen", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it("클리어하면 성공 문구를 보여준다", () => {
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().pickUp(0);
    render(<ResultScreen onRetry={() => {}} />);
    expect(screen.getByText(/성공/)).toBeTruthy();
  });

  it("시간이 다 되면 실패 문구를 보여준다", () => {
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().tick(999);
    render(<ResultScreen onRetry={() => {}} />);
    expect(screen.getByText(/시간/)).toBeTruthy();
  });

  it("별 개수를 접근 가능한 라벨로 알려준다", () => {
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().pickUp(0);
    render(<ResultScreen onRetry={() => {}} />);
    expect(screen.getByLabelText("별 3개 중 3개")).toBeTruthy();
  });

  it("오답을 섞으면 별이 줄어든다", () => {
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().pickUp(1); // 오답
    useGameStore.getState().pickUp(0);
    render(<ResultScreen onRetry={() => {}} />);
    expect(screen.getByLabelText("별 3개 중 1개")).toBeTruthy();
  });

  it("다시하기 버튼이 콜백을 부른다", () => {
    const onRetry = vi.fn();
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().pickUp(0);
    render(<ResultScreen onRetry={onRetry} />);
    screen.getByRole("button", { name: "다시하기" }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("playing 중에는 아무것도 그리지 않는다", () => {
    useGameStore.getState().startStage(stage, spawns);
    const { container } = render(<ResultScreen onRetry={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("헷갈린 단어를 정답 품사와 함께 보여준다", () => {
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().pickUp(1); // 「매우」는 부사
    useGameStore.getState().pickUp(0);
    render(<ResultScreen onRetry={() => {}} />);
    expect(screen.getByText(/매우/)).toBeTruthy();
    expect(screen.getByText(/부사/)).toBeTruthy();
  });

  it("오답이 없으면 헷갈린 단어 목록을 보이지 않는다", () => {
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().pickUp(0);
    render(<ResultScreen onRetry={() => {}} />);
    expect(screen.queryByText(/헷갈린/)).toBeNull();
  });
});
