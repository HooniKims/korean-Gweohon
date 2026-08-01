import { describe, expect, it } from "vitest";
import { KOREAN_POS, POS_COLORS, isKoreanPos } from "./pos";

describe("pos", () => {
  it("9품사를 교과 분류 순서로 담는다", () => {
    expect(KOREAN_POS).toEqual([
      "명사",
      "대명사",
      "수사",
      "동사",
      "형용사",
      "관형사",
      "부사",
      "조사",
      "감탄사"
    ]);
  });

  it("모든 품사에 색이 있다", () => {
    for (const pos of KOREAN_POS) {
      expect(POS_COLORS[pos]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("명사 색은 스펙 값과 같다", () => {
    expect(POS_COLORS["명사"]).toBe("#2563eb");
    expect(POS_COLORS["조사"]).toBe("#64748b");
  });

  it("품사 색은 서로 겹치지 않는다", () => {
    const colors = KOREAN_POS.map((p) => POS_COLORS[p]);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("isKoreanPos는 품사만 통과시킨다", () => {
    expect(isKoreanPos("명사")).toBe(true);
    expect(isKoreanPos("서술격조사")).toBe(false);
    expect(isKoreanPos("")).toBe(false);
  });
});
