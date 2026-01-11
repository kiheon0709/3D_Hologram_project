import { NextRequest, NextResponse } from "next/server";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 모델 설정 (하드코딩 - 변경하려면 여기만 수정하면 됨)
const REPLICATE_MODEL = "google/veo-3-fast"; // Replicate 모델 변경: google/veo-3-fast, google/veo-3 등
const VEO_MODEL = "veo-3.1-generate-preview"; // Veo 모델 변경: veo-3.1-generate-preview, veo-3.1-fast-generate-preview 등
const CREDIT_COST = 10; // 영상 제작당 필요한 크래딧

/**
 * Replicate를 사용한 비디오 생성
 */
async function createVideoWithReplicate(imageUrl: string, prompt: string): Promise<string> {
    if (!REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN이 설정되지 않았습니다.");
  }

  console.log("Replicate로 홀로그램 영상 생성 시작:", { imageUrl, model: REPLICATE_MODEL });

  // 1) Replicate에 영상 생성 요청
  const createRes = await fetch(`https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
        Prefer: "wait",
      },
      body: JSON.stringify({
        input: {
          image: imageUrl,
        last_frame: imageUrl,
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
      let errorDetail = text;
      try {
        const jsonError = JSON.parse(text);
        errorDetail = jsonError.detail || jsonError.message || text;
      } catch {
        // JSON 파싱 실패 시 원본 텍스트 사용
      }
    throw new Error(`Replicate 요청 실패: ${errorDetail}`);
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
      throw new Error(`영상 생성 상태 확인 실패: ${text}`);
      }

      prediction = await pollRes.json();
      console.log(`Prediction 상태 (${pollCount}/${maxPolls}):`, prediction.status);
    }

    if (pollCount >= maxPolls) {
    throw new Error("영상 생성 시간 초과: 최대 대기 시간을 초과했습니다.");
    }

    if (prediction.status !== "succeeded") {
    throw new Error(`영상 생성에 실패했습니다: ${prediction.error || JSON.stringify(prediction)}`);
    }

    // 3) 결과 영상 URL 추출
    const output = prediction.output;
    const videoUrl =
      typeof output === "string" ? output : Array.isArray(output) ? output[0] : null;

    if (!videoUrl) {
    throw new Error(`영상 생성 결과 형식이 예상과 다릅니다: ${JSON.stringify(output)}`);
  }

  console.log("Replicate 영상 생성 완료, 결과 URL:", videoUrl);
  return videoUrl;
}

/**
 * Veo (Gemini API)를 사용한 비디오 생성
 */
async function createVideoWithVeo(imageUrl: string, prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  console.log("Veo로 홀로그램 영상 생성 시작:", { imageUrl, model: VEO_MODEL });

  // 1) 이미지를 base64로 변환
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`이미지 다운로드 실패: ${imageResponse.status}`);
  }
  const imageBuffer = await imageResponse.arrayBuffer();
  const imageBase64 = Buffer.from(imageBuffer).toString("base64");
  const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

  // 2) Veo API로 비디오 생성 요청 (공식 문서 형식)
  const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
  const modelId = VEO_MODEL;
  
  const createRes = await fetch(
    `${BASE_URL}/models/${modelId}:generateVideos?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        image: {
          data: imageBase64,
          mimeType: mimeType,
        },
        config: {
          lastFrame: {
            data: imageBase64,
            mimeType: mimeType,
          },
          aspectRatio: "16:9",
          resolution: "720p",
          durationSeconds: "4",
        },
      }),
    }
  );

  if (!createRes.ok) {
    const errorText = await createRes.text();
    let errorDetail;
    try {
      errorDetail = JSON.parse(errorText);
    } catch {
      errorDetail = { message: errorText };
    }
    throw new Error(`Veo API 요청 실패: ${errorDetail.error?.message || errorDetail.message || errorText}`);
  }

  const operation = await createRes.json();
  
  // generateVideos 엔드포인트는 long-running operation을 반환
  // 응답이 operation 객체인지 확인
  if (!operation.name && !operation.done) {
    // operation 객체가 아닌 경우, 직접 결과를 반환했을 수 있음
    const directResult = operation.generatedVideos?.[0]?.video;
    if (directResult?.uri || directResult?.url) {
      const videoUri = directResult.uri || directResult.url;
      console.log("Veo 영상 생성 완료 (직접 반환), 결과 URI:", videoUri);
      return videoUri.startsWith("http") ? videoUri : `https://storage.googleapis.com/${videoUri}`;
    }
    throw new Error(`Veo API 응답 형식이 예상과 다릅니다: ${JSON.stringify(operation)}`);
  }

  const operationName = operation.name;
  
  if (!operationName) {
    throw new Error(`Veo API 응답에 operation name이 없습니다: ${JSON.stringify(operation)}`);
  }

  console.log("Veo operation 생성됨:", operationName);

  // 3) 작업 완료까지 폴링
  let pollCount = 0;
  const maxPolls = 120; // 최대 40분 (20초 * 120)
  
  let currentOperation = operation;
  
  while (!currentOperation.done && pollCount < maxPolls) {
    await new Promise((r) => setTimeout(r, 20000)); // 20초 대기 (Veo는 더 오래 걸림)
    pollCount++;

    // operation name이 전체 경로인지, 상대 경로인지 확인
    const pollUrl = operationName.startsWith("operations/") 
      ? `${BASE_URL}/${operationName}?key=${GEMINI_API_KEY}`
      : `${BASE_URL}/operations/${operationName}?key=${GEMINI_API_KEY}`;

    const pollRes = await fetch(pollUrl, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!pollRes.ok) {
      const errorText = await pollRes.text();
      throw new Error(`Veo 작업 상태 확인 실패: ${errorText}`);
    }

    currentOperation = await pollRes.json();
    const progress = currentOperation.metadata?.progress || 0;
    console.log(`Veo 작업 상태 (${pollCount}/${maxPolls}): 진행률 ${(progress * 100).toFixed(1)}%`);
  }

  if (pollCount >= maxPolls) {
    throw new Error("Veo 영상 생성 시간 초과: 최대 대기 시간을 초과했습니다.");
  }

  if (currentOperation.error) {
    throw new Error(`Veo 영상 생성에 실패했습니다: ${JSON.stringify(currentOperation.error)}`);
  }

  // 4) 결과 영상 URI 추출
  // 공식 문서에 따르면 여러 형식이 가능:
  // - response.generateVideoResponse.generatedVideos[0].video.uri
  // - response.generateVideoResponse.generatedSamples[0].video.uri
  // - response.generatedVideos[0].video.uri
  const response = currentOperation.response || {};
  const generateVideoResponse = response.generateVideoResponse || {};
  const generatedVideos = generateVideoResponse.generatedVideos || 
                          generateVideoResponse.generatedSamples || 
                          response.generatedVideos || 
                          [];
  
  const videoData = generatedVideos[0]?.video || generatedVideos[0];
  const videoUri = videoData?.uri || videoData?.url;
  
  if (!videoUri) {
    console.error("Veo 응답 전체:", JSON.stringify(currentOperation, null, 2));
    throw new Error(`Veo 영상 생성 결과 형식이 예상과 다릅니다: ${JSON.stringify(currentOperation.response)}`);
  }

  console.log("Veo 영상 생성 완료, 결과 URI:", videoUri);

  // 5) Google Cloud Storage URI 다운로드
  // gs:// 형식이면 Files API를 통해 다운로드, https:// 형식이면 직접 사용
  if (videoUri.startsWith("gs://")) {
    // gs:// 형식은 Files API를 사용해야 함
    // 일단 에러를 던지고, 실제 구현은 나중에 추가
    throw new Error(`GCS URI는 아직 지원하지 않습니다. URI: ${videoUri}`);
  }

  // https:// 형식이면 그대로 반환 (다음 단계에서 다운로드)
  return videoUri;
}

/**
 * 비디오를 다운로드하고 Supabase에 업로드
 */
async function downloadAndUploadVideo(videoUrl: string, platform: string, userId: string | null): Promise<string> {
  console.log(`${platform} 결과 영상 다운로드 시작:`, videoUrl);
  
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
    throw new Error(`영상 다운로드 실패: ${videoRes.status} ${videoRes.statusText}`);
    }
    console.log("영상 다운로드 완료");

    const videoBuffer = await videoRes.arrayBuffer();
    const videoBlob = new Blob([videoBuffer], { type: "video/mp4" });

    // Supabase에 업로드
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey);
    const bucket = "3D_hologram_images";

    // 기존 파일 목록 확인해서 해당 유저의 다음 번호 계산
    const { data: existingFiles } = await supabase.storage
      .from(bucket)
      .list("veo_video", {
        limit: 1000,
        offset: 0,
      });

    // 파일명 생성: {user_id}_{번호}.mp4 또는 anonymous_{timestamp}.mp4
    let fileName: string;
    if (userId) {
      // 로그인한 사용자: 해당 유저의 파일만 필터링해서 번호 계산
      const prefix = `${userId}_`;
      const userFiles = existingFiles?.filter(f => f.name.startsWith(prefix)) || [];
      
      let nextIndex = 1;
      if (userFiles.length > 0) {
        const numericNames = userFiles
          .map((f) => {
            const base = f.name.replace(prefix, "").split(".")[0];
            const num = Number(base);
            return Number.isNaN(num) ? null : num;
          })
          .filter((n): n is number => n !== null);

        if (numericNames.length > 0) {
          nextIndex = Math.max(...numericNames) + 1;
        }
      }
      fileName = `${userId}_${nextIndex}.mp4`;
    } else {
      // 로그인하지 않은 사용자: 타임스탬프 사용
      fileName = `anonymous_${Date.now()}.mp4`;
    }

    const filePath = `veo_video/${fileName}`;

  console.log("Supabase 업로드 시작:", { filePath, fileSize: videoBlob.size, platform });

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
    throw new Error(`Supabase에 영상 저장 실패: ${uploadError.message || JSON.stringify(uploadError)}`);
    }

    console.log("Supabase 업로드 성공:", uploadData);

    // Public URL 가져오기
    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

  console.log(`홀로그램 영상 생성 완료 (${platform}) 및 Supabase 저장 완료:`, publicData.publicUrl);

  return publicData.publicUrl;
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, prompt, platform = "replicate" } = await req.json();
    
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

    if (platform !== "replicate" && platform !== "veo") {
      return NextResponse.json(
        { error: "platform은 'replicate' 또는 'veo'여야 합니다." },
        { status: 400 }
      );
    }

    // 유저 인증 및 크래딧 확인
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        { error: "Supabase 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    // Authorization 헤더에서 토큰 가져오기
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "인증에 실패했습니다." },
        { status: 401 }
      );
    }

    // 크래딧 확인
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credit")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "프로필을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (!profile.credit || profile.credit < CREDIT_COST) {
      return NextResponse.json(
        { error: `크래딧이 부족합니다. 영상 생성에는 ${CREDIT_COST} 크래딧이 필요합니다. (현재 크래딧: ${profile.credit || 0})` },
        { status: 400 }
      );
    }

    console.log("홀로그램 영상 생성 시작:", { imageUrl, platform, prompt: prompt.substring(0, 50) + "...", userId: user.id, currentCredit: profile.credit });

    // 플랫폼에 따라 비디오 생성
    let videoUrl: string;
    try {
      if (platform === "veo") {
        videoUrl = await createVideoWithVeo(imageUrl, prompt);
      } else {
        videoUrl = await createVideoWithReplicate(imageUrl, prompt);
      }
    } catch (err: any) {
      console.error(`${platform} 영상 생성 오류:`, err);
      return NextResponse.json(
        {
          error: `${platform === "veo" ? "Veo" : "Replicate"} 영상 생성 실패`,
          detail: err.message || String(err),
        },
        { status: 500 }
      );
    }

    console.log("영상 생성 완료, 다운로드 및 업로드 시작:", videoUrl);

    // 다운로드하고 Supabase에 업로드
    let finalVideoUrl: string;
    try {
      finalVideoUrl = await downloadAndUploadVideo(videoUrl, platform, user.id);
    } catch (err: any) {
      console.error("비디오 다운로드/업로드 오류:", err);
      return NextResponse.json(
        {
          error: "비디오 다운로드 또는 업로드 실패",
          detail: err.message || String(err),
        },
        { status: 500 }
      );
    }

    // 파일명 추출
    const fileName = finalVideoUrl.split("/").pop() || "video.mp4";
    const filePath = `veo_video/${fileName}`;

    // 영상 생성 성공 후 크래딧 차감
    const { error: creditError } = await supabase
      .from("profiles")
      .update({ credit: profile.credit - CREDIT_COST })
      .eq("id", user.id);

    if (creditError) {
      console.error("크래딧 차감 오류:", creditError);
      // 영상은 생성되었지만 크래딧 차감 실패 - 로깅만 (나중에 수동 처리 필요)
    } else {
      console.log(`크래딧 차감 완료: ${CREDIT_COST} 크래딧 차감 (잔여: ${profile.credit - CREDIT_COST})`);
    }

    return NextResponse.json({
      success: true,
      videoUrl: finalVideoUrl,
      fileName,
      filePath,
      platform,
      remainingCredit: profile.credit - CREDIT_COST,
    });
  } catch (err: any) {
    console.error("API /create-hologram-video 오류:", err);
    return NextResponse.json(
      {
        error: "서버 내부 오류",
        detail: err.message || String(err),
      },
      { status: 500 }
    );
  }
}
