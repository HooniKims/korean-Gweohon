"use client";

import { Billboard, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useMemo, useRef } from "react";
import { Mesh, MeshStandardMaterial, Quaternion, Vector3, type Object3D } from "three";
import { POS_COLORS } from "@/game/pos";
import type { SpawnPlan } from "@/game/words";
import { getLabelTexture } from "./labelTexture";
import { measureModel } from "./measureModel";
import { modelForIndex } from "./modelRegistry";
import { livePosition, setLivePosition } from "./spawnPositions";

/** 사물 모델의 기본 위쪽. Body가 원점을 바닥 중앙으로 맞추므로 +Y가 위다. */
const UP = new Vector3(0, 1, 0);

/** 못 먹는 사물의 밀도. 물의 1/40 정도로 가볍게 둬서 작은 공도 밀어낼 수 있다. */
const PUSHABLE_DENSITY = 25;

/** 상급 난이도에서 색을 끄면 이 회색으로 통일한다. */
const GREY = "#9ca3af";

/**
 * Tripo 사물 모델. 크기를 티어에 맞춰 정규화하고 품사색으로 칠한다.
 *
 * 원본 머티리얼을 새 것으로 갈아끼운다. 그래서 상급 난이도에서 색을 회색으로
 * 되돌릴 수 있다. 원본 색을 그대로 두면 난이도 조절이 불가능하다.
 */
function Body({
  size,
  color,
  url,
  dim = false
}: {
  size: number;
  color: string;
  url: string;
  /** 아직 못 붙이는 사물. 어둡게 그려 「지금은 무리」임을 알린다. */
  dim?: boolean;
}) {
  const { scene } = useGLTF(url);

  const { object, scale } = useMemo(() => {
    const object: Object3D = scene.clone(true);

    object.traverse((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) return;
      mesh.material = new MeshStandardMaterial({
        color,
        flatShading: true,
        roughness: 0.85,
        // 못 붙이는 사물은 어둡게 죽여 둔다. 눈으로 바로 구분돼야 한다.
        emissiveIntensity: 0,
        opacity: dim ? 0.55 : 1,
        transparent: dim
      });
      mesh.castShadow = true;
    });

    // 가장 긴 변을 size에 맞추고, 원점을 바닥 중앙으로 옮긴다
    const bounds = measureModel(object, url);
    object.position.set(-bounds.center.x, -bounds.min.y, -bounds.center.z);

    return { object, scale: size / bounds.longest };
  }, [scene, size, color, dim]);

  return (
    <group scale={scale}>
      <primitive object={object} dispose={null} />
    </group>
  );
}

/** 사물에 꽂힌 이름표. 곡면 왜곡 없이 정면에서 항상 읽힌다. */
function LabelTag({
  text,
  color,
  size,
  dim = false
}: {
  text: string;
  color: string;
  size: number;
  dim?: boolean;
}) {
  const texture = useMemo(() => getLabelTexture(text, color), [text, color]);
  // 작은 사물도 읽히게 최소 크기를 두고, 큰 사물에서 간판처럼 커지지 않게 상한을 둔다.
  const w = Math.min(Math.max(size * 1.8, 0.09), 0.26);
  const h = w / 4;
  // 카메라가 회전하므로 라벨은 항상 카메라를 봐야 한다. 고정 평면이면 옆에서
  // 볼 때 사라져 학생이 단어를 읽을 수 없다.
  return (
    <Billboard position={[0, size * 0.75 + h * 0.8, 0]}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={dim ? 0.4 : 1}
          toneMapped={false}
          depthTest={false}
        />
      </mesh>
    </Billboard>
  );
}

export type WordObjectProps = {
  /** 스폰 순번. 모델을 결정적으로 배정하는 데 쓴다. */
  index: number;
  spawn: SpawnPlan;
  position: [number, number, number];
  /** 상급 난이도에서 색을 끄면 회색으로 통일한다. P1은 항상 false. */
  greyscale?: boolean;
  /** 지금 공으로 붙일 수 있는가. 못 붙이면 흐리게 그려 튕기는 이유를 알려준다. */
  pickable?: boolean;
};

/**
 * 필드에 놓인 사물. 부착 판정은 Katamari가 거리로 하고(game/layout의 isTouching),
 * 이 바디는 공에 밀려 굴러다니는 물리 반응만 담당한다.
 *
 * 콜라이더는 모델 형태가 아니라 박스로 잡는다. 정밀 콜라이더는 60개에서
 * 태블릿이 버티지 못하고, 굴러 밀리는 반응에는 박스로 충분하다.
 */
export function WordObject({
  index,
  spawn,
  position,
  greyscale = false,
  pickable = true
}: WordObjectProps) {
  const size = spawn.sizeM;
  const color = greyscale ? GREY : POS_COLORS[spawn.entry.pos];
  const url = modelForIndex(spawn.tier, index);
  const body = useRef<RapierRigidBody>(null);

  /*
    밀려 움직인 실제 위치를 보고한다. 최초 좌표로 판정하면 밀린 뒤로는
    화면에서 사물을 밀고 있는데도 붙지 않는다.

    바디가 살아 있는지 반드시 확인한다. 공이 자라면 이 사물이 장애물에서
    「먹을 수 있는 것」으로 바뀌며 RigidBody가 통째로 사라지는데, 그 뒤에도
    ref에는 이미 해제된 바디가 남는다. 거기에 translation()을 부르면 Rapier의
    WASM이 unreachable로 트랩을 밟고, 그 순간부터 물리 월드 전체가 망가져
    매 프레임 "recursive use of an object" 예외가 나며 렌더 루프가 죽는다.
    실측에서 첫 부착 직후 타이머가 100초에 멈춘 원인이 이것이었다.
  */
  useFrame(() => {
    const rb = body.current;
    if (!rb || !rb.isValid()) return;
    const t = rb.translation();
    setLivePosition(index, t.x, t.z);
  });

  const visual = (
    <>
      <Body size={size} color={color} url={url} dim={!pickable} />
      <LabelTag text={spawn.entry.text} color={color} size={size} dim={!pickable} />
    </>
  );

  /*
    먹을 수 있는 것은 물리를 두지 않는다.

    콜라이더가 있으면 공이 다가갈 때 사물이 밀려나며 일정 간격을 유지해 영원히
    안 붙는다. 실측에서 여유가 정확히 1.5cm에 고정된 채 왕복했다. 부착 판정은
    Katamari가 경로로 하므로 물리가 필요 없다.

    못 먹는 것만 밀리는 물체로 둔다. 밀어서 치우거나 돌아가야 하는 장애물이 된다.
  */
  if (pickable) {
    /*
      최초 좌표가 아니라 마지막으로 밀려간 자리에 그린다.

      장애물이던 사물은 공에 밀려 옮겨져 있다. 공이 자라 이 사물이 먹을 수
      있게 되는 순간 물리 바디가 사라지는데, 그때 최초 좌표로 그리면 화면에서
      사물이 원래 자리로 순간이동한다. 부착 판정은 밀려간 자리를 쓰므로
      보이는 곳과 붙는 곳이 어긋난다.
    */
    const at = livePosition(index, { x: position[0], z: position[2] });
    return <group position={[at.x, position[1], at.z]}>{visual}</group>;
  }

  return (
    <RigidBody
      ref={body}
      colliders="cuboid"
      position={position}
      friction={0.55}
      density={PUSHABLE_DENSITY}
      linearDamping={1.4}
      angularDamping={1.4}
    >
      <mesh visible={false}>
        <boxGeometry args={[size, size, size]} />
      </mesh>
      {visual}
    </RigidBody>
  );
}

/**
 * 공에 붙은 뒤의 모습. 물리 바디 없이 공의 자식으로 함께 회전한다.
 * 표면에서 살짝만 파묻히게 둔다 — 매끈해지지 않고 튀어나온 채로 굴러야 괴혼답다.
 */
export function AttachedWord({
  index,
  spawn,
  dir,
  ballRadius,
  greyscale = false
}: {
  index: number;
  spawn: SpawnPlan;
  dir: [number, number, number];
  ballRadius: number;
  greyscale?: boolean;
}) {
  const size = spawn.sizeM;
  const color = greyscale ? GREY : POS_COLORS[spawn.entry.pos];
  const url = modelForIndex(spawn.tier, index);

  const { position, quaternion } = useMemo(() => {
    const normal = new Vector3(dir[0], dir[1], dir[2]).normalize();

    // 표면 법선을 따라 세운다. 회전시키지 않으면 사물이 제 방향 그대로 박혀
    // 아무렇게나 꽂힌 것처럼 보인다. 법선에 맞추면 공에서 돋아난 모양이 된다.
    const q = new Quaternion().setFromUnitVectors(UP, normal);

    // 밑동은 묻히고 윗부분만 나오게 한다. 표면에 얹기만 하면 굴러갈 때 떠 보이고,
    // 너무 깊이 넣으면 공이 매끈해져 괴혼의 울퉁불퉁한 맛이 사라진다.
    const depth = ballRadius - size * 0.25;
    const p = normal.clone().multiplyScalar(Math.max(0, depth));

    return {
      position: [p.x, p.y, p.z] as [number, number, number],
      quaternion: [q.x, q.y, q.z, q.w] as [number, number, number, number]
    };
  }, [dir, ballRadius, size]);

  // 붙은 뒤에는 이름표를 떼어낸다. 공에 이름표가 잔뜩 남으면 지저분하고,
  // 어차피 판정이 끝난 단어라 더 읽을 이유가 없다.
  return (
    <group position={position} quaternion={quaternion}>
      <Body size={size} color={color} url={url} />
    </group>
  );
}
