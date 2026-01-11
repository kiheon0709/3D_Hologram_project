import { NextRequest, NextResponse } from 'next/server';
import { testAuthentication } from '@/lib/googleAuth';

/**
 * WIF 인증 테스트 API
 * 
 * 이 엔드포인트를 호출하여 Vercel에서 Google WIF 인증이 제대로 작동하는지 확인합니다.
 * 
 * 사용법:
 * POST /api/debug-auth
 * 
 * 예상 응답:
 * - 성공: { success: true, message: "✅ WIF 인증 성공! ...", ... }
 * - 실패: { success: false, message: "❌ WIF 인증 실패: ...", ... }
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔍 WIF 인증 테스트 시작...');

    // 환경변수 상태 확인
    const envCheck = {
      GOOGLE_PROJECT_ID: !!process.env.GOOGLE_PROJECT_ID,
      GOOGLE_WIF_AUDIENCE: !!process.env.GOOGLE_WIF_AUDIENCE,
      GOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      VERCEL_OIDC_TOKEN: !!process.env.VERCEL_OIDC_TOKEN,
    };

    console.log('환경변수 체크:', envCheck);

    // 인증 테스트 실행
    const result = await testAuthentication();

    console.log('인증 테스트 결과:', result);

    return NextResponse.json({
      ...result,
      envCheck,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ 인증 테스트 중 오류 발생:', error);

    return NextResponse.json(
      {
        success: false,
        message: `인증 테스트 실패: ${error.message}`,
        error: error.toString(),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET 요청도 지원 (브라우저에서 바로 테스트 가능)
 */
export async function GET(req: NextRequest) {
  return POST(req);
}

