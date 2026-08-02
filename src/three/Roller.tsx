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
const HEIGHT_RATIO = 1.55;
/**
 * 공 중심선에서 옆으로 비키는 거리. (공 반지름 + 캐릭터 반두께)의 배수다.
 *
 * 정확히 뒤에 세우면 카메라와 공 사이를 막아 공이 안 보인다. 카메라를 올려
 * 머리 위로 넘겨다보려면 60도 이상 내려봐야 해서 그 방법은 쓸 수 없다.
 *
 * 그래서 옆으로 비키되, 캐릭터가 공보다 클 때만 많이 비킨다(MAX). 공이 자라
 * 키에 가까워지면 정면 뒤로 돌아온다(MIN).
 */
const SIDE_SHIFT_MAX = 1.05;
const SIDE_SHIFT_MIN = 0.18;
/**
 * 캐릭터의 앞뒤 두께를 키의 몇 배로 볼지.
 *
 * 이 모델은 왕관과 망토 때문에 키가 폭보다 크다. 각도로 비키게 하면 공이
 * 커질수록 뒤로 물러나는 거리가 같이 커져서, 20cm 공에서는 12cm 떨어진 채
 * 나란히 걷는 그림이 됐다. 두께를 기준으로 잡아야 어느 크기에서도 공에 닿는다.
 */
const HALF_DEPTH_RATIO = 0.3;
/** 캐릭터가 아무리 작아지거나 커져도 이 범위를 벗어나지 않는다(미터). */
const MIN_HEIGHT = 0.086;
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
 * 캐릭터가 공보다 얼마나 큰지를 0..1로 낸다. 1이면 공을 압도하는 크기,
 * 0이면 공이 캐릭터만큼 자란 상태다. 뒤로 물러나는 거리와 옆으로 비키는
 * 거리를 함께 이 값으로 정해, 공이 자랄수록 캐릭터가 정면 뒤로 돌아온다.
 */
function towerT(height: number, diameterM: number): number {
  const tower = height / Math.max(diameterM, 0.001);
  return Math.min(1, Math.max(0, (tower - 1) / 1.2));
}

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

    // 지름에 비례하되 네제곱근으로 완만하게. 공이 커질수록 캐릭터 비중이 줄어
    // 나중에 화면을 가리지 않는다. 세제곱근은 너무 빨리 줄어 작은 공에서
    // 캐릭터가 눈에 안 잡혔다.
    const shrink = (0.05 / Math.max(d, 0.001)) ** 0.25;
    const height = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, d * HEIGHT_RATIO * shrink));
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

    /*
      뒤로 물리되 옆으로도 비킨다. 공을 가리지 않으면서 미는 그림이 된다.

      뒤로 물러나는 거리는 몸이 공에 닿을 만큼만. 여기에 캐릭터가 공보다 클
      때만 여유를 더한다 — 작은 공에 바짝 붙으면 캐릭터가 공을 덮어버린다.
    */
    const halfDepth = height * HALF_DEPTH_RATIO;
    const back = radius + halfDepth * 0.85 + height * 0.9 * towerT(height, d);

    // 옆으로 비키는 거리. 각도로 주면 공이 커질수록 실제 거리가 같이 벌어져
    // 20cm 공에서 12cm 떨어진 채 나란히 걷는 그림이 됐다.
    const t = towerT(height, d);
    const shift = (radius + halfDepth) * (SIDE_SHIFT_MIN + (SIDE_SHIFT_MAX - SIDE_SHIFT_MIN) * t);

    const fwdX = Math.sin(shown.current);
    const fwdZ = Math.cos(shown.current);
    const px = ballPosition.x - fwdX * back - fwdZ * shift;
    const pz = ballPosition.z - fwdZ * back + fwdX * shift;
    g.position.set(px, 0, pz);

    /*
      공을 바라본다.

      진행 방향을 보게 두면 옆으로 비킨 만큼 공에서 고개를 돌린 채 나란히 걷는
      그림이 된다. 「공이 캐릭터 옆구리에 붙어 다닌다」는 게 이 때문이었다.
    */
    g.rotation.y =
      Math.atan2(ballPosition.x - px, ballPosition.z - pz) + MODEL_FACING_OFFSET;
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
        <primitive object={object} dispose={null} />
      </group>
    </group>
  );
}
