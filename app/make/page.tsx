"use client";

import { useState, ChangeEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import EXIF from "exif-js";
import { createHologramPrompt } from "@/prompts/hologram";

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

export default function MakePage() {
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
  const [skipBackgroundRemoval, setSkipBackgroundRemoval] = useState<boolean>(false);
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [hologramType, setHologramType] = useState<"4sides" | "1side">("1side");

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

  // 실제 Supabase 업로드 로직
  const uploadImageToSupabase = async (file: File): Promise<string | null> => {
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
        return null;
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
        return null;
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
        return null;
      }

      console.log("업로드 성공:", data);
      // 업로드 메시지는 배경 제거나 영상 생성 시에만 표시되므로 여기서는 설정하지 않음

      // 업로드된 파일 경로 저장 (버튼 클릭 시 이 파일 사용)
      setUploadedImagePath(filePath);
      return filePath;
    } catch (err) {
      console.error("예상치 못한 오류:", err);
      setUploadMessage(
        `❌ 예상치 못한 오류가 발생했습니다: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadMessage(null);
      // 업로드된 경로 초기화 (새 파일 선택 시)
      setUploadedImagePath(null);
      setRemovedBackgroundUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadMessage(null);
      // 업로드된 경로 초기화 (새 파일 선택 시)
      setUploadedImagePath(null);
      setRemovedBackgroundUrl(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  // 홀로그램 영상 생성 함수 (공통 로직)
  const createHologramVideo = async (imageUrl: string) => {
    setIsCreatingVideo(true);
    
    // 프롬프트 관리 파일에서 프롬프트 가져오기
    const prompt = createHologramPrompt(userPrompt);

    try {
      const videoRes = await fetch("/api/create-hologram-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          imageUrl: imageUrl,
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
        return false;
      }

      console.log("홀로그램 영상 생성 완료:", videoData);
      setHologramVideoUrl(videoData.videoUrl);
      setUploadMessage(`✅ 홀로그램 영상 생성 완료!`);

      // 영상 생성 완료 후 전체 화면 검정 배경으로 전환
      setShowHologramView(true);
      return true;
    } catch (err) {
      console.error("영상 생성 중 오류:", err);
      setUploadMessage(
        `❌ 영상 생성 중 오류 발생: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      return false;
    } finally {
      setIsCreatingVideo(false);
    }
  };

  // 배경 제거만 실행하는 함수
  const handleRemoveBackground = async () => {
    if (!selectedFile) {
      setUploadMessage("❌ 사진을 먼저 선택해주세요.");
      return;
    }

    // 업로드가 안 되어 있으면 먼저 업로드
    let imagePath = uploadedImagePath;
    if (!imagePath) {
      setIsUploading(true);
      setUploadMessage("사진 업로드 중...");
      imagePath = await uploadImageToSupabase(selectedFile);
      setIsUploading(false);
      
      if (!imagePath) {
        setUploadMessage("❌ 사진 업로드에 실패했습니다.");
        return;
      }
    }

    // 업로드된 파일의 public URL 가져오기
    const bucket = "3D_hologram_images";
    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(imagePath);

    const imageUrl = publicData.publicUrl;
    console.log("사용할 이미지 URL:", imageUrl, "(파일 경로:", imagePath, ")");

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
      setUploadMessage(`✅ 배경 제거 완료!`);
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

  // 홀로그램 영상 생성만 실행하는 함수
  const handleCreateVideo = async () => {
    if (!selectedFile) {
      setUploadMessage("❌ 사진을 먼저 선택해주세요.");
      return;
    }

    // 배경 제거된 이미지가 있으면 그것을 사용, 없으면 원본 사용
    let imageUrl: string;
    
    if (removedBackgroundUrl) {
      // 배경 제거된 이미지 사용
      imageUrl = removedBackgroundUrl;
      console.log("배경 제거된 이미지로 영상 생성:", imageUrl);
    } else if (skipBackgroundRemoval) {
      // 배경 제거 건너뛰기 옵션이 체크되어 있으면 원본 사용
      // 업로드가 안 되어 있으면 먼저 업로드
      let imagePath = uploadedImagePath;
      if (!imagePath) {
        setIsUploading(true);
        setUploadMessage("사진 업로드 중...");
        imagePath = await uploadImageToSupabase(selectedFile);
        setIsUploading(false);
        
        if (!imagePath) {
          setUploadMessage("❌ 사진 업로드에 실패했습니다.");
          return;
        }
      }
      
      const bucket = "3D_hologram_images";
      const { data: publicData } = supabase.storage
        .from(bucket)
        .getPublicUrl(imagePath);
      imageUrl = publicData.publicUrl;
      console.log("원본 이미지로 영상 생성:", imageUrl);
    } else {
      setUploadMessage("❌ 배경 제거를 먼저 실행하거나 '배경 제거 건너뛰기' 옵션을 체크해주세요.");
      return;
    }

    setUploadMessage("홀로그램 영상 생성 중...");
    await createHologramVideo(imageUrl);
  };

  // 홀로그램 재생 화면 (전체 화면 검정 배경)
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
        {hologramType === "4sides" ? (
          /* 4방면 홀로그램 십자가 배치 */
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
        ) : (
          /* 1면 홀로그램 (중앙 단일 화면) */
          <div
            style={{
              width: "80vmin",
              height: "80vmin",
              maxWidth: "800px",
              maxHeight: "800px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              backgroundColor: "#000000",
            }}
          >
            <video
              src={hologramVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "center",
                transform: `scale(${videoScale})`,
              }}
            />
          </div>
        )}

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
            border: "1px solid rgba(0, 0, 0, 0.4)",
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
    <main style={{ minHeight: "calc(100vh - 64px)", padding: "48px 24px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "8px", color: "#000000" }}>
          영상 만들기
        </h1>
        <p style={{ fontSize: "16px", color: "#666666", marginBottom: "32px" }}>
          한 장의 사진으로 스마트폰 3D 홀로그램 프로젝터용 영상을 만들어 보세요.
        </p>

        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <label
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              style={{
                border: "2px dashed #cccccc",
                borderRadius: "12px",
                padding: "32px",
                cursor: "pointer",
                textAlign: "center",
                backgroundColor: "#fafafa",
                transition: "border-color 0.2s, background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#000000";
                e.currentTarget.style.backgroundColor = "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#cccccc";
                e.currentTarget.style.backgroundColor = "#fafafa";
              }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <div>
                <p style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px", color: "#000000" }}>
                  사진을 드래그하거나 클릭해서 업로드
                </p>
                <p style={{ fontSize: "14px", color: "#666666", margin: 0 }}>
                  인물 또는 사물 사진 1장을 선택하세요. 배경은 AI가 자동으로 제거합니다.
                </p>
                {selectedFile && (
                  <p style={{ fontSize: "12px", color: "#999999", marginTop: "12px" }}>
                    선택된 파일: <span style={{ fontWeight: 600 }}>{selectedFile.name}</span>
                  </p>
                )}
                {previewUrl && (
                  <div style={{ marginTop: "16px", borderRadius: "8px", overflow: "hidden" }}>
                    <img 
                      src={previewUrl} 
                      alt="선택한 이미지 미리보기" 
                      style={{ width: "100%", maxHeight: "300px", objectFit: "contain" }}
                    />
                  </div>
                )}
                {removedBackgroundUrl && (
                  <div style={{ marginTop: "16px" }}>
                    <p style={{ fontSize: "12px", color: "#666666", marginBottom: "8px" }}>
                      배경 제거된 이미지:
                    </p>
                    <div style={{ borderRadius: "8px", overflow: "hidden" }}>
                      <img 
                        src={removedBackgroundUrl} 
                        alt="배경 제거된 이미지" 
                        style={{ width: "100%", maxHeight: "300px", objectFit: "contain" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </label>

            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "#000000" }}>
                사용할 기기
              </label>
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: "14px",
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  outline: "none",
                }}
              >
                {DEVICE_PRESETS.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "12px", color: "#000000" }}>
                홀로그램 타입
              </label>
              <div style={{ display: "flex", gap: "24px", marginBottom: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="hologramType"
                    value="1side"
                    checked={hologramType === "1side"}
                    onChange={(e) => setHologramType(e.target.value as "4sides" | "1side")}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "14px", color: "#000000" }}>
                    1면 (단일 화면)
                  </span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="hologramType"
                    value="4sides"
                    checked={hologramType === "4sides"}
                    onChange={(e) => setHologramType(e.target.value as "4sides" | "1side")}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "14px", color: "#000000" }}>
                    4방면 (십자가 형태)
                  </span>
                </label>
              </div>
              <p style={{ fontSize: "12px", color: "#666666", margin: 0 }}>
                {hologramType === "4sides" 
                  ? "4방면 홀로그램 피라미드용 (상하좌우 4개 화면)" 
                  : "단일 화면용 (중앙 1개 화면)"}
              </p>
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "8px" }}>
                <input
                  type="checkbox"
                  checked={skipBackgroundRemoval}
                  onChange={(e) => setSkipBackgroundRemoval(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#000000" }}>
                  배경 제거 건너뛰기 (원본 이미지로 영상 생성)
                </span>
              </label>
              <p style={{ fontSize: "12px", color: "#666666", marginLeft: "26px" }}>
                체크하면 배경 제거 없이 원본 이미지로 바로 영상 생성이 가능합니다.
              </p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "#000000" }}>
                추가 프롬프트 (선택사항)
              </label>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="예: 더 부드러운 움직임, 특정 색상 강조 등..."
                style={{
                  width: "100%",
                  minHeight: "80px",
                  padding: "12px",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cccccc",
                  borderRadius: "8px",
                  color: "#000000",
                  resize: "vertical",
                  outline: "none",
                }}
              />
              <p style={{ fontSize: "12px", color: "#666666", marginTop: "4px" }}>
                기본 프롬프트에 추가로 적용할 요구사항을 입력하세요.
              </p>
            </div>

            {/* 배경 제거 버튼 */}
            <button
              onClick={handleRemoveBackground}
              disabled={!selectedFile || isUploading || isRemovingBackground || isCreatingVideo}
              style={{
                width: "100%",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 600,
                border: "1px solid #000000",
                borderRadius: "8px",
                backgroundColor: removedBackgroundUrl ? "#f5f5f5" : "#000000",
                color: removedBackgroundUrl ? "#000000" : "#ffffff",
                cursor: removedBackgroundUrl || (!selectedFile || isUploading || isRemovingBackground || isCreatingVideo) ? "not-allowed" : "pointer",
                opacity: (!selectedFile || isUploading || isRemovingBackground || isCreatingVideo) ? 0.5 : 1,
                marginBottom: "12px",
              }}
            >
              {isRemovingBackground
                ? "배경 제거 중..."
                : removedBackgroundUrl
                ? "✅ 배경 제거 완료 (다시 실행)"
                : "배경 제거하기"}
            </button>

            {/* 3D 홀로그램 영상 만들기 버튼 */}
            <button
              onClick={handleCreateVideo}
              disabled={
                !selectedFile || 
                isUploading || 
                isRemovingBackground || 
                isCreatingVideo ||
                (!removedBackgroundUrl && !skipBackgroundRemoval)
              }
              style={{
                width: "100%",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 600,
                border: "1px solid #000000",
                borderRadius: "8px",
                backgroundColor: "#000000",
                color: "#ffffff",
                cursor: (!selectedFile || isUploading || isRemovingBackground || isCreatingVideo || (!removedBackgroundUrl && !skipBackgroundRemoval)) ? "not-allowed" : "pointer",
                opacity: (!selectedFile || isUploading || isRemovingBackground || isCreatingVideo || (!removedBackgroundUrl && !skipBackgroundRemoval)) ? 0.5 : 1,
              }}
            >
              {isCreatingVideo
                ? "영상 생성 중..."
                : "3D 홀로그램 영상 만들기"}
            </button>

            {uploadMessage && (
              <p style={{ fontSize: "14px", color: uploadMessage.includes("❌") ? "#ff0000" : "#000000", marginTop: "8px" }}>
                {uploadMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
