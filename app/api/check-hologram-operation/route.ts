import { NextRequest, NextResponse } from "next/server";

/**
 * Vertex AI Veo operation 상태 확인 및 결과 처리
 * 
 * GET /api/check-hologram-operation?operationName=xxx&userId=xxx&platform=veo
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const operationName = searchParams.get("operationName");
    const userId = searchParams.get("userId");
    const platform = searchParams.get("platform") || "veo";

    if (!operationName) {
      return NextResponse.json(
        { error: "operationName 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    console.log("🔍 Operation 상태 조회:", operationName);

    // Vertex AI 접근을 위한 토큰 가져오기
    const { getAccessToken } = await import("@/lib/googleAuth-unified");
    const accessToken = await getAccessToken();

    const projectId = process.env.GOOGLE_PROJECT_ID;
    const location = process.env.GOOGLE_LOCATION || "us-central1";

    // fetchPredictOperation 엔드포인트 사용
    const pollUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/veo-3.1-fast-generate-preview:fetchPredictOperation`;

    const pollRes = await fetch(pollUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operationName: operationName,
      }),
    });

    if (!pollRes.ok) {
      const errorText = await pollRes.text();
      console.error("❌ Operation 조회 실패:", errorText);
      return NextResponse.json(
        {
          error: "Operation 조회 실패",
          detail: errorText,
        },
        { status: pollRes.status }
      );
    }

    const currentOperation = await pollRes.json();
    console.log("✅ Operation 상태:", currentOperation.done ? "완료" : "진행중");

    // 완료되지 않았으면 상태만 반환
    if (!currentOperation.done) {
      return NextResponse.json({
        done: false,
        status: "processing",
        message: "영상 생성 중입니다...",
      });
    }

    // 에러 체크
    if (currentOperation.error) {
      console.error("❌ Vertex AI 작업 실패:", currentOperation.error);
      return NextResponse.json(
        {
          done: true,
          status: "error",
          error: "Vertex AI 영상 생성 실패",
          detail: JSON.stringify(currentOperation.error),
        },
        { status: 500 }
      );
    }

    // 완료됨 - 비디오 URI 추출
    const response = currentOperation.response || {};
    const predictions = response.predictions || [];
    const videos = response.videos || [];

    let videoUri: string | null = null;

    if (predictions.length > 0 && predictions[0].storageUri) {
      videoUri = predictions[0].storageUri;
    } else if (videos.length > 0 && videos[0].gcsUri) {
      videoUri = videos[0].gcsUri;
    }

    if (!videoUri) {
      console.error("❌ 비디오 URI를 찾을 수 없음:", JSON.stringify(response));
      return NextResponse.json(
        {
          done: true,
          status: "error",
          error: "비디오 URI를 찾을 수 없습니다.",
          detail: JSON.stringify(response),
        },
        { status: 500 }
      );
    }

    console.log("✅ 비디오 URI 추출 완료:", videoUri);

    // GCS에서 다운로드 후 Supabase에 업로드
    try {
      const finalVideoUrl = await downloadAndUploadVideo(videoUri, platform, userId);

      return NextResponse.json({
        done: true,
        status: "completed",
        videoUrl: finalVideoUrl,
        message: "영상 생성이 완료되었습니다!",
      });
    } catch (uploadErr: any) {
      console.error("❌ 비디오 업로드 오류:", uploadErr);
      return NextResponse.json(
        {
          done: true,
          status: "error",
          error: "비디오 다운로드 또는 업로드 실패",
          detail: uploadErr.message || String(uploadErr),
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("❌ check-hologram-operation 오류:", error);
    return NextResponse.json(
      {
        error: "서버 내부 오류",
        detail: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * 비디오를 다운로드하고 Supabase에 업로드
 */
async function downloadAndUploadVideo(
  videoUrl: string,
  platform: string,
  userId: string | null
): Promise<string> {
  console.log(`${platform} 결과 영상 다운로드 시작:`, videoUrl);

  // GCS URI (gs://)인 경우 @google-cloud/storage 라이브러리 사용
  let videoBlob: Blob;
  if (videoUrl.startsWith("gs://")) {
    console.log("GCS URI 감지, @google-cloud/storage 사용");
    const { Storage } = await import("@google-cloud/storage");

    // GCS URI 파싱: gs://bucket-name/path/to/file
    const gsPath = videoUrl.replace("gs://", "");
    const [bucketName, ...pathParts] = gsPath.split("/");
    const fileName = pathParts.join("/");

    console.log(`GCS 버킷: ${bucketName}, 파일 경로: ${fileName}`);

    // Storage 클라이언트 생성 (Service Account 자동 인증)
    const credentialsBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
    if (!credentialsBase64) {
      throw new Error("GOOGLE_APPLICATION_CREDENTIALS_BASE64 환경변수가 필요합니다.");
    }

    const credentialsJson = Buffer.from(credentialsBase64, "base64").toString("utf8");
    const credentials = JSON.parse(credentialsJson);

    const storage = new Storage({
      credentials,
      projectId: credentials.project_id,
    });

    const bucket = storage.bucket(bucketName);
    const gcsFile = bucket.file(fileName);

    // 파일 다운로드
    const [buffer] = await gcsFile.download();
    // Buffer를 Uint8Array로 변환한 후 ArrayBuffer로 변환
    const arrayBuffer = new Uint8Array(buffer).buffer;
    videoBlob = new Blob([arrayBuffer], { type: "video/mp4" });
    console.log("GCS 파일 다운로드 완료");
  } else {
    // 일반 HTTP URL인 경우 fetch 사용
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      throw new Error(`영상 다운로드 실패: ${videoRes.status} ${videoRes.statusText}`);
    }
    const videoBuffer = await videoRes.arrayBuffer();
    videoBlob = new Blob([videoBuffer], { type: "video/mp4" });
    console.log("HTTP 파일 다운로드 완료");
  }

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
  const { data: existingFiles } = await supabase.storage.from(bucket).list("veo_video", {
    limit: 1000,
    offset: 0,
  });

  // 파일명 생성: {user_id}_{번호}.mp4 또는 anonymous_{timestamp}.mp4
  let fileName: string;
  if (userId) {
    // 로그인한 사용자: 해당 유저의 파일만 필터링해서 번호 계산
    const prefix = `${userId}_`;
    const userFiles = existingFiles?.filter((f) => f.name.startsWith(prefix)) || [];

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
  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);

  console.log(`홀로그램 영상 생성 완료 (${platform}) 및 Supabase 저장 완료:`, publicData.publicUrl);

  return publicData.publicUrl;
}
