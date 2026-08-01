/**
 * 내부 길이 단위는 미터. 화면 표기는 괴혼식으로 밀리미터까지 쪼갠다.
 * 「32cm 4mm」처럼 쓸데없이 정밀한 계측이 이 게임의 맛이다.
 */
export function formatDiameter(meters: number): string {
  const totalMm = Math.round(meters * 1000);
  const m = Math.floor(totalMm / 1000);
  const cm = Math.floor((totalMm % 1000) / 10);
  const mm = totalMm % 10;

  const parts: string[] = [];
  if (m > 0) parts.push(`${m}m`);
  if (cm > 0) parts.push(`${cm}cm`);
  if (mm > 0) parts.push(`${mm}mm`);
  if (parts.length === 0) return "0mm";
  return parts.join(" ");
}
