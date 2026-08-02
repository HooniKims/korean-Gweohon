"use client";

import { useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import type { Group } from "three";
import { useGameStore } from "@/store/gameStore";
import { ballPosition, ballSpin } from "./ballTracker";
import { AttachedWord } from "./WordObject";

/**
 * 공에 붙은 사물들.
 *
 * 물리 바디 안에 넣으면 안 된다. 사물 모델이 아직 로딩 중이면 서스펜드하는데,
 * 그러면 가장 가까운 Suspense 경계 아래가 통째로 언마운트된다 — Physics가 그
 * 안에 있어서 공의 물리 바디까지 사라지고, 참조를 잃은 게임 루프가 멈춘다.
 * 실측에서 첫 부착 직후 타이머가 그대로 얼어붙었다.
 *
 * 그래서 물리 밖에 따로 두고 매 프레임 공의 위치·회전만 따라가게 한다. 여기서
 * 서스펜드해도 물리는 멀쩡하다.
 */
export function AttachedWords() {
  const group = useRef<Group>(null);
  const spawns = useGameStore((s) => s.spawns);
  const attachedIds = useGameStore((s) => s.attachedIds);
  const attachDirs = useGameStore((s) => s.attachDirs);
  const diameterM = useGameStore((s) => s.diameterM);
  const radius = diameterM / 2;

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.position.set(ballPosition.x, ballPosition.y, ballPosition.z);
    g.quaternion.set(ballSpin.x, ballSpin.y, ballSpin.z, ballSpin.w);
  });

  return (
    <group ref={group}>
      <Suspense fallback={null}>
        {attachedIds.map((id) => {
          const spawn = spawns[id];
          const dir = attachDirs[id];
          if (!spawn || !dir) return null;
          return (
            <AttachedWord key={id} index={id} spawn={spawn} dir={dir} ballRadius={radius} />
          );
        })}
      </Suspense>
    </group>
  );
}
