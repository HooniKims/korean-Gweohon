"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { canPickUp } from "@/game/growth";
import { placeSpawns } from "@/game/layout";
import { useGameStore } from "@/store/gameStore";
import { ballMotion, ballPosition, cameraState, coreDebug, rollerDebug } from "./ballTracker";
import { measureFailures } from "./measureModel";

/**
 * 조작 감각과 부착 판정을 수치로 보여준다. 플레이테스트에서 파라미터를 조율할 때 쓴다.
 *
 * Canvas 안에 있지만 아무것도 렌더하지 않는다. DOM을 직접 만져서 리렌더를 피한다.
 * useFrame으로 setState를 부르면 프레임마다 리렌더되므로 절대 그렇게 하지 않는다.
 */
export function DebugReadout({ elementId }: { elementId: string }) {
  const spawns = useGameStore((s) => s.spawns);
  const points = useMemo(() => placeSpawns(spawns.map((s) => ({ sizeM: s.sizeM, isTarget: s.isTarget }))), [spawns]);

  useFrame(() => {
    const el = document.getElementById(elementId);
    if (!el) return;
    const s = useGameStore.getState();
    const d = s.diameterM;

    // 붙일 수 있는 사물 중 가장 가까운 것까지의 여유 거리
    let nearestGap = Infinity;
    let nearestName = "-";
    for (let i = 0; i < s.spawns.length; i += 1) {
      if (s.attachedIds.includes(i)) continue;
      const spawn = s.spawns[i];
      const p = points[i];
      if (!spawn || !p) continue;
      const od = spawn.sizeM;
      if (!canPickUp(d, od)) continue;
      const gap =
        Math.hypot(ballPosition.x - p.x, ballPosition.z - p.z) - (d / 2 + od / 2);
      if (gap < nearestGap) {
        nearestGap = gap;
        nearestName = spawn.entry.text;
      }
    }

    el.textContent = [
      `fps ${ballMotion.fps.toFixed(0)} 최악 ${ballMotion.worstMs.toFixed(0)}ms 끊김 ${ballMotion.hitches}`,
      `v ${ballMotion.speed.toFixed(2)}`,
      `d ${(d * 100).toFixed(1)}cm`,
      `pos ${ballPosition.x.toFixed(2)},${ballPosition.z.toFixed(2)}`,
      `스폰 ${s.spawns.length} 붙음 ${s.attachedIds.length}`,
      `최근접 ${nearestName} ${Number.isFinite(nearestGap) ? nearestGap.toFixed(3) : "없음"}m`,
      `roller s${rollerDebug.scale.toFixed(2)} @${rollerDebug.x.toFixed(2)},${rollerDebug.z.toFixed(2)} h${rollerDebug.height.toFixed(3)}`,
      `cam yaw ${cameraState.yaw.toFixed(2)} pitch ${cameraState.pitch.toFixed(2)} zoom ${cameraState.zoom.toFixed(2)}`,
      `측정실패 ${measureFailures.count} ${measureFailures.last.replace("/models/", "")}`
    ].join("  ·  ");
  });

  return null;
}
