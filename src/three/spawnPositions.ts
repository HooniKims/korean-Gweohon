import type { SpawnPoint } from "@/game/layout";

/**
 * 사물의 실시간 위치.
 *
 * 부착 판정이 placeSpawns의 최초 좌표를 쓰면 안 된다. 사물은 물리 바디라 공에
 * 밀려 움직이는데, 한 번 밀리고 나면 눈에 보이는 자리와 판정 좌표가 어긋나
 * 화면에서 사물을 정확히 밀고 있는데도 영원히 안 붙는다.
 *
 * WordObject가 매 프레임 실제 위치를 여기에 쓰고 Katamari가 읽는다. 스토어에 두면
 * 프레임마다 리렌더가 일어나므로 모듈 스코프 배열을 쓴다.
 */
const live: (SpawnPoint | null)[] = [];

export function setLivePosition(index: number, x: number, z: number): void {
  const at = live[index];
  if (at) {
    at.x = x;
    at.z = z;
  } else {
    live[index] = { x, z };
  }
}

/** 실제 위치. 아직 보고된 적이 없으면 최초 좌표를 그대로 쓴다. */
export function livePosition(index: number, fallback: SpawnPoint): SpawnPoint {
  return live[index] ?? fallback;
}

/** 새 판을 시작할 때 비운다. 이전 판의 위치가 남으면 판정이 어긋난다. */
export function clearLivePositions(): void {
  live.length = 0;
}
