"use client";

import { useEffect, useRef, useState } from "react";
import { vectorFromKeys, vectorFromStick, type InputVector } from "./inputVector";

export type InputRef = { current: InputVector };

export const STICK_RADIUS_PX = 60;

/** 스틱 UI가 그릴 정보. 판정은 useInput이 소유하고 UI는 이걸 구독만 한다. */
export type StickVisual = {
  center: { x: number; y: number };
  knob: { x: number; y: number };
} | null;

/**
 * 키보드와 터치 스틱을 하나의 벡터로 합친다.
 *
 * 게임 루프는 ref만 읽는다. 벡터가 바뀔 때 리렌더가 일어나면 프레임이 떨어지므로
 * setState는 스틱 UI 표시용으로만 쓴다(터치 시작·끝, 이동 중 좌표).
 */
export function useInput(): { vector: InputRef; stick: StickVisual } {
  const vector = useRef<InputVector>({ x: 0, y: 0 });
  const pressed = useRef<Set<string>>(new Set());
  const touchId = useRef<number | null>(null);
  const touchCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [stick, setStick] = useState<StickVisual>(null);

  useEffect(() => {
    const applyKeys = () => {
      if (touchId.current !== null) return; // 터치가 잡혀 있으면 터치가 우선
      vector.current = vectorFromKeys(pressed.current);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      pressed.current.add(e.code);
      applyKeys();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      pressed.current.delete(e.code);
      applyKeys();
    };
    const onBlur = () => {
      pressed.current.clear();
      touchId.current = null;
      vector.current = { x: 0, y: 0 };
      setStick(null);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (touchId.current !== null) return; // 이미 잡은 손가락이 있으면 무시
      const t = e.changedTouches[0];
      if (!t) return;
      touchId.current = t.identifier;
      touchCenter.current = { x: t.clientX, y: t.clientY };
      vector.current = { x: 0, y: 0 };
      setStick({
        center: { x: t.clientX, y: t.clientY },
        knob: { x: t.clientX, y: t.clientY }
      });
    };

    const onTouchMove = (e: TouchEvent) => {
      const id = touchId.current;
      if (id === null) return;
      for (const t of Array.from(e.touches)) {
        if (t.identifier !== id) continue;
        const point = { x: t.clientX, y: t.clientY };
        vector.current = vectorFromStick(touchCenter.current, point, STICK_RADIUS_PX);
        setStick({ center: touchCenter.current, knob: point });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const id = touchId.current;
      if (id === null) return;
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== id) continue;
        touchId.current = null;
        vector.current = vectorFromKeys(pressed.current);
        setStick(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return { vector, stick };
}
