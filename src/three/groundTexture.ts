import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

/**
 * 바닥 체크무늬.
 *
 * 단색 바닥은 아무리 조명을 만져도 밋밋하다. 공이 굴러가도 배경이 그대로여서
 * 움직이는 느낌 자체가 안 난다. 괴혼이 체크·스트라이프를 쓰는 이유가 이것이다 —
 * 무늬가 지나가야 속도가 눈에 보인다.
 *
 * 파일을 받지 않고 캔버스로 그린다. 오프라인에서 돌아야 하고, 무늬 하나 때문에
 * 이미지를 번들에 넣을 이유가 없다.
 */

const TILE_PX = 128;

export type GroundStyle = {
  /** 밝은 칸 */
  light: string;
  /** 어두운 칸 */
  dark: string;
  /** 칸 사이 얇은 선. 없으면 생략한다. */
  line?: string;
};

export const CLASSROOM_GROUND: GroundStyle = {
  light: "#8ed7a8",
  dark: "#79c795",
  line: "rgba(255,255,255,0.22)"
};

export function drawCheckerTile(
  ctx: CanvasRenderingContext2D,
  style: GroundStyle
): void {
  const half = TILE_PX / 2;

  ctx.fillStyle = style.light;
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);

  ctx.fillStyle = style.dark;
  ctx.fillRect(0, 0, half, half);
  ctx.fillRect(half, half, half, half);

  if (style.line) {
    ctx.strokeStyle = style.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(half, 0);
    ctx.lineTo(half, TILE_PX);
    ctx.moveTo(0, half);
    ctx.lineTo(TILE_PX, half);
    ctx.stroke();
  }
}

/**
 * 체크무늬 텍스처를 만든다.
 *
 * @param repeat 바닥 전체에 무늬가 몇 번 반복될지. 공(5cm)이 한 칸을 지나는 데
 *   1초쯤 걸리는 크기가 좋다. 너무 촘촘하면 어지럽고 너무 크면 안 움직여 보인다.
 */
export function createGroundTexture(
  repeat: number,
  style: GroundStyle = CLASSROOM_GROUND
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = TILE_PX;
  canvas.height = TILE_PX;
  const ctx = canvas.getContext("2d");
  if (ctx) drawCheckerTile(ctx, style);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}
