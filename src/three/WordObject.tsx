"use client";

import { RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import { POS_COLORS } from "@/game/pos";
import type { SpawnPlan } from "@/game/words";
import { getLabelTexture } from "./labelTexture";

/** 사물 몸통. P1은 원시 도형으로 대신한다. Tripo GLB는 Task 10에서 붙인다. */
function Body({ size, color }: { size: number; color: string }) {
  return (
    <mesh castShadow>
      <boxGeometry args={[size, size * 0.7, size]} />
      <meshStandardMaterial color={color} flatShading roughness={0.85} />
    </mesh>
  );
}

/** 사물에 꽂힌 이름표. 곡면 왜곡 없이 정면에서 항상 읽힌다. */
function LabelTag({
  text,
  color,
  size
}: {
  text: string;
  color: string;
  size: number;
}) {
  const texture = useMemo(() => getLabelTexture(text, color), [text, color]);
  // 작은 사물도 읽히게 최소 크기를 두고, 큰 사물에서 간판처럼 커지지 않게 상한을 둔다.
  const w = Math.min(Math.max(size * 1.6, 0.05), 0.22);
  const h = w / 4;
  return (
    <mesh position={[0, size * 0.6 + h * 0.7, 0]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

export type WordObjectProps = {
  spawn: SpawnPlan;
  position: [number, number, number];
  /** 상급 난이도에서 색을 끄면 회색으로 통일한다. P1은 항상 false. */
  greyscale?: boolean;
};

/**
 * 필드에 놓인 사물. 부착 판정은 Katamari가 거리로 하고(game/layout의 isTouching),
 * 이 바디는 공에 밀려 굴러다니는 물리 반응만 담당한다.
 */
export function WordObject({ spawn, position, greyscale = false }: WordObjectProps) {
  const size = spawn.sizeM;
  const color = greyscale ? "#9ca3af" : POS_COLORS[spawn.entry.pos];

  return (
    <RigidBody colliders="cuboid" position={position} friction={0.9}>
      <Body size={size} color={color} />
      <LabelTag text={spawn.entry.text} color={color} size={size} />
    </RigidBody>
  );
}

/**
 * 공에 붙은 뒤의 모습. 물리 바디 없이 공의 자식으로 함께 회전한다.
 * 표면에서 살짝만 파묻히게 둔다 — 매끈해지지 않고 튀어나온 채로 굴러야 괴혼답다.
 */
export function AttachedWord({
  spawn,
  dir,
  ballRadius,
  greyscale = false
}: {
  spawn: SpawnPlan;
  dir: [number, number, number];
  ballRadius: number;
  greyscale?: boolean;
}) {
  const size = spawn.sizeM;
  const color = greyscale ? "#9ca3af" : POS_COLORS[spawn.entry.pos];
  const d = ballRadius * 0.85;
  const position: [number, number, number] = [dir[0] * d, dir[1] * d, dir[2] * d];

  return (
    <group position={position}>
      <Body size={size} color={color} />
      <LabelTag text={spawn.entry.text} color={color} size={size} />
    </group>
  );
}
