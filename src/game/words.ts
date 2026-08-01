import { isKoreanPos, type KoreanPos } from "./pos";
import { tierForIndex, type ObjectTier } from "./objectTiers";

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
 * 목표 단어에 줄 티어. L(60cm)은 90초 안에 공이 도달할 수 없으므로 제외한다.
 * 목표에 L을 주면 클리어가 불가능해진다. 앞쪽 절반은 XS로 둬서 초반에 붙을 것을 보장한다.
 */
function targetTier(index: number, total: number): ObjectTier {
  const ratio = total <= 1 ? 0 : index / total;
  if (ratio < 0.5) return "XS";
  if (ratio < 0.85) return "S";
  return "M";
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

  const targetPlans: SpawnPlan[] = targets.map((entry, i) => ({
    entry,
    isTarget: true,
    tier: targetTier(i, targets.length)
  }));

  const decoyPlans: SpawnPlan[] = decoys.map((entry, i) => ({
    entry,
    isTarget: false,
    tier: tierForIndex(i, decoys.length)
  }));

  return shuffle([...targetPlans, ...decoyPlans], rng);
}
