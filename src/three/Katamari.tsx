"use client";

import { useFrame } from "@react-three/fiber";
import { BallCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useRef } from "react";
import { speedMultiplier } from "@/game/growth";
import { useGameStore } from "@/store/gameStore";
import type { InputRef } from "@/input/useInput";
import { ballPosition } from "./ballTracker";
import { AttachedWord } from "./WordObject";

/**
 * 토크 계수. 관성모멘트(I ∝ m·r²)에 비례해 토크를 주므로 공이 커져도
 * 각가속도가 일정하다. 체감 속도는 플레이테스트에서 이 값으로 조율한다.
 */
const TORQUE_K = 26;
/** 최대 각속도. 공이 통제 불능으로 빨라지는 것을 막는다. */
const MAX_ANGULAR_SPEED = 14;

export function Katamari({ inputRef }: { inputRef: InputRef }) {
  const body = useRef<RapierRigidBody>(null);

  const spawns = useGameStore((st) => st.spawns);
  const attachedIds = useGameStore((st) => st.attachedIds);
  const attachDirs = useGameStore((st) => st.attachDirs);
  const diameterM = useGameStore((st) => st.diameterM);
  const radius = diameterM / 2;

  useFrame((_, delta) => {
    const rb = body.current;
    if (!rb) return;

    // 카메라가 읽을 위치를 갱신한다
    const t = rb.translation();
    ballPosition.x = t.x;
    ballPosition.y = t.y;
    ballPosition.z = t.z;

    const s = useGameStore.getState();
    if (s.phase !== "playing") return;

    // 시간 흐름. 스토어는 초가 바뀔 때만 갱신된다.
    s.tick(delta);

    const v = inputRef.current;
    if (v.x === 0 && v.y === 0) return;

    // 각속도 상한에 걸렸으면 더 밀지 않는다
    const w = rb.angvel();
    if (Math.hypot(w.x, w.y, w.z) > MAX_ANGULAR_SPEED) return;

    // 부착밀이 많으면 느려진다
    const mul = speedMultiplier(s.misfits);
    const r = s.diameterM / 2;
    const strength = TORQUE_K * rb.mass() * r * r * mul * delta;

    // 화면 위(-y)로 밀면 카메라 반대편(-Z)으로 굴러야 한다.
    // 접점이 -Y이므로 ω_x > 0 이 -Z 방향 이동을 만든다.
    rb.applyTorqueImpulse(
      { x: -v.y * strength, y: 0, z: v.x * strength },
      true
    );
  });

  return (
    <RigidBody
      ref={body}
      name="katamari"
      colliders={false}
      position={[0, 0.4, 0]}
      linearDamping={0.35}
      angularDamping={0.5}
      friction={1.4}
      restitution={0.05}
    >
      {/* 지름이 바뀔 때만 콜라이더가 다시 만들어진다 (부착 순간에만 일어남) */}
      <BallCollider args={[radius]} />
      <mesh castShadow scale={radius}>
        <sphereGeometry args={[1, 20, 16]} />
        <meshStandardMaterial color="#f4c542" flatShading roughness={0.7} />
      </mesh>
      {attachedIds.map((id) => {
        const spawn = spawns[id];
        const dir = attachDirs[id];
        if (!spawn || !dir) return null;
        return <AttachedWord key={id} spawn={spawn} dir={dir} ballRadius={radius} />;
      })}
    </RigidBody>
  );
}
