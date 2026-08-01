import type { KoreanPos } from "./pos";

export type StageDef = {
  id: string;
  targetPos: KoreanPos;
  targetCount: number;
  decoyCount: number;
  durationSec: number;
};

/** P1은 명사 스테이지 하나만 만든다. 나머지 8개는 P2에서 추가한다. */
export const STAGES: StageDef[] = [
  {
    id: "singlePos:명사",
    targetPos: "명사",
    targetCount: 20,
    decoyCount: 40,
    durationSec: 90
  }
];

export function stageById(id: string): StageDef | undefined {
  return STAGES.find((s) => s.id === id);
}
