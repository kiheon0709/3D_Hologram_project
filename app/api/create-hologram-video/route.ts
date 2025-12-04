import { NextRequest, NextResponse } from "next/server";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

export async function POST(req: NextRequest) {
  try {
    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN이 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const { imageUrl, prompt } = await req.json();
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl이 필요합니다." },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "prompt가 필요합니다." },
        { status: 400 }
      );
    }

    console.log("홀로그램 영상 생성 시작:", { imageUrl, model: "google/veo-3-fast" });

    // 1) Replicate에 영상 생성 요청 (모델 이름으로 latest 버전 사용)
    const createRes = await fetch("https://api.replicate.com/v1/models/google/veo-3-fast/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
        Prefer: "wait",
      },
      body: JSON.stringify({
        input: {
          image: imageUrl,
          last_frame: imageUrl, // 같은 이미지 사용
          prompt: prompt,
          aspect_ratio: "16:9",
          duration: 4,
          generate_audio: false,
          resolution: "720p",
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
    let pollCount = 0;
    const maxPolls = 120; // 최대 4분 (2초 * 120)
    
    while (
      (prediction.status === "starting" || prediction.status === "processing") &&
      pollCount < maxPolls
    ) {
      await new Promise((r) => setTimeout(r, 2000)); // 2초 대기
      pollCount++;

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
          { error: "영상 생성 상태 확인 실패", detail: text },
          { status: 500 }
        );
      }

      prediction = await pollRes.json();
      console.log(`Prediction 상태 (${pollCount}/${maxPolls}):`, prediction.status);
    }

    if (pollCount >= maxPolls) {
      return NextResponse.json(
        { error: "영상 생성 시간 초과", detail: "최대 대기 시간을 초과했습니다." },
        { status: 500 }
      );
    }

    if (prediction.status !== "succeeded") {
      console.error("Replicate failed prediction:", prediction);
      return NextResponse.json(
        {
          error: "영상 생성에 실패했습니다.",
          detail: prediction.error || prediction,
        },
        { status: 500 }
      );
    }

    // 3) 결과 영상 URL 추출
    const output = prediction.output;
    const videoUrl =
      typeof output === "string" ? output : Array.isArray(output) ? output[0] : null;

    if (!videoUrl) {
      console.error("Unexpected output format:", output);
      return NextResponse.json(
        { error: "영상 생성 결과 형식이 예상과 다릅니다.", detail: output },
        { status: 500 }
      );
    }

    console.log("영상 생성 완료, 결과 URL:", videoUrl);

    // 4) 결과 영상을 다운로드해서 Supabase에 저장
    console.log("Replicate 결과 영상 다운로드 시작...");
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      console.error("영상 다운로드 실패:", videoRes.status, videoRes.statusText);
      return NextResponse.json(
        { error: "생성된 영상 다운로드 실패", detail: `Status: ${videoRes.status}` },
        { status: 500 }
      );
    }
    console.log("영상 다운로드 완료");

    const videoBuffer = await videoRes.arrayBuffer();
    const videoBlob = new Blob([videoBuffer], { type: "video/mp4" });

    // Supabase에 업로드
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const bucket = "3D_hologram_images";

    // 기존 파일 목록 확인해서 다음 번호 계산
    const { data: existingFiles } = await supabase.storage
      .from(bucket)
      .list("veo_video", {
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

    const fileName = `${nextIndex}.mp4`;
    const filePath = `veo_video/${fileName}`;

    console.log("Supabase 업로드 시작:", { filePath, fileSize: videoBlob.size });

    // File 객체로 변환
    const file = new File([videoBlob], fileName, { type: "video/mp4" });

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
          error: "Supabase에 영상 저장 실패",
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

    console.log("홀로그램 영상 생성 완료 및 Supabase 저장 완료:", publicData.publicUrl);

    return NextResponse.json({
      success: true,
      videoUrl: publicData.publicUrl,
      fileName,
      filePath,
    });
  } catch (err) {
    console.error("API /create-hologram-video 오류:", err);
    return NextResponse.json(
      {
        error: "서버 내부 오류",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

