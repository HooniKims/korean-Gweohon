"use client";

import { RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import { FIELD_RADIUS, placeSpawns } from "@/game/layout";
import { TIER_DIAMETER_M } from "@/game/objectTiers";
import { useGameStore } from "@/store/gameStore";
import { WordObject } from "./WordObject";

const WALL_HEIGHT = 2;
const WALL_MARGIN = 0.8;

/** 공이 필드 밖으로 굴러 나가지 않게 둘레에 보이지 않는 벽을 세운다. */
function Walls() {
  const segments = 16;
  const radius = FIELD_RADIUS + WALL_MARGIN;
  return (
    <>
      {Array.from({ length: segments }, (_, i) => {
        const a = (i / segments) * Math.PI * 2;
        const width = (radius * 2 * Math.PI) / segments + 0.6;
        return (
          <RigidBody
            key={i}
            type="fixed"
            position={[Math.cos(a) * radius, WALL_HEIGHT / 2, Math.sin(a) * radius]}
            rotation={[0, -a, 0]}
          >
            <mesh visible={false}>
              <boxGeometry args={[0.3, WALL_HEIGHT, width]} />
            </mesh>
          </RigidBody>
        );
      })}
    </>
  );
}

export function Field() {
  const spawns = useGameStore((s) => s.spawns);
  const attachedIds = useGameStore((s) => s.attachedIds);

  // 배치는 game/layout이 유일한 출처다. Katamari의 부착 판정도 같은 좌표를 쓴다.
  const points = useMemo(() => placeSpawns(spawns.map((s) => s.tier)), [spawns]);

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
        const y = TIER_DIAMETER_M[spawn.tier] * 0.4;
        return <WordObject key={i} spawn={spawn} position={[p.x, y, p.z]} />;
      })}
    </>
  );
}
