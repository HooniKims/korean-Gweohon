"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Object3D, type InstancedMesh, type Mesh } from "three";
import { FIELD_RADIUS, ZONE_RADIUS, zoneCenters } from "@/game/layout";
import { measureModel } from "./measureModel";

/**
 * 맵을 채우는 장식.
 *
 * 넓힌 맵은 무리 사이가 비어 있다. 비워 두면 「아무것도 없는 들판」이 되고,
 * 사물로 채우면 미로가 된다. 그래서 붙지 않는 장식으로 채운다 — 눈으로는
 * 풍성하지만 굴러가는 길은 막지 않는다.
 *
 * Kenney의 CC0 로우폴리 팩을 쓴다. 이미 게임용으로 만들어진 에셋이라 34개가
 * 900KB밖에 안 되고, 지금 화면의 스타일라이즈드 톤과도 맞는다.
 *
 * 물리 바디를 만들지 않는다. 사물 51개에 더해 물리를 늘릴 이유가 없고, 장식은
 * 부딪힐 필요도 없다. 대신 InstancedMesh로 묶어 드로우콜을 하나로 줄인다.
 */

type ScatterSpec = {
  url: string;
  /** 몇 개 뿌릴지 */
  count: number;
  /** 화면에서의 크기(미터) */
  size: number;
  /** 크기 흔들림. 0.3이면 ±30% */
  sizeJitter: number;
};

const SPECS: ScatterSpec[] = [
  { url: "/models/kenney/n_tree_default.glb", count: 14, size: 1.5, sizeJitter: 0.3 },
  { url: "/models/kenney/n_tree_oak.glb", count: 10, size: 1.7, sizeJitter: 0.25 },
  { url: "/models/kenney/n_tree_pineRoundC.glb", count: 12, size: 1.6, sizeJitter: 0.3 },
  { url: "/models/kenney/n_tree_thin.glb", count: 8, size: 1.4, sizeJitter: 0.3 },
  { url: "/models/kenney/n_rock_largeA.glb", count: 8, size: 0.7, sizeJitter: 0.35 },
  { url: "/models/kenney/n_rock_tallD.glb", count: 7, size: 0.85, sizeJitter: 0.3 },
  { url: "/models/kenney/n_plant_bushLarge.glb", count: 16, size: 0.5, sizeJitter: 0.35 },
  { url: "/models/kenney/n_grass_large.glb", count: 22, size: 0.36, sizeJitter: 0.4 },
  { url: "/models/kenney/n_mushroom_redGroup.glb", count: 9, size: 0.3, sizeJitter: 0.3 },
  { url: "/models/kenney/n_flower_purpleB.glb", count: 12, size: 0.28, sizeJitter: 0.3 },
  { url: "/models/kenney/n_flower_yellowA.glb", count: 12, size: 0.28, sizeJitter: 0.3 },
  { url: "/models/kenney/n_stump_round.glb", count: 6, size: 0.45, sizeJitter: 0.3 }
];

/** 무리와 겹치지 않는 자리를 찾는다. 장식이 사물을 가리면 목표를 못 본다. */
function scatterPoints(count: number, seed: number): { x: number; z: number; rot: number; s: number }[] {
  const centers = zoneCenters();
  const out: { x: number; z: number; rot: number; s: number }[] = [];
  // 결정적 난수. 같은 판을 다시 해도 배경이 그대로여서 기준점 역할을 한다.
  let state = seed * 9301 + 49297;
  const rand = () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };

  let guard = 0;
  while (out.length < count && guard < count * 60) {
    guard += 1;
    // 필드 안쪽부터 바깥 여유까지 뿌린다
    const r = Math.sqrt(rand()) * FIELD_RADIUS * 1.5;
    const a = rand() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    // 무리 안에는 두지 않는다. 여유를 조금 더 둬서 무리 테두리도 비운다.
    const tooClose = centers.some(
      (c) => Math.hypot(x - c.x, z - c.z) < ZONE_RADIUS * 1.35
    );
    if (tooClose) continue;

    out.push({ x, z, rot: rand() * Math.PI * 2, s: 1 });
  }
  return out;
}

function ScatterGroup({ spec, seed }: { spec: ScatterSpec; seed: number }) {
  const { scene } = useGLTF(spec.url);

  const { geometry, material, matrices } = useMemo(() => {
    // Kenney 모델은 메시가 하나뿐이라 첫 메시를 찾아 인스턴싱한다
    let found: Mesh | null = null;
    scene.traverse((child) => {
      const mesh = child as Mesh;
      if (!found && mesh.isMesh) found = mesh;
    });

    const bounds = measureModel(scene, spec.url);
    const base = spec.size / bounds.longest;

    const points = scatterPoints(spec.count, seed);
    const dummy = new Object3D();
    const matrices = points.map((p, i) => {
      // 크기를 흔들어 복제 느낌을 줄인다
      const wobble = 1 + ((i % 7) / 6 - 0.5) * 2 * spec.sizeJitter;
      dummy.position.set(p.x, 0, p.z);
      dummy.rotation.set(0, p.rot, 0);
      dummy.scale.setScalar(base * wobble);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });

    return {
      geometry: found ? (found as Mesh).geometry : null,
      material: found ? (found as Mesh).material : null,
      matrices
    };
  }, [scene, spec, seed]);

  if (!geometry || !material || matrices.length === 0) return null;

  return (
    <instancedMesh
      args={[geometry, material, matrices.length]}
      castShadow
      receiveShadow
      ref={(node: InstancedMesh | null) => {
        if (!node) return;
        matrices.forEach((m, i) => node.setMatrixAt(i, m));
        node.instanceMatrix.needsUpdate = true;
        node.computeBoundingSphere();
      }}
    />
  );
}

export function Scatter() {
  return (
    <>
      {SPECS.map((spec, i) => (
        <ScatterGroup key={spec.url} spec={spec} seed={i + 1} />
      ))}
    </>
  );
}

export function preloadScatter(): void {
  for (const spec of SPECS) useGLTF.preload(spec.url);
}
