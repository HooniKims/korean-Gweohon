"use client";

import { POS_COLORS } from "@/game/pos";
import { formatDiameter } from "@/game/units";
import { useGameStore } from "@/store/gameStore";

const URGENT_SEC = 20;

const box: React.CSSProperties = {
  background: "rgba(9,14,32,0.72)",
  borderRadius: 12,
  padding: "8px 14px",
  fontWeight: 700,
  fontSize: 16,
  whiteSpace: "nowrap"
};

/**
 * 스토어를 값 단위로 골라 구독한다. 통째로 구독하면 관계없는 값이 바뀔 때도
 * 리렌더가 일어난다.
 */
export function Hud() {
  const stage = useGameStore((s) => s.stage);
  const collected = useGameStore((s) => s.collected);
  const misfits = useGameStore((s) => s.misfits);
  const diameterM = useGameStore((s) => s.diameterM);
  const secondsLeft = useGameStore((s) => s.secondsLeft);

  if (!stage) return null;

  const urgent = secondsLeft <= URGENT_SEC;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        padding: 12,
        pointerEvents: "none"
      }}
    >
      <div style={{ ...box, color: urgent ? "#fca5a5" : "#fff", minWidth: 58, textAlign: "center" }}>
        {Math.ceil(secondsLeft)}
      </div>

      <div style={{ ...box, color: POS_COLORS[stage.targetPos] }}>
        「{stage.targetPos}」
      </div>

      <div style={box}>
        {collected} / {stage.targetCount}
      </div>

      <div style={box}>{formatDiameter(diameterM)}</div>

      {misfits > 0 && <div style={{ ...box, color: "#fca5a5" }}>부착밀 {misfits}</div>}
    </div>
  );
}
