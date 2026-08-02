"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { BallCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useRef } from "react";
import { canPickUp, speedMultiplier } from "@/game/growth";
import { isTouchingPath, placeSpawns } from "@/game/layout";
import { rotateInput, torqueForInput } from "@/game/rolling";
import { createStuckState, updateStuck } from "@/game/stuck";
import { useGameStore } from "@/store/gameStore";
import {
  KEY_ROTATE_SPEED,
  YAW_SIGN,
  type InputRef,
  type NumberRef
} from "@/input/useInput";
import { Vector3, type Group, type Mesh, type Object3D } from "three";

/** 매 프레임 새 객체를 만들지 않도록 재사용한다. */
const worldPos = new Vector3();
import {
  ballMotion,
  ballPosition,
  ballSpin,
  cameraState,
  coreDebug,
  fallDebug
} from "./ballTracker";
import { measureModel } from "./measureModel";
import { livePosition } from "./spawnPositions";
import { CORE_MODEL } from "./modelRegistry";

/**
 * 토크 계수. 관성모멘트(I ∝ m·r²)에 비례해 토크를 주므로 공이 커져도
 * 각가속도가 일정하다. 체감 속도는 플레이테스트에서 이 값으로 조율한다.
 */
const TORQUE_K = 55;
/**
 * 최대 각속도. 공이 통제 불능으로 빨라지는 것을 막는다.
 * 선속도는 ω·r이므로 5cm 공은 약 0.65m/s, 20cm 공은 2.6m/s까지 난다.
 *
 * 선속도 상한으로 바꿔 초반을 빠르게 해봤지만 자동 플레이 성적이 12/15에서
 * 1/15로 떨어졌다. 감쇠를 낮춰 빠르게 만들면 공이 미끄러워 목표를 지나치고
 * 궤도를 돈다. 굴리는 재미는 속도보다 「멈출 수 있는가」에 달려 있다.
 */
const MAX_ANGULAR_SPEED = 26;
/** 이 높이보다 아래로 떨어지면 필드 밖으로 나간 것으로 본다. */
const FALL_LIMIT_Y = -0.6;
/**
 * 이 거리 안에 붙일 수 있는 목표가 있으면 조준 중으로 본다.
 * 카메라가 회전을 멈춰 화면이 고정되고, 마지막 한 뼘을 좁힐 수 있다.
 */
const AIM_RANGE_M = 0.75;
/** 안내 문구를 띄워 두는 시간(초) */
const NOTICE_SEC = 1.8;
/** 끼였을 때 뒤로 밀어주는 세기 (질량 대비) */
const ESCAPE_PUSH = 1.1;
/** 끼였을 때 살짝 띄우는 세기. 사물 위로 타 넘도록 돕는다. */
const ESCAPE_LIFT = 1.5;

/**
 * 카타마리 코어. 품사색 틴트 대상이 아니라 Tripo 원본 색을 그대로 쓴다.
 * 지름이 바뀔 때만 스케일을 다시 계산한다(부착 순간에만 일어남).
 */
function KatamariCore({ radius }: { radius: number }) {
  const { scene } = useGLTF(CORE_MODEL);

  const { object, scale } = useMemo(() => {
    const object: Object3D = scene.clone(true);
    object.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.isMesh) mesh.castShadow = true;
    });
    const bounds = measureModel(object);
    object.position.set(-bounds.center.x, -bounds.center.y, -bounds.center.z);
    const scale = (radius * 2) / bounds.longest;
    coreDebug.baseSize = bounds.longest;
    coreDebug.scale = scale;
    return { object, scale };
  }, [scene, radius]);

  return (
    <group scale={scale}>
      <primitive object={object} dispose={null} />
    </group>
  );
}

export function Katamari({
  inputRef,
  yawTarget
}: {
  inputRef: InputRef;
  yawTarget: NumberRef;
}) {
  const body = useRef<RapierRigidBody>(null);
  const visual = useRef<Group>(null);
  // 프레임 사이 이동을 선분으로 보기 위한 직전 위치
  const prevBall = useRef({ x: 0, z: 0 });
  const noticeHold = useRef(0);
  const stuck = useRef(createStuckState());
  const frameWindow = useRef(0);
  const frameWorst = useRef(0);
  const frameHitches = useRef(0);

  const spawns = useGameStore((st) => st.spawns);
  const diameterM = useGameStore((st) => st.diameterM);
  const radius = diameterM / 2;

  // Q·E 키 회전 상태. 리렌더를 유발하지 않도록 ref로 둔다.
  const keyRotate = useRef(0);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "KeyQ") keyRotate.current = -1;
      if (e.code === "KeyE") keyRotate.current = 1;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "KeyQ" || e.code === "KeyE") keyRotate.current = 0;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Field와 같은 좌표를 써야 한다. game/layout이 유일한 출처다.
  const points = useMemo(() => placeSpawns(spawns.map((s) => ({ sizeM: s.sizeM, isTarget: s.isTarget }))), [spawns]);

  useFrame((_, delta) => {
    const rb = body.current;
    // 해제된 바디를 읽으면 Rapier WASM이 트랩을 밟고 물리 월드가 통째로 망가진다.
    // 그 뒤로는 매 프레임 예외가 나서 게임이 멈춘다. WordObject와 같은 이유다.
    if (!rb || !rb.isValid()) return;

    // 카메라가 따라갈 위치는 화면에 실제로 그려진 좌표에서 읽는다.
    // 물리 원시 좌표는 60Hz로 갱신되는데 메시는 그 사이를 보간해 그려지므로,
    // 원시 좌표를 따라가면 공이 카메라 안에서 미세하게 떨린다.
    const t = rb.translation();
    const visualGroup = visual.current;
    if (visualGroup) {
      visualGroup.getWorldPosition(worldPos);
      ballPosition.x = worldPos.x;
      ballPosition.y = worldPos.y;
      ballPosition.z = worldPos.z;
    } else {
      ballPosition.x = t.x;
      ballPosition.y = t.y;
      ballPosition.z = t.z;
    }

    const rot = rb.rotation();
    ballSpin.x = rot.x;
    ballSpin.y = rot.y;
    ballSpin.z = rot.z;
    ballSpin.w = rot.w;

    const lv = rb.linvel();
    const av = rb.angvel();
    ballMotion.speed = Math.hypot(lv.x, lv.z);
    if (ballMotion.speed > 0.02) {
      ballMotion.dirX = lv.x;
      ballMotion.dirZ = lv.z;
    }
    ballMotion.angularSpeed = Math.hypot(av.x, av.y, av.z);
    ballMotion.fps = delta > 0 ? 1 / delta : 0;

    // 끊김 계측. 평균 fps가 60이어도 가끔 튀는 프레임이 있으면 손에는 끊겨 느껴진다.
    const ms = delta * 1000;
    frameWindow.current += delta;
    if (ms > frameWorst.current) frameWorst.current = ms;
    if (ms > 33) frameHitches.current += 1;
    if (frameWindow.current >= 2) {
      ballMotion.worstMs = frameWorst.current;
      ballMotion.hitches = frameHitches.current;
      frameWindow.current = 0;
      frameWorst.current = 0;
      frameHitches.current = 0;
    }

    // 어떤 이유로든 필드 밖으로 떨어지면 되돌린다. 끝없이 떨어지면 판이 죽는다.
    if (t.y < FALL_LIMIT_Y) {
      fallDebug.resets += 1;
      rb.setTranslation({ x: 0, y: 0.4, z: 0 }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    const s = useGameStore.getState();
    if (s.phase !== "playing") return;

    // 시간 흐름. 스토어는 초가 바뀔 때만 갱신된다.
    s.tick(delta);

    // 부착 판정. 충돌 이벤트를 쓰면 빠를 때 작은 사물을 통과해 버린다.
    const ball = { x: t.x, z: t.z, diameterM: s.diameterM };
    let bumpedTooBig: string | null = null;
    // 붙일 수 있는 목표 중 가장 가까운 거리. 카메라 조준 고정에 쓴다.
    let nearestPickable = Infinity;
    for (let i = 0; i < s.spawns.length; i += 1) {
      if (s.attachedIds.includes(i)) continue;
      const spawn = s.spawns[i];
      const spawned = points[i];
      if (!spawn || !spawned) continue;
      // 밀려 움직였을 수 있으므로 실제 위치로 판정한다
      const point = livePosition(i, spawned);
      const objectDiameterM = spawn.sizeM;
      if (canPickUp(s.diameterM, objectDiameterM)) {
        const gap = Math.hypot(ball.x - point.x, ball.z - point.z);
        if (gap < nearestPickable) nearestPickable = gap;
      }

      if (!isTouchingPath(prevBall.current, ball, s.diameterM, point, objectDiameterM))
        continue;

      if (!canPickUp(s.diameterM, objectDiameterM)) {
        // 튕겨나가는 이유를 알려준다. 신호가 없으면 학생은 버그로 여긴다.
        bumpedTooBig = spawn.entry.text;
        continue;
      }
      s.pickUp(i);
      bumpedTooBig = null;
      break; // 한 프레임에 하나만 붙인다
    }

    ballMotion.aiming = nearestPickable < AIM_RANGE_M;
    // 다음 프레임의 경로 판정 시작점
    prevBall.current.x = ball.x;
    prevBall.current.z = ball.z;

    if (bumpedTooBig) {
      s.setNotice(`「${bumpedTooBig}」는 아직 너무 커요 — 더 키워서 오세요`);
      noticeHold.current = NOTICE_SEC;
    } else if (noticeHold.current > 0) {
      noticeHold.current -= delta;
      if (noticeHold.current <= 0) s.setNotice(null);
    }

    // Q·E 로도 시점을 돌린다
    if (keyRotate.current !== 0) {
      yawTarget.current += keyRotate.current * KEY_ROTATE_SPEED * delta * YAW_SIGN;
    }

    const raw = inputRef.current;
    if (raw.x === 0 && raw.y === 0) {
      stuck.current = updateStuck(stuck.current, {
        pushing: false,
        speed: ballMotion.speed,
        deltaSec: delta
      });
      return;
    }
    // 카메라가 돈 만큼 입력도 돌려야 「화면 위 = 앞으로」가 유지된다
    const v = rotateInput(raw, cameraState.yaw);

    // 끼임 감지. 밀고 있는데도 제자리면 위로 살짝 띄우고 뒤로 밀어 빼낸다.
    stuck.current = updateStuck(stuck.current, {
      pushing: true,
      speed: ballMotion.speed,
      deltaSec: delta
    });
    if (stuck.current.escape) {
      const m = rb.mass();
      rb.applyImpulse(
        { x: -v.x * m * ESCAPE_PUSH, y: m * ESCAPE_LIFT, z: v.y * m * ESCAPE_PUSH },
        true
      );
      s.setNotice("끼었어요 — 다른 길로 돌아가 보세요");
      noticeHold.current = NOTICE_SEC;
    }

    // 각속도 상한에 걸렸으면 더 밀지 않는다
    if (ballMotion.angularSpeed > MAX_ANGULAR_SPEED) return;

    // 부착밀이 많으면 느려진다
    const mul = speedMultiplier(s.misfits);
    const r = s.diameterM / 2;
    const strength = TORQUE_K * rb.mass() * r * r * mul * delta;

    rb.applyTorqueImpulse(torqueForInput(v, strength), true);
  });

  return (
    <RigidBody
      ref={body}
      name="katamari"
      colliders={false}
      position={[0, 0.4, 0]}
      linearDamping={0.08}
      angularDamping={0.12}
      friction={1.4}
      restitution={0.05}
    >
      {/* 지름이 바뀔 때만 콜라이더가 다시 만들어진다 (부착 순간에만 일어남) */}
      <BallCollider args={[radius]} />
      <group ref={visual}>
        <KatamariCore radius={radius} />
      </group>
    </RigidBody>
  );
}
