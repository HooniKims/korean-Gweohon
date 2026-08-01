/**
 * 공의 현재 월드 위치. Katamari가 매 프레임 쓰고 ChaseCamera가 읽는다.
 *
 * 스토어에 두면 프레임마다 리렌더가 일어나므로 모듈 스코프 가변 객체를 쓴다.
 * 공은 한 판에 하나뿐이라 전역으로 둬도 충돌하지 않는다.
 */
export const ballPosition = { x: 0, y: 0, z: 0 };

export function resetBallPosition(): void {
  ballPosition.x = 0;
  ballPosition.y = 0;
  ballPosition.z = 0;
}
