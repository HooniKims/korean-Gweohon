export type ScoreState = {
  hits: number;
  misses: number;
  combo: number;
  multiplier: number;
  points: number;
};

const POINTS_PER_HIT = 100;
const PENALTY_PER_MISS = 50;
const COMBO_STEP = 3;
const MULTIPLIER_STEP = 0.2;
const MAX_MULTIPLIER = 2;
const ACCURACY_FOR_TWO_STARS = 0.85;
const SECONDS_LEFT_FOR_THREE_STARS = 30;

export function createScoreState(): ScoreState {
  return { hits: 0, misses: 0, combo: 0, multiplier: 1, points: 0 };
}

export function applyHit(s: ScoreState): ScoreState {
  const points = s.points + Math.round(POINTS_PER_HIT * s.multiplier);
  const combo = s.combo + 1;
  const steps = Math.floor(combo / COMBO_STEP);
  const multiplier = Math.min(MAX_MULTIPLIER, 1 + steps * MULTIPLIER_STEP);
  return { ...s, hits: s.hits + 1, combo, multiplier, points };
}

export function applyMiss(s: ScoreState): ScoreState {
  return {
    ...s,
    misses: s.misses + 1,
    combo: 0,
    multiplier: 1,
    points: Math.max(0, s.points - PENALTY_PER_MISS)
  };
}

export function accuracy(s: ScoreState): number {
  const total = s.hits + s.misses;
  if (total === 0) return 1;
  return s.hits / total;
}

/**
 * 별은 누적 조건이다. 위 조건을 만족하지 못하면 아래 조건은 보지 않는다.
 * ★ 클리어 / ★★ + 정확도 85% / ★★★ + 30초 이상 남김
 */
export function starsFor(opts: {
  cleared: boolean;
  accuracy: number;
  secondsLeft: number;
}): 0 | 1 | 2 | 3 {
  if (!opts.cleared) return 0;
  if (opts.accuracy < ACCURACY_FOR_TWO_STARS) return 1;
  if (opts.secondsLeft < SECONDS_LEFT_FOR_THREE_STARS) return 2;
  return 3;
}
