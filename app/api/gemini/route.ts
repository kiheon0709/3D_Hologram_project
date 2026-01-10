import { NextRequest, NextResponse } from "next/server";

/**
 * Gemini API 호출 (API 키 사용)
 * Gemini Developer API를 직접 사용합니다.
 */
async function callGeminiAPI(prompt: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  // 모델 설정 (하드코딩 - 변경하려면 여기만 수정하면 됨)
  const modelId = "gemini-1.5-flash"; // Gemini 텍스트 모델 변경: gemini-1.5-flash, gemini-1.5-pro, gemini-pro 등

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  // Gemini API 엔드포인트
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  console.log("Gemini API 호출:", { modelId, promptLength: prompt.length });

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
    });

    throw {
      status: response.status,
      message: errorMessage,
      details: errorDetail,
    };
  }

  const result = await response.json();
  console.log("Gemini API 호출 성공");
  return result;
}

export async function POST(req: NextRequest) {
  try {
    // 1. 요청 본문에서 prompt 가져오기
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

    // 2. Gemini API 호출
    let geminiResponse: any;
    try {
      geminiResponse = await callGeminiAPI(prompt);
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

    // 3. 응답 반환
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
