// assets/tripo/raw/*.glb → public/models/*.glb
//
// Tripo 원본은 하나에 3~12MB, 정점 29만 개다. 2cm로 보이는 클립에 그 정도는 필요 없고
// 태블릿에서 60개를 띄울 수도 없다. 단순화 → 텍스처 축소 → Draco 순으로 줄인다.
//
// 붙는 사물은 코드에서 품사색으로 머티리얼을 덮으므로 텍스처가 거의 쓰이지 않는다.
// 배경 프롭·대왕·보스는 색을 그대로 쓰므로 텍스처를 조금 크게 남긴다.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const RAW = "assets/tripo/raw";
const OUT = "public/models";

/** 품사색으로 덮어쓸 사물의 파일명 접두사 */
const TINTED_PREFIXES = ["xs_", "s_", "m_", "l_", "prop_"];

function isTinted(file) {
  return TINTED_PREFIXES.some((p) => file.startsWith(p));
}

/** 남길 삼각형 비율. 사물은 화면에서 작으니 과감하게 줄인다. */
function simplifyRatio(file) {
  if (file.startsWith("char_")) return 0.08; // 캐릭터는 형태가 중요하다
  return isTinted(file) ? 0.02 : 0.06;
}

function textureSize(file) {
  return isTinted(file) ? 64 : 512;
}

function human(bytes) {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${Math.round(bytes / 1024)}KB`;
}

function run(args) {
  execFileSync("npx", ["gltf-transform", ...args], {
    stdio: ["ignore", "ignore", "pipe"]
  });
}

if (!existsSync(RAW)) {
  console.log(`${RAW} 가 없습니다. Tripo에서 먼저 내려받으세요.`);
  process.exit(0);
}

mkdirSync(OUT, { recursive: true });

const files = readdirSync(RAW).filter((f) => f.endsWith(".glb")).sort();
if (files.length === 0) {
  console.log("raw GLB가 없습니다. Tripo에서 먼저 내려받으세요.");
  process.exit(0);
}

let before = 0;
let after = 0;
const failed = [];

for (const file of files) {
  const src = path.join(RAW, file);
  const dst = path.join(OUT, file);
  const tmp = path.join(tmpdir(), `gweohon-${file}`);
  const srcSize = statSync(src).size;
  before += srcSize;

  try {
    // 1) 삼각형 줄이기. Draco 앞에 해야 효과가 크다.
    run(["simplify", src, tmp, "--ratio", String(simplifyRatio(file)), "--error", "0.02"]);
    // 2) 텍스처 축소 + Draco 압축
    run([
      "optimize",
      tmp,
      dst,
      "--compress",
      "draco",
      "--texture-compress",
      "webp",
      "--texture-size",
      String(textureSize(file)),
      "--simplify",
      "false"
    ]);
    const dstSize = statSync(dst).size;
    after += dstSize;
    console.log(`${file.padEnd(28)} ${human(srcSize).padStart(7)} → ${human(dstSize)}`);
  } catch {
    failed.push(file);
    console.error(`실패: ${file}`);
  } finally {
    try {
      unlinkSync(tmp);
    } catch {
      /* 임시 파일이 없으면 무시 */
    }
  }
}

console.log(`\n${files.length - failed.length}/${files.length}개 압축`);
console.log(`합계 ${human(before)} → ${human(after)}`);
if (failed.length) {
  console.log(`실패: ${failed.join(", ")}`);
  process.exitCode = 1;
}
