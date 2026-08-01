export type InputVector = { x: number; y: number };

/** 화면 좌표계를 따른다: y가 양수면 아래쪽. */
export const KEY_TO_DIRECTION: Record<string, InputVector> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 }
};

/** 크기가 1을 넘으면 1로 줄인다. 1 이하는 그대로 둬서 스틱의 미세 조작을 살린다. */
function clampToUnit(v: InputVector): InputVector {
  const len = Math.hypot(v.x, v.y);
  if (len === 0) return { x: 0, y: 0 };
  if (len <= 1) return v;
  return { x: v.x / len, y: v.y / len };
}

export function vectorFromKeys(pressed: ReadonlySet<string>): InputVector {
  let x = 0;
  let y = 0;
  for (const code of pressed) {
    const dir = KEY_TO_DIRECTION[code];
    if (!dir) continue;
    x += dir.x;
    y += dir.y;
  }
  return clampToUnit({ x, y });
}

/** 스틱 중심에서 벗어난 방향과 거리를 -1..1 벡터로 바꾼다. */
export function vectorFromStick(
  center: InputVector,
  current: InputVector,
  radiusPx: number
): InputVector {
  const dx = current.x - center.x;
  const dy = current.y - center.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0 || radiusPx <= 0) return { x: 0, y: 0 };
  const scale = Math.min(1, dist / radiusPx) / dist;
  return { x: dx * scale, y: dy * scale };
}
