import { useGLTF } from "@react-three/drei";
import type { ObjectTier } from "@/game/objectTiers";

/**
 * 티어별로 쓸 사물 모델. Tripo에서 받아 압축한 GLB다.
 *
 * 실제로 public/models/ 에 있는 파일만 적는다. 없는 파일을 적으면 런타임에 깨진다.
 * 색은 코드에서 품사색으로 덮으므로(WordObject) 원본 색은 쓰이지 않는다.
 */
export const MODELS_BY_TIER: Record<ObjectTier, string[]> = {
  XS: [
    "/models/xs_clip.glb",
    "/models/xs_pushpin.glb",
    "/models/xs_button.glb",
    "/models/xs_pebble.glb",
    "/models/xs_eraser_crumb.glb",
    "/models/xs_paperclip_bent.glb",
    "/models/xs_bead.glb",
    "/models/xs_staple.glb",
    "/models/xs_rubber_band.glb",
    "/models/xs_chalk_stub.glb",
    "/models/prop_gem.glb",
    "/models/prop_star.glb"
  ],
  S: [
    "/models/s_eraser.glb",
    "/models/s_pencil.glb",
    "/models/s_glue_stick.glb",
    "/models/s_postit_stack.glb",
    "/models/s_mechanical_pencil.glb",
    "/models/s_marker.glb",
    "/models/s_scissors.glb",
    "/models/s_sharpener.glb",
    "/models/s_usb_stick.glb",
    "/models/s_name_stamp.glb",
    "/models/prop_heart.glb",
    "/models/prop_bulb.glb",
    "/models/prop_bell.glb",
    "/models/prop_compass.glb"
  ],
  M: [
    "/models/m_pencil_case.glb",
    "/models/m_mug.glb",
    "/models/m_dictionary.glb",
    "/models/m_stapler.glb",
    "/models/m_calculator.glb",
    "/models/m_notebook.glb",
    "/models/m_ruler.glb",
    "/models/m_tissue_box.glb",
    "/models/m_water_bottle.glb",
    "/models/m_desk_clock.glb",
    "/models/prop_controller.glb",
    "/models/prop_hourglass.glb",
    "/models/prop_lotus.glb",
    "/models/prop_mirror.glb",
    "/models/prop_mask.glb",
    "/models/prop_play.glb"
  ],
  L: [
    "/models/l_backpack.glb",
    "/models/l_desk_lamp.glb",
    "/models/l_chair.glb",
    "/models/l_laptop.glb",
    "/models/l_potted_plant.glb",
    "/models/l_globe.glb",
    "/models/l_guitar_case.glb",
    "/models/l_trash_bin.glb",
    "/models/l_bookshelf_small.glb",
    "/models/l_soccer_ball.glb",
    "/models/prop_trophy.glb",
    "/models/prop_cup.glb",
    "/models/prop_shield.glb",
    "/models/prop_crystalball.glb",
    "/models/prop_core.glb"
  ]
};

/** 카타마리 코어. 품사색 틴트 대상이 아니라 원본 색을 그대로 쓴다. */
export const CORE_MODEL = "/models/core_ball.glb";

/**
 * 공을 미는 캐릭터. 괴혼의 왕자 자리다.
 *
 * 품사 대왕이 직접 민다. T-포즈로 뽑은 로봇 캐릭터도 있지만 리깅된 스킨 메시라
 * 바인드 포즈 기준으로 크기가 잘못 재어져 화면을 덮는다. 대왕은 정적 메시라
 * 크기가 정확히 잡히고, 훈시하던 대왕이 몸소 구르는 그림이 이 게임에 맞기도 하다.
 */
export const ROLLER_MODEL = "/models/king_pos.glb";

/** 스폰 순번에 모델을 결정적으로 배정한다. 같은 판을 다시 해도 같은 모습이다. */
export function modelForIndex(tier: ObjectTier, index: number): string {
  const list = MODELS_BY_TIER[tier];
  return list[index % list.length];
}

/** 첫 부착에서 끊기지 않도록 모든 사물 모델을 미리 받는다. */
export function preloadModels(): void {
  for (const list of Object.values(MODELS_BY_TIER)) {
    for (const url of list) useGLTF.preload(url);
  }
  useGLTF.preload(CORE_MODEL);
  useGLTF.preload(ROLLER_MODEL);
}
