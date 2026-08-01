/**
 * 끼임 감지.
 *
 * 필드가 좁고 사물이 많아서 공보다 큰 사물에 끼여 못 나오는 일이 생긴다. 큰 사물은
 * 못 먹으므로(괴혼 규칙) 학생은 그 자리에서 판을 끝낼 수밖에 없다.
 *
 * 조작을 하고 있는데 실제로 움직이지 않는 상태가 이어지면 끼인 것으로 본다.
 * 조작을 하지 않고 서 있는 것과는 구분해야 한다.
 */

/** 이 속도 아래면 사실상 멈춘 것으로 본다(m/s). */
export const STUCK_SPEED = 0.06;
/** 이 시간 동안 밀고 있는데도 안 움직이면 끼인 것으로 본다(초). */
export const STUCK_SEC = 0.9;

export type StuckState = {
  /** 밀고 있는데도 안 움직인 시간 */
  heldSec: number;
  /** 이번 프레임에 탈출을 밀어줘야 하는가 */
  escape: boolean;
};

export function createStuckState(): StuckState {
  return { heldSec: 0, escape: false };
}

/**
 * 끼임 상태를 갱신한다.
 *
 * `escape`가 true인 프레임에만 탈출 임펄스를 준다. 계속 true면 공이 통제 불능으로
 * 튀므로, 탈출을 준 다음에는 타이머를 되감아 잠시 쉰다.
 */
export function updateStuck(
  state: StuckState,
  input: { pushing: boolean; speed: number; deltaSec: number }
): StuckState {
  const { pushing, speed, deltaSec } = input;

  if (!pushing || speed > STUCK_SPEED) {
    return { heldSec: 0, escape: false };
  }

  const heldSec = state.heldSec + deltaSec;
  if (heldSec >= STUCK_SEC) {
    return { heldSec: 0, escape: true };
  }
  return { heldSec, escape: false };
}
