import { isKoreanPos, type KoreanPos } from "./pos";
import { sizeInTier, tierForIndex, tierForSize, type ObjectTier } from "./objectTiers";
import { START_DIAMETER_M, grow } from "./growth";

export type WordEntry = { text: string; pos: KoreanPos };
export type WordBank = { version: number; words: WordEntry[] };

export function parseWordBank(raw: unknown): WordBank {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("사전이 객체가 아닙니다");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.version !== "number") {
    throw new Error("사전에 version 숫자가 없습니다");
  }
  if (!Array.isArray(obj.words)) {
    throw new Error("사전에 words 배열이 없습니다");
  }

  const seen = new Set<string>();
  const words: WordEntry[] = obj.words.map((item, i) => {
    if (typeof item !== "object" || item === null) {
      throw new Error(`words[${i}]가 객체가 아닙니다`);
    }
    const w = item as Record<string, unknown>;
    if (typeof w.text !== "string" || w.text.length === 0) {
      throw new Error(`words[${i}]의 text가 비어 있습니다`);
    }
    if (typeof w.pos !== "string" || !isKoreanPos(w.pos)) {
      throw new Error(`words[${i}]의 품사가 9품사 밖입니다: ${String(w.pos)}`);
    }
    const key = `${w.text}/${w.pos}`;
    if (seen.has(key)) {
      throw new Error(`중복 항목입니다: ${key}`);
    }
    seen.add(key);
    return { text: w.text, pos: w.pos };
  });

  return { version: obj.version, words };
}

export type SpawnPlan = {
  entry: WordEntry;
  tier: ObjectTier;
  /** 실제 지름(미터). 티어 구간 안에 퍼져 있어 성장 사다리에 구멍이 없다. */
  sizeM: number;
  isTarget: boolean;
};

type PlanOpts = {
  targetPos: KoreanPos;
  targetCount: number;
  decoyCount: number;
  rng: () => number;
};

/** rng로 배열을 섞는다 (Fisher-Yates). 원본을 바꾸지 않는다. */
function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/**
 * 목표 단어의 크기를 공이 자라는 곡선에서 역산한다.
 *
 * 티어 구간에서 크기를 뽑으면 구간 경계에 도약이 생겨 사다리가 끊긴다. 예를 들어
 * M 구간을 3등분하면 11cm 다음이 20.5cm인데, 11cm를 먹은 공은 14cm라서 20.5cm에
 * 손이 닿지 않는다. 대신 「지금 공 크기의 85%」를 다음 목표로 두면 항상 붙일 수
 * 있고 매번 약 11%씩 자란다. 20개를 다 먹으면 지름이 약 8배가 된다.
 */
const TARGET_SIZE_RATIO = 0.85;

function ladderSizes(count: number): number[] {
  const sizes: number[] = [];
  let d = START_DIAMETER_M;
  for (let i = 0; i < count; i += 1) {
    const size = d * TARGET_SIZE_RATIO;
    sizes.push(size);
    d = grow(d, size);
  }
  return sizes;
}

/** 오답은 티어 구간 안에 고르게 퍼뜨린다. 배경과 장애물 역할이라 사다리와 무관하다. */
function spreadInTiers(
  items: readonly { entry: WordEntry; isTarget: boolean; tier: ObjectTier }[]
): SpawnPlan[] {
  const perTier = new Map<ObjectTier, number>();
  for (const it of items) perTier.set(it.tier, (perTier.get(it.tier) ?? 0) + 1);

  const seen = new Map<ObjectTier, number>();
  return items.map((it) => {
    const total = perTier.get(it.tier) ?? 1;
    const rank = seen.get(it.tier) ?? 0;
    seen.set(it.tier, rank + 1);
    const spread = total <= 1 ? 0 : rank / (total - 1);
    return { ...it, sizeM: sizeInTier(it.tier, spread) };
  });
}

/**
 * 스테이지에 낼 단어를 뽑는다.
 *
 * 같은 판에 같은 표기(text)가 두 번 나오지 않게 막는다. 동형이의어가 함께 나오면
 * 학생이 어느 품사로 판정할지 알 수 없어 필드에 판정 불가 오브젝트가 생긴다.
 *
 * 티어는 목표와 오답을 따로 매긴다. 목표는 반드시 붙을 수 있어야 하고(XS~M),
 * 오답은 L까지 써서 배경 역할을 겸한다.
 */
export function planSpawns(bank: WordBank, opts: PlanOpts): SpawnPlan[] {
  const { targetPos, targetCount, decoyCount, rng } = opts;
  const usedTexts = new Set<string>();

  const take = (pool: WordEntry[], count: number): WordEntry[] => {
    const picked: WordEntry[] = [];
    for (const entry of pool) {
      if (picked.length >= count) break;
      if (usedTexts.has(entry.text)) continue;
      usedTexts.add(entry.text);
      picked.push(entry);
    }
    return picked;
  };

  const targets = take(
    shuffle(
      bank.words.filter((w) => w.pos === targetPos),
      rng
    ),
    targetCount
  );
  const decoys = take(
    shuffle(
      bank.words.filter((w) => w.pos !== targetPos),
      rng
    ),
    decoyCount
  );

  const ladder = ladderSizes(targets.length);
  const targetPlans: SpawnPlan[] = targets.map((entry, i) => ({
    entry,
    isTarget: true,
    sizeM: ladder[i],
    tier: tierForSize(ladder[i])
  }));

  const decoyPlans = spreadInTiers(
    decoys.map((entry, i) => ({ entry, isTarget: false, tier: tierForIndex(i, decoys.length) }))
  );

  return shuffle([...targetPlans, ...decoyPlans], rng);
}
