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

export function GameShell() {
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
      <GameCanvas inputRef={vector} />
      <Hud />
      <VirtualStick stick={stick} />
      <ResultScreen onRetry={() => begin(bank)} />
    </>
  );
}
