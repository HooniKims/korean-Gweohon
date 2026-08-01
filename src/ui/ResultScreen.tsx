"use client";

import { useMemo } from "react";
import { POS_COLORS } from "@/game/pos";
import { accuracy } from "@/game/scoring";
import { formatDiameter } from "@/game/units";
import { misfitWords, useGameStore } from "@/store/gameStore";

export function ResultScreen({ onRetry }: { onRetry: () => void }) {
  const phase = useGameStore((s) => s.phase);
  const stars = useGameStore((s) => s.stars);
  const score = useGameStore((s) => s.score);
  const diameterM = useGameStore((s) => s.diameterM);
  const collected = useGameStore((s) => s.collected);
  const stage = useGameStore((s) => s.stage);
  const spawns = useGameStore((s) => s.spawns);
  const attachedIds = useGameStore((s) => s.attachedIds);

  // 셀렉터 안에서 배열을 만들면 매 렌더마다 새 참조가 나와 무한 리렌더가 된다.
  // 원본 참조를 구독하고 파생은 useMemo로 한다.
  const misfits = useMemo(
    () => misfitWords({ spawns, attachedIds, stage }),
    [spawns, attachedIds, stage]
  );

  if (phase !== "cleared" && phase !== "failed") return null;

  const cleared = phase === "cleared";
  const acc = Math.round(accuracy(score) * 100);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 30,
        display: "grid",
        placeItems: "center",
        background: "rgba(4,8,20,0.86)",
        padding: 20,
        overflowY: "auto"
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 420, width: "100%" }}>
        <h1 style={{ fontSize: 30, marginBottom: 8 }}>
          {cleared ? "성공!" : "시간이 다 됐어요"}
        </h1>

        <div
          aria-label={`별 3개 중 ${stars}개`}
          style={{ fontSize: 34, letterSpacing: 6, marginBottom: 16, color: "#f4c542" }}
        >
          {"★".repeat(stars)}
          {"☆".repeat(3 - stars)}
        </div>

        <div style={{ display: "grid", gap: 6, marginBottom: 18, fontSize: 16 }}>
          <div>
            「{stage?.targetPos}」 {collected} / {stage?.targetCount}
          </div>
          <div>지름 {formatDiameter(diameterM)}</div>
          <div>
            {score.points}점 · 정확도 {acc}%
          </div>
        </div>

        {misfits.length > 0 && (
          <div
            style={{
              background: "rgba(255,255,255,0.07)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 18,
              textAlign: "left"
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8, color: "#fca5a5" }}>
              헷갈린 단어
            </div>
            <ul style={{ listStyle: "none", display: "grid", gap: 6 }}>
              {misfits.map((w, i) => (
                <li key={`${w.text}-${i}`} style={{ fontSize: 15 }}>
                  「{w.text}」는{" "}
                  <span style={{ color: POS_COLORS[w.pos], fontWeight: 700 }}>
                    {w.pos}
                  </span>
                  예요
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={onRetry}
          style={{
            fontSize: 18,
            fontWeight: 700,
            padding: "12px 28px",
            borderRadius: 12,
            border: "none",
            background: "#f4c542",
            color: "#111",
            cursor: "pointer"
          }}
        >
          다시하기
        </button>
      </div>
    </div>
  );
}
