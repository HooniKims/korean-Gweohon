"use client";

import { useCallback, useEffect, useState } from "react";
import { placeSpawns } from "@/game/layout";
import { STAGES } from "@/game/stages";
import { ballPosition } from "@/three/ballTracker";
import { parseWordBank, planSpawns, type WordBank } from "@/game/words";
import { useInput } from "@/input/useInput";
import { VirtualStick } from "@/input/VirtualStick";
import { GameCanvas } from "@/three/GameCanvas";
import { refreshLabelsWhenFontReady } from "@/three/labelTexture";
import { preloadModels } from "@/three/modelRegistry";
import { useGameStore } from "@/store/gameStore";
import { CameraPad } from "./CameraPad";
import { ControlHint } from "./ControlHint";
import { Hud } from "./Hud";
import { Notice } from "./Notice";
import { ResultScreen } from "./ResultScreen";

const centered: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "grid",
  placeItems: "center",
  padding: 24,
  textAlign: "center"
};

const DEBUG_ID = "gweohon-debug";

/** ?debug=1 을 붙이면 계측값이 보인다. 플레이테스트에서 파라미터를 조율할 때 쓴다. */
function debugRequested(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("debug");
}

export function GameShell() {
  const [showDebug] = useState(debugRequested);
  const [bank, setBank] = useState<WordBank | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startStage = useGameStore((s) => s.startStage);
  const { vector, yawTarget, pitchTarget, zoomTarget, stick } = useInput();

  // 첫 부착에서 끊기지 않도록 모델을 미리 받는다
  useEffect(() => {
    preloadModels();
    refreshLabelsWhenFontReady();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/words.json")
      .then((r) => {
        if (!r.ok) throw new Error(`사전을 받지 못했습니다 (${r.status})`);
        return r.json();
      })
      .then((raw) => {
        if (!cancelled) setBank(parseWordBank(raw));
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "사전을 읽지 못했습니다");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const begin = useCallback(
    (loaded: WordBank) => {
      const stage = STAGES[0];
      const spawns = planSpawns(loaded, {
        targetPos: stage.targetPos,
        targetCount: stage.targetCount,
        decoyCount: stage.decoyCount,
        rng: Math.random
      });
      startStage(stage, spawns);
    },
    [startStage]
  );

  useEffect(() => {
    if (bank) begin(bank);
  }, [bank, begin]);

  // ?debug=1 일 때만 내부를 노출한다. 플레이 밸런스를 스크립트로 검증할 때 쓴다.
  useEffect(() => {
    if (!showDebug) return;
    (window as unknown as Record<string, unknown>).__gweohon = {
      store: useGameStore,
      placeSpawns,
      ballPosition
    };
  }, [showDebug]);

  if (error) {
    return <main style={centered}>사전을 읽지 못했습니다: {error}</main>;
  }
  if (!bank) {
    return <main style={centered}>준비 중…</main>;
  }

  return (
    <>
      <GameCanvas
        inputRef={vector}
        yawTarget={yawTarget}
        pitchTarget={pitchTarget}
        zoomTarget={zoomTarget}
        debugElementId={showDebug ? DEBUG_ID : undefined} />
      <Hud />
      <Notice />
      <VirtualStick stick={stick} />
      <ControlHint />
      <CameraPad
        yawTarget={yawTarget}
        pitchTarget={pitchTarget}
        zoomTarget={zoomTarget}
      />
      {showDebug && (
        <div
          id={DEBUG_ID}
          style={{
            position: "fixed",
            bottom: 8,
            left: 8,
            zIndex: 15,
            background: "rgba(9,14,32,0.72)",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
            fontFamily: "ui-monospace, monospace",
            pointerEvents: "none"
          }}
        />
      )}
      <ResultScreen onRetry={() => begin(bank)} />
    </>
  );
}
