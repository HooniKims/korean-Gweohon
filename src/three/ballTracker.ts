/**
 * 공의 현재 월드 위치와 속도. Katamari가 매 프레임 쓰고 ChaseCamera·DebugOverlay가 읽는다.
 *
 * 스토어에 두면 프레임마다 리렌더가 일어나므로 모듈 스코프 가변 객체를 쓴다.
 * 공은 한 판에 하나뿐이라 전역으로 둬도 충돌하지 않는다.
 */
export const ballPosition = { x: 0, y: 0, z: 0 };

/** 조작 감각을 수치로 확인하기 위한 계측값. 플레이테스트에서 파라미터를 조율할 때 쓴다. */
export const ballMotion = {
  /** 수평 속도 (m/s) */
  speed: 0,
  /** 각속도 크기 (rad/s) */
  angularSpeed: 0,
  /** 초당 프레임 수 */
  fps: 0
};

export function resetBallTracker(): void {
  ballPosition.x = 0;
  ballPosition.y = 0;
  ballPosition.z = 0;
  ballMotion.speed = 0;
  ballMotion.angularSpeed = 0;
}
