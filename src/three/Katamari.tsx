"use client";

import { useFrame } from "@react-three/fiber";
import { BallCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useMemo, useRef } from "react";
import { canPickUp, speedMultiplier } from "@/game/growth";
import { isTouching, placeSpawns } from "@/game/layout";
import { TIER_DIAMETER_M } from "@/game/objectTiers";
import { torqueForInput } from "@/game/rolling";
import { useGameStore } from "@/store/gameStore";
import type { InputRef } from "@/input/useInput";
import { ballMotion, ballPosition } from "./ballTracker";
import { AttachedWord } from "./WordObject";

/**
 * 토크 계수. 관성모멘트(I ∝ m·r²)에 비례해 토크를 주므로 공이 커져도
 * 각가속도가 일정하다. 체감 속도는 플레이테스트에서 이 값으로 조율한다.
 */
const TORQUE_K = 26;
/**
 * 최대 각속도. 공이 통제 불능으로 빨라지는 것을 막는다.
 * 선속도는 ω·r이므로 5cm 공은 0.8m/s, 20cm 공은 3.2m/s까지 난다.
 */
const MAX_ANGULAR_SPEED = 32;

export function Katamari({ inputRef }: { inputRef: InputRef }) {
  const body = useRef<RapierRigidBody>(null);

  const spawns = useGameStore((st) => st.spawns);
  const attachedIds = useGameStore((st) => st.attachedIds);
  const attachDirs = useGameStore((st) => st.attachDirs);
  const diameterM = useGameStore((st) => st.diameterM);
  const radius = diameterM / 2;

  // Field와 같은 좌표를 써야 한다. game/layout이 유일한 출처다.
  const points = useMemo(() => placeSpawns(spawns.map((s) => s.tier)), [spawns]);

  useFrame((_, delta) => {
    const rb = body.current;
    if (!rb) return;

    // 카메라와 디버그 오버레이가 읽을 값을 갱신한다
    const t = rb.translation();
    ballPosition.x = t.x;
    ballPosition.y = t.y;
    ballPosition.z = t.z;

    const lv = rb.linvel();
    const av = rb.angvel();
    ballMotion.speed = Math.hypot(lv.x, lv.z);
    ballMotion.angularSpeed = Math.hypot(av.x, av.y, av.z);
    ballMotion.fps = delta > 0 ? 1 / delta : 0;

    const s = useGameStore.getState();
    if (s.phase !== "playing") return;

    // 시간 흐름. 스토어는 초가 바뀔 때만 갱신된다.
    s.tick(delta);

    // 부착 판정. 충돌 이벤트를 쓰면 빠를 때 작은 사물을 통과해 버린다.
    const ball = { x: t.x, z: t.z, diameterM: s.diameterM };
    for (let i = 0; i < s.spawns.length; i += 1) {
      if (s.attachedIds.includes(i)) continue;
      const spawn = s.spawns[i];
      const point = points[i];
      if (!spawn || !point) continue;
      const objectDiameterM = TIER_DIAMETER_M[spawn.tier];
      if (!canPickUp(s.diameterM, objectDiameterM)) continue;
      if (!isTouching(ball, point, objectDiameterM)) continue;
      s.pickUp(i);
      break; // 한 프레임에 하나만 붙인다
    }

    const v = inputRef.current;
    if (v.x === 0 && v.y === 0) return;

    // 각속도 상한에 걸렸으면 더 밀지 않는다
    const w = rb.angvel();
    if (Math.hypot(w.x, w.y, w.z) > MAX_ANGULAR_SPEED) return;

    // 부착밀이 많으면 느려진다
    const mul = speedMultiplier(s.misfits);
    const r = s.diameterM / 2;
    const strength = TORQUE_K * rb.mass() * r * r * mul * delta;

    rb.applyTorqueImpulse(torqueForInput(v, strength), true);
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
