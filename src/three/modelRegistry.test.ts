import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CORE_MODEL, MODELS_BY_TIER, modelForIndex } from "./modelRegistry";
import { OBJECT_TIERS } from "@/game/objectTiers";

const publicDir = path.resolve(__dirname, "../../public");

describe("modelRegistry", () => {
  it("모든 티어에 모델이 하나 이상 있다", () => {
    for (const tier of OBJECT_TIERS) {
      expect(MODELS_BY_TIER[tier].length).toBeGreaterThan(0);
    }
  });

  it("모델 경로는 /models/로 시작하고 .glb로 끝난다", () => {
    for (const tier of OBJECT_TIERS) {
      for (const p of MODELS_BY_TIER[tier]) {
        expect(p).toMatch(/^\/models\/.+\.glb$/);
      }
    }
  });

  it("적어둔 모델 파일이 실제로 존재한다", () => {
    // 없는 파일을 적으면 런타임에 깨진다. 여기서 막는다.
    const missing: string[] = [];
    for (const tier of OBJECT_TIERS) {
      for (const p of MODELS_BY_TIER[tier]) {
        if (!existsSync(path.join(publicDir, p))) missing.push(p);
      }
    }
    if (!existsSync(path.join(publicDir, CORE_MODEL))) missing.push(CORE_MODEL);
    expect(missing).toEqual([]);
  });

  it("같은 티어에 같은 모델을 중복해 적지 않았다", () => {
    for (const tier of OBJECT_TIERS) {
      const list = MODELS_BY_TIER[tier];
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it("같은 티어와 순번이면 항상 같은 모델을 준다", () => {
    expect(modelForIndex("XS", 5)).toBe(modelForIndex("XS", 5));
  });

  it("순번이 목록보다 커도 순환한다", () => {
    const count = MODELS_BY_TIER.XS.length;
    expect(modelForIndex("XS", count)).toBe(modelForIndex("XS", 0));
  });

  it("한 티어 안에서 순번이 다르면 다른 모델이 나온다", () => {
    expect(modelForIndex("S", 0)).not.toBe(modelForIndex("S", 1));
  });
});
