/**
 * 3D 영상 생성을 위한 프롬프트 관리
 */

/**
 * 기본 3D 변환 프롬프트
 */
export const BASE_HOLOGRAM_PROMPT = `Transform the 2D image into a seamless looping 3D holographic video on a pure black (#000000) background.

Create a perfect seamless loop where the first frame matches the last frame exactly, allowing infinite continuous playback.

Convert the subject from 2D to 3D with strong depth, dimensionality, and volumetric presence. Use subtle parallax movement and gentle rotation to enhance the 3D illusion. The subject should appear as a floating 3D object with depth perception.

Add subtle camera movement with gentle circular or orbital motion around the subject to maximize the 3D effect while keeping the subject centered.

Keep all original details, colors, proportions, and textures of the subject. The background must remain pure black (#000000) at all times with no variation.

No shadows, no reflections, no particles, no added objects, no background elements.
Lighting stays consistent, clean, and evenly distributed to maintain the holographic appearance.

The animation should be smooth, continuous, and designed to loop perfectly without any visible cuts or jumps.`;

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
