"use client";

import { useGameStore } from "@/store/gameStore";

/**
 * 규칙을 알려주는 안내 문구.
 *
 * 공보다 큰 사물은 튕겨나가는데(괴혼의 핵심 규칙), 신호가 없으면 학생은 버그로
 * 여기고 같은 사물에 계속 부딪힌다. 왜 안 붙는지와 무엇을 해야 하는지를 함께
 * 말해준다.
 */
export function Notice() {
  const notice = useGameStore((s) => s.notice);
  if (!notice) return null;

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        top: 76,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 14,
        padding: "10px 18px",
        borderRadius: 12,
        background: "rgba(9,14,32,0.86)",
        border: "1px solid rgba(252,165,165,0.5)",
        color: "#fca5a5",
        fontSize: 15,
        fontWeight: 700,
        whiteSpace: "nowrap",
        pointerEvents: "none"
      }}
    >
      {notice}
    </div>
  );
}
