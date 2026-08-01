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
  fps: 0,
  /** 최근 2초 동안 가장 느렸던 프레임(ms). 끊김은 평균이 아니라 여기서 보인다. */
  worstMs: 0,
  /** 최근 2초 동안 33ms를 넘긴 프레임 수 */
  hitches: 0,
  /** 수평 진행 방향(정규화 전). 캐릭터가 뒤에 서는 데 쓴다. */
  dirX: 0,
  dirZ: 0
};

/**
 * 카메라가 공에서 떨어져 있는 방향각(라디안). ChaseCamera가 쓰고 Katamari가 읽는다.
 *
 * 카메라가 진행 방향을 따라 돌기 때문에, 입력을 이 각도만큼 돌려야 조작이 어긋나지
 * 않는다. yaw=0이면 카메라가 +Z에 있고 화면 위가 -Z를 향한다.
 */
export const cameraState = { yaw: 0 };

/** 캐릭터 크기 진단용. 스케일이 폭주하면 여기서 보인다. */
export const rollerDebug = { baseSize: 0, height: 0, scale: 0, x: 0, y: 0, z: 0 };

/** 코어(공) 크기 진단용. */
export const coreDebug = { baseSize: 0, scale: 0 };

export function resetBallTracker(): void {
  ballPosition.x = 0;
  ballPosition.y = 0;
  ballPosition.z = 0;
  ballMotion.speed = 0;
  ballMotion.angularSpeed = 0;
}
