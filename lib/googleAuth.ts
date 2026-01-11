/**
 * Vercel + WIF(Workload Identity Federation)를 사용한 Google Auth 설정
 * 
 * 이 파일은 Vercel 환경에서 Vertex AI를 호출하기 위한 인증을 담당합니다.
 */

import { GoogleAuth, GoogleAuthOptions } from 'google-auth-library';

/**
 * Vercel OIDC 토큰을 가져옵니다.
 * Vercel은 여러 방식으로 OIDC 토큰을 제공할 수 있습니다.
 */
async function getVercelOidcToken(): Promise<string> {
  // 방법 1: VERCEL_OIDC_TOKEN 환경변수 (직접 설정한 경우)
  if (process.env.VERCEL_OIDC_TOKEN) {
    return process.env.VERCEL_OIDC_TOKEN;
  }

  // 방법 2: AWS Web Identity Token (Vercel은 AWS에서 실행됨)
  if (process.env.AWS_WEB_IDENTITY_TOKEN_FILE) {
    try {
      const fs = await import('fs');
      const token = fs.readFileSync(process.env.AWS_WEB_IDENTITY_TOKEN_FILE, 'utf8');
      if (token) return token.trim();
    } catch (error) {
      console.warn('AWS_WEB_IDENTITY_TOKEN_FILE 읽기 실패:', error);
    }
  }

  // 방법 3: Vercel OIDC 엔드포인트에서 동적으로 가져오기
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    try {
      const response = await fetch(`https://${vercelUrl}/.well-known/oidc-configuration`);
      if (response.ok) {
        const data = await response.json();
        if (data.token) return data.token;
      }
    } catch (error) {
      console.warn('Vercel OIDC 엔드포인트 호출 실패:', error);
    }
  }

  throw new Error(
    'Vercel OIDC 토큰을 가져올 수 없습니다.\n' +
    '다음 중 하나를 확인하세요:\n' +
    '1. Vercel 프로젝트에서 OIDC가 활성화되어 있는지\n' +
    '2. VERCEL_OIDC_TOKEN 환경변수를 수동으로 설정했는지\n' +
    '3. Vercel의 최신 배포인지'
  );
}

/**
 * Vercel에서 WIF를 사용하여 Google 인증 클라이언트를 생성합니다.
 * 
 * 필요한 환경변수:
 * - GOOGLE_PROJECT_ID: GCP 프로젝트 ID
 * - GOOGLE_WIF_AUDIENCE: WIF Audience (예: //iam.googleapis.com/projects/.../providers/...)
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL: Service Account 이메일
 */
export async function createGoogleAuthClient() {
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const wifAudience = process.env.GOOGLE_WIF_AUDIENCE;
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  // 환경변수 검증
  const missingVars: string[] = [];
  if (!projectId) missingVars.push('GOOGLE_PROJECT_ID');
  if (!wifAudience) missingVars.push('GOOGLE_WIF_AUDIENCE');
  if (!serviceAccountEmail) missingVars.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');

  if (missingVars.length > 0) {
    throw new Error(
      `다음 환경변수가 설정되지 않았습니다: ${missingVars.join(', ')}\n` +
      `Vercel 대시보드에서 환경변수를 설정해주세요.`
    );
  }

  // Vercel OIDC 토큰 가져오기
  const vercelOidcToken = await getVercelOidcToken();

  // WIF 설정을 포함한 GoogleAuth 생성
  const authOptions: GoogleAuthOptions = {
    projectId,
    credentials: {
      type: 'external_account',
      audience: wifAudience,
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      token_url: 'https://sts.googleapis.com/v1/token',
      service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`,
      credential_source: {
        // ⚠️ 중요: Vercel도 aws1로 설정해야 함
        environment_id: 'aws1',
        regional_cred_verification_url: 'https://sts.googleapis.com/v1/token',
        url: 'https://oidc.vercel.com',
        headers: {
          Authorization: `Bearer ${vercelOidcToken}`,
        },
        format: {
          type: 'json',
          subject_token_field_name: 'value',
        },
      },
    } as any,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  };

  return new GoogleAuth(authOptions);
}

/**
 * Access Token을 가져옵니다.
 * 이 토큰으로 Vertex AI API를 호출할 수 있습니다.
 */
export async function getAccessToken(): Promise<string> {
  const auth = await createGoogleAuthClient();
  const client = await auth.getClient();
  const accessTokenResponse = await client.getAccessToken();

  if (!accessTokenResponse.token) {
    throw new Error('Access Token을 가져올 수 없습니다.');
  }

  return accessTokenResponse.token;
}

/**
 * 인증이 제대로 작동하는지 테스트합니다.
 * @returns 인증 성공 여부와 메시지
 */
export async function testAuthentication(): Promise<{
  success: boolean;
  message: string;
  projectId?: string;
  tokenPreview?: string;
}> {
  try {
    const token = await getAccessToken();
    const projectId = process.env.GOOGLE_PROJECT_ID;

    return {
      success: true,
      message: '✅ WIF 인증 성공! Vertex AI 호출 준비 완료',
      projectId,
      tokenPreview: token.substring(0, 20) + '...',
    };
  } catch (error: any) {
    return {
      success: false,
      message: `❌ WIF 인증 실패: ${error.message}`,
    };
  }
}

