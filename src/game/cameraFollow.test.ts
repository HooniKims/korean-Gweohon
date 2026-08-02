import { describe, expect, it } from "vitest";
import {
  FOLLOW_DEADZONE,
  FOLLOW_MIN_SPEED,
  angleDelta,
  followYawStep
} from "./cameraFollow";

const frame = 1 / 60;

describe("angleDelta", () => {
  it("같은 각이면 0이다", () => {
    expect(angleDelta(1.2, 1.2)).toBeCloseTo(0, 10);
  });

  it("경계를 넘어도 짧은 쪽으로 돈다", () => {
    // 3.0 → -3.0 은 6 라디안이 아니라 약 0.28 라디안이다
    expect(Math.abs(angleDelta(-3.0, 3.0))).toBeLessThan(0.6);
  });
});

describe("followYawStep", () => {
  it("멈춰 있으면 돌지 않는다", () => {
    expect(followYawStep(0, 1, 0, 0, frame)).toBe(0);
    expect(followYawStep(0, 1, 0, FOLLOW_MIN_SPEED, frame)).toBe(0);
  });

  it("방향이 없으면 돌지 않는다", () => {
    expect(followYawStep(0, 0, 0, 1, frame)).toBe(0);
  });

  it("데드존 안쪽 어긋남은 무시한다", () => {
    // 조준 중에 늘 생기는 작은 어긋남까지 따라 돌면 목표를 맞출 수 없다.
    // 실측에서 공이 목표 주변 0.5m 궤도에 갇혔던 원인이다.
    const yaw = 0;
    const small = FOLLOW_DEADZONE * 0.8;
    // yaw=0 이면 카메라가 +Z, 진행 방향은 -Z. 여기서 살짝 틀어 본다.
    const dirX = Math.sin(small);
    const dirZ = -Math.cos(small);
    expect(followYawStep(yaw, dirX, dirZ, 1, frame)).toBe(0);
  });

  it("데드존을 넘으면 되돌린다", () => {
    const yaw = 0;
    const big = FOLLOW_DEADZONE + 0.5;
    const dirX = Math.sin(big);
    const dirZ = -Math.cos(big);
    const step = followYawStep(yaw, dirX, dirZ, 1, frame);
    expect(Math.abs(step)).toBeGreaterThan(0);
  });

  it("되돌리는 방향이 맞다", () => {
    // 오른쪽으로 크게 틀었으면 yaw도 그쪽으로 가야 한다
    const big = FOLLOW_DEADZONE + 0.8;
    const stepRight = followYawStep(0, Math.sin(big), -Math.cos(big), 1, frame);
    const stepLeft = followYawStep(0, Math.sin(-big), -Math.cos(-big), 1, frame);
    expect(Math.sign(stepRight)).toBe(-Math.sign(stepLeft));
  });

  it("반복하면 데드존 경계까지만 좁혀지고 멈춘다", () => {
    // 완전히 정렬시키면 계속 미세 회전이 남아 조준을 방해한다
    let yaw = 0;
    const dirX = 1;
    const dirZ = 0; // +X 진행 → 카메라는 -X 쪽(yaw = -π/2)에 있어야 한다
    for (let i = 0; i < 600; i += 1) {
      yaw += followYawStep(yaw, dirX, dirZ, 1, frame);
    }
    const desired = Math.atan2(-1, 0);
    const gap = Math.abs(angleDelta(desired, yaw));
    expect(gap).toBeLessThanOrEqual(FOLLOW_DEADZONE + 0.05);
    expect(gap).toBeGreaterThan(FOLLOW_DEADZONE - 0.15);
  });

  it("한 프레임에 과하게 돌지 않는다", () => {
    // 확 돌면 멀미가 난다
    const big = Math.PI;
    const step = followYawStep(0, Math.sin(big), -Math.cos(big), 1, frame);
    expect(Math.abs(step)).toBeLessThan(0.12);
  });
});

describe("조준 중 화면 고정", () => {
  it("조준 중이면 어긋남이 커도 돌지 않는다", () => {
    // 목표에 붙는 사이 카메라가 2.2회전 하면 사람은 조준을 할 수 없다
    const big = Math.PI * 0.9;
    const withoutAim = followYawStep(0, Math.sin(big), -Math.cos(big), 1, frame, false);
    const withAim = followYawStep(0, Math.sin(big), -Math.cos(big), 1, frame, true);
    expect(Math.abs(withoutAim)).toBeGreaterThan(0);
    expect(withAim).toBe(0);
  });

  it("조준이 끝나면 다시 따라온다", () => {
    const big = Math.PI * 0.9;
    expect(followYawStep(0, Math.sin(big), -Math.cos(big), 1, frame, true)).toBe(0);
    expect(
      Math.abs(followYawStep(0, Math.sin(big), -Math.cos(big), 1, frame, false))
    ).toBeGreaterThan(0);
  });

  it("기본값은 조준 아님이다", () => {
    const big = Math.PI * 0.9;
    const omitted = followYawStep(0, Math.sin(big), -Math.cos(big), 1, frame);
    const explicit = followYawStep(0, Math.sin(big), -Math.cos(big), 1, frame, false);
    expect(omitted).toBeCloseTo(explicit, 12);
  });
});
