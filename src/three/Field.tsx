"use client";

import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import { canPickUp } from "@/game/growth";
import { FIELD_RADIUS, placeSpawns } from "@/game/layout";
import { useGameStore } from "@/store/gameStore";
import { WordObject } from "./WordObject";

const WALL_HEIGHT = 2;
const WALL_MARGIN = 0.8;

/**
 * 필드 둘레의 보이지 않는 벽.
 *
 * 콜라이더를 직접 만든다. `visible={false}` 메시로 두면 Rapier가 콜라이더를
 * 만들지 않아 벽이 없는 것과 같고, 공이 필드 밖으로 나가 끝없이 떨어진다.
 */
function Walls() {
  const segments = 20;
  const radius = FIELD_RADIUS + WALL_MARGIN;
  const halfWidth = (radius * Math.PI) / segments + 0.3;
  return (
    <>
      {Array.from({ length: segments }, (_, i) => {
        const a = (i / segments) * Math.PI * 2;
        return (
          <CuboidCollider
            key={i}
            args={[0.2, WALL_HEIGHT / 2, halfWidth]}
            position={[Math.cos(a) * radius, WALL_HEIGHT / 2, Math.sin(a) * radius]}
            rotation={[0, -a, 0]}
          />
        );
      })}
    </>
  );
}

export function Field() {
  const spawns = useGameStore((s) => s.spawns);
  const attachedIds = useGameStore((s) => s.attachedIds);
  const diameterM = useGameStore((s) => s.diameterM);

  // 배치는 game/layout이 유일한 출처다. Katamari의 부착 판정도 같은 좌표를 쓴다.
  const points = useMemo(() => placeSpawns(spawns.map((s) => ({ sizeM: s.sizeM, isTarget: s.isTarget }))), [spawns]);

  return (
    <>
      <RigidBody type="fixed" friction={1.4}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[FIELD_RADIUS + WALL_MARGIN, 48]} />
          <meshStandardMaterial color="#7dd3a0" flatShading />
        </mesh>
      </RigidBody>

      <Walls />

      {spawns.map((spawn, i) => {
        if (attachedIds.includes(i)) return null;
        const p = points[i];
        if (!p) return null;
        // 큰 사물은 바닥에 닿게 y를 올려준다
        const y = spawn.sizeM * 0.4;
        return (
          <WordObject
            key={i}
            index={i}
            spawn={spawn}
            position={[p.x, y, p.z]}
            pickable={canPickUp(diameterM, spawn.sizeM)}
          />
        );
      })}
    </>
  );
}
