import { Box3, Mesh, Vector3, type Object3D } from "three";

/**
 * 복제한 GLTF를 <primitive>로 렌더할 때는 반드시 dispose={null}을 준다.
 *
 * scene.clone()은 지오메트리를 원본과 공유한다. R3F는 언마운트할 때 붙어 있던
 * 객체를 정리하는데, 그러면 캐시된 GLTF와 다른 복제본들이 쓰는 GPU 버퍼까지
 * 해제된다. 사물을 붙이는 순간(필드 사물 언마운트 + 부착물 마운트) 렌더러가
 * 통째로 멈추는 원인이 이것이었다.
 */

export type ModelBounds = {
  /** 가장 긴 변의 길이. 0보다 크다. */
  longest: number;
  center: Vector3;
  min: Vector3;
};

/**
 * 모델의 크기를 잰다.
 *
 * `Box3.setFromObject`만 쓰면 안 된다. 리깅된 모델(T-포즈로 뽑은 캐릭터)에서는
 * 빈 박스가 나와 크기가 1로 잡히고, 그러면 스케일이 수십 배로 폭주해 캐릭터가
 * 화면을 덮는다. 지오메트리의 바운딩 박스를 직접 합쳐서 그 경우를 막는다.
 */
/** 측정 실패 진단용. 폴백이 걸린 모델을 알아내려고 둔다. */
export const measureFailures: { count: number; last: string } = { count: 0, last: "-" };

export function measureModel(object: Object3D, label = "?"): ModelBounds {
  object.updateWorldMatrix(true, true);

  let box = new Box3().setFromObject(object);

  if (box.isEmpty() || !Number.isFinite(box.min.x)) {
    box = new Box3();
    object.traverse((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const gb = mesh.geometry.boundingBox;
      if (!gb) return;
      box.union(gb.clone().applyMatrix4(mesh.matrixWorld));
    });
  }

  if (box.isEmpty() || !Number.isFinite(box.min.x)) {
    measureFailures.count += 1;
    measureFailures.last = label;
    return { longest: 1, center: new Vector3(), min: new Vector3() };
  }

  const span = box.getSize(new Vector3());
  const longest = Math.max(span.x, span.y, span.z);

  return {
    longest: longest > 1e-6 ? longest : 1,
    center: box.getCenter(new Vector3()),
    min: box.min.clone()
  };
}
