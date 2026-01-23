/**
 * 3D 영상 생성을 위한 프롬프트 관리 (백업 - 2025-01-23)
 * 원본 프롬프트 백업본
 */

/**
 * 1면 홀로그램용 기본 3D 변환 프롬프트 (회전 포함) - 원본
 */
export const BASE_HOLOGRAM_PROMPT_1SIDE_ORIGINAL = `Transform the input image into a seamless looping 3D holographic-style video.

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
 * 4면 홀로그램용 기본 3D 변환 프롬프트 (회전 없음, 자유도 높음) - 원본
 */
export const BASE_HOLOGRAM_PROMPT_4SIDES_ORIGINAL = `Transform the input image into a seamless looping 3D holographic-style video.

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
