/**
 * 카메라 자동 추종 계산.
 *
 * 굴러가는 방향 뒤로 카메라가 따라 돌아야 좌우로 굴려도 공이 화면 밖으로 안 나간다.
 * 그런데 입력도 카메라 기준이라, 계속 돌리면 「목표 방향」 입력이 매 프레임 회전해
 * 공이 목표 주변을 맴돌고 영원히 못 붙는다. 실측에서 0.5m 궤도에 갇혔다.
 *
 * 그래서 두 가지로 막는다. 크게 어긋났을 때만 되돌리고(데드존), 목표에 다가가는
 * 동안에는 아예 멈춘다(조준). 실측에서 목표 하나에 붙는 사이 카메라가 2.2회전
 * 했는데, 화면이 그렇게 돌면 사람은 조준을 할 수 없다.
 */

/** 이 속도 아래면 추종하지 않는다. 멈춰 있을 때 흔들리지 않게. */
export const FOLLOW_MIN_SPEED = 0.12;
/**
 * 이 각도(라디안) 안쪽으로 어긋난 것은 무시한다.
 *
 * 조준할 때는 늘 조금씩 어긋난다. 그것까지 따라 돌면 화면이 계속 회전해서
 * 목표를 맞출 수 없다. 약 50도.
 */
export const FOLLOW_DEADZONE = 0.9;
/** 되돌리는 속도. 데드존을 넘은 만큼만 줄인다. */
export const FOLLOW_RATE = 2.2;

/** −π..π 로 정규화한 각도 차 */
export function angleDelta(to: number, from: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/**
 * 이번 프레임에 yaw를 얼마나 움직일지 낸다.
 *
 * @param currentYaw 지금 카메라 방향각
 * @param dirX 공의 수평 진행 방향 x
 * @param dirZ 공의 수평 진행 방향 z
 * @param speed 공의 수평 속도(m/s)
 * @param deltaSec 프레임 시간
 * @param aiming 목표에 다가가는 중이면 true. 화면을 고정한다.
 * @returns yaw에 더할 값. 추종하지 않을 때는 0.
 */
export function followYawStep(
  currentYaw: number,
  dirX: number,
  dirZ: number,
  speed: number,
  deltaSec: number,
  /** 목표에 다가가는 중인가. true면 화면을 고정해 조준을 돕는다. */
  aiming = false
): number {
  if (aiming) return 0;
  if (speed <= FOLLOW_MIN_SPEED) return 0;

  const len = Math.hypot(dirX, dirZ);
  if (len < 1e-6) return 0;

  // 진행 방향의 반대편이 카메라 자리다
  const desired = Math.atan2(-dirX / len, -dirZ / len);
  const diff = angleDelta(desired, currentYaw);

  // 데드존 안이면 가만히 둔다
  const over = Math.abs(diff) - FOLLOW_DEADZONE;
  if (over <= 0) return 0;

  const sign = diff > 0 ? 1 : -1;
  const t = 1 - Math.exp(-FOLLOW_RATE * deltaSec);
  return sign * over * t;
}
