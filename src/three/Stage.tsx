"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Mesh, type Object3D } from "three";
import { FIELD_RADIUS } from "@/game/layout";
import { measureModel } from "./measureModel";

/**
 * 무대 배경.
 *
 * 필드 둘레에 큰 프롭을 둘러 세운다. 배경이 비어 있으면 공이 굴러가도 세계가
 * 없는 것처럼 보이고, 자기가 어디쯤 있는지도 알 수 없다. 둘레에 기준점이 있으면
 * 방향 감각이 생기고 화면도 채워진다.
 *
 * 이 프롭들은 붙지 않는다. 필드 밖(벽 너머)에 두므로 공이 닿을 일이 없고,
 * 물리 바디도 만들지 않는다. 60개 사물에 더해 물리를 늘릴 이유가 없다.
 */

type Prop = {
  url: string;
  /** 화면에서의 크기(미터). 원본 비율은 무시하고 이 값으로 맞춘다. */
  size: number;
  /** 필드 중심에서의 각도(도) */
  angle: number;
  /** 중심에서의 거리 배수. 1이면 벽 바로 밖. */
  distance: number;
};

/** 교실 무대. 작은 소품은 가까이, 큰 건물은 멀리 둔다. */
const PROPS: Prop[] = [
  { url: "/models/bg_blackboard.glb", size: 4.62, angle: 0, distance: 1.05 },
  { url: "/models/bg_window.glb", size: 3.57, angle: 52, distance: 1.13 },
  { url: "/models/bg_locker.glb", size: 3.99, angle: 104, distance: 1.09 },
  { url: "/models/bg_bulletin_board.glb", size: 3.36, angle: 152, distance: 1.13 },
  { url: "/models/bg_curtain.glb", size: 4.2, angle: 200, distance: 1.13 },
  { url: "/models/bg_wall_clock.glb", size: 2.1, angle: 248, distance: 1.01 },
  { url: "/models/bg_podium.glb", size: 2.31, angle: 296, distance: 0.84 },
  { url: "/models/bg_desk.glb", size: 2.52, angle: 26, distance: 0.73 },
  { url: "/models/bg_big_plant.glb", size: 2.94, angle: 78, distance: 0.76 },
  { url: "/models/bg_sofa.glb", size: 3.15, angle: 130, distance: 0.78 },
  { url: "/models/bg_house.glb", size: 8.4, angle: 176, distance: 1.93 },
  { url: "/models/bg_fireplace.glb", size: 3.57, angle: 224, distance: 1.05 },
  { url: "/models/bg_ritual.glb", size: 5.04, angle: 272, distance: 1.68 }
];

function StageProp({ prop }: { prop: Prop }) {
  const { scene } = useGLTF(prop.url);

  const { object, scale } = useMemo(() => {
    const object: Object3D = scene.clone(true);
    object.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });
    const bounds = measureModel(object, prop.url);
    object.position.set(-bounds.center.x, -bounds.min.y, -bounds.center.z);
    return { object, scale: prop.size / bounds.longest };
  }, [scene, prop.size, prop.url]);

  const rad = (prop.angle * Math.PI) / 180;
  const r = FIELD_RADIUS * prop.distance;

  return (
    <group
      position={[Math.cos(rad) * r, 0, Math.sin(rad) * r]}
      // 프롭이 필드 중심을 바라보게 돌린다
      rotation={[0, -rad + Math.PI / 2, 0]}
      scale={scale}
    >
      <primitive object={object} />
    </group>
  );
}

export function Stage() {
  return (
    <>
      {PROPS.map((prop) => (
        <StageProp key={prop.url} prop={prop} />
      ))}
    </>
  );
}

export function preloadStage(): void {
  for (const prop of PROPS) useGLTF.preload(prop.url);
}
