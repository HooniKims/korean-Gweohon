"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";
import type { NumberRef } from "@/input/useInput";
import { followYawStep } from "@/game/cameraFollow";
import { useGameStore } from "@/store/gameStore";
import { ballMotion, ballPosition, cameraState } from "./ballTracker";

/** 시선이 공보다 살짝 위를 향하게 해서 앞쪽 지면이 더 보이게 한다. */
const LOOK_AHEAD_UP = 0.35;
/** 손으로 시점을 만진 뒤 이 시간 동안은 자동 추종을 쉰다(초). */
const MANUAL_HOLD_SEC = 1.6;

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
  const pitch = useRef(0.38);
  const zoom = useRef(1);
  const lastManualYaw = useRef(0);
  const manualHold = useRef(0);

  useFrame((_, delta) => {
    // 굴러가는 방향으로 카메라를 돌린다. 크게 어긋났을 때만 되돌리므로
    // 조준 중에는 화면이 가만히 있다(game/cameraFollow).
    //
    // 손으로 시점을 만지면 잠시 멈춘다. 안 그러면 학생이 옆을 보려고 돌려놔도
    // 카메라가 곧바로 제자리로 끌려가 조작이 싸운다.
    if (yawTarget.current !== lastManualYaw.current) {
      manualHold.current = MANUAL_HOLD_SEC;
      lastManualYaw.current = yawTarget.current;
    } else if (manualHold.current > 0) {
      manualHold.current -= delta;
    }

    if (manualHold.current <= 0) {
      const step = followYawStep(
        yawTarget.current,
        ballMotion.dirX,
        ballMotion.dirZ,
        ballMotion.speed,
        delta,
        ballMotion.aiming
      );
      if (step !== 0) {
        yawTarget.current += step;
        lastManualYaw.current = yawTarget.current;
      }
    }

    // 조작을 감쇠해서 따라가되 지연이 느껴지지 않을 만큼 빠르게 한다.
    // 시점은 손끝을 바로 따라와야 하고, 위치 추종(아래 follow)만 부드러우면 된다.
    const t = 1 - Math.exp(-22 * delta);
    cameraState.yaw += (yawTarget.current - cameraState.yaw) * t;
    pitch.current += (pitchTarget.current - pitch.current) * t;
    zoom.current += (zoomTarget.current - zoom.current) * t;
    cameraState.pitch = pitch.current;
    cameraState.zoom = zoom.current;

    // 공 지름에 비례하되 상수항을 둔다. 상수항이 없으면 5cm 공에 카메라가 바짝
    // 붙어 필드가 비어 보이고, 상수항만 크면 공이 점이 된다.
    const d = useGameStore.getState().diameterM;
    // 상수항이 크면 작은 공이 화면에서 점이 된다. 맵을 넓혔다고 카메라를 뒤로
    // 빼면 공과 캐릭터가 같이 작아진다 — 맵은 축소 버튼으로 살펴보게 하고
    // 기본 시점은 공에 붙인다.
    const range = (0.42 + d * 4.5) * zoom.current;

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
