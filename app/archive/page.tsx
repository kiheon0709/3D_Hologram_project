"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

type VideoFile = {
  name: string;
  id: string;
  created_at: string;
  updated_at: string;
  publicUrl: string;
  userId?: string;
  nickname?: string;
  hologramType?: "1side" | "4sides";
};

export default function ArchivePage() {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [videoScale, setVideoScale] = useState<number>(1.0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 비디오 다운로드 함수
  const handleDownload = async (videoUrl: string, videoName?: string) => {
    try {
      setIsDownloading(true);
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = videoName || `hologram-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('다운로드 오류:', error);
      alert('다운로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsDownloading(false);
    }
  };

  // 전체화면 진입 시 가로 모드로 고정
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedVideo) return;

    const handleFullscreenChange = async () => {
      if (document.fullscreenElement === video) {
        // 전체화면 진입 시 가로 모드로 설정 시도
        try {
          if ('orientation' in screen && 'lock' in screen.orientation) {
            await (screen.orientation as any).lock('landscape').catch(() => {
              // 일부 브라우저에서는 실패할 수 있음 (무시)
            });
          }
        } catch (err) {
          // 지원하지 않는 브라우저 (무시)
        }
      } else {
        // 전체화면 종료 시 잠금 해제
        try {
          if ('orientation' in screen && 'unlock' in screen.orientation) {
            (screen.orientation as any).unlock();
          }
        } catch (err) {
          // 지원하지 않는 브라우저 (무시)
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [selectedVideo]);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const bucket = "3D_hologram_images";
      
      // veo_video 폴더에서 모든 파일 가져오기
      const { data: files, error } = await supabase.storage
        .from(bucket)
        .list("veo_video", {
          limit: 100,
          offset: 0,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) {
        console.error("영상 목록 로드 오류:", error);
        return;
      }

      if (!files || files.length === 0) {
        setVideos([]);
        return;
      }

      // 각 파일의 public URL 가져오기 및 userId 추출
      const videosWithUrls = files
        .filter((file) => file.name.endsWith(".mp4"))
        .map((file) => {
          const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(`veo_video/${file.name}`);
          
          // 파일명에서 userId 추출: {userId}_{번호}.mp4
          const fileNameWithoutExt = file.name.replace(".mp4", "");
          const userId = fileNameWithoutExt.split("_")[0];
          
          return {
            name: file.name,
            id: file.id,
            created_at: file.created_at || "",
            updated_at: file.updated_at || "",
            publicUrl: data.publicUrl,
            userId: userId,
          };
        });

      // 모든 userId 추출 (중복 제거)
      const userIds = [...new Set(videosWithUrls.map(v => v.userId).filter(Boolean))];
      
      // profiles 테이블에서 nickname 가져오기
      const userIdToNickname = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nickname")
          .in("id", userIds);
        
        if (profiles) {
          profiles.forEach(profile => {
            userIdToNickname.set(profile.id, profile.nickname || profile.id);
          });
        }
      }

      // holograms 테이블에서 hologram_type 정보 가져오기
      const videoUrls = videosWithUrls.map(v => v.publicUrl);
      const { data: holograms } = await supabase
        .from("holograms")
        .select("video_url, hologram_type")
        .in("video_url", videoUrls);
      
      const urlToHologramType = new Map<string, "1side" | "4sides">();
      if (holograms) {
        holograms.forEach(h => {
          urlToHologramType.set(h.video_url, h.hologram_type);
        });
      }

      // 각 비디오에 nickname과 hologramType 추가
      const videosWithNicknames = videosWithUrls.map(video => ({
        ...video,
        nickname: video.userId ? (userIdToNickname.get(video.userId) || video.userId) : undefined,
        hologramType: urlToHologramType.get(video.publicUrl) || "1side",
      }));

      setVideos(videosWithNicknames);
    } catch (err) {
      console.error("영상 로드 중 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main style={{ minHeight: "calc(100vh - 64px)", padding: "48px 24px" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "8px", color: "#000000" }}>
            Archive
          </h1>
          <p style={{ fontSize: "16px", color: "#666666", marginBottom: "32px" }}>
            생성된 홀로그램 영상들을 모아볼 수 있는 공간입니다.
          </p>
          <p style={{ fontSize: "14px", color: "#999999" }}>로딩 중...</p>
        </div>
      </main>
    );
  }

  if (selectedVideo) {
    const video = selectedVideo;
    const hologramType = video.hologramType || "1side";
    
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
          padding: "20px",
        }}
      >
        {hologramType === "4sides" ? (
          /* 4방면 홀로그램 십자가 배치 */
          <div
            style={{
              width: "100%",
              maxWidth: "600px",
              aspectRatio: "1 / 1",
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
                key="top-180"
                ref={videoRef}
                src={video.publicUrl}
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
                key="left-90"
                src={video.publicUrl}
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
                key="right-270"
                src={video.publicUrl}
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
                key="bottom-0"
                src={video.publicUrl}
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
          <video
            ref={videoRef}
            src={video.publicUrl}
            controls
            autoPlay
            loop
            playsInline
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
            }}
          />
        )}
        
        {/* 스케일 조절 컨트롤 (4방면일 때만) */}
        {hologramType === "4sides" && (
          <div
            style={{
              position: "absolute",
              bottom: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              padding: "12px 16px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              minWidth: "200px",
            }}
          >
            <label
              style={{
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 600,
                textAlign: "center",
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
                height: "6px",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "10px",
                color: "rgba(255, 255, 255, 0.6)",
              }}
            >
              <span>0.5x</span>
              <span>2.0x</span>
            </div>
          </div>
        )}
        <button
          onClick={() => setSelectedVideo(null)}
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
        <button
          onClick={() => handleDownload(video.publicUrl, video?.name)}
          disabled={isDownloading}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            padding: "10px 20px",
            backgroundColor: isDownloading ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "8px",
            color: "#ffffff",
            cursor: isDownloading ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: 600,
            zIndex: 10000,
            opacity: isDownloading ? 0.6 : 1,
          }}
        >
          {isDownloading ? "다운로드 중..." : "⬇ 다운로드"}
        </button>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "calc(100vh - 64px)", padding: "48px 24px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "8px", color: "#000000" }}>
          Archive
        </h1>
        <p style={{ fontSize: "16px", color: "#666666", marginBottom: "32px" }}>
          생성된 홀로그램 영상들을 모아볼 수 있는 공간입니다.
        </p>

        {videos.length === 0 ? (
          <div
            style={{
              padding: "48px",
              textAlign: "center",
              border: "1px solid #e5e5e5",
              borderRadius: "12px",
              backgroundColor: "#fafafa",
            }}
          >
            <p style={{ fontSize: "16px", color: "#666666" }}>
              아직 생성된 영상이 없습니다.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "24px",
            }}
          >
            {videos.map((video) => (
              <div
                key={video.id}
                onClick={() => setSelectedVideo(video)}
                style={{
                  border: "1px solid #e5e5e5",
                  borderRadius: "12px",
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  backgroundColor: "#ffffff",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "16 / 9",
                    backgroundColor: "#000000",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <video
                    src={video.publicUrl}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    muted
                    playsInline
                    onMouseEnter={(e) => {
                      e.currentTarget.play();
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      padding: "4px 8px",
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                      borderRadius: "4px",
                      color: "#ffffff",
                      fontSize: "12px",
                    }}
                  >
                    MP4
                  </div>
                </div>
                <div style={{ padding: "16px" }}>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      marginBottom: "8px",
                      color: "#000000",
                    }}
                  >
                    {video.nickname || video.userId || video.name.replace(".mp4", "")}
                  </h3>
                  {video.created_at && (
                    <p style={{ fontSize: "12px", color: "#666666", margin: 0 }}>
                      {new Date(video.created_at).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
