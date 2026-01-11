/**
 * 3D 영상 생성을 위한 프롬프트 관리
 */

/**
 * 기본 3D 변환 프롬프트
 */
export const BASE_HOLOGRAM_PROMPT = `Transform the input image into a seamless looping 3D holographic-style video.

The background must remain pure black (#000000) at all times.

Convert the subject into a strong semi-3D, volumetric form with clear depth and dimensionality, making it 3D object in space.
Preserve all original details, colors, proportions, and textures exactly as the input image.

The subject stays centered and stable.
Use only subtle object-based motion, such as very slow self-rotation or gentle depth parallax, to enhance the 3D effect.
The camera remains completely static.

Create a perfect seamless loop where the first and last frames match naturally, allowing continuous infinite playback.

Lighting is clean, neutral, and consistent.
No shadows, no reflections, no particles, no added elements.`;

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
