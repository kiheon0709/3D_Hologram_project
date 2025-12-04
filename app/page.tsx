"use client";

import { useState, ChangeEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import EXIF from "exif-js";

type DevicePreset = {
  id: string;
  label: string;
};

const DEVICE_PRESETS: DevicePreset[] = [
  {
    id: "ipad-air-11",
    label: "iPad Air 11"
  }
];

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deviceId, setDeviceId] = useState<string>("ipad-air-11");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removedBackgroundUrl, setRemovedBackgroundUrl] = useState<string | null>(null);
  const [isRemovingBackground, setIsRemovingBackground] = useState<boolean>(false);
  const [showHologramView, setShowHologramView] = useState<boolean>(false);
  const [uploadedImagePath, setUploadedImagePath] = useState<string | null>(null);
  const [hologramVideoUrl, setHologramVideoUrl] = useState<string | null>(null);
  const [isCreatingVideo, setIsCreatingVideo] = useState<boolean>(false);
  const [videoScale, setVideoScale] = useState<number>(1.0);

  // 이미지 orientation 정규화 함수 (EXIF 정보 기반으로 올바른 방향으로 회전)
  const normalizeImageOrientation = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          // EXIF 데이터 읽기
          EXIF.getData(img as any, function(this: any) {
            const orientation = EXIF.getTag(this, "Orientation") || 1;
            
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(file);
              return;
            }

            let width = this.width;
            let height = this.height;

            // EXIF orientation에 따라 canvas 크기 및 변환 설정
            if (orientation > 4) {
              // 90도 또는 270도 회전된 경우 width/height 교체
              canvas.width = height;
              canvas.height = width;
            } else {
              canvas.width = width;
              canvas.height = height;
            }

            // orientation에 따라 변환 적용
            switch (orientation) {
              case 2:
                // horizontal flip
                ctx.transform(-1, 0, 0, 1, width, 0);
                break;
              case 3:
                // 180° rotate left
                ctx.transform(-1, 0, 0, -1, width, height);
                break;
              case 4:
                // vertical flip
                ctx.transform(1, 0, 0, -1, 0, height);
                break;
              case 5:
                // vertical flip + 90 rotate right
                ctx.transform(0, 1, 1, 0, 0, 0);
                break;
              case 6:
                // 90° rotate right
                ctx.transform(0, 1, -1, 0, height, 0);
                break;
              case 7:
                // horizontal flip + 90 rotate right
                ctx.transform(0, -1, -1, 0, height, width);
                break;
              case 8:
                // 90° rotate left
                ctx.transform(0, -1, 1, 0, 0, width);
                break;
              default:
                // 1 또는 기타: 정상
                break;
            }

            // 이미지 그리기
            ctx.drawImage(this, 0, 0);
            
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const normalizedFile = new File([blob], file.name, {
                    type: file.type || "image/jpeg",
                    lastModified: Date.now(),
                  });
                  resolve(normalizedFile);
                } else {
                  resolve(file);
                }
              },
              file.type || "image/jpeg",
              0.95
            );
          });
        };
        
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  // 실제 Supabase 업로드 로직 (파일 선택/드롭 시 바로 사용)
  const uploadImageToSupabase = async (file: File) => {
    setIsUploading(true);
    setUploadMessage(null);

    try {
      // 환경변수 확인
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.error("환경변수 누락:", {
          supabaseUrl: !!supabaseUrl,
          supabaseKey: !!supabaseKey
        });
        setUploadMessage(
          "❌ 환경변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요."
        );
        return;
      }

      const bucket = "3D_hologram_images"; // Supabase에서 사용 중인 버킷 이름
      const ext = file.name.split(".").pop() || "jpg";

      console.log("업로드 시작:", {
        bucket,
        fileName: file.name,
        fileSize: file.size
      });

      // 현재 user_images 폴더에 있는 파일 목록을 보고 다음 번호를 계산
      const { data: existingFiles, error: listError } = await supabase.storage
        .from(bucket)
        .list("user_images", {
          limit: 1000,
          offset: 0
        });

      if (listError) {
        console.error("파일 목록 조회 오류:", listError);
        setUploadMessage(
          `❌ 파일 목록 조회 실패: ${
            (listError as any).message || JSON.stringify(listError)
          }`
        );
        return;
      }

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

      const fileName = `${nextIndex}.${ext}`;
      const filePath = `user_images/${fileName}`;

      console.log("업로드 시도:", { filePath, nextIndex });

      // 이미지 orientation 정규화 (회전 문제 해결)
      const normalizedFile = await normalizeImageOrientation(file);
      console.log("이미지 orientation 정규화 완료");

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, normalizedFile, {
          cacheControl: "3600",
          upsert: false
        });

      if (error) {
        console.error("업로드 오류 상세:", error);
        setUploadMessage(
          `❌ 업로드 실패: ${error.message || JSON.stringify(error)}`
        );
        return;
      }

      console.log("업로드 성공:", data);
      setUploadMessage(
        `✅ 사진이 Supabase 스토리지에 업로드되었습니다. (파일명: ${fileName})`
      );

      // 업로드된 파일 경로 저장 (버튼 클릭 시 이 파일 사용)
      setUploadedImagePath(filePath);
    } catch (err) {
      console.error("예상치 못한 오류:", err);
      setUploadMessage(
        `❌ 예상치 못한 오류가 발생했습니다: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadMessage(null);

      // 파일 선택 즉시 Supabase로 업로드
      await uploadImageToSupabase(file);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadMessage(null);

      // 드래그 앤 드롭 시에도 즉시 업로드
      await uploadImageToSupabase(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  // 버튼 클릭 시: 배경 제거 실행 → 완료 후 화면 전환
  const handleCreateClick = async () => {
    if (!selectedFile) return;

    if (!uploadedImagePath) {
      setUploadMessage("❌ 업로드된 이미지가 없습니다. 먼저 사진을 업로드해주세요.");
      return;
    }

    // 업로드된 파일의 public URL 가져오기 (방금 업로드한 정확한 파일)
    const bucket = "3D_hologram_images";
    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(uploadedImagePath);

    const imageUrl = publicData.publicUrl;
    console.log("배경 제거할 이미지 URL:", imageUrl, "(파일 경로:", uploadedImagePath, ")");

    // 배경 제거 실행
    setIsRemovingBackground(true);
    setUploadMessage("배경 제거 중...");

    try {
      const removeBgRes = await fetch("/api/remove-background", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl }),
      });

      const removeBgData = await removeBgRes.json();

      if (!removeBgRes.ok) {
        console.error("배경 제거 오류:", removeBgData);
        const errorMsg = removeBgData.detail 
          ? `${removeBgData.error || "배경 제거 실패"}: ${removeBgData.detail}`
          : removeBgData.error || "알 수 없는 오류";
        setUploadMessage(`❌ ${errorMsg}`);
        return;
      }

      console.log("배경 제거 완료:", removeBgData);
      setRemovedBackgroundUrl(removeBgData.imageUrl);
      setUploadMessage(`✅ 배경 제거 완료! 홀로그램 영상 생성 중...`);

      // 배경 제거 완료 후 홀로그램 영상 생성
      setIsCreatingVideo(true);
      
      const prompt = `Create a short video where the subject stays perfectly preserved and centered on a pure black (#000000) background.

Apply only subtle symmetric motion: a gentle left-right parallax and a very small tilt, just enough to suggest depth.
The movement should be minimal and cyclic so it feels loop-friendly when repeated.

You must generate background color only black.

Do not reveal new angles. Do not rotate the subject.
Keep all original details, colors and proportions.

No shadows, no reflections, no particles, no added objects.
Lighting stays consistent and clean.`;

      try {
        const videoRes = await fetch("/api/create-hologram-video", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            imageUrl: removeBgData.imageUrl,
            prompt: prompt
          }),
        });

        const videoData = await videoRes.json();

        if (!videoRes.ok) {
          console.error("영상 생성 오류:", videoData);
          const errorMsg = videoData.detail 
            ? `${videoData.error || "영상 생성 실패"}: ${videoData.detail}`
            : videoData.error || "알 수 없는 오류";
          setUploadMessage(`❌ ${errorMsg}`);
          return;
        }

        console.log("홀로그램 영상 생성 완료:", videoData);
        setHologramVideoUrl(videoData.videoUrl);
        setUploadMessage(`✅ 홀로그램 영상 생성 완료!`);

        // 영상 생성 완료 후 전체 화면 검정 배경으로 전환
        setShowHologramView(true);
      } catch (err) {
        console.error("영상 생성 중 오류:", err);
        setUploadMessage(
          `❌ 영상 생성 중 오류 발생: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      } finally {
        setIsCreatingVideo(false);
      }
    } catch (err) {
      console.error("배경 제거 중 오류:", err);
      setUploadMessage(
        `❌ 배경 제거 중 오류 발생: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsRemovingBackground(false);
    }
  };

  // 홀로그램 4방면 재생 화면 (전체 화면 검정 배경)
  if (showHologramView && hologramVideoUrl) {
    return (
      <main
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        {/* 4방면 홀로그램 십자가 배치 */}
        <div
          style={{
            width: "100vmin",
            height: "100vmin",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gridTemplateRows: "1fr 1fr 1fr",
            gap: 0,
          }}
        >
          {/* 빈 공간 (좌상단) */}
          <div style={{ backgroundColor: "#000000" }} />

          {/* 상단: 180도 회전 */}
          <div style={{ overflow: "hidden", backgroundColor: "#000000" }}>
            <video
              src={hologramVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                transform: `rotate(180deg) scale(${videoScale})`,
              }}
            />
          </div>

          {/* 빈 공간 (우상단) */}
          <div style={{ backgroundColor: "#000000" }} />

          {/* 좌측: 90도 회전 */}
          <div style={{ overflow: "hidden", backgroundColor: "#000000" }}>
            <video
              src={hologramVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                transform: `rotate(90deg) scale(${videoScale})`,
              }}
            />
          </div>

          {/* 중앙 빈 공간 (피라미드 위치) */}
          <div style={{ backgroundColor: "#000000" }} />

          {/* 우측: 270도 회전 */}
          <div style={{ overflow: "hidden", backgroundColor: "#000000" }}>
            <video
              src={hologramVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                transform: `rotate(270deg) scale(${videoScale})`,
              }}
            />
          </div>

          {/* 빈 공간 (좌하단) */}
          <div style={{ backgroundColor: "#000000" }} />

          {/* 하단: 0도 (원본) */}
          <div style={{ overflow: "hidden", backgroundColor: "#000000" }}>
            <video
              src={hologramVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                transform: `rotate(0deg) scale(${videoScale})`,
              }}
            />
          </div>

          {/* 빈 공간 (우하단) */}
          <div style={{ backgroundColor: "#000000" }} />
        </div>

          {/* 뒤로가기 버튼 */}
          <button
            onClick={() => setShowHologramView(false)}
            style={{
              position: "absolute",
              top: "20px",
              left: "20px",
              padding: "10px 20px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "8px",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
              zIndex: 10000,
            }}
          >
            ← 뒤로가기
          </button>

          {/* 스케일 조절 컨트롤 (우측 상단 작게) */}
          <div
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              padding: "8px 12px",
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              border: "1px solid rgba(255, 171, 94, 0.4)",
              borderRadius: "8px",
              zIndex: 10000,
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              minWidth: "140px",
            }}
          >
            <label
              style={{
                color: "#ffffff",
                fontSize: "10px",
                fontWeight: 600,
                marginBottom: "2px",
              }}
            >
              확대: {videoScale.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={videoScale}
              onChange={(e) => setVideoScale(Number(e.target.value))}
              style={{
                width: "100%",
                cursor: "pointer",
                height: "4px",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "8px",
                color: "rgba(255, 255, 255, 0.5)",
              }}
            >
              <span>0.5x</span>
              <span>2.0x</span>
            </div>
          </div>
      </main>
    );
  }

  return (
    <main className="page-root">
      <div className="grid-shell">
        <div className="card-shell">
          <header className="card-header">
            <div>
              <p className="badge">ALPHA</p>
              <h1 className="title">HoloFrame Studio</h1>
              <p className="subtitle">
                한 장의 사진으로 스마트폰 3D 홀로그램 프로젝터용 영상을 만들어 보세요.
              </p>
            </div>
          </header>

          <section className="content-grid">
            <div className="left-panel">
              <label
                className="upload-area"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="upload-input"
                  onChange={handleFileChange}
                />
                <div className="upload-inner">
                  <div className="upload-icon" />
                  <p className="upload-title">
                    사진을 드래그하거나 클릭해서 업로드
                  </p>
                  <p className="upload-help">
                    인물 또는 사물 사진 1장을 선택하세요. 배경은 AI가 자동으로 제거합니다.
                  </p>
                  {selectedFile && (
                    <p className="upload-file">
                      선택된 파일: <span>{selectedFile.name}</span>
                    </p>
                  )}
                  {previewUrl && (
                    <div className="upload-preview">
                      <img src={previewUrl} alt="선택한 이미지 미리보기" />
                    </div>
                  )}
                  {removedBackgroundUrl && (
                    <div className="upload-preview" style={{ marginTop: "10px" }}>
                      <p style={{ fontSize: "12px", color: "#7ee8ff", marginBottom: "4px" }}>
                        배경 제거된 이미지:
                      </p>
                      <img src={removedBackgroundUrl} alt="배경 제거된 이미지" />
                    </div>
                  )}
                </div>
              </label>

              <div className="field-group">
                <label className="field-label">사용할 기기</label>
                <div className="select-wrapper">
                  <select
                    className="select"
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                  >
                    {DEVICE_PRESETS.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                className="primary-btn"
                onClick={handleCreateClick}
                disabled={!selectedFile || isUploading || isRemovingBackground || isCreatingVideo}
              >
                {isUploading
                  ? "업로드 중..."
                  : isRemovingBackground
                  ? "배경 제거 중..."
                  : isCreatingVideo
                  ? "영상 생성 중..."
                  : "3D 홀로그램 영상 만들기"}
              </button>

              <p className="helper-text">
                버튼을 누르면 선택한 사진이 Supabase 스토리지에 업로드됩니다. 이후 단계에서
                AI 변환 및 홀로그램 전용 재생 화면으로 연결할 예정입니다.
              </p>

              {uploadMessage && (
                <p className="upload-status">{uploadMessage}</p>
              )}
            </div>

            <div className="right-panel">
              <div className="video-frame">
                <div className="video-inner">
                  <iframe
                    src="https://www.youtube.com/embed/Y60mfBvXCj8?autoplay=0&loop=1&playlist=Y60mfBvXCj8"
                    title="3D hologram sample"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}


