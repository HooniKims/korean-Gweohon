"use client";

import { useCallback, useEffect, useState } from "react";
import { STAGES } from "@/game/stages";
import { parseWordBank, planSpawns, type WordBank } from "@/game/words";
import { useInput } from "@/input/useInput";
import { VirtualStick } from "@/input/VirtualStick";
import { GameCanvas } from "@/three/GameCanvas";
import { useGameStore } from "@/store/gameStore";
import { Hud } from "./Hud";
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
  const { vector, stick } = useInput();

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

  if (error) {
    return <main style={centered}>사전을 읽지 못했습니다: {error}</main>;
  }
  if (!bank) {
    return <main style={centered}>준비 중…</main>;
  }

  return (
    <>
      <GameCanvas inputRef={vector} debugElementId={showDebug ? DEBUG_ID : undefined} />
      <Hud />
      <VirtualStick stick={stick} />
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
