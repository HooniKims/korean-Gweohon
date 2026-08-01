"use client";

import { STICK_RADIUS_PX, type StickVisual } from "./useInput";

/**
 * 터치가 시작된 지점에 스틱 원을 그린다. 판정은 useInput이 하고 여기는 표시만 한다.
 * 고정 위치 스틱보다 손 크기와 기기 차이를 잘 흡수한다.
 */
export function VirtualStick({ stick }: { stick: StickVisual }) {
  if (!stick) return null;

  const ring = STICK_RADIUS_PX * 2;
  const knobSize = 44;

  return (
    <div
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 20 }}
      aria-hidden
    >
      <div
        style={{
          position: "absolute",
          left: stick.center.x - STICK_RADIUS_PX,
          top: stick.center.y - STICK_RADIUS_PX,
          width: ring,
          height: ring,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.35)",
          background: "rgba(255,255,255,0.06)"
        }}
      />
      <div
        style={{
          position: "absolute",
          left: stick.knob.x - knobSize / 2,
          top: stick.knob.y - knobSize / 2,
          width: knobSize,
          height: knobSize,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.7)"
        }}
      />
    </div>
  );
}
