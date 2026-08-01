"use client";

import { useEffect, useRef, useState } from "react";
import { vectorFromKeys, vectorFromStick, type InputVector } from "./inputVector";

export type InputRef = { current: InputVector };
export type NumberRef = { current: number };

export const STICK_RADIUS_PX = 60;
/**
 * 오른쪽으로 끌었을 때 yaw가 움직이는 부호.
 *
 * yaw는 카메라가 공에서 떨어져 있는 방향각이라, 오른쪽으로 끌어 시점을 오른쪽으로
 * 돌리려면 카메라가 반대쪽(-X)으로 가야 한다. 부호를 여기 한 곳에 두고 모든
 * 입력이 같이 쓴다 — 마우스와 버튼이 서로 반대로 도는 사고를 막는다.
 */
export const YAW_SIGN = -1;
/** 화면 가로 폭을 끝에서 끝까지 끌면 카메라가 이만큼 돈다(라디안). */
const ROTATE_PER_SCREEN_WIDTH = Math.PI * 3.0;
/** 화면 세로 폭을 끝에서 끝까지 끌면 시선이 이만큼 오르내린다(라디안). */
const PITCH_PER_SCREEN_HEIGHT = 2.4;
/** 시선 각도 범위. 너무 낮으면 지면에 파묻히고 너무 높으면 위에서 내려다보기만 한다. */
export const PITCH_MIN = 0.12;
export const PITCH_MAX = 1.15;
/** 확대/축소 배수 범위 */
export const ZOOM_MIN = 0.6;
export const ZOOM_MAX = 2.6;

/** 스틱 UI가 그릴 정보. 판정은 useInput이 소유하고 UI는 이걸 구독만 한다. */
export type StickVisual = {
  center: { x: number; y: number };
  knob: { x: number; y: number };
} | null;

export type InputHandles = {
  /** 이동 입력. 화면 기준 -1..1 */
  vector: InputRef;
  /** 카메라 목표 방향각(라디안). 드래그로 누적된다. */
  yawTarget: NumberRef;
  /** 카메라 목표 올려다보는 각(라디안). 위아래 드래그로 바뀐다. */
  pitchTarget: NumberRef;
  /** 카메라 거리 배수. 핀치·휠로 바뀐다. */
  zoomTarget: NumberRef;
  stick: StickVisual;
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * 화면 위 조작 UI에서 시작한 입력인지 본다.
 *
 * 시점 패드를 만졌는데 이동 스틱까지 같이 잡히면 공이 제멋대로 굴러간다.
 * UI에는 data-ui 속성을 달아 두고 여기서 걸러낸다.
 */
function fromUi(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("[data-ui]") !== null;
}

/**
 * 이동과 시점 회전을 함께 다룬다.
 *
 * - 이동: 첫 손가락(플로팅 스틱) / 방향키·WASD
 * - 시점: 두 번째 손가락 좌우 드래그 / 마우스 좌우 드래그 / Q·E
 *
 * 게임 루프는 ref만 읽는다. 값이 바뀔 때 리렌더가 일어나면 프레임이 떨어지므로
 * setState는 스틱 UI 표시용으로만 쓴다.
 */
export function useInput(): InputHandles {
  const vector = useRef<InputVector>({ x: 0, y: 0 });
  const yawTarget = useRef<number>(0);
  const pitchTarget = useRef<number>(0.55);
  const zoomTarget = useRef<number>(1);
  const pinchDist = useRef<number | null>(null);
  const pinchZoomStart = useRef<number>(1);
  const pressed = useRef<Set<string>>(new Set());
  const moveTouchId = useRef<number | null>(null);
  const moveCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rotateTouchId = useRef<number | null>(null);
  const rotateLastX = useRef<number>(0);
  const rotateLastY = useRef<number>(0);
  const mouseDown = useRef<boolean>(false);
  const mouseLastX = useRef<number>(0);
  const mouseLastY = useRef<number>(0);
  const [stick, setStick] = useState<StickVisual>(null);

  useEffect(() => {
    const yawPerPixel = () =>
      (YAW_SIGN * ROTATE_PER_SCREEN_WIDTH) / Math.max(1, window.innerWidth);
    const pitchPerPixel = () => PITCH_PER_SCREEN_HEIGHT / Math.max(1, window.innerHeight);
    const touchDistance = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    const applyKeys = () => {
      if (moveTouchId.current !== null) return; // 터치가 잡혀 있으면 터치가 우선
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
      moveTouchId.current = null;
      rotateTouchId.current = null;
      mouseDown.current = false;
      vector.current = { x: 0, y: 0 };
      setStick(null);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (fromUi(e.target)) return;
      for (const t of Array.from(e.changedTouches)) {
        if (moveTouchId.current === null) {
          moveTouchId.current = t.identifier;
          moveCenter.current = { x: t.clientX, y: t.clientY };
          vector.current = { x: 0, y: 0 };
          setStick({
            center: { x: t.clientX, y: t.clientY },
            knob: { x: t.clientX, y: t.clientY }
          });
        } else if (rotateTouchId.current === null) {
          // 두 번째 손가락은 시점 회전
          rotateTouchId.current = t.identifier;
          rotateLastX.current = t.clientX;
          rotateLastY.current = t.clientY;
        }
      }
      // 손가락 두 개가 닿아 있으면 벌리고 좁혀서 확대·축소
      if (e.touches.length >= 2) {
        pinchDist.current = touchDistance(e.touches[0], e.touches[1]);
        pinchZoomStart.current = zoomTarget.current;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      // 핀치가 잡혀 있으면 확대·축소가 우선이다. 시점 회전과 섞이면 둘 다 어긋난다.
      if (e.touches.length >= 2 && pinchDist.current !== null) {
        const now = touchDistance(e.touches[0], e.touches[1]);
        if (pinchDist.current > 0) {
          zoomTarget.current = clamp(
            pinchZoomStart.current * (pinchDist.current / now),
            ZOOM_MIN,
            ZOOM_MAX
          );
        }
        return;
      }
      for (const t of Array.from(e.touches)) {
        if (t.identifier === moveTouchId.current) {
          const point = { x: t.clientX, y: t.clientY };
          vector.current = vectorFromStick(moveCenter.current, point, STICK_RADIUS_PX);
          setStick({ center: moveCenter.current, knob: point });
        } else if (t.identifier === rotateTouchId.current) {
          yawTarget.current += (t.clientX - rotateLastX.current) * yawPerPixel();
          pitchTarget.current = clamp(
            pitchTarget.current + (t.clientY - rotateLastY.current) * pitchPerPixel(),
            PITCH_MIN,
            PITCH_MAX
          );
          rotateLastX.current = t.clientX;
          rotateLastY.current = t.clientY;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === moveTouchId.current) {
          moveTouchId.current = null;
          vector.current = vectorFromKeys(pressed.current);
          setStick(null);
        } else if (t.identifier === rotateTouchId.current) {
          rotateTouchId.current = null;
        }
      }
      if (e.touches.length < 2) pinchDist.current = null;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (fromUi(e.target)) return;
      mouseDown.current = true;
      mouseLastX.current = e.clientX;
      mouseLastY.current = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!mouseDown.current) return;
      yawTarget.current += (e.clientX - mouseLastX.current) * yawPerPixel();
      pitchTarget.current = clamp(
        pitchTarget.current + (e.clientY - mouseLastY.current) * pitchPerPixel(),
        PITCH_MIN,
        PITCH_MAX
      );
      mouseLastX.current = e.clientX;
      mouseLastY.current = e.clientY;
    };
    const onMouseUp = () => {
      mouseDown.current = false;
    };
    const onWheel = (e: WheelEvent) => {
      zoomTarget.current = clamp(
        zoomTarget.current * (1 + e.deltaY * 0.0015),
        ZOOM_MIN,
        ZOOM_MAX
      );
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("wheel", onWheel);
    };
  }, []);

  return { vector, yawTarget, pitchTarget, zoomTarget, stick };
}

/** Q·E 키로도 시점을 돌린다. 게임 루프에서 프레임마다 부른다. */
export const KEY_ROTATE_SPEED = 3.4;
