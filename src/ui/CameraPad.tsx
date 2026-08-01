"use client";

import { useEffect, useRef } from "react";
import {
  PITCH_MAX,
  PITCH_MIN,
  ZOOM_MAX,
  ZOOM_MIN,
  type NumberRef
} from "@/input/useInput";

/** 패드를 끝에서 끝까지 끌었을 때 도는 각(라디안) */
const YAW_PER_PAD = Math.PI * 1.4;
const PITCH_PER_PAD = 1.2;
/** 버튼 한 번에 도는 각 */
const YAW_STEP = Math.PI / 6;
const ZOOM_STEP = 1.25;

const PAD_SIZE = 96;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

const btn: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  border: "none",
  background: "rgba(9,14,32,0.72)",
  color: "#fff",
  fontSize: 18,
  fontWeight: 700,
  fontFamily: "inherit",
  cursor: "pointer",
  pointerEvents: "auto",
  touchAction: "none"
};

/**
 * 시점 조작 위젯.
 *
 * 드래그와 휠로도 시점을 바꿀 수 있지만 화면에 단서가 없으면 아무도 찾지 못한다.
 * 항상 보이는 조작부를 둬서 처음 켠 학생도 각도를 바꿀 수 있게 한다.
 *
 * 값은 ref에 직접 쓴다. 상태로 두면 시점을 돌릴 때마다 리렌더가 일어난다.
 */
export function CameraPad({
  yawTarget,
  pitchTarget,
  zoomTarget
}: {
  yawTarget: NumberRef;
  pitchTarget: NumberRef;
  zoomTarget: NumberRef;
}) {
  const pad = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = pad.current;
    if (!el) return;

    const moveKnob = (dx: number, dy: number) => {
      if (!knob.current) return;
      const r = PAD_SIZE / 2 - 14;
      const len = Math.hypot(dx, dy) || 1;
      const s = Math.min(1, len / r) / len;
      knob.current.style.transform = `translate(${dx * s * r}px, ${dy * s * r}px)`;
    };

    const start = (x: number, y: number) => {
      dragging.current = true;
      last.current = { x, y };
    };
    const move = (x: number, y: number) => {
      if (!dragging.current) return;
      const rect = el.getBoundingClientRect();
      yawTarget.current += ((x - last.current.x) / rect.width) * YAW_PER_PAD;
      pitchTarget.current = clamp(
        pitchTarget.current + ((y - last.current.y) / rect.height) * PITCH_PER_PAD,
        PITCH_MIN,
        PITCH_MAX
      );
      last.current = { x, y };
      const c = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      moveKnob(x - c.x, y - c.y);
    };
    const end = () => {
      dragging.current = false;
      if (knob.current) knob.current.style.transform = "translate(0px, 0px)";
    };

    const onPointerDown = (e: PointerEvent) => {
      e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      start(e.clientX, e.clientY);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      e.stopPropagation();
      move(e.clientX, e.clientY);
    };
    const onPointerUp = (e: PointerEvent) => {
      e.stopPropagation();
      end();
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  }, [yawTarget, pitchTarget, zoomTarget]);

  const rotate = (dir: number) => () => {
    yawTarget.current += YAW_STEP * dir;
  };
  const zoom = (factor: number) => () => {
    zoomTarget.current = clamp(zoomTarget.current * factor, ZOOM_MIN, ZOOM_MAX);
  };

  return (
    <div
      data-ui="camera"
      style={{
        position: "fixed",
        right: 14,
        bottom: 14,
        zIndex: 15,
        display: "grid",
        gap: 8,
        justifyItems: "center",
        pointerEvents: "none"
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" style={btn} onClick={zoom(1 / ZOOM_STEP)} aria-label="확대">
          ＋
        </button>
        <button type="button" style={btn} onClick={zoom(ZOOM_STEP)} aria-label="축소">
          －
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" style={btn} onClick={rotate(-1)} aria-label="왼쪽으로 돌리기">
          ↺
        </button>

        <div
          ref={pad}
          aria-label="시점 조작"
          style={{
            width: PAD_SIZE,
            height: PAD_SIZE,
            borderRadius: "50%",
            background: "rgba(9,14,32,0.6)",
            border: "2px solid rgba(255,255,255,0.28)",
            display: "grid",
            placeItems: "center",
            pointerEvents: "auto",
            touchAction: "none",
            cursor: "grab"
          }}
        >
          <div
            ref={knob}
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.75)",
              pointerEvents: "none"
            }}
          />
        </div>

        <button type="button" style={btn} onClick={rotate(1)} aria-label="오른쪽으로 돌리기">
          ↻
        </button>
      </div>

      <div
        style={{
          fontSize: 11,
          opacity: 0.7,
          background: "rgba(9,14,32,0.6)",
          borderRadius: 8,
          padding: "3px 8px"
        }}
      >
        시점
      </div>
    </div>
  );
}
