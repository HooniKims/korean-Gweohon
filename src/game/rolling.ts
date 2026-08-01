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
