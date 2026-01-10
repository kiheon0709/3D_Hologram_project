import { NextRequest, NextResponse } from "next/server";

/**
 * Vercel OIDC 토큰을 Google Cloud 액세스 토큰으로 교환
 * Google STS (Security Token Service) API를 직접 호출
 */
async function getGoogleAccessToken(oidcToken: string): Promise<string> {
  const wifAudience = process.env.GOOGLE_WIF_AUDIENCE;
  const projectNumber = process.env.GOOGLE_PROJECT_NUMBER;
  const poolId = process.env.GOOGLE_WIF_POOL_ID;
  const providerId = process.env.GOOGLE_WIF_PROVIDER_ID;

  // audience를 구성 (환경 변수에서 전체 값을 가져오거나, 개별 값으로 조합)
  let audience: string;
  
  if (wifAudience) {
    // 이미 전체 리소스 이름이 있는 경우
    audience = wifAudience;
    
    // 형식 검증: //iam.googleapis.com/projects/... 형식인지 확인
    if (!audience.startsWith("//iam.googleapis.com/projects/")) {
      // 만약 형식이 맞지 않으면, 개별 값으로 조합 시도
      if (projectNumber && poolId && providerId) {
        audience = `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`;
      } else {
        throw new Error(
          "GOOGLE_WIF_AUDIENCE가 올바른 형식이 아닙니다. " +
          "형식: //iam.googleapis.com/projects/{PROJECT_NUMBER}/locations/global/workloadIdentityPools/{POOL_ID}/providers/{PROVIDER_ID} " +
          "또는 GOOGLE_PROJECT_NUMBER, GOOGLE_WIF_POOL_ID, GOOGLE_WIF_PROVIDER_ID를 설정하세요."
        );
      }
    }
  } else if (projectNumber && poolId && providerId) {
    // 개별 값으로 조합
    audience = `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`;
  } else {
    throw new Error(
      "GOOGLE_WIF_AUDIENCE 또는 (GOOGLE_PROJECT_NUMBER, GOOGLE_WIF_POOL_ID, GOOGLE_WIF_PROVIDER_ID) 환경변수가 설정되지 않았습니다."
    );
  }

  console.log("사용할 audience:", audience);

  // Google STS API를 통해 OIDC 토큰을 Google Cloud 액세스 토큰으로 교환
  // 참고: OAuth 2.0 토큰 교환은 form-urlencoded 형식 사용
  const stsResponse = await fetch("https://sts.googleapis.com/v1/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      audience: audience,
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
      scope: "https://www.googleapis.com/auth/cloud-platform",
      subject_token: oidcToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
    }),
  });

  if (!stsResponse.ok) {
    const errorText = await stsResponse.text();
    let errorDetail;
    try {
      errorDetail = JSON.parse(errorText);
    } catch {
      errorDetail = { error: errorText };
    }
    
    // audience 관련 에러인 경우 더 명확한 메시지 제공
    let errorMessage = errorDetail.error_description || errorDetail.error || `STS API 호출 실패: ${stsResponse.statusText}`;
    
    if (errorMessage.includes("audience") || errorMessage.includes("Invalid value")) {
      errorMessage += `\n\n현재 audience 값: ${audience}\n` +
        `올바른 형식: //iam.googleapis.com/projects/{PROJECT_NUMBER}/locations/global/workloadIdentityPools/{POOL_ID}/providers/{PROVIDER_ID}\n` +
        `환경 변수 GOOGLE_WIF_AUDIENCE에 전체 리소스 이름을 설정하거나,\n` +
        `GOOGLE_PROJECT_NUMBER, GOOGLE_WIF_POOL_ID, GOOGLE_WIF_PROVIDER_ID를 개별 설정하세요.`;
    }
    
    throw {
      status: stsResponse.status,
      message: errorMessage,
      details: errorDetail,
      audience: audience, // 디버깅을 위해 현재 audience 값 포함
    };
  }

  const stsData = await stsResponse.json();
  
  if (!stsData.access_token) {
    throw new Error("STS 응답에 access_token이 없습니다.");
  }

  return stsData.access_token;
}

/**
 * Gemini API 호출 (Publisher Model generateContent API 사용)
 * 참고: Gemini는 Vertex AI Endpoint가 아닌 Publisher Model 전용 API를 사용합니다.
 */
async function callGeminiAPI(
  accessToken: string,
  prompt: string
): Promise<any> {
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const location = process.env.GOOGLE_LOCATION || "us-central1";
  // Gemini 모델 ID
  const modelId = process.env.GEMINI_MODEL_ID || "gemini-2.0-flash";

  if (!projectId) {
    throw new Error("GOOGLE_PROJECT_ID 환경변수가 설정되지 않았습니다.");
  }

  // Publisher Model generateContent API 엔드포인트
  // 형식: https://{location}-aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent
  const apiUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:generateContent`;

  console.log("Gemini API 호출:", { apiUrl, modelId, location });

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
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

    const errorMessage = errorDetail.error?.message || errorDetail.message || `HTTP ${response.status}: ${response.statusText}`;
    
    console.error("Gemini API 호출 실패:", {
      status: response.status,
      statusText: response.statusText,
      error: errorDetail,
      apiUrl,
    });

    throw {
      status: response.status,
      message: errorMessage,
      details: errorDetail,
      apiUrl, // 디버깅을 위해 URL 포함
    };
  }

  const result = await response.json();
  console.log("Gemini API 호출 성공");
  return result;
}

export async function POST(req: NextRequest) {
  try {
    // 1. OIDC 토큰 가져오기 (여러 가능한 헤더 이름 시도)
    const oidcToken = 
      req.headers.get("x-vercel-oidc-token") ||
      req.headers.get("vercel-oidc-token") ||
      req.headers.get("x-vercel-oidc-id-token") ||
      process.env.VERCEL_OIDC_TOKEN; // 환경 변수에서도 확인
    
    // 디버깅: 관련 헤더 확인
    const allHeaders = Object.fromEntries(req.headers.entries());
    const vercelRelatedHeaders = Object.keys(allHeaders).filter(key => 
      key.toLowerCase().includes("vercel") || key.toLowerCase().includes("oidc")
    );
    
    console.log("Vercel 관련 헤더:", vercelRelatedHeaders);
    console.log("OIDC 토큰 존재:", !!oidcToken);
    console.log("환경 변수 설정:", {
      hasProjectId: !!process.env.GOOGLE_PROJECT_ID,
      hasLocation: !!process.env.GOOGLE_LOCATION,
      hasWifAudience: !!process.env.GOOGLE_WIF_AUDIENCE,
    });
    
    if (!oidcToken) {
      return NextResponse.json(
        { 
          error: "OIDC 토큰을 찾을 수 없습니다.",
          message: "Vercel OIDC 토큰이 제공되지 않았습니다. Vercel 환경에서 실행 중인지 확인하세요.",
          debug: {
            availableHeaders: vercelRelatedHeaders,
            allHeaderKeys: Object.keys(allHeaders).slice(0, 10), // 처음 10개만
          }
        },
        { status: 401 }
      );
    }

    // 2. 요청 본문에서 prompt 가져오기
    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { 
          error: "prompt가 필요합니다.",
          message: "요청 본문에 'prompt' 필드가 필요합니다."
        },
        { status: 400 }
      );
    }

    console.log("Gemini API 호출 시작:", { prompt: prompt.substring(0, 50) + "..." });

    // 3. OIDC 토큰을 Google Cloud 액세스 토큰으로 교환
    let accessToken: string;
    try {
      accessToken = await getGoogleAccessToken(oidcToken);
      console.log("액세스 토큰 발급 성공");
    } catch (err: any) {
      console.error("액세스 토큰 발급 실패:", err);
      
      // STS API 에러는 status와 message를 포함할 수 있음
      if (err.status && err.message) {
        return NextResponse.json(
          {
            error: "인증 실패",
            message: err.message,
            status: err.status,
            details: err.details,
          },
          { status: err.status }
        );
      }
      
      return NextResponse.json(
        {
          error: "인증 실패",
          message: err.message || "Google Cloud 액세스 토큰 발급에 실패했습니다.",
          status: 500,
        },
        { status: 500 }
      );
    }

    // 4. Gemini API 호출
    let geminiResponse: any;
    try {
      geminiResponse = await callGeminiAPI(accessToken, prompt);
      console.log("Gemini API 호출 성공");
    } catch (err: any) {
      console.error("Gemini API 호출 실패:", err);
      
      // 에러 객체에 status와 message가 있으면 그대로 반환
      if (err.status && err.message) {
        return NextResponse.json(
          {
            error: "Gemini API 호출 실패",
            message: err.message,
            status: err.status,
            details: err.details,
          },
          { status: err.status }
        );
      }

      return NextResponse.json(
        {
          error: "Gemini API 호출 실패",
          message: err.message || "알 수 없는 오류가 발생했습니다.",
          status: 500,
        },
        { status: 500 }
      );
    }

    // 5. 응답 반환
    return NextResponse.json({
      success: true,
      response: geminiResponse,
    });

  } catch (err: any) {
    console.error("API 오류:", err);
    return NextResponse.json(
      {
        error: "서버 내부 오류",
        message: err.message || "알 수 없는 오류가 발생했습니다.",
        status: 500,
      },
      { status: 500 }
    );
  }
}
