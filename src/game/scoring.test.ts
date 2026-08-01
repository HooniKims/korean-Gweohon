import { describe, expect, it } from "vitest";
import { accuracy, applyHit, applyMiss, createScoreState, starsFor } from "./scoring";

describe("createScoreState", () => {
  it("빈 상태로 시작한다", () => {
    expect(createScoreState()).toEqual({
      hits: 0,
      misses: 0,
      combo: 0,
      multiplier: 1,
      points: 0
    });
  });
});

describe("applyHit", () => {
  it("정답 1개는 100점이다", () => {
    const s = applyHit(createScoreState());
    expect(s.hits).toBe(1);
    expect(s.points).toBe(100);
  });

  it("연속 3개마다 배수가 0.2 오른다", () => {
    let s = createScoreState();
    s = applyHit(s);
    s = applyHit(s);
    expect(s.multiplier).toBe(1);
    s = applyHit(s);
    expect(s.multiplier).toBeCloseTo(1.2, 10);
  });

  it("배수가 적용된 점수를 더한다", () => {
    let s = createScoreState();
    s = applyHit(s);
    s = applyHit(s);
    s = applyHit(s); // 여기서 배수 1.2가 된다
    const before = s.points;
    s = applyHit(s);
    expect(s.points - before).toBeCloseTo(120, 10);
  });

  it("배수는 2.0을 넘지 않는다", () => {
    let s = createScoreState();
    for (let i = 0; i < 60; i += 1) s = applyHit(s);
    expect(s.multiplier).toBe(2);
  });
});

describe("applyMiss", () => {
  it("50점을 깎고 콤보를 끊는다", () => {
    let s = createScoreState();
    s = applyHit(s);
    s = applyHit(s);
    s = applyHit(s);
    const before = s.points;
    s = applyMiss(s);
    expect(s.points).toBe(before - 50);
    expect(s.combo).toBe(0);
    expect(s.multiplier).toBe(1);
    expect(s.misses).toBe(1);
  });

  it("점수는 0 미만으로 내려가지 않는다", () => {
    expect(applyMiss(createScoreState()).points).toBe(0);
  });
});

describe("accuracy", () => {
  it("부착이 없으면 1로 본다", () => {
    expect(accuracy(createScoreState())).toBe(1);
  });

  it("정답 비율을 낸다", () => {
    let s = createScoreState();
    s = applyHit(s);
    s = applyHit(s);
    s = applyHit(s);
    s = applyMiss(s);
    expect(accuracy(s)).toBeCloseTo(0.75, 10);
  });
});

describe("starsFor", () => {
  it("클리어 못하면 0개다", () => {
    expect(starsFor({ cleared: false, accuracy: 1, secondsLeft: 60 })).toBe(0);
  });

  it("클리어만 하면 1개다", () => {
    expect(starsFor({ cleared: true, accuracy: 0.5, secondsLeft: 5 })).toBe(1);
  });

  it("정확도 85% 이상이면 2개다", () => {
    expect(starsFor({ cleared: true, accuracy: 0.85, secondsLeft: 5 })).toBe(2);
  });

  it("정확도와 시간 여유를 모두 만족하면 3개다", () => {
    expect(starsFor({ cleared: true, accuracy: 0.9, secondsLeft: 30 })).toBe(3);
  });

  it("시간 여유만 있고 정확도가 낮으면 1개다", () => {
    expect(starsFor({ cleared: true, accuracy: 0.5, secondsLeft: 40 })).toBe(1);
  });
});
