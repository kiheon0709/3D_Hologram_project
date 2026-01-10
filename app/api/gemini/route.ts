import { NextRequest, NextResponse } from "next/server";

/**
 * Vercel OIDC 토큰을 Google Cloud 액세스 토큰으로 교환
 * Google STS (Security Token Service) API를 직접 호출
 */
async function getGoogleAccessToken(oidcToken: string): Promise<string> {
  const wifAudience = process.env.GOOGLE_WIF_AUDIENCE;

  if (!wifAudience) {
    throw new Error("GOOGLE_WIF_AUDIENCE 환경변수가 설정되지 않았습니다.");
  }

  // Google STS API를 통해 OIDC 토큰을 Google Cloud 액세스 토큰으로 교환
  // 참고: grant_type (snake_case) 형식 사용
  const stsResponse = await fetch("https://sts.googleapis.com/v1/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      audience: wifAudience,
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
    
    throw {
      status: stsResponse.status,
      message: errorDetail.error_description || errorDetail.error || `STS API 호출 실패: ${stsResponse.statusText}`,
      details: errorDetail,
    };
  }

  const stsData = await stsResponse.json();
  
  if (!stsData.access_token) {
    throw new Error("STS 응답에 access_token이 없습니다.");
  }

  return stsData.access_token;
}

/**
 * Gemini API 호출
 */
async function callGeminiAPI(
  accessToken: string,
  prompt: string
): Promise<any> {
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const location = process.env.GOOGLE_LOCATION || "us-central1";

  if (!projectId) {
    throw new Error("GOOGLE_PROJECT_ID 환경변수가 설정되지 않았습니다.");
  }

  const apiUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-1.5-flash:generateContent`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorDetail;
    try {
      errorDetail = JSON.parse(errorText);
    } catch {
      errorDetail = { message: errorText };
    }

    throw {
      status: response.status,
      message: errorDetail.error?.message || errorDetail.message || `HTTP ${response.status}: ${response.statusText}`,
      details: errorDetail,
    };
  }

  return await response.json();
}

export async function POST(req: NextRequest) {
  try {
    // 1. OIDC 토큰 가져오기
    const oidcToken = req.headers.get("x-vercel-oidc-token");
    
    if (!oidcToken) {
      return NextResponse.json(
        { 
          error: "x-vercel-oidc-token 헤더가 없습니다.",
          message: "Vercel OIDC 토큰이 제공되지 않았습니다."
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
