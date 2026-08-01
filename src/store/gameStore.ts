import { create } from "zustand";
import { START_DIAMETER_M, canPickUp, grow } from "@/game/growth";
import { TIER_DIAMETER_M } from "@/game/objectTiers";
import {
  accuracy,
  applyHit,
  applyMiss,
  createScoreState,
  starsFor,
  type ScoreState
} from "@/game/scoring";
import { isCleared, judgePickup } from "@/game/modes/singlePos";
import type { StageDef } from "@/game/stages";
import type { SpawnPlan, WordEntry } from "@/game/words";

export type Phase = "ready" | "playing" | "cleared" | "failed";

type GameState = {
  phase: Phase;
  stage: StageDef | null;
  spawns: SpawnPlan[];
  attachedIds: number[];
  /** 붙은 사물이 공 표면 어디에 박혔는지. 정규화된 방향 벡터. */
  attachDirs: Record<number, [number, number, number]>;
  diameterM: number;
  collected: number;
  misfits: number;
  score: ScoreState;
  secondsLeft: number;
  stars: 0 | 1 | 2 | 3;

  startStage: (stage: StageDef, spawns: SpawnPlan[]) => void;
  pickUp: (spawnIndex: number) => void;
  tick: (deltaSec: number) => void;
  reset: () => void;
};

/** 공 표면의 임의 방향. 사물이 튀어나온 채로 붙는 위치를 정한다. */
function randomUnitVector(): [number, number, number] {
  const u = Math.random() * 2 - 1;
  const theta = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  return [r * Math.cos(theta), u, r * Math.sin(theta)];
}

const initialState = {
  phase: "ready" as Phase,
  stage: null as StageDef | null,
  spawns: [] as SpawnPlan[],
  attachedIds: [] as number[],
  attachDirs: {} as Record<number, [number, number, number]>,
  diameterM: START_DIAMETER_M,
  collected: 0,
  misfits: 0,
  secondsLeft: 0,
  stars: 0 as 0 | 1 | 2 | 3
};

/**
 * tick은 매 프레임 불리지만 스토어는 초가 바뀔 때만 갱신한다.
 * 프레임마다 set을 부르면 HUD가 프레임마다 리렌더된다. 소수점 잔여는 여기 모아둔다.
 */
let fractionalSec = 0;

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,
  score: createScoreState(),

  startStage: (stage, spawns) => {
    fractionalSec = 0;
    set({
      ...initialState,
      phase: "playing",
      stage,
      spawns,
      secondsLeft: stage.durationSec,
      score: createScoreState()
    });
  },

  pickUp: (spawnIndex) => {
    const s = get();
    if (s.phase !== "playing" || !s.stage) return;
    if (s.attachedIds.includes(spawnIndex)) return;

    const spawn = s.spawns[spawnIndex];
    if (!spawn) return;

    const objectDiameterM = TIER_DIAMETER_M[spawn.tier];
    if (!canPickUp(s.diameterM, objectDiameterM)) return;

    const verdict = judgePickup(spawn.entry, s.stage.targetPos);
    const collected = verdict === "hit" ? s.collected + 1 : s.collected;
    const misfits = verdict === "miss" ? s.misfits + 1 : s.misfits;
    const score = verdict === "hit" ? applyHit(s.score) : applyMiss(s.score);
    const cleared = isCleared(collected, s.stage.targetCount);

    set({
      attachedIds: [...s.attachedIds, spawnIndex],
      attachDirs: { ...s.attachDirs, [spawnIndex]: randomUnitVector() },
      diameterM: grow(s.diameterM, objectDiameterM),
      collected,
      misfits,
      score,
      phase: cleared ? "cleared" : "playing",
      stars: cleared
        ? starsFor({
            cleared: true,
            accuracy: accuracy(score),
            secondsLeft: s.secondsLeft
          })
        : s.stars
    });
  },

  tick: (deltaSec) => {
    const s = get();
    if (s.phase !== "playing") return;

    fractionalSec += deltaSec;
    if (fractionalSec < 1) return;

    const wholeSec = Math.floor(fractionalSec);
    fractionalSec -= wholeSec;

    const secondsLeft = Math.max(0, s.secondsLeft - wholeSec);
    if (secondsLeft === 0) {
      set({ secondsLeft: 0, phase: "failed", stars: 0 });
      return;
    }
    set({ secondsLeft });
  },

  reset: () => {
    fractionalSec = 0;
    set({ ...initialState, score: createScoreState() });
  }
}));

/**
 * 이 판에서 부착밀로 붙인 단어들. 새 상태를 두지 않고 붙은 목록에서 파생한다.
 * 정화 지대와 오답노트(P2)도 이 목록을 쓴다.
 *
 * 주의: 이 함수를 zustand 셀렉터로 직접 넘기면 매 렌더마다 새 배열이 나와
 * 무한 리렌더가 된다. 원본을 구독하고 useMemo로 감싸서 쓴다.
 */
export function misfitWords(
  input: Pick<GameState, "spawns" | "attachedIds" | "stage">
): WordEntry[] {
  if (!input.stage) return [];
  const targetPos = input.stage.targetPos;
  const out: WordEntry[] = [];
  for (const id of input.attachedIds) {
    const entry = input.spawns[id]?.entry;
    if (entry && entry.pos !== targetPos) out.push(entry);
  }
  return out;
}
