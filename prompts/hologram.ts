/**
 * 3D 영상 생성을 위한 프롬프트 관리
 */

/**
 * 1면 홀로그램용 최적화된 프롬프트 v2 (2D→3D 추론, 자유로운 움직임)
 * 주요 개선:
 * - 보이지 않는 부분(뒷면, 옆면, 깊이) 추론 명시
 * - 15-45도 각도 제한 제거 → 완전한 자유도
 * - 적극적 어투로 개선 (포함→만드세요)
 * - 평면 아님 강조 (not just a flat cutout)
 * - 사용자 프롬프트 우선도 향상
 */
export const BASE_HOLOGRAM_PROMPT_1SIDE = `Transform the 2D image into a full three-dimensional form by inferring and constructing the unseen parts (back, sides, depth). The subject should exist as a complete 3D entity that looks natural from any angle, not just a flat cutout.

Goal: Create a solid, volumetric subject that feels truly three-dimensional, then animate it actively according to user requirements.

Background: Pure black (#000000) at all times.

CRITICAL - Preserve Original Appearance:
Do NOT alter ANY visible characteristics from the input image. Face, features, colors, proportions - everything visible must remain EXACTLY as shown. Only construct the unseen parts naturally.

CRITICAL - Keep in Frame:
The ENTIRE subject must stay visible at all times. Never allow any part to go outside the frame or get cropped. Subject can move within the central 75% of frame area only.

Movement with Depth:
Animate the subject with depth and volume that makes it feel truly 3D as it moves. Movement should showcase the subject's dimensional nature from various perspectives naturally.

User Requirements:
Follow user instructions for movement and actions actively and dynamically while respecting frame boundaries.

Camera: Completely static throughout.

Loop: Perfect seamless loop where first and last frames match naturally.

Lighting: Clean, neutral, consistent. No shadows, reflections, or added elements.`;

/**
 * 4면 홀로그램용 기본 3D 변환 프롬프트 (회전 없음, 자유도 높음)
 */
export const BASE_HOLOGRAM_PROMPT_4SIDES = `Transform the input image into a seamless looping 3D holographic-style video.

The background must remain pure black (#000000) at all times.

Convert the subject into a strong semi-3D, volumetric form with clear depth and dimensionality, making it appear as a floating 3D object in space.

CRITICAL: Do not alter, modify, or change ANY characteristics of the original character or subject. The character's face, facial features, facial expressions, body, proportions, textures, colors, and ALL details must remain EXACTLY as they appear in the input image. Absolutely do not modify the face, expressions, or any details. The character's appearance must remain completely identical to the original - no changes whatsoever.

Preserve all original details, colors, proportions, textures, facial features, expressions, and distinctive characteristics exactly as the input image.

The subject can move and animate naturally with more freedom and variety. The subject can perform subtle movements such as gentle swaying, slight bobbing, natural breathing motions, or other organic movements that enhance the 3D effect. The movement should be smooth, natural, and add life to the character while maintaining the character's original appearance.
IMPORTANT: Keep the entire subject fully visible within the frame at all times. Do not crop, cut off, or hide any part of the subject. Ensure all parts of the subject remain completely visible throughout the entire video.
The camera remains completely static. Do not rotate the subject - the subject should remain in its original orientation.

Create a perfect seamless loop where the first and last frames match naturally, allowing continuous infinite playback.

Lighting is clean, neutral, and consistent.
No shadows, no reflections, no particles, no added elements.`;

/**
 * 사용자 프롬프트와 기본 프롬프트를 결합하여 최종 프롬프트 생성
 * @param userPrompt 사용자가 입력한 추가 프롬프트 (선택사항)
 * @param hologramType 홀로그램 타입 ("1side" | "4sides")
 * @returns 최종 프롬프트 문자열
 */
export function createHologramPrompt(userPrompt?: string, hologramType: "1side" | "4sides" = "1side"): string {
  const basePrompt = hologramType === "4sides" ? BASE_HOLOGRAM_PROMPT_4SIDES : BASE_HOLOGRAM_PROMPT_1SIDE;
  const trimmedUserPrompt = userPrompt?.trim();
  
  if (trimmedUserPrompt) {
    return `${basePrompt}\n\nAdditional requirements: ${trimmedUserPrompt}`;
  }
  
  return basePrompt;
}
