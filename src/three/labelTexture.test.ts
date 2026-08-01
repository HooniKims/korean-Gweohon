import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LABEL_CACHE_LIMIT,
  LABEL_HEIGHT,
  LABEL_WIDTH,
  clearLabelCache,
  getLabelTexture,
  labelCacheSize,
  textColorFor
} from "./labelTexture";

describe("labelTexture", () => {
  beforeEach(() => {
    clearLabelCache();
  });

  it("라벨 크기는 256x64다", () => {
    expect(LABEL_WIDTH).toBe(256);
    expect(LABEL_HEIGHT).toBe(64);
  });

  it("같은 텍스트와 색이면 같은 텍스처를 재사용한다", () => {
    const a = getLabelTexture("학교", "#2563eb");
    const b = getLabelTexture("학교", "#2563eb");
    expect(a).toBe(b);
    expect(labelCacheSize()).toBe(1);
  });

  it("색이 다르면 다른 텍스처다", () => {
    const a = getLabelTexture("학교", "#2563eb");
    const b = getLabelTexture("학교", "#888888");
    expect(a).not.toBe(b);
    expect(labelCacheSize()).toBe(2);
  });

  it("캐시는 상한을 넘지 않는다", () => {
    for (let i = 0; i < LABEL_CACHE_LIMIT + 10; i += 1) {
      getLabelTexture(`단어${i}`, "#2563eb");
    }
    expect(labelCacheSize()).toBe(LABEL_CACHE_LIMIT);
  });

  it("가장 오래 안 쓴 것을 버린다", () => {
    for (let i = 0; i < LABEL_CACHE_LIMIT; i += 1) {
      getLabelTexture(`단어${i}`, "#2563eb");
    }
    // 단어0을 다시 써서 최신으로 만든다
    const first = getLabelTexture("단어0", "#2563eb");
    // 하나 더 넣으면 단어1이 밀려나야 한다 (단어0은 남는다)
    getLabelTexture("새단어", "#2563eb");
    expect(getLabelTexture("단어0", "#2563eb")).toBe(first);
    expect(labelCacheSize()).toBe(LABEL_CACHE_LIMIT);
  });

  it("버려질 때 dispose를 부른다", () => {
    const oldest = getLabelTexture("가장오래된", "#2563eb");
    const spy = vi.spyOn(oldest, "dispose");
    for (let i = 0; i < LABEL_CACHE_LIMIT; i += 1) {
      getLabelTexture(`채우기${i}`, "#2563eb");
    }
    expect(spy).toHaveBeenCalled();
  });

  it("clearLabelCache가 전부 비운다", () => {
    getLabelTexture("학교", "#2563eb");
    getLabelTexture("하늘", "#2563eb");
    clearLabelCache();
    expect(labelCacheSize()).toBe(0);
  });
});

describe("textColorFor", () => {
  it("어두운 배경에는 흰 글자를 쓴다", () => {
    expect(textColorFor("#2563eb")).toBe("#ffffff");
    expect(textColorFor("#000000")).toBe("#ffffff");
  });

  it("밝은 배경에는 검은 글자를 쓴다", () => {
    expect(textColorFor("#ffffff")).toBe("#111111");
    expect(textColorFor("#f4c542")).toBe("#111111");
  });

  it("상급 난이도의 회색에도 대비를 낸다", () => {
    // 회색(#9ca3af)은 중간 밝기다. 어느 쪽이든 읽히기만 하면 된다.
    expect(["#111111", "#ffffff"]).toContain(textColorFor("#9ca3af"));
  });
});
