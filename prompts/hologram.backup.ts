/**
 * 3D 영상 생성을 위한 프롬프트 백업 파일
 * 1면 홀로그램 프롬프트 버전 히스토리
 */

/**
 * v1 - 1면 홀로그램용 기본 3D 변환 프롬프트 (회전 포함) - 원본
 * 작성일: 2025-01-23 초기
 * 특징: 360도 회전 강제, 홀로그램 스타일 명시
 */
export const BASE_HOLOGRAM_PROMPT_1SIDE_V1 = `Transform the input image into a seamless looping 3D holographic-style video.

The background must remain pure black (#000000) at all times.

Convert the subject into a strong semi-3D, volumetric form with clear depth and dimensionality, making it appear as a floating 3D object in space.

CRITICAL: Do not alter, modify, or change ANY characteristics of the original character or subject. The character's face, facial features, facial expressions, body, proportions, textures, colors, and ALL details must remain EXACTLY as they appear in the input image. Absolutely do not modify the face, expressions, or any details. The character's appearance must remain completely identical to the original - no changes whatsoever.

Preserve all original details, colors, proportions, textures, facial features, expressions, and distinctive characteristics exactly as the input image.

The subject can move and animate naturally according to the requirements, while staying generally centered in the frame.
IMPORTANT: Keep the entire subject fully visible within the frame at all times. Do not crop, cut off, or hide any part of the subject. Ensure all parts of the subject remain completely visible throughout the entire video.
The subject must rotate exactly one full 360-degree turn around the z-axis (depth axis) during the video. This complete rotation showcases the 3D depth and all angles of the character, making it appear more 3D. The rotation should be smooth and continuous throughout the entire video duration.
The camera remains completely static.

Create a perfect seamless loop where the first and last frames match naturally, allowing continuous infinite playback.

Lighting is clean, neutral, and consistent.
No shadows, no reflections, no particles, no added elements.`;

/**
 * v2 - 1면 홀로그램용 최적화된 프롬프트 (2D→3D 추론 명시)
 * 작성일: 2025-01-23 23:30
 * 주요 개선:
 * - 보이지 않는 부분(뒷면, 옆면, 깊이) 추론 명시
 * - 15-45도 각도 제한 제거 → 완전한 자유도
 * - 적극적 어투로 개선 (포함→만드세요)
 * - 평면 아님 강조 (not just a flat cutout)
 * - 사용자 프롬프트 우선도 향상
 * 문제점: 처리 시간 216초로 증가 (1080p), 추론 명시로 인한 복잡도 증가
 */
export const BASE_HOLOGRAM_PROMPT_1SIDE_V2 = `Transform the 2D image into a full three-dimensional form by inferring and constructing the unseen parts (back, sides, depth). The subject should exist as a complete 3D entity that looks natural from any angle, not just a flat cutout.

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
 * v3 - 1면 홀로그램용 잘린 부분 복원 기능 추가
 * 작성일: 2025-01-24 23:45
 * 주요 개선:
 * - 잘린 신체 부위(팔, 다리, 발, 손 등) 자동 복원 기능 추가
 * - "Restore Missing Parts" CRITICAL 섹션 추가
 * - 해부학적 구조 기반 지능적 재구성 지시
 * - 완전한 형상 (full, intact figure) 강조
 */
export const BASE_HOLOGRAM_PROMPT_1SIDE_V3 = `Transform the 2D image into a full three-dimensional form by inferring and constructing the unseen parts (back, sides, depth). The subject should exist as a complete 3D entity that looks natural from any angle, not just a flat cutout.

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
