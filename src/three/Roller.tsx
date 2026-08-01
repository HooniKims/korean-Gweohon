"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { type Group, type Object3D } from "three";
import { useGameStore } from "@/store/gameStore";
import { ballMotion, ballPosition, cameraState, rollerDebug } from "./ballTracker";
import { measureModel } from "./measureModel";
import { ROLLER_MODEL } from "./modelRegistry";

/** 캐릭터 키를 공 지름의 몇 배로 둘지. 괴혼의 왕자도 공보다 조금 크게 시작한다. */
const HEIGHT_RATIO = 1.3;
/** 캐릭터가 아무리 작아지거나 커져도 이 범위를 벗어나지 않는다(미터). */
const MIN_HEIGHT = 0.06;
const MAX_HEIGHT = 0.5;
/** 모델을 미리 이 키로 정규화해 둔다(미터). 그룹 스케일은 이 값 기준 배수다. */
const BASE_HEIGHT = 0.08;
/**
 * 모델 자체가 바라보는 방향 보정(라디안).
 *
 * 이 모델은 정면이 +X다. 보정하지 않으면 옆통수나 등으로 공을 미는 그림이 된다.
 * 화면을 보고 맞춘 값이다.
 */
const MODEL_FACING_OFFSET = -Math.PI / 2;
/** 밀 때 앞으로 기울이는 각(라디안) */
const PUSH_LEAN = 0.32;
/** 걷는 흔들림 */
const BOB_SPEED = 14;
const BOB_AMOUNT = 0.09;

/**
 * 공을 미는 캐릭터.
 *
 * 물리 바디가 아니다. 공에 붙여 두면 함께 굴러 넘어가므로, 매 프레임 공 뒤쪽
 * 지면에 세워 놓는다. 공이 커질수록 캐릭터도 조금 커지지만 비율보다 완만하게
 * 키워서, 나중에 캐릭터가 화면을 가리지 않게 한다.
 */
export function Roller() {
  const group = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const { scene } = useGLTF(ROLLER_MODEL);
  const phase = useRef(0);
  const facing = useRef(0);
  const shown = useRef(0);

  const { object, baseSize } = useMemo(() => {
    const model: Object3D = scene.clone(true);
    const bounds = measureModel(model, ROLLER_MODEL);
    // 발이 원점에 오도록 내린다
    model.position.set(-bounds.center.x, -bounds.min.y, -bounds.center.z);
    rollerDebug.baseSize = bounds.longest;
    return { object: model, baseSize: bounds.longest };
  }, [scene]);

  // 스케일을 JSX로 선언한다. useFrame으로만 주면 첫 프레임이 스케일 1로 그려져
  // 캐릭터가 화면을 덮고, 모델 안쪽에 구워 넣으면 R3F가 primitive를 다시 붙일 때
  // 1로 되돌린다. 선언해 두면 두 경우 모두 막힌다.
  const initialScale = BASE_HEIGHT / baseSize;

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;

    const d = useGameStore.getState().diameterM;
    const radius = d / 2;

    // 지름에 비례하되 세제곱근으로 완만하게. 공이 8배 커져도 캐릭터는 2배만 커진다.
    const height = Math.min(
      MAX_HEIGHT,
      Math.max(MIN_HEIGHT, d * HEIGHT_RATIO * Math.cbrt(0.05 / Math.max(d, 0.001)))
    );
    const scale = height / baseSize;
    g.scale.setScalar(scale);
    rollerDebug.height = height;
    rollerDebug.scale = scale;

    // 굴러가는 방향의 반대편에 선다. 멈춰 있으면 카메라 뒤쪽을 기본으로 삼는다.
    const moving = ballMotion.speed > 0.08;
    if (moving) {
      const len = Math.hypot(ballMotion.dirX, ballMotion.dirZ) || 1;
      facing.current = Math.atan2(ballMotion.dirX / len, ballMotion.dirZ / len);
    } else {
      facing.current = cameraState.yaw + Math.PI;
    }
    // 각도를 부드럽게 따라간다. 확 돌면 캐릭터가 순간이동한 것처럼 보인다.
    const diff = Math.atan2(
      Math.sin(facing.current - shown.current),
      Math.cos(facing.current - shown.current)
    );
    shown.current += diff * (1 - Math.exp(-12 * delta));

    const back = radius + height * 0.3;
    g.position.set(
      ballPosition.x - Math.sin(shown.current) * back,
      0,
      ballPosition.z - Math.cos(shown.current) * back
    );
    // 공을 바라본다
    g.rotation.y = shown.current + MODEL_FACING_OFFSET;
    rollerDebug.x = g.position.x;
    rollerDebug.y = g.position.y;
    rollerDebug.z = g.position.z;

    // 굴릴 때는 앞으로 기울여 미는 자세를 만들고 통통 튄다.
    // 리깅된 애니메이션이 없어도 기울임과 흔들림만으로 미는 느낌이 난다.
    if (inner.current) {
      if (moving) {
        phase.current += delta * BOB_SPEED;
        inner.current.position.y = Math.abs(Math.sin(phase.current)) * height * BOB_AMOUNT;
        inner.current.rotation.x = PUSH_LEAN;
        inner.current.rotation.z = Math.sin(phase.current * 0.5) * 0.06;
      } else {
        phase.current = 0;
        inner.current.position.y = 0;
        inner.current.rotation.x *= 0.85;
        inner.current.rotation.z = 0;
      }
    }
  });

  return (
    <group ref={group} scale={initialScale}>
      <group ref={inner}>
        <primitive object={object} />
      </group>
    </group>
  );
}
