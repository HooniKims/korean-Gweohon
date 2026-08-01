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

  it("0은 0mm로 보여준다", () => {
    expect(formatDiameter(0)).toBe("0mm");
  });
});
