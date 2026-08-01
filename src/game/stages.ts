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
    // 스펙은 20개였다. 자동 플레이 측정에서 90초에 12개였고, 학습 게임에서
    // 반복 실패는 학습 동기를 깎으므로 15개로 내렸다. 교실 검증 후 재조정한다.
    targetCount: 15,
    // 오답이 많으면 작은 공에게 미로가 된다. 40개에서 24개로 내렸다.
    decoyCount: 24,
    durationSec: 90
  }
];

export function stageById(id: string): StageDef | undefined {
  return STAGES.find((s) => s.id === id);
}
