/**
 * 3D 영상 생성을 위한 프롬프트 관리
 */

/**
 * 기본 3D 변환 프롬프트
 */
export const BASE_HOLOGRAM_PROMPT = `Transform the input image into a seamless looping 3D holographic-style video.

The background must remain pure black (#000000) at all times.

Convert the subject into a strong semi-3D, volumetric form with clear depth and dimensionality, making it appear as a floating 3D object in space.

IMPORTANT: Do not alter any characteristics of the original character or subject. Preserve the face, body, features, and all details exactly as they appear in the input image. Keep all original facial features, body proportions, textures, colors, and distinctive characteristics completely unchanged. The character's appearance must remain identical to the original.

Preserve all original details, colors, proportions, and textures exactly as the input image.

The subject can move and animate naturally according to the requirements, while staying generally centered in the frame.
Use object-based motion, such as self-rotation or depth parallax, to enhance the 3D effect.
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
