"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";
import type { NumberRef } from "@/input/useInput";
import { useGameStore } from "@/store/gameStore";
import { ballPosition, cameraState } from "./ballTracker";

/** 시선이 공보다 살짝 위를 향하게 해서 앞쪽 지면이 더 보이게 한다. */
const LOOK_AHEAD_UP = 0.35;

/**
 * 공 뒤를 쫓는 카메라.
 *
 * 좌우 드래그로 사방을 돌아보고, 위아래 드래그로 시선 높이를 바꾸고,
 * 핀치·휠로 확대·축소한다. 회전각은 cameraState에 남겨 Katamari가 입력을 같은
 * 각도로 돌린다 — 그래야 카메라가 어디를 보든 「화면 위로 밀면 앞으로」가 성립한다.
 */
export function ChaseCamera({
  yawTarget,
  pitchTarget,
  zoomTarget
}: {
  yawTarget: NumberRef;
  pitchTarget: NumberRef;
  zoomTarget: NumberRef;
}) {
  const { camera } = useThree();
  const desired = useRef(new Vector3());
  const target = useRef(new Vector3());
  const pitch = useRef(0.55);
  const zoom = useRef(1);

  useFrame((_, delta) => {
    // 조작을 감쇠해서 따라간다. 즉시 반영하면 손 떨림이 그대로 화면에 나온다.
    const t = 1 - Math.exp(-10 * delta);
    cameraState.yaw += (yawTarget.current - cameraState.yaw) * t;
    pitch.current += (pitchTarget.current - pitch.current) * t;
    zoom.current += (zoomTarget.current - zoom.current) * t;
    cameraState.pitch = pitch.current;
    cameraState.zoom = zoom.current;

    // 공 지름에 비례하되 상수항을 둔다. 상수항이 없으면 5cm 공에 카메라가 바짝
    // 붙어 필드가 비어 보이고, 상수항만 크면 공이 점이 된다.
    const d = useGameStore.getState().diameterM;
    const range = (0.55 + d * 5) * zoom.current;

    const cosPitch = Math.cos(pitch.current);
    const sinPitch = Math.sin(pitch.current);
    const sinYaw = Math.sin(cameraState.yaw);
    const cosYaw = Math.cos(cameraState.yaw);

    desired.current.set(
      ballPosition.x + sinYaw * range * cosPitch,
      ballPosition.y + range * sinPitch + d * 0.5,
      ballPosition.z + cosYaw * range * cosPitch
    );

    const follow = 1 - Math.exp(-8 * delta);
    camera.position.lerp(desired.current, follow);

    target.current.set(
      ballPosition.x,
      ballPosition.y + d * LOOK_AHEAD_UP,
      ballPosition.z
    );
    camera.lookAt(target.current);
  });

  return null;
}
