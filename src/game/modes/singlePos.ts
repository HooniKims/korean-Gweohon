import type { KoreanPos } from "../pos";
import type { WordEntry } from "../words";

/** 단일 품사 모드: 목표 품사 하나만 정답이다. */
export function judgePickup(entry: WordEntry, targetPos: KoreanPos): "hit" | "miss" {
  return entry.pos === targetPos ? "hit" : "miss";
}

export function isCleared(collected: number, targetCount: number): boolean {
  return collected >= targetCount;
}
