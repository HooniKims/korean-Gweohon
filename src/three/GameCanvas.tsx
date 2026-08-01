"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import type { InputRef } from "@/input/useInput";
import { ChaseCamera } from "./ChaseCamera";
import { Field } from "./Field";
import { Katamari } from "./Katamari";

export function GameCanvas({ inputRef }: { inputRef: InputRef }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.8, 1.5], fov: 55, near: 0.01, far: 200 }}
      style={{ position: "fixed", inset: 0 }}
    >
      <color attach="background" args={["#8ecae6"]} />
      <hemisphereLight intensity={0.75} groundColor="#3f6212" />
      <directionalLight
        position={[6, 10, 4]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <Physics gravity={[0, -9.81, 0]}>
        <Field />
        <Katamari inputRef={inputRef} />
      </Physics>
      <ChaseCamera />
    </Canvas>
  );
}
