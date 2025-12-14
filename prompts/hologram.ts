/**
 * 3D 영상 생성을 위한 프롬프트 관리
 */

/**
 * 기본 3D 변환 프롬프트
 */
export const BASE_HOLOGRAM_PROMPT = `Transform the 2D image into a 3D video representation on a pure black (#000000) background.

The subject should be converted from 2D to 3D with depth and dimensionality.
Keep all original details, colors and proportions of the subject.
The background must remain pure black (#000000) at all times.

No shadows, no reflections, no particles, no added objects.
Lighting stays consistent and clean.`;

/**
 * 사용자 프롬프트와 기본 프롬프트를 결합하여 최종 프롬프트 생성
 * @param userPrompt 사용자가 입력한 추가 프롬프트 (선택사항)
 * @returns 최종 프롬프트 문자열
 */
export function createHologramPrompt(userPrompt?: string): string {
  const trimmedUserPrompt = userPrompt?.trim();
  
  if (trimmedUserPrompt) {
    return `${BASE_HOLOGRAM_PROMPT}\n\nAdditional requirements: ${trimmedUserPrompt}`;
  }
  
  return BASE_HOLOGRAM_PROMPT;
}
