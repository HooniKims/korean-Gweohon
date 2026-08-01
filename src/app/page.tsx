"use client";

import dynamic from "next/dynamic";

// 3D 캔버스는 서버에서 렌더할 수 없다.
const GameShell = dynamic(() => import("@/ui/GameShell").then((m) => m.GameShell), {
  ssr: false,
  loading: () => <main style={{ padding: 24 }}>불러오는 중…</main>
});

export default function Page() {
  return <GameShell />;
}
