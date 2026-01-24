/**
 * 3D 영상 생성을 위한 프롬프트 관리
 */

/**
 * 1면 홀로그램용 최적화된 프롬프트 v3 (잘린 부분 복원 기능 추가)
 * 주요 개선:
 * - 보이지 않는 부분(뒷면, 옆면, 깊이) 추론 명시
 * - 잘린 신체 부위 자동 복원 기능 추가 ✨ NEW
 * - 15-45도 각도 제한 제거 → 완전한 자유도
 * - 적극적 어투로 개선 (포함→만드세요)
 * - 평면 아님 강조 (not just a flat cutout)
 * - 사용자 프롬프트 우선도 향상
 */
export const BASE_HOLOGRAM_PROMPT_1SIDE = `Transform the 2D image into a full three-dimensional form by inferring and constructing the unseen parts (back, sides, depth). The subject should exist as a complete 3D entity that looks natural from any angle, not just a flat cutout.

Goal: Create a solid, volumetric subject that feels truly three-dimensional, then animate it actively according to user requirements.

Background: Pure black (#000000) at all times.

CRITICAL - Restore Missing Parts:
If the input image shows a cropped subject with cut-off limbs, arms, legs, feet, hands, or any body parts, intelligently reconstruct and complete these missing parts to create a full, intact figure. Infer the natural continuation of any truncated body parts based on visible anatomy and proportions. The subject should appear as a complete, whole entity with all body parts fully formed.

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
2D 이미지를 보이지 않는 부분(뒷면, 옆면, 깊이)을 추론하고 구성하여 
완전한 3차원 형태로 변환하세요. 
피사체는 평면 오려내기가 아니라, 어느 각도에서든 자연스럽게 보이는 
완전한 3D 개체로 존재해야 합니다.

목표: 진정으로 3차원으로 느껴지는 단단하고 입체적인 피사체를 만든 다음, 
사용자 요구사항에 따라 적극적으로 애니메이션하세요.

배경: 항상 순수한 검은색(#000000).

중요 - 잘린 부분 복원:
입력 이미지가 팔다리, 팔, 다리, 발, 손 또는 신체 일부가 잘린 상태로 
나타난다면, 이러한 누락된 부분을 지능적으로 재구성하고 완성하여 
온전한 전체 형상을 만드세요. 보이는 해부학적 구조와 비율을 기반으로 
잘린 신체 부위의 자연스러운 연장선을 추론하세요. 
피사체는 모든 신체 부위가 완전히 형성된 완전하고 온전한 개체로 
보여야 합니다.

중요 - 원본 외형 보존:
입력 이미지에서 보이는 어떤 특성도 변경하지 마세요. 얼굴, 특징, 색상, 비율 - 
보이는 모든 것은 정확히 그대로 유지되어야 합니다. 
보이지 않는 부분만 자연스럽게 구성하세요.

중요 - 프레임 안 유지:
전체 피사체가 항상 보여야 합니다. 어떤 부분도 프레임 밖으로 나가거나 
잘리지 않도록 하세요. 피사체는 프레임 중앙 75% 영역 안에서만 움직일 수 있습니다.

깊이감 있는 움직임:
피사체가 움직일 때 진정으로 3D로 느껴지도록 깊이와 부피를 가진 
애니메이션을 만드세요. 움직임은 자연스럽게 여러 각도에서 
피사체의 입체적 특성을 보여줘야 합니다.

사용자 요구사항:
프레임 경계를 존중하면서 사용자 지시사항에 따라 움직임과 동작을 
적극적이고 역동적으로 따르세요.

카메라: 전체에 걸쳐 완전히 고정.

루프: 첫 번째와 마지막 프레임이 자연스럽게 일치하는 완벽한 끊김 없는 루프.

조명: 깨끗하고, 중립적이며, 일관성 있음. 그림자, 반사, 추가 요소 없음.
 */

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
