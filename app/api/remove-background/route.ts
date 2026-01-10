import { NextRequest, NextResponse } from "next/server";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
// Replicate에서 cjwbw/rembg 모델 페이지 → API 탭에서 version ID 복사해서 넣어주세요
// 예: "a295a834-9a12-4c58-8d8d-0c07f3681c07" 같은 형태
const REMBG_MODEL_VERSION = process.env.REPLICATE_REMBG_VERSION || "";

export async function POST(req: NextRequest) {
  try {
    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN이 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    if (!REMBG_MODEL_VERSION) {
      return NextResponse.json(
        { error: "REPLICATE_REMBG_VERSION이 설정되지 않았습니다. .env.local에 모델 version ID를 추가해주세요." },
        { status: 500 }
      );
    }

    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl이 필요합니다." },
        { status: 400 }
      );
    }

    console.log("배경 제거 시작:", { imageUrl, modelVersion: REMBG_MODEL_VERSION });

    // 1) Replicate에 배경 제거 요청
    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
      },
      body: JSON.stringify({
        version: REMBG_MODEL_VERSION,
        input: {
          image: imageUrl, // Supabase public URL
        },
      }),
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      console.error("Replicate create error:", {
        status: createRes.status,
        statusText: createRes.statusText,
        body: text,
      });
      
      let errorDetail = text;
      try {
        const jsonError = JSON.parse(text);
        errorDetail = jsonError.detail || jsonError.message || text;
      } catch {
        // JSON 파싱 실패 시 원본 텍스트 사용
      }
      
      return NextResponse.json(
        { 
          error: "Replicate 요청 실패", 
          detail: errorDetail,
          status: createRes.status,
        },
        { status: 500 }
      );
    }

    let prediction = await createRes.json();
    console.log("Prediction 생성됨:", prediction.id);

    // 2) status가 succeeded 될 때까지 폴링
    while (
      prediction.status === "starting" ||
      prediction.status === "processing"
    ) {
      await new Promise((r) => setTimeout(r, 2000)); // 2초 대기

      const pollRes = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            Authorization: `Token ${REPLICATE_API_TOKEN}`,
          },
        }
      );

      if (!pollRes.ok) {
        const text = await pollRes.text();
        console.error("Polling error:", text);
        return NextResponse.json(
          { error: "배경 제거 상태 확인 실패", detail: text },
          { status: 500 }
        );
      }

      prediction = await pollRes.json();
      console.log("Prediction 상태:", prediction.status);
    }

    if (prediction.status !== "succeeded") {
      console.error("Replicate failed prediction:", prediction);
      return NextResponse.json(
        {
          error: "배경 제거에 실패했습니다.",
          detail: prediction.error || prediction,
        },
        { status: 500 }
      );
    }

    // 3) 결과 이미지 URL 추출
    // rembg-enhance는 보통 output이 이미지 URL 문자열 또는 배열
    const output = prediction.output;
    const resultImageUrl =
      typeof output === "string" ? output : Array.isArray(output) ? output[0] : null;

    if (!resultImageUrl) {
      console.error("Unexpected output format:", output);
      return NextResponse.json(
        { error: "배경 제거 결과 형식이 예상과 다릅니다.", detail: output },
        { status: 500 }
      );
    }

    console.log("배경 제거 완료, 결과 URL:", resultImageUrl);

    // 4) 결과 이미지를 다운로드해서 Supabase에 저장
    console.log("Replicate 결과 이미지 다운로드 시작...");
    const imageRes = await fetch(resultImageUrl);
    if (!imageRes.ok) {
      console.error("이미지 다운로드 실패:", imageRes.status, imageRes.statusText);
      return NextResponse.json(
        { error: "배경 제거된 이미지 다운로드 실패", detail: `Status: ${imageRes.status}` },
        { status: 500 }
      );
    }
    console.log("이미지 다운로드 완료");

    const imageBuffer = await imageRes.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: "image/png" });

    // Supabase에 업로드
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        { error: "Supabase 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey);
    const bucket = "3D_hologram_images";

    // 기존 파일 목록 확인해서 다음 번호 계산
    const { data: existingFiles } = await supabase.storage
      .from(bucket)
      .list("removed_backgrounds", {
        limit: 1000,
        offset: 0,
      });

    let nextIndex = 1;
    if (existingFiles && existingFiles.length > 0) {
      const numericNames = existingFiles
        .map((f) => {
          const base = f.name.split(".")[0];
          const num = Number(base);
          return Number.isNaN(num) ? null : num;
        })
        .filter((n): n is number => n !== null);

      if (numericNames.length > 0) {
        nextIndex = Math.max(...numericNames) + 1;
      }
    }

    const fileName = `${nextIndex}.png`;
    const filePath = `removed_backgrounds/${fileName}`;

    console.log("Supabase 업로드 시작:", { filePath, fileSize: imageBlob.size });

    // File 객체로 변환
    const file = new File([imageBlob], fileName, { type: "image/png" });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase 업로드 오류:", uploadError);
      return NextResponse.json(
        {
          error: "Supabase에 배경 제거된 이미지 저장 실패",
          detail: uploadError.message || JSON.stringify(uploadError),
        },
        { status: 500 }
      );
    }

    console.log("Supabase 업로드 성공:", uploadData);

    // Public URL 가져오기
    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    console.log("배경 제거 완료 및 Supabase 저장 완료:", publicData.publicUrl);

    return NextResponse.json({
      success: true,
      imageUrl: publicData.publicUrl,
      fileName,
      filePath,
    });
  } catch (err) {
    console.error("API /remove-background 오류:", err);
    return NextResponse.json(
      {
        error: "서버 내부 오류",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

