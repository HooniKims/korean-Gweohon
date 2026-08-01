import { describe, expect, it } from "vitest";
import { isCleared, judgePickup } from "./singlePos";

describe("judgePickup", () => {
  it("목표 품사면 hit이다", () => {
    expect(judgePickup({ text: "학교", pos: "명사" }, "명사")).toBe("hit");
  });

  it("목표가 아니면 miss다", () => {
    expect(judgePickup({ text: "매우", pos: "부사" }, "명사")).toBe("miss");
  });

  it("품사만 보고 판정한다. 표기는 상관없다", () => {
    expect(judgePickup({ text: "하나", pos: "수사" }, "명사")).toBe("miss");
    expect(judgePickup({ text: "하나", pos: "명사" }, "명사")).toBe("hit");
  });
});

describe("isCleared", () => {
  it("목표 수를 채우면 클리어다", () => {
    expect(isCleared(20, 20)).toBe(true);
  });

  it("넘겨도 클리어다", () => {
    expect(isCleared(21, 20)).toBe(true);
  });

  it("부족하면 아니다", () => {
    expect(isCleared(19, 20)).toBe(false);
  });
});
