"use client";

// drei의 Cloud는 볼류메트릭이라 카메라 앞을 뒤덮어 화면이 하얘진다. 쓰지 않는다.
import { Sky, Sparkles } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Suspense } from "react";
import { FIELD_RADIUS } from "@/game/layout";
import type { InputRef, NumberRef } from "@/input/useInput";
import { ChaseCamera } from "./ChaseCamera";
import { DebugReadout } from "./DebugReadout";
import { Field } from "./Field";
import { Katamari } from "./Katamari";
import { Roller } from "./Roller";
import { Scatter } from "./Scatter";
import { Stage } from "./Stage";

/** 화각이 넓으면 가까운 사물이 화면을 덮고 원근이 과장된다. */
const CAMERA = {
  position: [0, 0.3, 0.6] as [number, number, number],
  fov: 42,
  near: 0.01,
  far: 200
};

/**
 * 조명.
 *
 * 밋밋함의 절반은 조명이다. 방향광 하나로는 그림자가 시커멓고 색이 죽는다.
 * 주광(해) + 반대편 보조광 + 하늘·땅 반구광 셋을 쓴다. 보조광이 그림자 쪽을
 * 살짝 띄워서 사물의 형태가 살아난다.
 */
function Lights() {
  const span = FIELD_RADIUS * 1.8;
  return (
    <>
      <hemisphereLight args={["#cfefff", "#4f9d68", 0.9]} />
      <directionalLight
        position={[5, 9, 4]}
        intensity={1.5}
        color="#fff6e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
        shadow-bias={-0.0008}
      />
      {/* 그림자 쪽을 띄우는 보조광. 그림자를 만들지 않는다. */}
      <directionalLight position={[-4, 3, -5]} intensity={0.5} color="#bcd9ff" />
    </>
  );
}

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
      shadows="soft"
      dpr={[1, 1.5]}
      camera={CAMERA}
      style={{ position: "fixed", inset: 0 }}
    >
      {/* 하늘은 절차적으로 그린다. 파일을 받지 않으므로 오프라인에서도 나온다. */}
      <Sky
        distance={450}
        sunPosition={[5, 0.7, 4]}
        turbidity={5}
        rayleigh={0.9}
        mieCoefficient={0.006}
        mieDirectionalG={0.85}
      />
      {/* 먼 곳을 하늘색으로 흐리게 해서 바닥이 뚝 끊기지 않게 한다. */}
      <fog attach="fog" args={["#cfe8f5", FIELD_RADIUS * 3.5, FIELD_RADIUS * 13]} />
      <Lights />

      <Suspense fallback={null}>
        <Stage />
        <Scatter />
      </Suspense>

      {/* 공기 중에 떠다니는 반짝임. 정지 화면에도 미세한 움직임이 생긴다. */}
      <Sparkles
        count={40}
        scale={[FIELD_RADIUS * 2, 1.2, FIELD_RADIUS * 2]}
        position={[0, 0.6, 0]}
        size={2.5}
        speed={0.3}
        opacity={0.5}
        color="#ffffff"
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

      <ChaseCamera
        yawTarget={yawTarget}
        pitchTarget={pitchTarget}
        zoomTarget={zoomTarget}
      />
      {debugElementId && <DebugReadout elementId={debugElementId} />}

      {/*
        후처리. 세게 주면 화면이 뿌옇게 뭉개져 라벨을 읽을 수 없다. 블룸은 밝은
        부분만 살짝 번지게 하고, 비네트로 가장자리만 눌러 시선을 가운데로 모은다.
      */}
      <EffectComposer enableNormalPass={false}>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.72}
          luminanceSmoothing={0.3}
          mipmapBlur
        />
        <Vignette offset={0.32} darkness={0.4} />
      </EffectComposer>
    </Canvas>
  );
}
