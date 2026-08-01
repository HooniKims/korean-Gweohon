import type { InputVector } from "@/input/inputVector";

export type Torque = { x: number; y: number; z: number };

/**
 * 입력 벡터를 공에 줄 토크로 바꾼다.
 *
 * 부호 유도 — 미끄러짐 없는 구름에서 접점 속도는 0이므로
 *   v_center = −(ω × r_contact),  r_contact = (0, −r, 0)
 * ω = (ω_x, 0, 0) 이면 v_center = (0, 0, ω_x·r)
 * ω = (0, 0, ω_z) 이면 v_center = (−ω_z·r, 0, 0)
 *
 * 화면 위(v.y = −1)로 밀면 카메라 반대편(−Z)으로 가야 하므로 ω_x < 0 → torque.x = v.y
 * 화면 오른쪽(v.x = +1)으로 밀면 +X로 가야 하므로 ω_z < 0 → torque.z = −v.x
 *
 * 마이너스를 빼먹으면 조작이 통째로 반대가 된다. 테스트로 고정해 둔다.
 */
export function torqueForInput(input: InputVector, strength: number): Torque {
  return { x: input.y * strength, y: 0, z: -input.x * strength };
}

/**
 * 화면 기준 입력을 카메라가 바라보는 방향 기준으로 돌린다.
 *
 * 카메라가 공 뒤를 따라 회전하므로, 돌리지 않으면 카메라가 돈 만큼 조작이
 * 어긋난다. 이 변환을 거치면 카메라가 어느 방향을 보든 「화면 위로 밀면 앞으로」가
 * 항상 성립한다. 조작을 처음 잡는 학생에게 이게 제일 중요하다.
 *
 * yaw는 카메라가 공에서 떨어져 있는 방향각이다. yaw=0이면 카메라가 +Z에 있고
 * 화면 위가 -Z를 향한다(회전 없던 시절과 같다).
 */
export function rotateInput(input: InputVector, yaw: number): InputVector {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return {
    x: input.x * c + input.y * s,
    y: -input.x * s + input.y * c
  };
}
