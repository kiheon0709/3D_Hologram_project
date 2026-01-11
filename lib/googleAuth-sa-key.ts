/**
 * Service Account JSON 키 방식을 사용한 Google Auth
 * 
 * WIF가 작동하지 않을 때 사용하는 대안입니다.
 * 프로덕션 환경에서도 안전하게 사용할 수 있도록 Base64 인코딩된 키를 사용합니다.
 */

import { GoogleAuth } from 'google-auth-library';

/**
 * Service Account JSON 키를 사용하여 Google 인증 클라이언트를 생성합니다.
 * 
 * 필요한 환경변수:
 * - GOOGLE_APPLICATION_CREDENTIALS_BASE64: Base64로 인코딩된 Service Account JSON 키
 * - 또는 GOOGLE_PROJECT_ID + GOOGLE_PRIVATE_KEY + GOOGLE_CLIENT_EMAIL
 */
export function createGoogleAuthClientWithServiceAccount() {
  // 방법 1: Base64로 인코딩된 전체 JSON 키 사용
  const credentialsBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
  
  if (credentialsBase64) {
    try {
      const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf8');
      const credentials = JSON.parse(credentialsJson);
      
      return new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
    } catch (error: any) {
      throw new Error(
        `GOOGLE_APPLICATION_CREDENTIALS_BASE64 파싱 실패: ${error.message}\n` +
        `올바른 Base64 인코딩된 Service Account JSON 키인지 확인하세요.`
      );
    }
  }

  // 방법 2: 개별 필드 사용
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

  if (projectId && privateKey && clientEmail) {
    // private_key는 환경변수에서 \n이 \\n으로 저장되므로 복원
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

  throw new Error(
    '다음 중 하나의 환경변수 조합이 필요합니다:\n\n' +
    '옵션 1 (권장):\n' +
    '- GOOGLE_APPLICATION_CREDENTIALS_BASE64\n\n' +
    '옵션 2:\n' +
    '- GOOGLE_PROJECT_ID\n' +
    '- GOOGLE_PRIVATE_KEY\n' +
    '- GOOGLE_CLIENT_EMAIL'
  );
}

/**
 * Access Token을 가져옵니다.
 */
export async function getAccessTokenWithServiceAccount(): Promise<string> {
  const auth = createGoogleAuthClientWithServiceAccount();
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
export async function testAuthenticationWithServiceAccount(): Promise<{
  success: boolean;
  message: string;
  projectId?: string;
  tokenPreview?: string;
}> {
  try {
    const token = await getAccessTokenWithServiceAccount();
    const projectId = process.env.GOOGLE_PROJECT_ID;

    return {
      success: true,
      message: '✅ Service Account 인증 성공! Vertex AI 호출 준비 완료',
      projectId,
      tokenPreview: token.substring(0, 20) + '...',
    };
  } catch (error: any) {
    return {
      success: false,
      message: `❌ Service Account 인증 실패: ${error.message}`,
    };
  }
}

