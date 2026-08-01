"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense } from "react";
import type { InputRef, NumberRef } from "@/input/useInput";
import { ChaseCamera } from "./ChaseCamera";
import { DebugReadout } from "./DebugReadout";
import { Field } from "./Field";
import { Katamari } from "./Katamari";
import { Roller } from "./Roller";

/** 화각이 넓으면 가까운 사물이 화면을 덮고 원근이 과장된다. */
const CAMERA = { position: [0, 0.3, 0.6] as [number, number, number], fov: 42, near: 0.01, far: 200 };

export function GameCanvas({
  inputRef,
  yawTarget,
  pitchTarget,
  zoomTarget,
  debugElementId
}: {
  inputRef: InputRef;
  yawTarget: NumberRef;
  pitchTarget: NumberRef;
  zoomTarget: NumberRef;
  /** 값을 주면 그 id의 DOM에 계측값을 써넣는다. 플레이테스트용. */
  debugElementId?: string;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={CAMERA}
      style={{ position: "fixed", inset: 0 }}
    >
      {/* 배경과 조명은 Suspense 밖에 둔다. Physics가 WASM을 받는 동안에도 보여야 한다. */}
      <color attach="background" args={["#8ecae6"]} />
      <hemisphereLight intensity={0.75} groundColor="#3f6212" />
      <directionalLight
        position={[6, 10, 4]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/*
        Rapier는 WASM을 비동기로 받으며 서스펜드한다. Suspense 경계가 없으면
        Canvas 하위 전체가 커밋되지 않아 배경색조차 나오지 않는다.
      */}
      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]}>
          <Field />
          <Katamari inputRef={inputRef} yawTarget={yawTarget} />
        </Physics>
        <Roller />
      </Suspense>

      <ChaseCamera yawTarget={yawTarget} pitchTarget={pitchTarget} zoomTarget={zoomTarget} />
      {debugElementId && <DebugReadout elementId={debugElementId} />}
    </Canvas>
  );
}
