import { CanvasTexture, SRGBColorSpace } from "three";

export const LABEL_WIDTH = 256;
export const LABEL_HEIGHT = 64;
export const LABEL_CACHE_LIMIT = 60;
/** 라벨 글꼴. globals.css의 @font-face와 같은 이름을 쓴다. */
export const LABEL_FONT = '"Paperlogy", system-ui, sans-serif';
/** 굵으면 한글 획이 뭉쳐 작은 라벨에서 오히려 안 읽힌다. */
export const LABEL_WEIGHT = 600;

/** 라벨 배경색에 대비되는 글자색을 고른다. */
export function textColorFor(bgColor: string): string {
  const hex = bgColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111111" : "#ffffff";
}

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  bgColor: string
): void {
  ctx.clearRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);

  // 이름표는 항상 한 줄이다. 글자가 길면 폰트를 줄여서 넣는다.
  let fontSize = 40;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = textColorFor(bgColor);
  while (fontSize > 14) {
    ctx.font = `${LABEL_WEIGHT} ${fontSize}px ${LABEL_FONT}`;
    if (ctx.measureText(text).width <= LABEL_WIDTH - 24) break;
    fontSize -= 2;
  }

  // 글자 주위를 살짝 어둡게 둘러 배경색과 겹쳐도 획이 살아나게 한다
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, fontSize * 0.11);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.strokeText(text, LABEL_WIDTH / 2, LABEL_HEIGHT / 2);
  ctx.fillText(text, LABEL_WIDTH / 2, LABEL_HEIGHT / 2);
}

/** Map은 삽입 순서를 지키므로 LRU에 그대로 쓴다. */
const cache = new Map<string, CanvasTexture>();

export function getLabelTexture(text: string, bgColor: string): CanvasTexture {
  const key = `${text}|${bgColor}`;
  const hit = cache.get(key);
  if (hit) {
    // 다시 넣어 최신으로 올린다
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  const canvas = document.createElement("canvas");
  canvas.width = LABEL_WIDTH;
  canvas.height = LABEL_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (ctx) drawLabel(ctx, text, bgColor);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  cache.set(key, texture);

  while (cache.size > LABEL_CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    const oldest = cache.get(oldestKey);
    cache.delete(oldestKey);
    oldest?.dispose();
  }

  return texture;
}

export function clearLabelCache(): void {
  for (const texture of cache.values()) texture.dispose();
  cache.clear();
}

export function labelCacheSize(): number {
  return cache.size;
}

/**
 * 글꼴이 늦게 도착하면 먼저 그린 라벨이 기본 글꼴로 굳는다. 로드가 끝나면
 * 캐시를 비워 다시 그리게 한다. 한 번만 걸어 두면 된다.
 */
export function refreshLabelsWhenFontReady(): void {
  if (typeof document === "undefined" || !document.fonts) return;
  document.fonts.ready.then(() => {
    clearLabelCache();
  });
}
