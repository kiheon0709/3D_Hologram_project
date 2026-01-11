/**
 * 통합 Google Auth - WIF와 Service Account 키 방식을 모두 지원
 * 
 * 우선순위:
 * 1. Service Account JSON 키 (GOOGLE_APPLICATION_CREDENTIALS_BASE64)
 * 2. WIF (VERCEL_OIDC_TOKEN + WIF 설정)
 */

import { GoogleAuth } from 'google-auth-library';

/**
 * 사용 가능한 인증 방식을 감지하고 적절한 인증 클라이언트를 반환합니다.
 */
export async function createGoogleAuthClient() {
  // 방법 1: Service Account JSON 키 (가장 확실함)
  const credentialsBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
  
  if (credentialsBase64) {
    console.log('🔑 Service Account JSON 키 방식 사용');
    try {
      const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf8');
      const credentials = JSON.parse(credentialsJson);
      
      return new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
    } catch (error: any) {
      console.error('Service Account 키 파싱 실패:', error);
      throw new Error(
        `Service Account 키가 올바르지 않습니다: ${error.message}`
      );
    }
  }

  // 방법 2: 개별 필드로 제공된 Service Account 정보
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

  if (privateKey && clientEmail) {
    console.log('🔑 Service Account (개별 필드) 방식 사용');
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    return new GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: formattedPrivateKey,
      },
      projectId,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }

  // 방법 3: WIF (Workload Identity Federation) - 실험적
  const wifAudience = process.env.GOOGLE_WIF_AUDIENCE;
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const vercelOidcToken = process.env.VERCEL_OIDC_TOKEN;

  if (wifAudience && serviceAccountEmail && vercelOidcToken) {
    console.log('🔐 WIF 방식 사용 (실험적)');
    
    return new GoogleAuth({
      projectId,
      credentials: {
        type: 'external_account',
        audience: wifAudience,
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        token_url: 'https://sts.googleapis.com/v1/token',
        service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`,
        credential_source: {
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
    });
  }

  // 모든 방식이 불가능한 경우
  throw new Error(
    '❌ Google 인증 정보를 찾을 수 없습니다.\n\n' +
    '다음 중 하나를 설정해주세요:\n\n' +
    '✅ 권장 방법 (Service Account JSON 키):\n' +
    '  1. GCP에서 Service Account JSON 키 다운로드\n' +
    '  2. Base64로 인코딩: base64 -i key.json\n' +
    '  3. Vercel 환경변수에 추가:\n' +
    '     GOOGLE_APPLICATION_CREDENTIALS_BASE64=<base64-string>\n\n' +
    '또는 개별 필드 방식:\n' +
    '  - GOOGLE_PROJECT_ID\n' +
    '  - GOOGLE_PRIVATE_KEY\n' +
    '  - GOOGLE_CLIENT_EMAIL\n\n' +
    '⚠️ WIF 방식 (실험적, Vercel에서 작동 안 할 수 있음):\n' +
    '  - GOOGLE_WIF_AUDIENCE\n' +
    '  - GOOGLE_SERVICE_ACCOUNT_EMAIL\n' +
    '  - VERCEL_OIDC_TOKEN'
  );
}

/**
 * Access Token을 가져옵니다.
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
 * 인증 테스트
 */
export async function testAuthentication(): Promise<{
  success: boolean;
  message: string;
  projectId?: string;
  tokenPreview?: string;
  authMethod?: string;
}> {
  try {
    // 어떤 인증 방식이 사용되는지 감지
    let authMethod = 'unknown';
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
      authMethod = 'Service Account JSON (Base64)';
    } else if (process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL) {
      authMethod = 'Service Account (개별 필드)';
    } else if (process.env.GOOGLE_WIF_AUDIENCE && process.env.VERCEL_OIDC_TOKEN) {
      authMethod = 'WIF (Workload Identity Federation)';
    }

    const token = await getAccessToken();
    const projectId = process.env.GOOGLE_PROJECT_ID;

    return {
      success: true,
      message: '✅ Google 인증 성공! Vertex AI 호출 준비 완료',
      projectId,
      tokenPreview: token.substring(0, 20) + '...',
      authMethod,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `❌ Google 인증 실패: ${error.message}`,
    };
  }
}

