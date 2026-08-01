"use client";

import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import { canPickUp } from "@/game/growth";
import { FIELD_RADIUS, placeSpawns } from "@/game/layout";
import { useGameStore } from "@/store/gameStore";
import { CLASSROOM_GROUND, createGroundTexture } from "./groundTexture";
import { WordObject } from "./WordObject";

const WALL_HEIGHT = 2;
const WALL_MARGIN = 0.8;
/** 무대 밖 먼 바닥. 대비를 낮춰 시선이 무대에 남게 한다. */
const FAR_GROUND = {
  light: CLASSROOM_GROUND.light,
  dark: CLASSROOM_GROUND.dark
};

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
  const points = useMemo(
    () => placeSpawns(spawns.map((s) => ({ sizeM: s.sizeM, isTarget: s.isTarget }))),
    [spawns]
  );

  // 무늬 간격은 공이 한 칸을 1초 남짓에 지나는 크기로 잡는다. 촘촘하면 어지럽고
  // 크면 안 움직여 보인다.
  const ground = useMemo(() => createGroundTexture(14), []);
  const groundFar = useMemo(() => createGroundTexture(90, FAR_GROUND), []);

  return (
    <>
      <RigidBody type="fixed" friction={1.4}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[FIELD_RADIUS + WALL_MARGIN, 64]} />
          <meshStandardMaterial map={ground} roughness={0.85} />
        </mesh>
      </RigidBody>

      {/* 필드 밖으로 바닥을 더 깔아 세계가 뚝 끊기지 않게 한다. 물리는 없다. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow={false}
      >
        <circleGeometry args={[FIELD_RADIUS * 9, 64]} />
        <meshStandardMaterial map={groundFar} roughness={0.9} />
      </mesh>

      {/* 필드 경계를 눈에 보이게 하는 링. 어디까지가 무대인지 알려준다. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <ringGeometry args={[FIELD_RADIUS + WALL_MARGIN - 0.08, FIELD_RADIUS + WALL_MARGIN, 64]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
      </mesh>

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
