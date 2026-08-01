"use client";

import { RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import { POS_COLORS } from "@/game/pos";
import { TIER_DIAMETER_M } from "@/game/objectTiers";
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
  const w = Math.max(size * 1.8, 0.06);
  const h = w / 4;
  return (
    <mesh position={[0, size * 0.85, 0]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

export type WordObjectProps = {
  index: number;
  spawn: SpawnPlan;
  position: [number, number, number];
  /** 상급 난이도에서 색을 끄면 회색으로 통일한다. P1은 항상 false. */
  greyscale?: boolean;
  onTouch: (index: number) => void;
};

export function WordObject({
  index,
  spawn,
  position,
  greyscale = false,
  onTouch
}: WordObjectProps) {
  const size = TIER_DIAMETER_M[spawn.tier];
  const color = greyscale ? "#9ca3af" : POS_COLORS[spawn.entry.pos];

  return (
    <RigidBody
      colliders="cuboid"
      position={position}
      friction={0.9}
      userData={{ wordIndex: index }}
      onCollisionEnter={({ other }) => {
        if (other.rigidBodyObject?.name === "katamari") onTouch(index);
      }}
    >
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
  const size = TIER_DIAMETER_M[spawn.tier];
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
