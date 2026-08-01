"use client";

import { useEffect, useState } from "react";

const SHOW_MS = 6000;

/**
 * 조작 안내. 처음 몇 초만 보여주고 사라진다.
 *
 * 안내가 없으면 학생은 공만 보고 무엇을 해야 하는지 알 수 없다. 첫 조작을
 * 하면 바로 감춘다 — 이미 알아낸 사람에게 계속 띄울 이유가 없다.
 */
export function ControlHint() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const hide = () => setVisible(false);
    const timer = setTimeout(hide, SHOW_MS);
    window.addEventListener("keydown", hide, { once: true });
    window.addEventListener("touchstart", hide, { once: true });
    window.addEventListener("mousedown", hide, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", hide);
      window.removeEventListener("touchstart", hide);
      window.removeEventListener("mousedown", hide);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 28,
        transform: "translateX(-50%)",
        zIndex: 12,
        display: "grid",
        gap: 6,
        padding: "12px 20px",
        borderRadius: 14,
        background: "rgba(9,14,32,0.78)",
        fontSize: 14,
        lineHeight: 1.6,
        textAlign: "center",
        pointerEvents: "none",
        whiteSpace: "nowrap"
      }}
    >
      <div style={{ fontWeight: 700, color: "#f4c542" }}>같은 품사를 굴려서 모으세요</div>
      <div>한 손가락으로 굴리기 · 두 번째 손가락으로 시점 회전 · 두 손가락으로 확대·축소</div>
      <div style={{ opacity: 0.75 }}>PC: 방향키·WASD로 굴리기 · 마우스 드래그로 시점 · 휠로 확대·축소</div>
    </div>
  );
}
