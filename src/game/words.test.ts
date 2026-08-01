import { describe, expect, it } from "vitest";
import { parseWordBank, planSpawns } from "./words";
import { TIER_DIAMETER_M } from "./objectTiers";
import wordsJson from "../../public/data/words.json";

const validRaw = {
  version: 1,
  words: [
    { text: "학교", pos: "명사" },
    { text: "하늘", pos: "명사" },
    { text: "달리다", pos: "동사" },
    { text: "매우", pos: "부사" }
  ]
};

/** 결정적 난수: 0, 0.1, 0.2 ... 를 순환한다 */
function seqRng(): () => number {
  let i = 0;
  return () => {
    const v = (i % 10) / 10;
    i += 1;
    return v;
  };
}

describe("parseWordBank", () => {
  it("올바른 사전을 통과시킨다", () => {
    const bank = parseWordBank(validRaw);
    expect(bank.version).toBe(1);
    expect(bank.words).toHaveLength(4);
  });

  it("version이 없으면 거부한다", () => {
    expect(() => parseWordBank({ words: [] })).toThrow(/version/);
  });

  it("품사가 9품사 밖이면 거부한다", () => {
    expect(() =>
      parseWordBank({ version: 1, words: [{ text: "이다", pos: "서술격조사" }] })
    ).toThrow(/서술격조사/);
  });

  it("text가 빈 문자열이면 거부한다", () => {
    expect(() =>
      parseWordBank({ version: 1, words: [{ text: "", pos: "명사" }] })
    ).toThrow(/text/);
  });

  it("text와 pos가 모두 같은 중복 항목이면 거부한다", () => {
    expect(() =>
      parseWordBank({
        version: 1,
        words: [
          { text: "학교", pos: "명사" },
          { text: "학교", pos: "명사" }
        ]
      })
    ).toThrow(/중복/);
  });

  it("같은 text라도 품사가 다르면 허용한다", () => {
    const bank = parseWordBank({
      version: 1,
      words: [
        { text: "하나", pos: "수사" },
        { text: "하나", pos: "명사" }
      ]
    });
    expect(bank.words).toHaveLength(2);
  });
});

describe("planSpawns", () => {
  const bank = parseWordBank({
    version: 1,
    words: [
      { text: "학교", pos: "명사" },
      { text: "하늘", pos: "명사" },
      { text: "거북이", pos: "명사" },
      { text: "달리다", pos: "동사" },
      { text: "읽다", pos: "동사" },
      { text: "매우", pos: "부사" },
      { text: "아름답다", pos: "형용사" }
    ]
  });

  const plan = () =>
    planSpawns(bank, {
      targetPos: "명사",
      targetCount: 3,
      decoyCount: 4,
      rng: seqRng()
    });

  it("요청한 만큼 목표 품사와 오답을 편성한다", () => {
    const p = plan();
    expect(p).toHaveLength(7);
    expect(p.filter((x) => x.isTarget)).toHaveLength(3);
    expect(p.filter((x) => !x.isTarget)).toHaveLength(4);
  });

  it("목표로 표시된 것은 모두 목표 품사다", () => {
    for (const x of plan().filter((y) => y.isTarget)) {
      expect(x.entry.pos).toBe("명사");
    }
  });

  it("오답에는 목표 품사가 섞이지 않는다", () => {
    for (const x of plan().filter((y) => !y.isTarget)) {
      expect(x.entry.pos).not.toBe("명사");
    }
  });

  it("같은 단어를 두 번 스폰하지 않는다", () => {
    const keys = plan().map((x) => `${x.entry.text}/${x.entry.pos}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("동형이의어를 같은 판에 함께 내지 않는다", () => {
    const homonymBank = parseWordBank({
      version: 1,
      words: [
        { text: "하나", pos: "수사" },
        { text: "하나", pos: "명사" },
        { text: "학교", pos: "명사" },
        { text: "달리다", pos: "동사" }
      ]
    });
    const texts = planSpawns(homonymBank, {
      targetPos: "명사",
      targetCount: 2,
      decoyCount: 2,
      rng: seqRng()
    }).map((x) => x.entry.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("모든 스폰에 티어가 붙는다", () => {
    for (const x of plan()) {
      expect(TIER_DIAMETER_M[x.tier]).toBeGreaterThan(0);
    }
  });

  it("사전에 목표 품사가 부족하면 있는 만큼만 낸다", () => {
    const p = planSpawns(bank, {
      targetPos: "감탄사",
      targetCount: 5,
      decoyCount: 2,
      rng: seqRng()
    });
    expect(p.filter((x) => x.isTarget)).toHaveLength(0);
  });

  it("목표 단어에는 L티어를 주지 않는다", () => {
    // L(60cm)은 90초 안에 공이 도달할 수 없다. 목표에 배정되면 클리어가 불가능해진다.
    const p = planSpawns(parseWordBank(wordsJson), {
      targetPos: "명사",
      targetCount: 20,
      decoyCount: 40,
      rng: Math.random
    });
    for (const x of p.filter((y) => y.isTarget)) {
      expect(x.tier).not.toBe("L");
    }
  });

  it("목표 단어의 절반 이상은 XS나 S다", () => {
    // 초반에 붙을 것이 없으면 공이 자라지 못해 판이 막힌다.
    const p = planSpawns(parseWordBank(wordsJson), {
      targetPos: "명사",
      targetCount: 20,
      decoyCount: 40,
      rng: Math.random
    });
    const targets = p.filter((y) => y.isTarget);
    const small = targets.filter((y) => y.tier === "XS" || y.tier === "S");
    expect(small.length).toBeGreaterThanOrEqual(targets.length / 2);
  });

  it("오답에는 L티어가 섞여 배경 역할을 한다", () => {
    const p = planSpawns(parseWordBank(wordsJson), {
      targetPos: "명사",
      targetCount: 20,
      decoyCount: 40,
      rng: Math.random
    });
    const decoyTiers = new Set(p.filter((y) => !y.isTarget).map((y) => y.tier));
    expect(decoyTiers.has("L")).toBe(true);
  });
});

describe("public/data/words.json", () => {
  it("스키마를 통과한다", () => {
    const bank = parseWordBank(wordsJson);
    expect(bank.words.length).toBeGreaterThan(60);
  });

  it("명사가 스테이지 목표 20개를 채울 만큼 있다", () => {
    const bank = parseWordBank(wordsJson);
    const nouns = bank.words.filter((w) => w.pos === "명사");
    expect(nouns.length).toBeGreaterThanOrEqual(20);
  });

  it("오답 40개를 낼 만큼 다른 품사가 있다", () => {
    const bank = parseWordBank(wordsJson);
    const others = bank.words.filter((w) => w.pos !== "명사");
    expect(others.length).toBeGreaterThanOrEqual(40);
  });

  it("용언은 기본형으로 적혀 있다", () => {
    const bank = parseWordBank(wordsJson);
    const verbs = bank.words.filter((w) => w.pos === "동사" || w.pos === "형용사");
    for (const v of verbs) {
      expect(v.text.endsWith("다")).toBe(true);
    }
  });

  it("서술격 조사 「이다」를 담지 않는다", () => {
    const bank = parseWordBank(wordsJson);
    expect(bank.words.some((w) => w.text === "이다")).toBe(false);
  });
});
