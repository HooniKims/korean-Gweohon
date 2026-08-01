"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";
import { useGameStore } from "@/store/gameStore";
import { ballPosition } from "./ballTracker";

/**
 * 낮은 각도에서 공 뒤를 쫓는다. 공이 커지면 거리와 높이가 함께 늘어난다.
 *
 * 카메라를 회전시키지 않는 것이 중요하다. 각도가 고정이면 「화면 위로 밀면
 * 앞으로」가 항상 성립해서, 조작을 처음 잡는 학생이 헷갈리지 않는다.
 */
export function ChaseCamera() {
  const { camera } = useThree();
  const desired = useRef(new Vector3());
  const target = useRef(new Vector3());

  useFrame((_, delta) => {
    const d = useGameStore.getState().diameterM;
    const dist = 1.1 + d * 5;
    const height = 0.6 + d * 2.2;

    desired.current.set(ballPosition.x, ballPosition.y + height, ballPosition.z + dist);

    // 감쇠를 걸어 부드럽게 따라간다. delta에 비례해 프레임률과 무관하게 만든다.
    const t = 1 - Math.exp(-6 * delta);
    camera.position.lerp(desired.current, t);

    target.current.set(ballPosition.x, ballPosition.y, ballPosition.z);
    camera.lookAt(target.current);
  });

  return null;
}
