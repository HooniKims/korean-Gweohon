# P1 수직 슬라이스 구현 계획 — 괴혼 스타일 국어 9품사 학습 게임

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 명사 스테이지 한 개를 끝까지 플레이할 수 있는 수직 슬라이스를 만들어 "공을 굴려 같은 품사를 모으는 것이 실제로 재미있는가"를 검증한다.

**Architecture:** 게임 규칙은 `src/game/`의 순수 TypeScript에 두고 Three.js·React를 import하지 않는다. 규칙 전체가 Vitest로 검증되고, 버그가 났을 때 규칙 문제인지 물리 문제인지 즉시 구분된다. 렌더링은 React Three Fiber, 물리는 Rapier, 게임 상태는 zustand 스토어에 두고 HUD만 선택적으로 구독한다. 백엔드는 없다.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, three, @react-three/fiber, @react-three/drei, @react-three/rapier, zustand, Vitest, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-08-01-korean-pos-katamari-design.md`

## Global Constraints

- `src/game/` 아래 어떤 파일도 `three`, `@react-three/*`, `react`를 import하지 않는다. 순수 TypeScript만.
- 게임 상태는 React state(`useState`)에 두지 않는다. zustand 스토어가 유일한 주인이다.
- 프레임마다 바뀌는 값(공 위치·회전·지름·카메라)은 `useFrame` 안에서 `ref.current`를 직접 변경한다. `setState`를 호출하지 않는다.
- 공에 붙은 사물은 리지드바디를 제거하고 공의 자식 메시로 재부착한다. 물리 바디 수가 늘어나면 안 된다.
- 품사색은 스펙 §2의 값을 그대로 쓴다. 명사 `#2563eb`, 대명사 `#7c3aed`, 수사 `#0891b2`, 동사 `#dc2626`, 형용사 `#ea580c`, 관형사 `#16a34a`, 부사 `#9333ea`, 조사 `#64748b`, 감탄사 `#db2777`.
- 성장 상수 `k = 0.6`, 부착 판정 배수 `1.1`, 시작 지름 `5cm`(내부 단위 0.05m). 모두 `growth.ts`에 단일 상수로 둔다.
- 내부 길이 단위는 미터(m)를 쓴다. 화면 표시는 `32cm 4mm` 형식으로 변환한다.
- 단어 데이터는 `public/data/words.json` 고정 사전. 서버 호출·API 키 없음.
- 용언은 기본형으로 표기한다(달리다, 아름답다). 활용형을 쓰지 않는다.
- P1 범위 밖: 정화 지대, 품사 대왕, 오답노트, localStorage, 난이도 3단, 나머지 3개 모드, 보스판. 이들은 P2 이후 계획서에서 다룬다.

---

## File Structure

**순수 로직 (`src/game/`)** — Vitest 전면 대상, Three.js/React import 금지

| 파일 | 책임 |
|---|---|
| `pos.ts` | 9품사 배열, `KoreanPos` 타입, 품사색 팔레트, 타입 가드 |
| `units.ts` | 미터 ↔ 화면 표기 변환 (`32cm 4mm`) |
| `growth.ts` | 부착 가능 판정, 부피 합산 성장, 부착밀 속도 배수 |
| `words.ts` | `words.json` 스키마 검증, 스테이지 스폰 편성(티어·품사 비율·중복 배제) |
| `scoring.ts` | 점수, 콤보 배수, 정확도, 별 등급 |
| `modes/singlePos.ts` | 단일 품사 모드의 정답·클리어 판정 |
| `stages.ts` | 스테이지 정의 테이블 (P1은 명사 1개) |

**상태 (`src/store/`)**

| 파일 | 책임 |
|---|---|
| `gameStore.ts` | zustand 스토어. 실행 중 게임 상태의 유일한 주인 |

**입력 (`src/input/`)**

| 파일 | 책임 |
|---|---|
| `inputVector.ts` | 순수 함수. 키 집합·스틱 좌표 → 정규화 `{x, y}` |
| `useInput.ts` | React 훅. 키보드·터치 이벤트를 걸고 ref로 벡터 제공 |
| `VirtualStick.tsx` | 플로팅 가상 스틱 UI |

**렌더 (`src/three/`)**

| 파일 | 책임 |
|---|---|
| `labelTexture.ts` | 한글 라벨 캔버스 텍스처 + LRU 캐시 |
| `WordObject.tsx` | 사물 메시 + 품사색 틴트 + 이름표 태그 |
| `Katamari.tsx` | 공 리지드바디, 입력 → 토크, 부착 처리 |
| `Field.tsx` | 지형과 사물 배치 |
| `ChaseCamera.tsx` | 로우앵글 추적, 지름 연동 줌아웃 |
| `GameCanvas.tsx` | Canvas + Physics 조립 |

**화면 (`src/ui/`)**

| 파일 | 책임 |
|---|---|
| `Hud.tsx` | 남은 시간·목표·수집 수·지름·부착밀 |
| `ResultScreen.tsx` | 별·점수·다시하기 |
| `GameShell.tsx` | 화면 전환(플레이 ↔ 결과) |

---

### Task 1: 프로젝트 스캐폴딩과 품사 정의

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `vitest.config.ts`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `src/game/pos.ts`
- Test: `src/game/pos.test.ts`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - `KOREAN_POS: readonly ["명사","대명사","수사","동사","형용사","관형사","부사","조사","감탄사"]`
  - `type KoreanPos = (typeof KOREAN_POS)[number]`
  - `POS_COLORS: Record<KoreanPos, string>`
  - `isKoreanPos(value: string): value is KoreanPos`

- [ ] **Step 1: Next.js 프로젝트 초기화**

```bash
cd "/Volumes/exDisk/vibecoding project/27.korean_Gweohon"
npm init -y
npm install next@15 react@19 react-dom@19
npm install three @react-three/fiber @react-three/drei @react-three/rapier zustand
npm install -D typescript @types/react @types/react-dom @types/node @types/three
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom
```

- [ ] **Step 2: 설정 파일 작성**

`package.json`의 `scripts`를 다음으로 교체한다.

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
};

export default nextConfig;
```

`vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") }
  }
});
```

`.gitignore`:

```text
node_modules/
.next/
.DS_Store
*.local
next-env.d.ts
```

- [ ] **Step 3: 실패하는 테스트 작성**

`src/game/pos.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { KOREAN_POS, POS_COLORS, isKoreanPos } from "./pos";

describe("pos", () => {
  it("9품사를 교과 분류 순서로 담는다", () => {
    expect(KOREAN_POS).toEqual([
      "명사", "대명사", "수사",
      "동사", "형용사",
      "관형사", "부사",
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
```

- [ ] **Step 4: 테스트 실패 확인**

Run: `npx vitest run src/game/pos.test.ts`
Expected: FAIL — `Failed to resolve import "./pos"`

- [ ] **Step 5: 구현**

`src/game/pos.ts`:

```typescript
export const KOREAN_POS = [
  "명사",
  "대명사",
  "수사",
  "동사",
  "형용사",
  "관형사",
  "부사",
  "조사",
  "감탄사"
] as const;

export type KoreanPos = (typeof KOREAN_POS)[number];

export const POS_COLORS: Record<KoreanPos, string> = {
  명사: "#2563eb",
  대명사: "#7c3aed",
  수사: "#0891b2",
  동사: "#dc2626",
  형용사: "#ea580c",
  관형사: "#16a34a",
  부사: "#9333ea",
  조사: "#64748b",
  감탄사: "#db2777"
};

export function isKoreanPos(value: string): value is KoreanPos {
  return (KOREAN_POS as readonly string[]).includes(value);
}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx vitest run src/game/pos.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 7: 최소 앱 셸 작성**

`src/app/globals.css`:

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; background: #0b1020; color: #fff; font-family: system-ui, sans-serif; }
```

`src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "품사 괴혼",
  description: "굴려서 배우는 국어 9품사"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:

```tsx
export default function Page() {
  return <main>품사 괴혼</main>;
}
```

- [ ] **Step 8: 빌드 확인**

Run: `npx tsc --noEmit`
Expected: 오류 없음

- [ ] **Step 9: 커밋**

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs vitest.config.ts .gitignore src/
git commit -m "feat: Next.js 스캐폴딩과 9품사 정의"
```

---

### Task 2: 단위 변환과 성장 계산

**Files:**
- Create: `src/game/units.ts`, `src/game/growth.ts`
- Test: `src/game/units.test.ts`, `src/game/growth.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `formatDiameter(meters: number): string` — `0.324` → `"32cm 4mm"`
  - `START_DIAMETER_M = 0.05`
  - `PICKUP_RATIO = 1.1`
  - `GROWTH_K = 0.6`
  - `MASS_PENALTY_PER_MISFIT = 0.12`
  - `canPickUp(ballDiameterM: number, objectDiameterM: number): boolean`
  - `grow(ballDiameterM: number, objectDiameterM: number): number`
  - `shrink(ballDiameterM: number, objectDiameterM: number): number`
  - `speedMultiplier(misfitCount: number): number`

- [ ] **Step 1: units 실패 테스트 작성**

`src/game/units.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { formatDiameter } from "./units";

describe("formatDiameter", () => {
  it("센티미터와 밀리미터를 함께 보여준다", () => {
    expect(formatDiameter(0.324)).toBe("32cm 4mm");
  });

  it("밀리미터가 0이면 센티미터만 보여준다", () => {
    expect(formatDiameter(0.32)).toBe("32cm");
  });

  it("10cm 미만도 정확히 표기한다", () => {
    expect(formatDiameter(0.05)).toBe("5cm");
    expect(formatDiameter(0.054)).toBe("5cm 4mm");
  });

  it("1cm 미만은 밀리미터만 보여준다", () => {
    expect(formatDiameter(0.007)).toBe("7mm");
  });

  it("1m 이상은 미터를 앞세운다", () => {
    expect(formatDiameter(1.234)).toBe("1m 23cm 4mm");
  });

  it("반올림이 자리올림을 만들면 정규화한다", () => {
    expect(formatDiameter(0.0999)).toBe("10cm");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/game/units.test.ts`
Expected: FAIL — `Failed to resolve import "./units"`

- [ ] **Step 3: units 구현**

`src/game/units.ts`:

```typescript
/** 내부 길이 단위는 미터. 화면 표기는 괴혼식으로 밀리미터까지 쪼갠다. */
export function formatDiameter(meters: number): string {
  const totalMm = Math.round(meters * 1000);
  const m = Math.floor(totalMm / 1000);
  const cm = Math.floor((totalMm % 1000) / 10);
  const mm = totalMm % 10;

  const parts: string[] = [];
  if (m > 0) parts.push(`${m}m`);
  if (cm > 0) parts.push(`${cm}cm`);
  if (mm > 0) parts.push(`${mm}mm`);
  if (parts.length === 0) return "0mm";
  return parts.join(" ");
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/game/units.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: growth 실패 테스트 작성**

`src/game/growth.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  GROWTH_K,
  MASS_PENALTY_PER_MISFIT,
  PICKUP_RATIO,
  START_DIAMETER_M,
  canPickUp,
  grow,
  shrink,
  speedMultiplier
} from "./growth";

describe("상수", () => {
  it("스펙 값을 그대로 쓴다", () => {
    expect(START_DIAMETER_M).toBe(0.05);
    expect(PICKUP_RATIO).toBe(1.1);
    expect(GROWTH_K).toBe(0.6);
    expect(MASS_PENALTY_PER_MISFIT).toBe(0.12);
  });
});

describe("canPickUp", () => {
  it("공보다 작으면 붙는다", () => {
    expect(canPickUp(0.05, 0.02)).toBe(true);
  });

  it("공의 1.1배까지 붙는다 (경계 포함)", () => {
    expect(canPickUp(0.1, 0.11)).toBe(true);
  });

  it("1.1배를 넘으면 붙지 않는다", () => {
    expect(canPickUp(0.1, 0.1101)).toBe(false);
  });

  it("같은 크기는 붙는다", () => {
    expect(canPickUp(0.1, 0.1)).toBe(true);
  });
});

describe("grow", () => {
  it("부피를 합산해 지름을 키운다", () => {
    // newD = cbrt(D^3 + k * objD^3), k=0.6
    const result = grow(0.05, 0.05);
    const expected = Math.cbrt(0.05 ** 3 + 0.6 * 0.05 ** 3);
    expect(result).toBeCloseTo(expected, 10);
  });

  it("작은 것을 붙여도 반드시 커진다", () => {
    expect(grow(0.5, 0.01)).toBeGreaterThan(0.5);
  });

  it("붙인 것이 클수록 더 커진다", () => {
    expect(grow(0.1, 0.08)).toBeGreaterThan(grow(0.1, 0.02));
  });
});

describe("shrink", () => {
  it("grow의 역연산이다", () => {
    const grown = grow(0.2, 0.07);
    expect(shrink(grown, 0.07)).toBeCloseTo(0.2, 10);
  });

  it("전체 부피보다 큰 것을 빼도 0 미만이 되지 않는다", () => {
    expect(shrink(0.05, 10)).toBe(0);
  });
});

describe("speedMultiplier", () => {
  it("부착밀이 없으면 1이다", () => {
    expect(speedMultiplier(0)).toBe(1);
  });

  it("1개당 12%씩 깎는다", () => {
    expect(speedMultiplier(1)).toBeCloseTo(0.88, 10);
    expect(speedMultiplier(2)).toBeCloseTo(0.76, 10);
  });

  it("아무리 쌓여도 0.2 미만으로는 떨어지지 않는다", () => {
    expect(speedMultiplier(50)).toBe(0.2);
  });
});
```

- [ ] **Step 6: 실패 확인**

Run: `npx vitest run src/game/growth.test.ts`
Expected: FAIL — `Failed to resolve import "./growth"`

- [ ] **Step 7: growth 구현**

`src/game/growth.ts`:

```typescript
/** 시작 지름 5cm */
export const START_DIAMETER_M = 0.05;
/** 공 지름의 이 배수까지 붙는다 */
export const PICKUP_RATIO = 1.1;
/** 부피 합산 성장 계수 */
export const GROWTH_K = 0.6;
/** 부착밀 1개당 최대 속도 감소율 */
export const MASS_PENALTY_PER_MISFIT = 0.12;
/** 부착밀이 아무리 많아도 이 배수 아래로는 안 내려간다 */
const MIN_SPEED_MULTIPLIER = 0.2;

export function canPickUp(ballDiameterM: number, objectDiameterM: number): boolean {
  return objectDiameterM <= ballDiameterM * PICKUP_RATIO;
}

export function grow(ballDiameterM: number, objectDiameterM: number): number {
  const volume = ballDiameterM ** 3 + GROWTH_K * objectDiameterM ** 3;
  return Math.cbrt(volume);
}

export function shrink(ballDiameterM: number, objectDiameterM: number): number {
  const volume = ballDiameterM ** 3 - GROWTH_K * objectDiameterM ** 3;
  if (volume <= 0) return 0;
  return Math.cbrt(volume);
}

export function speedMultiplier(misfitCount: number): number {
  const raw = 1 - misfitCount * MASS_PENALTY_PER_MISFIT;
  return Math.max(MIN_SPEED_MULTIPLIER, raw);
}
```

- [ ] **Step 8: 통과 확인**

Run: `npx vitest run src/game/`
Expected: PASS (units 6 + growth 12 + pos 5)

- [ ] **Step 9: 커밋**

```bash
git add src/game/units.ts src/game/units.test.ts src/game/growth.ts src/game/growth.test.ts
git commit -m "feat: 단위 변환과 부피 합산 성장 계산"
```

---

### Task 3: 단어 사전과 스폰 편성

**Files:**
- Create: `public/data/words.json`, `src/game/words.ts`, `src/game/objectTiers.ts`
- Test: `src/game/words.test.ts`

**Interfaces:**
- Consumes: `KoreanPos`, `isKoreanPos` (Task 1)
- Produces:
  - `type WordEntry = { text: string; pos: KoreanPos }`
  - `type WordBank = { version: number; words: WordEntry[] }`
  - `parseWordBank(raw: unknown): WordBank` — 스키마 위반 시 throw
  - `type SpawnPlan = { entry: WordEntry; tier: ObjectTier; isTarget: boolean }`
  - `planSpawns(bank: WordBank, opts: { targetPos: KoreanPos; targetCount: number; decoyCount: number; rng: () => number }): SpawnPlan[]`
  - `type ObjectTier = "XS" | "S" | "M" | "L"`
  - `TIER_DIAMETER_M: Record<ObjectTier, number>`
  - `tierForIndex(index: number, total: number): ObjectTier`

- [ ] **Step 1: 티어 정의 작성**

`src/game/objectTiers.ts`:

```typescript
export type ObjectTier = "XS" | "S" | "M" | "L";

export const OBJECT_TIERS: readonly ObjectTier[] = ["XS", "S", "M", "L"] as const;

/** 각 티어의 대표 지름(미터). 스펙 §6.3의 크기 구간 중앙값. */
export const TIER_DIAMETER_M: Record<ObjectTier, number> = {
  XS: 0.02,
  S: 0.07,
  M: 0.2,
  L: 0.6
};

/**
 * 스폰 순번을 티어에 배분한다. 앞쪽(작은 공일 때 만나는 것)은 XS가 많고,
 * 뒤쪽은 L이 섞이도록 40% / 30% / 20% / 10%로 나눈다.
 */
export function tierForIndex(index: number, total: number): ObjectTier {
  const ratio = total <= 1 ? 0 : index / total;
  if (ratio < 0.4) return "XS";
  if (ratio < 0.7) return "S";
  if (ratio < 0.9) return "M";
  return "L";
}
```

- [ ] **Step 2: 실패 테스트 작성**

`src/game/words.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { parseWordBank, planSpawns } from "./words";
import { TIER_DIAMETER_M } from "./objectTiers";

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

  it("요청한 만큼 목표 품사와 오답을 편성한다", () => {
    const plan = planSpawns(bank, {
      targetPos: "명사",
      targetCount: 3,
      decoyCount: 4,
      rng: seqRng()
    });
    expect(plan).toHaveLength(7);
    expect(plan.filter((p) => p.isTarget)).toHaveLength(3);
    expect(plan.filter((p) => !p.isTarget)).toHaveLength(4);
  });

  it("목표로 표시된 것은 모두 목표 품사다", () => {
    const plan = planSpawns(bank, {
      targetPos: "명사",
      targetCount: 3,
      decoyCount: 4,
      rng: seqRng()
    });
    for (const p of plan.filter((x) => x.isTarget)) {
      expect(p.entry.pos).toBe("명사");
    }
  });

  it("오답에는 목표 품사가 섞이지 않는다", () => {
    const plan = planSpawns(bank, {
      targetPos: "명사",
      targetCount: 3,
      decoyCount: 4,
      rng: seqRng()
    });
    for (const p of plan.filter((x) => !x.isTarget)) {
      expect(p.entry.pos).not.toBe("명사");
    }
  });

  it("같은 단어를 두 번 스폰하지 않는다", () => {
    const plan = planSpawns(bank, {
      targetPos: "명사",
      targetCount: 3,
      decoyCount: 4,
      rng: seqRng()
    });
    const keys = plan.map((p) => `${p.entry.text}/${p.entry.pos}`);
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
    const plan = planSpawns(homonymBank, {
      targetPos: "명사",
      targetCount: 2,
      decoyCount: 2,
      rng: seqRng()
    });
    const texts = plan.map((p) => p.entry.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("모든 스폰에 티어가 붙는다", () => {
    const plan = planSpawns(bank, {
      targetPos: "명사",
      targetCount: 3,
      decoyCount: 4,
      rng: seqRng()
    });
    for (const p of plan) {
      expect(TIER_DIAMETER_M[p.tier]).toBeGreaterThan(0);
    }
  });

  it("사전에 목표 품사가 부족하면 있는 만큼만 낸다", () => {
    const plan = planSpawns(bank, {
      targetPos: "감탄사",
      targetCount: 5,
      decoyCount: 2,
      rng: seqRng()
    });
    expect(plan.filter((p) => p.isTarget)).toHaveLength(0);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run src/game/words.test.ts`
Expected: FAIL — `Failed to resolve import "./words"`

- [ ] **Step 4: words 구현**

`src/game/words.ts`:

```typescript
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
 * 스테이지에 낼 단어를 뽑는다.
 * 같은 판에 같은 표기(text)가 두 번 나오지 않게 막는다. 동형이의어가 함께 나오면
 * 학생이 어느 품사로 판정할지 알 수 없어 필드에 판정 불가 오브젝트가 생긴다.
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

  const targetPool = shuffle(
    bank.words.filter((w) => w.pos === targetPos),
    rng
  );
  const decoyPool = shuffle(
    bank.words.filter((w) => w.pos !== targetPos),
    rng
  );

  const targets = take(targetPool, targetCount);
  const decoys = take(decoyPool, decoyCount);

  const merged = shuffle(
    [
      ...targets.map((entry) => ({ entry, isTarget: true })),
      ...decoys.map((entry) => ({ entry, isTarget: false }))
    ],
    rng
  );

  return merged.map((m, i) => ({
    entry: m.entry,
    isTarget: m.isTarget,
    tier: tierForIndex(i, merged.length)
  }));
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/game/words.test.ts`
Expected: PASS (14 tests)

- [ ] **Step 6: 명사 스테이지용 사전 작성**

`public/data/words.json` — P1은 명사 스테이지만 쓰지만, 오답 품사가 필요하므로 다른 품사도 채운다. 용언은 기본형으로 쓴다.

```json
{
  "version": 1,
  "words": [
    { "text": "학교", "pos": "명사" },
    { "text": "교실", "pos": "명사" },
    { "text": "하늘", "pos": "명사" },
    { "text": "바다", "pos": "명사" },
    { "text": "거북이", "pos": "명사" },
    { "text": "친구", "pos": "명사" },
    { "text": "연필", "pos": "명사" },
    { "text": "가방", "pos": "명사" },
    { "text": "시계", "pos": "명사" },
    { "text": "노래", "pos": "명사" },
    { "text": "겨울", "pos": "명사" },
    { "text": "동생", "pos": "명사" },
    { "text": "운동장", "pos": "명사" },
    { "text": "선생님", "pos": "명사" },
    { "text": "도서관", "pos": "명사" },
    { "text": "책상", "pos": "명사" },
    { "text": "그림", "pos": "명사" },
    { "text": "구름", "pos": "명사" },
    { "text": "강아지", "pos": "명사" },
    { "text": "빗물", "pos": "명사" },
    { "text": "나", "pos": "대명사" },
    { "text": "너", "pos": "대명사" },
    { "text": "우리", "pos": "대명사" },
    { "text": "그것", "pos": "대명사" },
    { "text": "여기", "pos": "대명사" },
    { "text": "누구", "pos": "대명사" },
    { "text": "하나", "pos": "수사" },
    { "text": "둘", "pos": "수사" },
    { "text": "셋", "pos": "수사" },
    { "text": "다섯", "pos": "수사" },
    { "text": "첫째", "pos": "수사" },
    { "text": "여럿", "pos": "수사" },
    { "text": "달리다", "pos": "동사" },
    { "text": "읽다", "pos": "동사" },
    { "text": "먹다", "pos": "동사" },
    { "text": "웃다", "pos": "동사" },
    { "text": "던지다", "pos": "동사" },
    { "text": "심다", "pos": "동사" },
    { "text": "배우다", "pos": "동사" },
    { "text": "부르다", "pos": "동사" },
    { "text": "아름답다", "pos": "형용사" },
    { "text": "빠르다", "pos": "형용사" },
    { "text": "차갑다", "pos": "형용사" },
    { "text": "높다", "pos": "형용사" },
    { "text": "조용하다", "pos": "형용사" },
    { "text": "무겁다", "pos": "형용사" },
    { "text": "새", "pos": "관형사" },
    { "text": "헌", "pos": "관형사" },
    { "text": "온갖", "pos": "관형사" },
    { "text": "여러", "pos": "관형사" },
    { "text": "모든", "pos": "관형사" },
    { "text": "매우", "pos": "부사" },
    { "text": "아주", "pos": "부사" },
    { "text": "천천히", "pos": "부사" },
    { "text": "빨리", "pos": "부사" },
    { "text": "다시", "pos": "부사" },
    { "text": "몹시", "pos": "부사" },
    { "text": "은", "pos": "조사" },
    { "text": "는", "pos": "조사" },
    { "text": "이", "pos": "조사" },
    { "text": "가", "pos": "조사" },
    { "text": "을", "pos": "조사" },
    { "text": "를", "pos": "조사" },
    { "text": "에", "pos": "조사" },
    { "text": "도", "pos": "조사" },
    { "text": "만", "pos": "조사" },
    { "text": "아", "pos": "감탄사" },
    { "text": "어머", "pos": "감탄사" },
    { "text": "야", "pos": "감탄사" },
    { "text": "와", "pos": "감탄사" },
    { "text": "앗", "pos": "감탄사" }
  ]
}
```

- [ ] **Step 7: 사전 파일이 스키마를 통과하는지 테스트 추가**

`src/game/words.test.ts` 끝에 추가한다.

```typescript
import wordsJson from "../../public/data/words.json";

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
});
```

- [ ] **Step 8: 통과 확인**

Run: `npx vitest run src/game/words.test.ts`
Expected: PASS (16 tests)

- [ ] **Step 9: 커밋**

```bash
git add public/data/words.json src/game/words.ts src/game/words.test.ts src/game/objectTiers.ts
git commit -m "feat: 단어 사전 스키마 검증과 스폰 편성"
```

---

### Task 4: 점수와 모드 판정

**Files:**
- Create: `src/game/scoring.ts`, `src/game/modes/singlePos.ts`, `src/game/stages.ts`
- Test: `src/game/scoring.test.ts`, `src/game/modes/singlePos.test.ts`

**Interfaces:**
- Consumes: `KoreanPos` (Task 1), `WordEntry` (Task 3)
- Produces:
  - `type ScoreState = { hits: number; misses: number; combo: number; multiplier: number; points: number }`
  - `createScoreState(): ScoreState`
  - `applyHit(s: ScoreState): ScoreState`
  - `applyMiss(s: ScoreState): ScoreState`
  - `accuracy(s: ScoreState): number`
  - `starsFor(opts: { cleared: boolean; accuracy: number; secondsLeft: number }): 0 | 1 | 2 | 3`
  - `judgePickup(entry: WordEntry, targetPos: KoreanPos): "hit" | "miss"`
  - `isCleared(collected: number, targetCount: number): boolean`
  - `STAGES: StageDef[]`, `type StageDef`

- [ ] **Step 1: scoring 실패 테스트 작성**

`src/game/scoring.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  accuracy,
  applyHit,
  applyMiss,
  createScoreState,
  starsFor
} from "./scoring";

describe("createScoreState", () => {
  it("빈 상태로 시작한다", () => {
    const s = createScoreState();
    expect(s).toEqual({ hits: 0, misses: 0, combo: 0, multiplier: 1, points: 0 });
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
    s = applyHit(s); // 여기서 배수 1.2
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
    let s = createScoreState();
    s = applyMiss(s);
    expect(s.points).toBe(0);
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
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/game/scoring.test.ts`
Expected: FAIL — `Failed to resolve import "./scoring"`

- [ ] **Step 3: scoring 구현**

`src/game/scoring.ts`:

```typescript
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
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/game/scoring.test.ts`
Expected: PASS (13 tests)

- [ ] **Step 5: 모드 판정 실패 테스트 작성**

`src/game/modes/singlePos.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { isCleared, judgePickup } from "./singlePos";

describe("judgePickup", () => {
  it("목표 품사면 hit이다", () => {
    expect(judgePickup({ text: "학교", pos: "명사" }, "명사")).toBe("hit");
  });

  it("목표가 아니면 miss다", () => {
    expect(judgePickup({ text: "매우", pos: "부사" }, "명사")).toBe("miss");
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
```

- [ ] **Step 6: 실패 확인**

Run: `npx vitest run src/game/modes/singlePos.test.ts`
Expected: FAIL — `Failed to resolve import "./singlePos"`

- [ ] **Step 7: 모드와 스테이지 구현**

`src/game/modes/singlePos.ts`:

```typescript
import type { KoreanPos } from "../pos";
import type { WordEntry } from "../words";

export function judgePickup(entry: WordEntry, targetPos: KoreanPos): "hit" | "miss" {
  return entry.pos === targetPos ? "hit" : "miss";
}

export function isCleared(collected: number, targetCount: number): boolean {
  return collected >= targetCount;
}
```

`src/game/stages.ts`:

```typescript
import type { KoreanPos } from "./pos";

export type StageDef = {
  id: string;
  targetPos: KoreanPos;
  targetCount: number;
  decoyCount: number;
  durationSec: number;
};

/** P1은 명사 스테이지 하나만 만든다. 나머지 8개는 P2에서 추가한다. */
export const STAGES: StageDef[] = [
  {
    id: "singlePos:명사",
    targetPos: "명사",
    targetCount: 20,
    decoyCount: 40,
    durationSec: 90
  }
];

export function stageById(id: string): StageDef | undefined {
  return STAGES.find((s) => s.id === id);
}
```

- [ ] **Step 8: 전체 순수 로직 테스트 통과 확인**

Run: `npx vitest run src/game/`
Expected: PASS (pos 5 + units 6 + growth 12 + words 16 + scoring 13 + singlePos 5 = 57 tests)

- [ ] **Step 9: 커밋**

```bash
git add src/game/scoring.ts src/game/scoring.test.ts src/game/modes/ src/game/stages.ts
git commit -m "feat: 점수·콤보·별 등급과 단일 품사 모드 판정"
```

---

### Task 5: 입력 정규화

**Files:**
- Create: `src/input/inputVector.ts`, `src/input/useInput.ts`, `src/input/VirtualStick.tsx`
- Test: `src/input/inputVector.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `type InputVector = { x: number; y: number }`
  - `KEY_TO_DIRECTION: Record<string, InputVector>`
  - `vectorFromKeys(pressed: ReadonlySet<string>): InputVector`
  - `vectorFromStick(center: {x,y}, current: {x,y}, radiusPx: number): InputVector`
  - `useInput(): { current: InputVector }` — ref 형태. 리렌더를 유발하지 않는다
  - `<VirtualStick side="left" | "right" />`

- [ ] **Step 1: 실패 테스트 작성**

`src/input/inputVector.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { vectorFromKeys, vectorFromStick } from "./inputVector";

describe("vectorFromKeys", () => {
  it("아무 키도 없으면 0이다", () => {
    expect(vectorFromKeys(new Set())).toEqual({ x: 0, y: 0 });
  });

  it("위쪽은 y가 -1이다", () => {
    expect(vectorFromKeys(new Set(["ArrowUp"]))).toEqual({ x: 0, y: -1 });
  });

  it("WASD도 방향키와 같게 동작한다", () => {
    expect(vectorFromKeys(new Set(["KeyW"]))).toEqual({ x: 0, y: -1 });
    expect(vectorFromKeys(new Set(["KeyD"]))).toEqual({ x: 1, y: 0 });
  });

  it("대각선은 크기가 1로 정규화된다", () => {
    const v = vectorFromKeys(new Set(["ArrowUp", "ArrowRight"]));
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 10);
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBeLessThan(0);
  });

  it("반대 방향이 함께 눌리면 상쇄된다", () => {
    expect(vectorFromKeys(new Set(["ArrowLeft", "ArrowRight"]))).toEqual({ x: 0, y: 0 });
  });

  it("모르는 키는 무시한다", () => {
    expect(vectorFromKeys(new Set(["KeyZ", "ArrowDown"]))).toEqual({ x: 0, y: 1 });
  });
});

describe("vectorFromStick", () => {
  const center = { x: 100, y: 100 };

  it("중심에 있으면 0이다", () => {
    expect(vectorFromStick(center, { x: 100, y: 100 }, 60)).toEqual({ x: 0, y: 0 });
  });

  it("반경의 절반이면 크기가 0.5다", () => {
    const v = vectorFromStick(center, { x: 130, y: 100 }, 60);
    expect(v.x).toBeCloseTo(0.5, 10);
    expect(v.y).toBeCloseTo(0, 10);
  });

  it("반경을 넘으면 1로 클램프된다", () => {
    const v = vectorFromStick(center, { x: 400, y: 100 }, 60);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 10);
  });

  it("화면 아래로 끌면 y가 양수다", () => {
    const v = vectorFromStick(center, { x: 100, y: 160 }, 60);
    expect(v.y).toBeCloseTo(1, 10);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/input/inputVector.test.ts`
Expected: FAIL — `Failed to resolve import "./inputVector"`

- [ ] **Step 3: 구현**

`src/input/inputVector.ts`:

```typescript
export type InputVector = { x: number; y: number };

/** 화면 좌표계를 따른다: y가 양수면 아래쪽. */
export const KEY_TO_DIRECTION: Record<string, InputVector> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 }
};

function normalize(v: InputVector): InputVector {
  const len = Math.hypot(v.x, v.y);
  if (len === 0) return { x: 0, y: 0 };
  if (len <= 1) return v;
  return { x: v.x / len, y: v.y / len };
}

export function vectorFromKeys(pressed: ReadonlySet<string>): InputVector {
  let x = 0;
  let y = 0;
  for (const code of pressed) {
    const dir = KEY_TO_DIRECTION[code];
    if (!dir) continue;
    x += dir.x;
    y += dir.y;
  }
  return normalize({ x, y });
}

export function vectorFromStick(
  center: InputVector,
  current: InputVector,
  radiusPx: number
): InputVector {
  const dx = current.x - center.x;
  const dy = current.y - center.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0 || radiusPx <= 0) return { x: 0, y: 0 };
  const scale = Math.min(1, dist / radiusPx) / dist;
  return { x: dx * scale, y: dy * scale };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/input/inputVector.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: React 훅 작성**

`src/input/useInput.ts`. 이 훅은 절대 `setState`를 부르지 않는다. 게임 루프는 ref만 읽는다.

```typescript
"use client";

import { useEffect, useRef } from "react";
import { vectorFromKeys, vectorFromStick, type InputVector } from "./inputVector";

export type InputRef = { current: InputVector };

const STICK_RADIUS_PX = 60;

/**
 * 키보드와 터치 스틱을 하나의 벡터로 합친다.
 * 리렌더를 유발하지 않도록 ref만 갱신한다.
 */
export function useInput(): InputRef {
  const vector = useRef<InputVector>({ x: 0, y: 0 });
  const pressed = useRef<Set<string>>(new Set());
  const touch = useRef<{ id: number; center: InputVector } | null>(null);

  useEffect(() => {
    const recompute = () => {
      if (touch.current) return; // 터치가 잡혀 있으면 터치가 우선
      vector.current = vectorFromKeys(pressed.current);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      pressed.current.add(e.code);
      recompute();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      pressed.current.delete(e.code);
      recompute();
    };
    const onBlur = () => {
      pressed.current.clear();
      vector.current = { x: 0, y: 0 };
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;
      touch.current = { id: t.identifier, center: { x: t.clientX, y: t.clientY } };
      vector.current = { x: 0, y: 0 };
    };
    const onTouchMove = (e: TouchEvent) => {
      const active = touch.current;
      if (!active) return;
      for (const t of Array.from(e.touches)) {
        if (t.identifier !== active.id) continue;
        vector.current = vectorFromStick(
          active.center,
          { x: t.clientX, y: t.clientY },
          STICK_RADIUS_PX
        );
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      const active = touch.current;
      if (!active) return;
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== active.id) continue;
        touch.current = null;
        vector.current = vectorFromKeys(pressed.current);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return vector;
}
```

- [ ] **Step 6: 가상 스틱 UI 작성**

`src/input/VirtualStick.tsx`. 순수 표시용이다. 입력 판정은 `useInput`이 window 이벤트로 처리한다.

```tsx
"use client";

import { useEffect, useState } from "react";

/** 터치가 시작된 지점에 스틱 원을 그려 보여준다. 판정에는 관여하지 않는다. */
export function VirtualStick() {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;
      setOrigin({ x: t.clientX, y: t.clientY });
      setKnob({ x: t.clientX, y: t.clientY });
    };
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      setKnob({ x: t.clientX, y: t.clientY });
    };
    const onEnd = () => {
      setOrigin(null);
      setKnob(null);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  if (!origin || !knob) return null;

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 20 }}>
      <div
        style={{
          position: "absolute",
          left: origin.x - 60,
          top: origin.y - 60,
          width: 120,
          height: 120,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.35)",
          background: "rgba(255,255,255,0.06)"
        }}
      />
      <div
        style={{
          position: "absolute",
          left: knob.x - 22,
          top: knob.y - 22,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.7)"
        }}
      />
    </div>
  );
}
```

- [ ] **Step 7: 타입 검사**

Run: `npx tsc --noEmit`
Expected: 오류 없음

- [ ] **Step 8: 커밋**

```bash
git add src/input/
git commit -m "feat: 키보드·터치를 하나의 벡터로 정규화하는 입력 계층"
```

---

### Task 6: 게임 스토어

**Files:**
- Create: `src/store/gameStore.ts`
- Test: `src/store/gameStore.test.ts`

**Interfaces:**
- Consumes: `START_DIAMETER_M`, `grow`, `canPickUp` (Task 2), `createScoreState`, `applyHit`, `applyMiss`, `accuracy`, `starsFor` (Task 4), `judgePickup`, `isCleared` (Task 4), `SpawnPlan` (Task 3), `StageDef` (Task 4)
- Produces:
  - `type Phase = "ready" | "playing" | "cleared" | "failed"`
  - `useGameStore` — zustand 스토어
  - 상태: `phase`, `stage`, `diameterM`, `collected`, `misfits`, `score`, `secondsLeft`, `spawns`, `attachedIds`
  - 액션: `startStage(stage, spawns)`, `pickUp(spawnIndex)`, `tick(deltaSec)`, `reset()`

- [ ] **Step 1: 실패 테스트 작성**

`src/store/gameStore.test.ts`:

```typescript
import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "./gameStore";
import type { SpawnPlan } from "@/game/words";
import type { StageDef } from "@/game/stages";

const stage: StageDef = {
  id: "test:명사",
  targetPos: "명사",
  targetCount: 2,
  decoyCount: 1,
  durationSec: 10
};

const spawns: SpawnPlan[] = [
  { entry: { text: "학교", pos: "명사" }, tier: "XS", isTarget: true },
  { entry: { text: "하늘", pos: "명사" }, tier: "XS", isTarget: true },
  { entry: { text: "매우", pos: "부사" }, tier: "XS", isTarget: false }
];

describe("gameStore", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it("초기에는 ready 상태다", () => {
    expect(useGameStore.getState().phase).toBe("ready");
  });

  it("스테이지를 시작하면 playing이 되고 지름이 5cm다", () => {
    useGameStore.getState().startStage(stage, spawns);
    const s = useGameStore.getState();
    expect(s.phase).toBe("playing");
    expect(s.diameterM).toBe(0.05);
    expect(s.secondsLeft).toBe(10);
    expect(s.collected).toBe(0);
    expect(s.misfits).toBe(0);
  });

  it("목표 품사를 붙이면 수집이 늘고 점수가 오른다", () => {
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().pickUp(0);
    const s = useGameStore.getState();
    expect(s.collected).toBe(1);
    expect(s.misfits).toBe(0);
    expect(s.score.points).toBe(100);
    expect(s.attachedIds).toContain(0);
  });

  it("다른 품사를 붙이면 부착밀이 늘고 수집은 안 는다", () => {
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().pickUp(2);
    const s = useGameStore.getState();
    expect(s.collected).toBe(0);
    expect(s.misfits).toBe(1);
  });

  it("부착밀도 지름을 키운다", () => {
    useGameStore.getState().startStage(stage, spawns);
    const before = useGameStore.getState().diameterM;
    useGameStore.getState().pickUp(2);
    expect(useGameStore.getState().diameterM).toBeGreaterThan(before);
  });

  it("같은 것을 두 번 붙일 수 없다", () => {
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().pickUp(0);
    useGameStore.getState().pickUp(0);
    expect(useGameStore.getState().collected).toBe(1);
  });

  it("공보다 너무 큰 것은 붙지 않는다", () => {
    const bigSpawns: SpawnPlan[] = [
      { entry: { text: "의자", pos: "명사" }, tier: "L", isTarget: true }
    ];
    useGameStore.getState().startStage(stage, bigSpawns);
    useGameStore.getState().pickUp(0);
    expect(useGameStore.getState().collected).toBe(0);
    expect(useGameStore.getState().attachedIds).toHaveLength(0);
  });

  it("목표 수를 채우면 cleared가 된다", () => {
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().pickUp(0);
    useGameStore.getState().pickUp(1);
    expect(useGameStore.getState().phase).toBe("cleared");
  });

  it("tick이 남은 시간을 줄인다", () => {
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().tick(3);
    expect(useGameStore.getState().secondsLeft).toBe(7);
  });

  it("시간이 다 되면 failed가 된다", () => {
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().tick(20);
    const s = useGameStore.getState();
    expect(s.phase).toBe("failed");
    expect(s.secondsLeft).toBe(0);
  });

  it("clear 후에는 tick이 시간을 줄이지 않는다", () => {
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().pickUp(0);
    useGameStore.getState().pickUp(1);
    const left = useGameStore.getState().secondsLeft;
    useGameStore.getState().tick(5);
    expect(useGameStore.getState().secondsLeft).toBe(left);
  });

  it("playing이 아니면 붙지 않는다", () => {
    useGameStore.getState().pickUp(0);
    expect(useGameStore.getState().collected).toBe(0);
  });

  it("clear 시 별을 계산해 둔다", () => {
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().pickUp(0);
    useGameStore.getState().pickUp(1);
    expect(useGameStore.getState().stars).toBe(1);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/store/gameStore.test.ts`
Expected: FAIL — `Failed to resolve import "./gameStore"`

- [ ] **Step 3: 구현**

`src/store/gameStore.ts`:

```typescript
import { create } from "zustand";
import { START_DIAMETER_M, canPickUp, grow } from "@/game/growth";
import { TIER_DIAMETER_M } from "@/game/objectTiers";
import {
  accuracy,
  applyHit,
  applyMiss,
  createScoreState,
  starsFor,
  type ScoreState
} from "@/game/scoring";
import { isCleared, judgePickup } from "@/game/modes/singlePos";
import type { StageDef } from "@/game/stages";
import type { SpawnPlan } from "@/game/words";

export type Phase = "ready" | "playing" | "cleared" | "failed";

type GameState = {
  phase: Phase;
  stage: StageDef | null;
  spawns: SpawnPlan[];
  attachedIds: number[];
  diameterM: number;
  collected: number;
  misfits: number;
  score: ScoreState;
  secondsLeft: number;
  stars: 0 | 1 | 2 | 3;

  startStage: (stage: StageDef, spawns: SpawnPlan[]) => void;
  pickUp: (spawnIndex: number) => void;
  tick: (deltaSec: number) => void;
  reset: () => void;
};

const initial = {
  phase: "ready" as Phase,
  stage: null,
  spawns: [] as SpawnPlan[],
  attachedIds: [] as number[],
  diameterM: START_DIAMETER_M,
  collected: 0,
  misfits: 0,
  score: createScoreState(),
  secondsLeft: 0,
  stars: 0 as 0 | 1 | 2 | 3
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initial,

  startStage: (stage, spawns) =>
    set({
      ...initial,
      phase: "playing",
      stage,
      spawns,
      secondsLeft: stage.durationSec,
      score: createScoreState()
    }),

  pickUp: (spawnIndex) => {
    const s = get();
    if (s.phase !== "playing" || !s.stage) return;
    if (s.attachedIds.includes(spawnIndex)) return;

    const spawn = s.spawns[spawnIndex];
    if (!spawn) return;

    const objectDiameterM = TIER_DIAMETER_M[spawn.tier];
    if (!canPickUp(s.diameterM, objectDiameterM)) return;

    const verdict = judgePickup(spawn.entry, s.stage.targetPos);
    const collected = verdict === "hit" ? s.collected + 1 : s.collected;
    const misfits = verdict === "miss" ? s.misfits + 1 : s.misfits;
    const score = verdict === "hit" ? applyHit(s.score) : applyMiss(s.score);
    const cleared = isCleared(collected, s.stage.targetCount);

    set({
      attachedIds: [...s.attachedIds, spawnIndex],
      diameterM: grow(s.diameterM, objectDiameterM),
      collected,
      misfits,
      score,
      phase: cleared ? "cleared" : "playing",
      stars: cleared
        ? starsFor({
            cleared: true,
            accuracy: accuracy(score),
            secondsLeft: s.secondsLeft
          })
        : s.stars
    });
  },

  tick: (deltaSec) => {
    const s = get();
    if (s.phase !== "playing") return;
    const secondsLeft = Math.max(0, s.secondsLeft - deltaSec);
    if (secondsLeft === 0) {
      set({ secondsLeft: 0, phase: "failed", stars: 0 });
      return;
    }
    set({ secondsLeft });
  },

  reset: () => set({ ...initial, score: createScoreState() })
}));
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/store/gameStore.test.ts`
Expected: PASS (14 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/store/
git commit -m "feat: zustand 게임 스토어 — 성장·판정·타이머"
```

---

### Task 7: 한글 라벨 텍스처

**Files:**
- Create: `src/three/labelTexture.ts`
- Test: `src/three/labelTexture.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `LABEL_WIDTH = 256`, `LABEL_HEIGHT = 64`
  - `drawLabel(ctx: CanvasRenderingContext2D, text: string, bgColor: string): void`
  - `getLabelTexture(text: string, bgColor: string): THREE.CanvasTexture` — LRU 60개 캐시
  - `clearLabelCache(): void`
  - `labelCacheSize(): number`

- [ ] **Step 1: 실패 테스트 작성**

`src/three/labelTexture.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LABEL_CACHE_LIMIT,
  LABEL_HEIGHT,
  LABEL_WIDTH,
  clearLabelCache,
  getLabelTexture,
  labelCacheSize
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

  it("캐시는 60개를 넘지 않는다", () => {
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
    // 하나 더 넣으면 단어1이 밀려나야 한다
    getLabelTexture("새단어", "#2563eb");
    expect(getLabelTexture("단어0", "#2563eb")).toBe(first);
    expect(labelCacheSize()).toBe(LABEL_CACHE_LIMIT);
  });

  it("버려질 때 dispose를 부른다", () => {
    const disposed: string[] = [];
    for (let i = 0; i < LABEL_CACHE_LIMIT; i += 1) {
      const t = getLabelTexture(`단어${i}`, "#2563eb");
      vi.spyOn(t, "dispose").mockImplementation(() => {
        disposed.push(`단어${i}`);
      });
    }
    getLabelTexture("추가", "#2563eb");
    expect(disposed).toContain("단어0");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/three/labelTexture.test.ts`
Expected: FAIL — `Failed to resolve import "./labelTexture"`

- [ ] **Step 3: 구현**

`src/three/labelTexture.ts`:

```typescript
import { CanvasTexture, SRGBColorSpace } from "three";

export const LABEL_WIDTH = 256;
export const LABEL_HEIGHT = 64;
export const LABEL_CACHE_LIMIT = 60;

/** 라벨 배경색에 대비되는 글자색을 고른다. */
function textColorFor(bgColor: string): string {
  const hex = bgColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111111" : "#ffffff";
}

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  bgColor: string
): void {
  ctx.clearRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);

  // 글자가 길면 줄여서 넣는다. 이름표는 항상 한 줄이다.
  let fontSize = 40;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = textColorFor(bgColor);
  do {
    ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
    if (ctx.measureText(text).width <= LABEL_WIDTH - 24) break;
    fontSize -= 2;
  } while (fontSize > 14);

  ctx.fillText(text, LABEL_WIDTH / 2, LABEL_HEIGHT / 2);
}

/** Map은 삽입 순서를 지키므로 LRU에 그대로 쓴다. */
const cache = new Map<string, CanvasTexture>();

export function getLabelTexture(text: string, bgColor: string): CanvasTexture {
  const key = `${text}|${bgColor}`;
  const hit = cache.get(key);
  if (hit) {
    // 최신으로 올린다
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  const canvas = document.createElement("canvas");
  canvas.width = LABEL_WIDTH;
  canvas.height = LABEL_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (ctx) drawLabel(ctx, text, bgColor);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  cache.set(key, texture);

  while (cache.size > LABEL_CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    const oldest = cache.get(oldestKey);
    cache.delete(oldestKey);
    oldest?.dispose();
  }

  return texture;
}

export function clearLabelCache(): void {
  for (const texture of cache.values()) texture.dispose();
  cache.clear();
}

export function labelCacheSize(): number {
  return cache.size;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/three/labelTexture.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/three/labelTexture.ts src/three/labelTexture.test.ts
git commit -m "feat: 한글 라벨 캔버스 텍스처와 LRU 캐시"
```

---

### Task 8: 3D 씬 — 공, 사물, 필드, 카메라

**Files:**
- Create: `src/three/WordObject.tsx`, `src/three/Katamari.tsx`, `src/three/Field.tsx`, `src/three/ChaseCamera.tsx`, `src/three/GameCanvas.tsx`
- Modify: `src/store/gameStore.ts` (부착 위치 기록 추가)

**Interfaces:**
- Consumes: `useGameStore` (Task 6), `useInput` (Task 5), `getLabelTexture` (Task 7), `POS_COLORS` (Task 1), `TIER_DIAMETER_M` (Task 3), `speedMultiplier` (Task 2)
- Produces:
  - `<GameCanvas />` — Canvas + Physics 전체 조립
  - `<Katamari inputRef={...} />`
  - `<WordObject index={number} spawn={SpawnPlan} position={[x,y,z]} />`
  - `<Field />`
  - `<ChaseCamera targetRef={...} />`

**Note:** P1은 Tripo GLB 대신 원시 도형(박스·구·실린더)을 쓴다. GLB 교체는 Task 10에서 한다. 재미 검증에 모델 품질은 필요하지 않고, 모델 로딩이 물리·조작 디버깅을 방해한다.

- [ ] **Step 1: 부착 위치를 스토어에 기록하도록 확장**

`src/store/gameStore.ts`의 `GameState`에 다음을 추가한다.

```typescript
  /** 붙은 사물이 공 표면 어디에 박혔는지. 정규화된 방향 벡터. */
  attachDirs: Record<number, [number, number, number]>;
```

`initial`에 `attachDirs: {} as Record<number, [number, number, number]>`를 추가하고, `pickUp`의 `set({...})`에 다음을 넣는다.

```typescript
      attachDirs: {
        ...s.attachDirs,
        [spawnIndex]: randomUnitVector()
      },
```

파일 상단에 헬퍼를 추가한다.

```typescript
/** 공 표면의 임의 방향. 사물이 튀어나온 채로 붙는 위치를 정한다. */
function randomUnitVector(): [number, number, number] {
  const u = Math.random() * 2 - 1;
  const theta = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  return [r * Math.cos(theta), u, r * Math.sin(theta)];
}
```

- [ ] **Step 2: 스토어 테스트에 부착 방향 검증 추가**

`src/store/gameStore.test.ts`에 추가한다.

```typescript
  it("붙은 사물마다 표면 방향을 기록한다", () => {
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().pickUp(0);
    const dir = useGameStore.getState().attachDirs[0];
    expect(dir).toBeDefined();
    expect(Math.hypot(dir[0], dir[1], dir[2])).toBeCloseTo(1, 6);
  });
```

- [ ] **Step 3: 테스트 통과 확인**

Run: `npx vitest run src/store/gameStore.test.ts`
Expected: PASS (15 tests)

- [ ] **Step 4: WordObject 작성**

`src/three/WordObject.tsx`. 붙기 전에는 리지드바디, 붙은 뒤에는 공의 자식 메시가 된다.

```tsx
"use client";

import { RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import { POS_COLORS } from "@/game/pos";
import { TIER_DIAMETER_M } from "@/game/objectTiers";
import type { SpawnPlan } from "@/game/words";
import { getLabelTexture } from "./labelTexture";

/** 사물 몸통. P1은 원시 도형으로 대신한다. Tripo GLB는 Task 10에서 붙인다. */
function Body({ size, color }: { size: number; color: string }) {
  return (
    <mesh castShadow>
      <boxGeometry args={[size, size * 0.7, size]} />
      <meshStandardMaterial color={color} flatShading roughness={0.85} />
    </mesh>
  );
}

/** 사물에 꽂힌 이름표. 곡면 왜곡 없이 항상 정면에서 읽힌다. */
function LabelTag({ text, color, size }: { text: string; color: string; size: number }) {
  const texture = useMemo(() => getLabelTexture(text, color), [text, color]);
  const w = Math.max(size * 1.6, 0.05);
  const h = w / 4;
  return (
    <mesh position={[0, size * 0.75, 0]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

export type WordObjectProps = {
  index: number;
  spawn: SpawnPlan;
  position: [number, number, number];
  /** 상급 난이도에서 색을 끄면 회색으로 통일한다. P1은 항상 false. */
  greyscale?: boolean;
  onTouch: (index: number) => void;
};

export function WordObject({
  index,
  spawn,
  position,
  greyscale = false,
  onTouch
}: WordObjectProps) {
  const size = TIER_DIAMETER_M[spawn.tier];
  const color = greyscale ? "#9ca3af" : POS_COLORS[spawn.entry.pos];

  return (
    <RigidBody
      colliders="cuboid"
      position={position}
      userData={{ wordIndex: index }}
      onCollisionEnter={({ other }) => {
        if (other.rigidBodyObject?.name === "katamari") onTouch(index);
      }}
    >
      <group>
        <Body size={size} color={color} />
        <LabelTag text={spawn.entry.text} color={color} size={size} />
      </group>
    </RigidBody>
  );
}

/** 공에 붙은 뒤의 모습. 물리 바디 없이 공의 자식으로 회전한다. */
export function AttachedWord({
  spawn,
  dir,
  ballRadius,
  greyscale = false
}: {
  spawn: SpawnPlan;
  dir: [number, number, number];
  ballRadius: number;
  greyscale?: boolean;
}) {
  const size = TIER_DIAMETER_M[spawn.tier];
  const color = greyscale ? "#9ca3af" : POS_COLORS[spawn.entry.pos];
  // 표면에서 살짝 파묻히게 둔다. 매끈해지지 않고 튀어나온 채로 굴러야 한다.
  const d = ballRadius * 0.85;
  const position: [number, number, number] = [dir[0] * d, dir[1] * d, dir[2] * d];

  return (
    <group position={position}>
      <Body size={size} color={color} />
      <LabelTag text={spawn.entry.text} color={color} size={size} />
    </group>
  );
}
```

- [ ] **Step 5: Katamari 작성**

`src/three/Katamari.tsx`. 지름 변화를 `useFrame`에서 ref로 반영한다. `setState`를 부르지 않는다.

```tsx
"use client";

import { useFrame } from "@react-three/fiber";
import { RapierRigidBody, RigidBody, BallCollider } from "@react-three/rapier";
import { useRef } from "react";
import type { Group, Mesh } from "three";
import { speedMultiplier } from "@/game/growth";
import { useGameStore } from "@/store/gameStore";
import type { InputRef } from "@/input/useInput";
import { AttachedWord } from "./WordObject";

const TORQUE_BASE = 0.9;

export function Katamari({ inputRef }: { inputRef: InputRef }) {
  const body = useRef<RapierRigidBody>(null);
  const visual = useRef<Group>(null);
  const ballMesh = useRef<Mesh>(null);

  useFrame((_, delta) => {
    const rb = body.current;
    if (!rb) return;

    const s = useGameStore.getState();
    if (s.phase !== "playing") return;

    // 시간 흐름
    s.tick(delta);

    // 입력 → 토크. 부착밀이 많으면 느려진다.
    const v = inputRef.current;
    const mul = speedMultiplier(s.misfits);
    const strength = TORQUE_BASE * mul * delta * 60;
    if (v.x !== 0 || v.y !== 0) {
      // 화면 위(-y)로 밀면 앞으로 굴러야 하므로 x축 토크에 v.y를 쓴다.
      rb.applyTorqueImpulse({ x: v.y * strength, y: 0, z: -v.x * strength }, true);
    }

    // 지름 반영. 스케일만 키우고 콜라이더 반경도 따라간다.
    const radius = s.diameterM / 2;
    if (ballMesh.current) ballMesh.current.scale.setScalar(radius);
    if (visual.current) visual.current.scale.setScalar(1);
  });

  const spawns = useGameStore((st) => st.spawns);
  const attachedIds = useGameStore((st) => st.attachedIds);
  const attachDirs = useGameStore((st) => st.attachDirs);
  const diameterM = useGameStore((st) => st.diameterM);
  const radius = diameterM / 2;

  return (
    <RigidBody
      ref={body}
      name="katamari"
      colliders={false}
      position={[0, 0.3, 0]}
      linearDamping={0.4}
      angularDamping={0.35}
      friction={1.2}
    >
      <BallCollider args={[radius]} />
      <group ref={visual}>
        <mesh ref={ballMesh} castShadow>
          <sphereGeometry args={[1, 20, 16]} />
          <meshStandardMaterial color="#f4c542" flatShading roughness={0.7} />
        </mesh>
        {attachedIds.map((id) => {
          const spawn = spawns[id];
          const dir = attachDirs[id];
          if (!spawn || !dir) return null;
          return (
            <AttachedWord key={id} spawn={spawn} dir={dir} ballRadius={radius} />
          );
        })}
      </group>
    </RigidBody>
  );
}
```

- [ ] **Step 6: Field 작성**

`src/three/Field.tsx`:

```tsx
"use client";

import { RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import { useGameStore } from "@/store/gameStore";
import { WordObject } from "./WordObject";

const FIELD_SIZE = 14;

/** 스폰 순번을 필드에 흩뿌린다. 나선으로 놓아 뭉치지 않게 한다. */
function scatter(count: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const r = (FIELD_SIZE / 2) * Math.sqrt((i + 0.5) / count);
    const a = i * golden;
    out.push([Math.cos(a) * r, 0.1, Math.sin(a) * r]);
  }
  return out;
}

export function Field() {
  const spawns = useGameStore((s) => s.spawns);
  const attachedIds = useGameStore((s) => s.attachedIds);
  const pickUp = useGameStore((s) => s.pickUp);

  const positions = useMemo(() => scatter(spawns.length), [spawns.length]);

  return (
    <>
      <RigidBody type="fixed" friction={1.4}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[FIELD_SIZE * 2, FIELD_SIZE * 2]} />
          <meshStandardMaterial color="#7dd3a0" flatShading />
        </mesh>
      </RigidBody>

      {spawns.map((spawn, i) => {
        if (attachedIds.includes(i)) return null;
        const pos = positions[i];
        if (!pos) return null;
        return (
          <WordObject key={i} index={i} spawn={spawn} position={pos} onTouch={pickUp} />
        );
      })}
    </>
  );
}
```

- [ ] **Step 7: ChaseCamera 작성**

`src/three/ChaseCamera.tsx`:

```tsx
"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";
import { useGameStore } from "@/store/gameStore";

/** 낮은 각도에서 뒤를 쫓고, 공이 커지면 거리와 높이가 늘어난다. */
export function ChaseCamera() {
  const { camera } = useThree();
  const desired = useRef(new Vector3());
  const lookAt = useRef(new Vector3());

  useFrame((_, delta) => {
    const d = useGameStore.getState().diameterM;
    const dist = 1.2 + d * 6;
    const height = 0.5 + d * 2.5;

    desired.current.set(0, height, dist);
    // 감쇠를 걸어 부드럽게 따라간다
    const t = Math.min(1, delta * 3);
    camera.position.lerp(desired.current, t);
    lookAt.current.set(0, d * 0.5, 0);
    camera.lookAt(lookAt.current);
  });

  return null;
}
```

- [ ] **Step 8: GameCanvas 작성**

`src/three/GameCanvas.tsx`:

```tsx
"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { useInput } from "@/input/useInput";
import { ChaseCamera } from "./ChaseCamera";
import { Field } from "./Field";
import { Katamari } from "./Katamari";

export function GameCanvas() {
  const inputRef = useInput();

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 1, 2], fov: 55, near: 0.01, far: 200 }}
      style={{ position: "fixed", inset: 0 }}
    >
      <color attach="background" args={["#8ecae6"]} />
      <hemisphereLight intensity={0.7} groundColor="#3f6212" />
      <directionalLight
        position={[6, 10, 4]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <Physics gravity={[0, -9.81, 0]}>
        <Field />
        <Katamari inputRef={inputRef} />
      </Physics>
      <ChaseCamera />
    </Canvas>
  );
}
```

- [ ] **Step 9: 타입 검사와 커밋**

Run: `npx tsc --noEmit`
Expected: 오류 없음

```bash
git add src/three/ src/store/gameStore.ts src/store/gameStore.test.ts
git commit -m "feat: 3D 씬 — 공·사물·필드·추적 카메라"
```

---

### Task 9: HUD와 화면 전환

**Files:**
- Create: `src/ui/Hud.tsx`, `src/ui/ResultScreen.tsx`, `src/ui/GameShell.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/ui/Hud.test.tsx`, `src/ui/ResultScreen.test.tsx`

**Interfaces:**
- Consumes: `useGameStore` (Task 6), `formatDiameter` (Task 2), `STAGES` (Task 4), `planSpawns`, `parseWordBank` (Task 3), `VirtualStick` (Task 5), `GameCanvas` (Task 8)
- Produces: `<GameShell />` — 앱의 진입 컴포넌트

- [ ] **Step 1: Hud 실패 테스트 작성**

`src/ui/Hud.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Hud } from "./Hud";
import { useGameStore } from "@/store/gameStore";
import type { StageDef } from "@/game/stages";
import type { SpawnPlan } from "@/game/words";

const stage: StageDef = {
  id: "test:명사",
  targetPos: "명사",
  targetCount: 3,
  decoyCount: 1,
  durationSec: 90
};

const spawns: SpawnPlan[] = [
  { entry: { text: "학교", pos: "명사" }, tier: "XS", isTarget: true },
  { entry: { text: "매우", pos: "부사" }, tier: "XS", isTarget: false }
];

describe("Hud", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().startStage(stage, spawns);
  });

  it("목표 품사를 보여준다", () => {
    render(<Hud />);
    expect(screen.getByText(/명사/)).toBeTruthy();
  });

  it("수집 진행을 N/M으로 보여준다", () => {
    render(<Hud />);
    expect(screen.getByText("0 / 3")).toBeTruthy();
  });

  it("지름을 밀리미터까지 보여준다", () => {
    render(<Hud />);
    expect(screen.getByText("5cm")).toBeTruthy();
  });

  it("남은 시간을 초로 보여준다", () => {
    render(<Hud />);
    expect(screen.getByText("90")).toBeTruthy();
  });

  it("부착밀이 없으면 경고를 보이지 않는다", () => {
    render(<Hud />);
    expect(screen.queryByText(/부착밀/)).toBeNull();
  });

  it("부착밀이 생기면 개수를 보여준다", () => {
    useGameStore.getState().pickUp(1);
    render(<Hud />);
    expect(screen.getByText(/부착밀 1/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/ui/Hud.test.tsx`
Expected: FAIL — `Failed to resolve import "./Hud"`

- [ ] **Step 3: Hud 구현**

`src/ui/Hud.tsx`. 스토어를 선택적으로 구독한다. 필요한 값만 골라 구독해야 리렌더가 최소화된다.

```tsx
"use client";

import { formatDiameter } from "@/game/units";
import { POS_COLORS } from "@/game/pos";
import { useGameStore } from "@/store/gameStore";

const box: React.CSSProperties = {
  background: "rgba(9,14,32,0.72)",
  borderRadius: 12,
  padding: "8px 14px",
  fontWeight: 700
};

export function Hud() {
  const stage = useGameStore((s) => s.stage);
  const collected = useGameStore((s) => s.collected);
  const misfits = useGameStore((s) => s.misfits);
  const diameterM = useGameStore((s) => s.diameterM);
  const secondsLeft = useGameStore((s) => s.secondsLeft);

  if (!stage) return null;

  const urgent = secondsLeft <= 20;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        display: "flex",
        gap: 10,
        alignItems: "center",
        padding: 12,
        pointerEvents: "none"
      }}
    >
      <div style={{ ...box, color: urgent ? "#fca5a5" : "#fff", minWidth: 62 }}>
        {Math.ceil(secondsLeft)}
      </div>

      <div style={{ ...box, color: POS_COLORS[stage.targetPos] }}>
        「{stage.targetPos}」
      </div>

      <div style={box}>
        {collected} / {stage.targetCount}
      </div>

      <div style={box}>{formatDiameter(diameterM)}</div>

      {misfits > 0 && (
        <div style={{ ...box, color: "#fca5a5" }}>부착밀 {misfits}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/ui/Hud.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: ResultScreen 실패 테스트 작성**

`src/ui/ResultScreen.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResultScreen } from "./ResultScreen";
import { useGameStore } from "@/store/gameStore";
import type { StageDef } from "@/game/stages";
import type { SpawnPlan } from "@/game/words";

const stage: StageDef = {
  id: "test:명사",
  targetPos: "명사",
  targetCount: 1,
  decoyCount: 1,
  durationSec: 90
};

const spawns: SpawnPlan[] = [
  { entry: { text: "학교", pos: "명사" }, tier: "XS", isTarget: true },
  { entry: { text: "매우", pos: "부사" }, tier: "XS", isTarget: false }
];

describe("ResultScreen", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it("클리어하면 성공 문구를 보여준다", () => {
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().pickUp(0);
    render(<ResultScreen onRetry={() => {}} />);
    expect(screen.getByText(/성공/)).toBeTruthy();
  });

  it("시간이 다 되면 실패 문구를 보여준다", () => {
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().tick(999);
    render(<ResultScreen onRetry={() => {}} />);
    expect(screen.getByText(/시간/)).toBeTruthy();
  });

  it("별을 채운 개수만큼 보여준다", () => {
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().pickUp(0);
    render(<ResultScreen onRetry={() => {}} />);
    expect(screen.getByLabelText(/별 3개 중/)).toBeTruthy();
  });

  it("다시하기 버튼이 콜백을 부른다", () => {
    const onRetry = vi.fn();
    useGameStore.getState().startStage(stage, spawns);
    useGameStore.getState().pickUp(0);
    render(<ResultScreen onRetry={onRetry} />);
    screen.getByRole("button", { name: "다시하기" }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("playing 중에는 아무것도 그리지 않는다", () => {
    useGameStore.getState().startStage(stage, spawns);
    const { container } = render(<ResultScreen onRetry={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 6: 실패 확인**

Run: `npx vitest run src/ui/ResultScreen.test.tsx`
Expected: FAIL — `Failed to resolve import "./ResultScreen"`

- [ ] **Step 7: ResultScreen 구현**

`src/ui/ResultScreen.tsx`:

```tsx
"use client";

import { accuracy } from "@/game/scoring";
import { formatDiameter } from "@/game/units";
import { useGameStore } from "@/store/gameStore";

export function ResultScreen({ onRetry }: { onRetry: () => void }) {
  const phase = useGameStore((s) => s.phase);
  const stars = useGameStore((s) => s.stars);
  const score = useGameStore((s) => s.score);
  const diameterM = useGameStore((s) => s.diameterM);
  const collected = useGameStore((s) => s.collected);
  const stage = useGameStore((s) => s.stage);

  if (phase !== "cleared" && phase !== "failed") return null;

  const cleared = phase === "cleared";
  const acc = Math.round(accuracy(score) * 100);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 30,
        display: "grid",
        placeItems: "center",
        background: "rgba(4,8,20,0.82)"
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
        <h1 style={{ fontSize: 30, marginBottom: 8 }}>
          {cleared ? "성공!" : "시간이 다 됐어요"}
        </h1>

        <div
          aria-label={`별 3개 중 ${stars}개`}
          style={{ fontSize: 34, letterSpacing: 6, marginBottom: 16 }}
        >
          {"★".repeat(stars)}
          {"☆".repeat(3 - stars)}
        </div>

        <dl style={{ display: "grid", gap: 6, marginBottom: 20, fontSize: 16 }}>
          <div>
            「{stage?.targetPos}」 {collected} / {stage?.targetCount}
          </div>
          <div>지름 {formatDiameter(diameterM)}</div>
          <div>{score.points}점 · 정확도 {acc}%</div>
        </dl>

        <button
          type="button"
          onClick={onRetry}
          style={{
            fontSize: 18,
            fontWeight: 700,
            padding: "12px 28px",
            borderRadius: 12,
            border: "none",
            background: "#f4c542",
            color: "#111",
            cursor: "pointer"
          }}
        >
          다시하기
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: 통과 확인**

Run: `npx vitest run src/ui/ResultScreen.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 9: GameShell 작성**

`src/ui/GameShell.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { GameCanvas } from "@/three/GameCanvas";
import { VirtualStick } from "@/input/VirtualStick";
import { STAGES } from "@/game/stages";
import { parseWordBank, planSpawns, type WordBank } from "@/game/words";
import { useGameStore } from "@/store/gameStore";
import { Hud } from "./Hud";
import { ResultScreen } from "./ResultScreen";

export function GameShell() {
  const [bank, setBank] = useState<WordBank | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startStage = useGameStore((s) => s.startStage);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/words.json")
      .then((r) => r.json())
      .then((raw) => {
        if (cancelled) return;
        setBank(parseWordBank(raw));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "사전을 읽지 못했습니다");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const begin = useCallback(
    (loaded: WordBank) => {
      const stage = STAGES[0];
      const spawns = planSpawns(loaded, {
        targetPos: stage.targetPos,
        targetCount: stage.targetCount,
        decoyCount: stage.decoyCount,
        rng: Math.random
      });
      startStage(stage, spawns);
    },
    [startStage]
  );

  useEffect(() => {
    if (bank) begin(bank);
  }, [bank, begin]);

  if (error) {
    return <main style={{ padding: 24 }}>사전을 읽지 못했습니다: {error}</main>;
  }
  if (!bank) {
    return <main style={{ padding: 24 }}>준비 중…</main>;
  }

  return (
    <>
      <GameCanvas />
      <Hud />
      <VirtualStick />
      <ResultScreen onRetry={() => begin(bank)} />
    </>
  );
}
```

- [ ] **Step 10: 페이지 연결**

`src/app/page.tsx`를 교체한다.

```tsx
import dynamic from "next/dynamic";

// 3D 캔버스는 서버에서 렌더할 수 없다.
const GameShell = dynamic(() => import("@/ui/GameShell").then((m) => m.GameShell), {
  ssr: false
});

export default function Page() {
  return <GameShell />;
}
```

- [ ] **Step 11: 전체 테스트와 타입 검사**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 모든 테스트 PASS, 타입 오류 없음

- [ ] **Step 12: 커밋**

```bash
git add src/ui/ src/app/page.tsx
git commit -m "feat: HUD·결과 화면·게임 셸 조립"
```

---

### Task 10: Tripo GLB 파이프라인과 모델 교체

**Files:**
- Create: `scripts/optimize-glb.mjs`, `src/three/modelRegistry.ts`
- Modify: `src/three/WordObject.tsx` (원시 도형 → GLB), `assets/tripo/manifest.json`
- Test: `src/three/modelRegistry.test.ts`

**Interfaces:**
- Consumes: `ObjectTier` (Task 3)
- Produces:
  - `MODELS_BY_TIER: Record<ObjectTier, string[]>` — 티어별 모델 경로
  - `modelForIndex(tier: ObjectTier, index: number): string` — 결정적 배정
  - `<Body>`가 GLB를 로드하도록 교체

**Note:** Tripo 생성물은 이 계획 실행 시점에 `assets/tripo/raw/`에 있어야 한다. 파일이 없으면 이 태스크를 건너뛰고 P1 검증을 원시 도형으로 진행한다 — 재미 검증에 모델 품질은 필요하지 않다.

- [ ] **Step 1: 압축 스크립트 작성**

```bash
npm install -D @gltf-transform/cli
```

`scripts/optimize-glb.mjs`:

```javascript
// assets/tripo/raw/*.glb → public/models/*.glb (Draco 압축)
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

const RAW = "assets/tripo/raw";
const OUT = "public/models";

mkdirSync(OUT, { recursive: true });

const files = readdirSync(RAW).filter((f) => f.endsWith(".glb"));
if (files.length === 0) {
  console.log("raw GLB가 없습니다. Tripo에서 먼저 내려받으세요.");
  process.exit(0);
}

for (const file of files) {
  const src = path.join(RAW, file);
  const dst = path.join(OUT, file);
  console.log(`압축: ${file}`);
  execFileSync(
    "npx",
    ["gltf-transform", "optimize", src, dst, "--compress", "draco", "--texture-size", "512"],
    { stdio: "inherit" }
  );
}
console.log(`완료: ${files.length}개`);
```

`package.json`의 `scripts`에 추가한다.

```json
"assets:optimize": "node scripts/optimize-glb.mjs"
```

- [ ] **Step 2: modelRegistry 실패 테스트 작성**

`src/three/modelRegistry.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { MODELS_BY_TIER, modelForIndex } from "./modelRegistry";
import { OBJECT_TIERS } from "@/game/objectTiers";

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

  it("같은 티어와 순번이면 항상 같은 모델을 준다", () => {
    expect(modelForIndex("XS", 5)).toBe(modelForIndex("XS", 5));
  });

  it("순번이 목록보다 커도 순환한다", () => {
    const count = MODELS_BY_TIER.XS.length;
    expect(modelForIndex("XS", count)).toBe(modelForIndex("XS", 0));
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run src/three/modelRegistry.test.ts`
Expected: FAIL — `Failed to resolve import "./modelRegistry"`

- [ ] **Step 4: modelRegistry 구현**

`src/three/modelRegistry.ts`. 실제로 `public/models/`에 있는 파일만 적는다. Tripo 산출물 이름은 `assets/tripo/prompts.md`의 파일명 규칙을 따른다.

```typescript
import type { ObjectTier } from "@/game/objectTiers";

/**
 * 티어별로 쓸 사물 모델. Tripo에서 받은 무채색 GLB다.
 * 실제로 public/models/에 존재하는 파일만 적는다. 없는 파일을 적으면 런타임에 깨진다.
 */
export const MODELS_BY_TIER: Record<ObjectTier, string[]> = {
  XS: [
    "/models/xs_clip.glb",
    "/models/xs_pushpin.glb",
    "/models/xs_button.glb",
    "/models/xs_pebble.glb",
    "/models/xs_eraser_crumb.glb"
  ],
  S: [
    "/models/s_eraser.glb",
    "/models/s_pencil.glb",
    "/models/s_glue_stick.glb",
    "/models/s_marker.glb"
  ],
  M: ["/models/m_mug.glb"],
  L: ["/models/l_chair.glb"]
};

/** 스폰 순번에 모델을 결정적으로 배정한다. 같은 판을 다시 해도 같은 모습이다. */
export function modelForIndex(tier: ObjectTier, index: number): string {
  const list = MODELS_BY_TIER[tier];
  return list[index % list.length];
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/three/modelRegistry.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: raw GLB 압축 실행**

Run: `npm run assets:optimize`
Expected: `public/models/`에 GLB가 생성된다. raw가 비어 있으면 "raw GLB가 없습니다" 후 종료 — 그 경우 Step 7~9를 건너뛰고 Step 10으로 간다.

- [ ] **Step 7: WordObject의 Body를 GLB로 교체**

`src/three/WordObject.tsx`의 `Body` 컴포넌트를 다음으로 교체하고, 파일 상단 import에 `useGLTF`와 `modelForIndex`, `SkeletonUtils` 대신 `clone`을 추가한다.

```tsx
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Box3, Vector3 } from "three";
import { modelForIndex } from "./modelRegistry";

/**
 * Tripo 무채색 GLB를 티어 크기에 맞춰 정규화하고 품사색으로 틴트한다.
 * 원본 머티리얼 색을 무시하고 우리 색으로 덮으므로, 상급 난이도에서 회색 통일이 가능하다.
 */
function Body({
  size,
  color,
  tier,
  index
}: {
  size: number;
  color: string;
  tier: ObjectTier;
  index: number;
}) {
  const url = modelForIndex(tier, index);
  const { scene } = useGLTF(url);

  const { object, scale } = useMemo(() => {
    const object = scene.clone(true);
    const box = new Box3().setFromObject(object);
    const span = box.getSize(new Vector3());
    const longest = Math.max(span.x, span.y, span.z) || 1;
    // 원점을 바닥 중앙으로 맞춘다
    const center = box.getCenter(new Vector3());
    object.position.set(-center.x, -box.min.y, -center.z);
    return { object, scale: size / longest };
  }, [scene, size]);

  return (
    <group scale={scale}>
      <primitive object={object} />
      {/* 품사색은 오버레이 셸로 준다. 원본 지오메트리를 건드리지 않는다. */}
      <mesh scale={1.001}>
        <sphereGeometry args={[0, 1, 1]} />
        <meshStandardMaterial color={color} flatShading transparent opacity={0} />
      </mesh>
    </group>
  );
}
```

`WordObject`와 `AttachedWord`의 `<Body ... />` 호출에 `tier={spawn.tier}` `index={index}`(AttachedWord는 스폰 순번을 prop으로 받아 넘긴다)를 추가한다.

- [ ] **Step 8: 품사색 적용 방식 수정**

Step 7의 오버레이 셸은 실제로 색을 입히지 않는다. `useMemo` 안에서 머티리얼을 직접 덮어쓰는 방식으로 바꾼다. `object.traverse`로 모든 `Mesh`의 `material`을 새 `MeshStandardMaterial`로 교체한다.

```tsx
  const { object, scale } = useMemo(() => {
    const object = scene.clone(true);
    object.traverse((child) => {
      if ((child as Mesh).isMesh) {
        (child as Mesh).material = new MeshStandardMaterial({
          color,
          flatShading: true,
          roughness: 0.85
        });
        (child as Mesh).castShadow = true;
      }
    });
    const box = new Box3().setFromObject(object);
    const span = box.getSize(new Vector3());
    const longest = Math.max(span.x, span.y, span.z) || 1;
    const center = box.getCenter(new Vector3());
    object.position.set(-center.x, -box.min.y, -center.z);
    return { object, scale: size / longest };
  }, [scene, size, color]);
```

import에 `Mesh`, `MeshStandardMaterial`을 추가하고, Step 7의 오버레이 `<mesh>`는 삭제한다.

- [ ] **Step 9: 프리로드 추가**

`src/three/modelRegistry.ts` 끝에 추가한다.

```typescript
import { useGLTF } from "@react-three/drei";

/** 첫 부착에서 끊기지 않도록 모든 모델을 미리 받는다. */
export function preloadModels(): void {
  for (const list of Object.values(MODELS_BY_TIER)) {
    for (const url of list) useGLTF.preload(url);
  }
}
```

`src/ui/GameShell.tsx`의 `useEffect` 안에서 `preloadModels()`를 호출한다.

- [ ] **Step 10: manifest 기록**

`assets/tripo/manifest.json`의 `assets` 배열에 실제로 받은 파일을 기록한다. 각 항목은 다음 형태다.

```json
{
  "file": "xs_clip.glb",
  "prompt": "low-poly 3D model of a single paper clip, low-poly game asset, simple stylized geometry, flat matte light grey surface, completely colorless, no text, no logos, clean silhouette, single centered object",
  "model": "v3.0",
  "createdAt": "2026-08-01",
  "tier": "XS"
}
```

- [ ] **Step 11: 전체 검증과 커밋**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 테스트 PASS, 타입 오류 없음, 빌드 성공

```bash
git add scripts/ src/three/ src/ui/GameShell.tsx assets/tripo/manifest.json public/models/ package.json
git commit -m "feat: Tripo GLB 압축 파이프라인과 사물 모델 적용"
```

---

### Task 11: P1 재미 검증

**Files:**
- Create: `docs/superpowers/qa/2026-08-01-p1-playtest.md`

**Interfaces:**
- Consumes: 전체 앱
- Produces: 검증 결과 문서. P2 착수 여부와 파라미터 조율 값을 결정한다.

- [ ] **Step 1: 개발 서버 실행**

```bash
npm run dev
```

- [ ] **Step 2: PC 브라우저에서 확인**

`/browse` 스킬 또는 직접 `http://localhost:3000`을 열고 다음을 확인한다.

- [ ] 방향키와 WASD로 공이 굴러간다
- [ ] 작은 사물에 닿으면 붙고, 공보다 훨씬 큰 것은 튕긴다
- [ ] 붙은 사물이 공 표면에 튀어나온 채로 함께 회전한다 (매끈해지지 않는다)
- [ ] HUD의 지름이 `5cm` → `12cm 3mm`처럼 밀리미터까지 변한다
- [ ] 명사를 붙이면 수집이 오르고, 부사를 붙이면 부착밀이 표시된다
- [ ] 부착밀이 쌓이면 공이 눈에 띄게 느려진다
- [ ] 90초가 지나면 실패 화면, 20개를 모으면 성공 화면이 뜬다
- [ ] 다시하기가 새 스폰으로 다시 시작한다

- [ ] **Step 3: 태블릿/폰 실기기에서 확인**

같은 네트워크에서 `http://<PC IP>:3000`을 열어 확인한다.

- [ ] 화면 아무 곳을 눌러도 그 지점에 스틱이 잡힌다
- [ ] 한 손 엄지로 공을 원하는 방향으로 굴릴 수 있다
- [ ] 이름표의 한글이 읽힌다 (붙은 뒤에도)
- [ ] 프레임이 눈에 띄게 끊기지 않는다

- [ ] **Step 4: 성능 측정**

브라우저 개발자 도구에서 실측한다.

- [ ] 필드 60개 상태에서 프레임 (목표 60fps, 최소 30fps)
- [ ] 30개를 붙인 뒤의 프레임 (부착 후 바디 제거가 효과가 있는지)
- [ ] 리지드바디 수가 늘어나지 않는지 (Rapier debug 켜서 확인)

- [ ] **Step 5: 결과 기록**

`docs/superpowers/qa/2026-08-01-p1-playtest.md`에 다음 형식으로 기록한다.

```markdown
# P1 플레이테스트 결과

일시:
기기: (PC / 태블릿 모델명 / 폰 모델명)

## 재미 판정

굴리는 것이 재미있는가: (예 / 아니오 / 조건부)
근거:

## 체크리스트 결과

(Step 2~4의 항목별 통과/실패와 관찰)

## 성능

- 필드 60개: __fps
- 30개 부착 후: __fps
- 리지드바디 수 변화:

## 조율이 필요한 값

- GROWTH_K (현재 0.6):
- TORQUE_BASE (현재 0.9):
- 카메라 감쇠 (현재 delta*3):
- 스테이지 목표 20개가 90초에 적정한가:

## P2 착수 판단

(착수 / 파라미터 조율 후 재검증 / 조작계 재검토)
```

- [ ] **Step 6: 커밋**

```bash
git add docs/superpowers/qa/
git commit -m "docs: P1 플레이테스트 결과"
```

---

## Self-Review

**1. 스펙 커버리지 (P1 범위)**

| 스펙 항목 | 태스크 |
|---|---|
| §2 품사 팔레트 이식 | Task 1 |
| §3.2 `game/` 순수 TS 격리 | Task 1~4 (Global Constraints로 강제) |
| §3.3 성능 규칙 3개 | Task 8 (useFrame ref, 부착 시 바디 제거), Task 9 (선택적 구독) |
| §3.4 입력 추상화 | Task 5 |
| §4.1 클리어 조건 = 단어 수 | Task 4 `isCleared`, Task 6 |
| §4.2 성장 (5cm, 1.1배, k=0.6) | Task 2 |
| §4.3 부착밀 속도 패널티 | Task 2 `speedMultiplier`, Task 8 적용 |
| §4.5 90초 시간 압박 | Task 6 `tick`, Task 9 HUD 20초 경고색 |
| §4.6 점수·콤보·별 | Task 4 |
| §4.8-1 단일 품사 모드 | Task 4 `singlePos` |
| §6.2 코드에서 품사색 틴트 | Task 10 Step 8 (머티리얼 덮어쓰기) |
| §6.3 크기 티어 | Task 3 `objectTiers` |
| §6.4 이름표 태그 + LRU 캐시 | Task 7, Task 8 `LabelTag` |
| §6.6 밀리미터 지름 표시 | Task 2 `formatDiameter` |
| §6.6 부착 시 튀어나온 채 회전 | Task 8 `AttachedWord` (반경 0.85배) |
| §6.9 Tripo 압축 파이프라인 | Task 10 |
| §7.1 flat words.json + 동형이의어 배제 | Task 3 |
| §7.2 어휘 큐레이션 (기본형, 이다 제외) | Task 3 Step 6 |
| §10.1 Vitest 커버리지 | Task 1~7 전부 TDD |
| §11 P1 범위 | Task 11 검증 |

P1 범위 밖(정화 지대, 대왕, 오답노트, localStorage, 난이도 3단, 나머지 모드, 보스판)은 Global Constraints에 명시했고 P2 이후 계획서에서 다룬다.

**2. 플레이스홀더 점검** — "TBD", "적절히", "필요에 따라" 없음. 모든 코드 스텝에 실제 코드가 있다. Task 10은 GLB 부재 시 건너뛰는 조건을 명시했다.

**3. 타입 일관성 확인**

- `KoreanPos`: Task 1 정의 → Task 3, 4, 6에서 동일하게 사용
- `WordEntry`: Task 3 정의 → Task 4 `judgePickup`, Task 6에서 동일
- `SpawnPlan`: Task 3 정의 (`entry`, `tier`, `isTarget`) → Task 6, 8에서 동일
- `ObjectTier`: Task 3 정의 → Task 8, 10에서 동일
- `InputVector` / `InputRef`: Task 5 정의 → Task 8 `Katamari` prop
- `ScoreState`: Task 4 정의 → Task 6 스토어 필드
- `StageDef`: Task 4 정의 → Task 6, 9에서 동일
- `attachDirs`: Task 8 Step 1에서 스토어에 추가 → Task 8 Step 5에서 소비
- `speedMultiplier`: Task 2 정의 → Task 8 `Katamari`에서 소비
- `formatDiameter`: Task 2 정의 → Task 9 Hud, ResultScreen에서 소비
- `getLabelTexture`: Task 7 정의 → Task 8 `LabelTag`에서 소비
- `modelForIndex`: Task 10 정의 → 같은 태스크 `Body`에서 소비

한 가지 수정: Task 8의 `AttachedWord`는 Task 10에서 `index`가 필요해진다. Task 10 Step 7에 "AttachedWord는 스폰 순번을 prop으로 받아 넘긴다"를 명시했고, `Katamari`가 `attachedIds.map((id) => ...)`에서 이미 `id`를 갖고 있으므로 `index={id}`로 넘기면 된다.
