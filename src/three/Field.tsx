"use client";

import { RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import { TIER_DIAMETER_M } from "@/game/objectTiers";
import { useGameStore } from "@/store/gameStore";
import { WordObject } from "./WordObject";

const FIELD_RADIUS = 9;
const WALL_HEIGHT = 2;

/**
 * 스폰을 필드에 흩뿌린다. 황금각 나선으로 놓아 뭉치지 않고 고르게 퍼진다.
 * 작은 것(앞 순번)이 중앙 가까이 오므로 시작하자마자 붙일 것이 있다.
 */
function scatter(count: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const r = FIELD_RADIUS * Math.sqrt((i + 0.6) / count);
    const a = i * golden;
    out.push([Math.cos(a) * r, 0.15, Math.sin(a) * r]);
  }
  return out;
}

/** 공이 필드 밖으로 굴러 나가지 않게 둘레에 보이지 않는 벽을 세운다. */
function Walls() {
  const segments = 16;
  return (
    <>
      {Array.from({ length: segments }, (_, i) => {
        const a = (i / segments) * Math.PI * 2;
        const x = Math.cos(a) * (FIELD_RADIUS + 1.5);
        const z = Math.sin(a) * (FIELD_RADIUS + 1.5);
        const width = ((FIELD_RADIUS + 1.5) * 2 * Math.PI) / segments + 0.6;
        return (
          <RigidBody key={i} type="fixed" position={[x, WALL_HEIGHT / 2, z]} rotation={[0, -a, 0]}>
            <mesh visible={false}>
              <boxGeometry args={[0.4, WALL_HEIGHT, width]} />
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
  const pickUp = useGameStore((s) => s.pickUp);

  // 위치는 스폰 목록이 바뀔 때만 다시 계산한다
  const positions = useMemo(() => scatter(spawns.length), [spawns.length]);

  return (
    <>
      <RigidBody type="fixed" friction={1.4}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[FIELD_RADIUS + 2, 48]} />
          <meshStandardMaterial color="#7dd3a0" flatShading />
        </mesh>
      </RigidBody>

      <Walls />

      {spawns.map((spawn, i) => {
        if (attachedIds.includes(i)) return null;
        const pos = positions[i];
        if (!pos) return null;
        // 큰 사물은 바닥에 닿게 y를 올려준다
        const y = TIER_DIAMETER_M[spawn.tier] * 0.4;
        return (
          <WordObject
            key={i}
            index={i}
            spawn={spawn}
            position={[pos[0], y, pos[2]]}
            onTouch={pickUp}
          />
        );
      })}
    </>
  );
}
