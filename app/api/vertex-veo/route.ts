import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/googleAuth';

/**
 * Vertex AI Veo API를 사용한 비디오 생성
 * 
 * Veo 2는 이미지와 텍스트 프롬프트를 받아 비디오를 생성합니다.
 * 
 * 요청 본문:
 * {
 *   "prompt": "비디오 생성 프롬프트",
 *   "imageUrl": "입력 이미지 URL (선택사항)",
 *   "imageBase64": "base64 인코딩된 이미지 (선택사항)",
 *   "aspectRatio": "9:16" | "16:9" | "1:1" (기본값: 9:16)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // 1. 요청 본문 파싱
    const body = await req.json();
    const { prompt, imageUrl, imageBase64, aspectRatio = '9:16' } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        {
          error: 'prompt가 필요합니다.',
          message: '요청 본문에 "prompt" 필드가 필요합니다.',
        },
        { status: 400 }
      );
    }

    console.log('🎬 Vertex AI Veo 비디오 생성 시작...');
    console.log('프롬프트:', prompt.substring(0, 100) + '...');
    console.log('Aspect Ratio:', aspectRatio);

    // 2. Access Token 가져오기
    const accessToken = await getAccessToken();
    console.log('✅ Access Token 획득 성공');

    // 3. Vertex AI 설정
    const projectId = process.env.GOOGLE_PROJECT_ID;
    const location = process.env.GOOGLE_LOCATION || 'us-central1';
    
    // Veo 2 모델 엔드포인트
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/veo-002:generateVideo`;

    // 4. 요청 본문 구성
    const requestBody: any = {
      prompt: {
        text: prompt,
      },
      parameters: {
        aspectRatio: aspectRatio,
        // Veo 2 기본 설정
        safetyFilterLevel: 'BLOCK_ONLY_HIGH', // 안전 필터 수준
        personGeneration: 'ALLOW_ADULT', // 사람 생성 허용
      },
    };

    // 이미지가 있으면 추가 (image-to-video)
    if (imageUrl) {
      requestBody.prompt.image = {
        gcsUri: imageUrl, // GCS URI 형식
      };
    } else if (imageBase64) {
      requestBody.prompt.image = {
        bytesBase64Encoded: imageBase64,
      };
    }

    console.log('📤 Vertex AI 요청 전송...');
    console.log('Endpoint:', endpoint);

    // 5. Vertex AI API 호출
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail;
      try {
        errorDetail = JSON.parse(errorText);
      } catch {
        errorDetail = { message: errorText };
      }

      console.error('❌ Vertex AI API 호출 실패:', {
        status: response.status,
        statusText: response.statusText,
        error: errorDetail,
      });

      const errorMessage =
        errorDetail.error?.message ||
        errorDetail.message ||
        `HTTP ${response.status}: ${response.statusText}`;

      return NextResponse.json(
        {
          error: 'Vertex AI API 호출 실패',
          message: errorMessage,
          status: response.status,
          details: errorDetail,
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('✅ Vertex AI 비디오 생성 요청 성공');

    // 6. 결과 반환
    // Veo는 비동기로 작동하므로 operation 정보가 반환됩니다
    return NextResponse.json({
      success: true,
      data: result,
      message: '비디오 생성이 시작되었습니다. operation을 통해 진행 상태를 확인하세요.',
    });
  } catch (error: any) {
    console.error('❌ API 오류:', error);

    return NextResponse.json(
      {
        error: '서버 내부 오류',
        message: error.message || '알 수 없는 오류가 발생했습니다.',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Operation 상태 조회 API (GET 요청)
 * 
 * 쿼리 파라미터:
 * - operationName: Veo가 반환한 operation 이름
 * 
 * 사용법:
 * GET /api/vertex-veo?operationName=projects/.../operations/...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const operationName = searchParams.get('operationName');

    if (!operationName) {
      return NextResponse.json(
        {
          error: 'operationName 파라미터가 필요합니다.',
        },
        { status: 400 }
      );
    }

    console.log('🔍 Operation 상태 조회:', operationName);

    // Access Token 가져오기
    const accessToken = await getAccessToken();

    const location = process.env.GOOGLE_LOCATION || 'us-central1';
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/${operationName}`;

    // Operation 상태 조회
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Operation 조회 실패:', errorText);

      return NextResponse.json(
        {
          error: 'Operation 조회 실패',
          message: errorText,
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('✅ Operation 상태:', result.done ? '완료' : '진행중');

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('❌ Operation 조회 오류:', error);

    return NextResponse.json(
      {
        error: '서버 내부 오류',
        message: error.message || '알 수 없는 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}

