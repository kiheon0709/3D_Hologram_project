/**
 * Vercel + WIF(Workload Identity Federation)를 사용한 Google Auth 설정
 * 
 * 이 파일은 Vercel 환경에서 Vertex AI를 호출하기 위한 인증을 담당합니다.
 */

import { GoogleAuth, GoogleAuthOptions } from 'google-auth-library';

/**
 * Vercel OIDC 토큰을 가져옵니다.
 * Vercel은 런타임 메타데이터 서비스를 통해 OIDC 토큰을 제공합니다.
 */
async function getVercelOidcToken(): Promise<string> {
  // 방법 1: VERCEL_OIDC_TOKEN 환경변수 (직접 설정한 경우)
  if (process.env.VERCEL_OIDC_TOKEN) {
    return process.env.VERCEL_OIDC_TOKEN;
  }

  // 방법 2: Vercel 런타임 메타데이터 서비스 (권장)
  // Vercel은 AWS Lambda처럼 런타임에 토큰을 제공합니다
  try {
    // Vercel의 내부 메타데이터 엔드포인트
    const metadataEndpoints = [
      'http://169.254.169.254/latest/meta-data/iam/security-credentials/', // AWS IMDS
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', // GCP
    ];

    for (const endpoint of metadataEndpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: endpoint.includes('google') 
            ? { 'Metadata-Flavor': 'Google' }
            : {},
          signal: AbortSignal.timeout(1000), // 1초 타임아웃
        });
        
        if (response.ok) {
          const data = await response.text();
          if (data && data.length > 10) {
            console.log('✅ 메타데이터 서비스에서 토큰 획득:', endpoint);
            return data.trim();
          }
        }
      } catch (error) {
        // 이 엔드포인트는 실패할 수 있음, 다음으로 계속
        continue;
      }
    }
  } catch (error) {
    console.warn('메타데이터 서비스 접근 실패:', error);
  }

  // 방법 3: AWS Web Identity Token File
  if (process.env.AWS_WEB_IDENTITY_TOKEN_FILE) {
    try {
      const fs = await import('fs');
      const token = fs.readFileSync(process.env.AWS_WEB_IDENTITY_TOKEN_FILE, 'utf8');
      if (token) return token.trim();
    } catch (error) {
      console.warn('AWS_WEB_IDENTITY_TOKEN_FILE 읽기 실패:', error);
    }
  }

  // 방법 4: Vercel의 공식 OIDC 엔드포인트
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    try {
      // Vercel의 OIDC 토큰 엔드포인트 시도
      const oidcEndpoints = [
        `https://${vercelUrl}/.well-known/vercel-oidc-token`,
        `https://oidc.vercel.com/token`,
      ];

      for (const endpoint of oidcEndpoints) {
        try {
          const response = await fetch(endpoint, {
            signal: AbortSignal.timeout(2000),
          });
          
          if (response.ok) {
            const data = await response.text();
            if (data && data.length > 10) {
              console.log('✅ Vercel OIDC 엔드포인트에서 토큰 획득:', endpoint);
              return data.trim();
            }
          }
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      console.warn('Vercel OIDC 엔드포인트 호출 실패:', error);
    }
  }

  throw new Error(
    'Vercel OIDC 토큰을 가져올 수 없습니다.\n\n' +
    '🔧 해결 방법:\n' +
    '1. Vercel 대시보드 > Settings > General에서 "OIDC Token" 활성화\n' +
    '2. 또는 VERCEL_OIDC_TOKEN 환경변수를 수동으로 설정\n' +
    '3. 또는 Service Account JSON 키를 사용하는 방식으로 전환\n\n' +
    '현재 시도한 방법:\n' +
    '- 환경변수: VERCEL_OIDC_TOKEN ❌\n' +
    '- AWS 메타데이터 서비스 ❌\n' +
    '- AWS Web Identity Token File ❌\n' +
    '- Vercel OIDC 엔드포인트 ❌'
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

