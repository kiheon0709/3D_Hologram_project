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
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fourSidesContainerRef = useRef<HTMLDivElement>(null);
  const videoTopRef = useRef<HTMLVideoElement>(null);
  const videoLeftRef = useRef<HTMLVideoElement>(null);
  const videoRightRef = useRef<HTMLVideoElement>(null);
  const videoBottomRef = useRef<HTMLVideoElement>(null);

  // 전체화면 전환 함수 (모바일 호환성 포함)
  const handleFullscreen = async () => {
    const container = fourSidesContainerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        // 모바일 브라우저 호환성
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        } else if ((container as any).mozRequestFullScreen) {
          await (container as any).mozRequestFullScreen();
        } else if ((container as any).msRequestFullscreen) {
          await (container as any).msRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        // 전체화면 종료
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('전체화면 오류:', err);
      // 모바일에서는 CSS로 대체
      setIsFullscreen(!isFullscreen);
    }
  };

  // 전체화면 상태 감지 (모바일 호환성 포함)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreenActive = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFullscreenActive);
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
  }, []);

  // 4방면 홀로그램을 하나의 영상으로 다운로드하는 함수
  const handleDownload4Sides = async (videoUrl: string, videoName?: string) => {
    try {
      setIsDownloading(true);
      
      // Canvas와 MediaRecorder를 사용하여 4방면을 하나의 영상으로 합성
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context를 가져올 수 없습니다.');
      }

      // 캔버스 크기 설정 (3x3 그리드, 각 셀 300x300)
      const cellSize = 300;
      canvas.width = cellSize * 3;
      canvas.height = cellSize * 3;

      // 비디오 요소들 생성
      const videos = [
        { video: document.createElement('video'), transform: 'rotate(180deg) scaleY(-1)' },
        { video: document.createElement('video'), transform: 'rotate(90deg) scaleY(-1)' },
        { video: document.createElement('video'), transform: 'rotate(270deg) scaleY(-1)' },
        { video: document.createElement('video'), transform: 'rotate(0deg) scaleY(-1)' },
      ];

      // 모든 비디오 로드 완료를 기다림
      await Promise.all(videos.map(({ video }) => {
        return new Promise((resolve, reject) => {
          video.src = videoUrl;
          video.crossOrigin = 'anonymous';
          video.muted = true;
          video.onloadeddata = () => resolve(undefined);
          video.onerror = reject;
        });
      }));

      // MediaRecorder 설정
      const stream = canvas.captureStream(30); // 30fps
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      return new Promise<void>((resolve, reject) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = videoName || `hologram-4sides-${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          videos.forEach(({ video }) => video.remove());
          canvas.remove();
          setIsDownloading(false);
          resolve();
        };

        recorder.onerror = reject;

        // 비디오 재생 시작
        videos.forEach(({ video }) => {
          video.currentTime = 0;
          video.play();
        });

        // 녹화 시작
        recorder.start();

        // 애니메이션 루프
        const drawFrame = () => {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // 상단 (180도)
          ctx.save();
          ctx.translate(cellSize * 1.5, cellSize * 0.5);
          ctx.rotate(Math.PI);
          ctx.scale(1, -1);
          ctx.drawImage(videos[0].video, -cellSize / 2, -cellSize / 2, cellSize, cellSize);
          ctx.restore();

          // 좌측 (90도)
          ctx.save();
          ctx.translate(cellSize * 0.5, cellSize * 1.5);
          ctx.rotate(Math.PI / 2);
          ctx.scale(1, -1);
          ctx.drawImage(videos[1].video, -cellSize / 2, -cellSize / 2, cellSize, cellSize);
          ctx.restore();

          // 우측 (270도)
          ctx.save();
          ctx.translate(cellSize * 2.5, cellSize * 1.5);
          ctx.rotate((Math.PI * 3) / 2);
          ctx.scale(1, -1);
          ctx.drawImage(videos[2].video, -cellSize / 2, -cellSize / 2, cellSize, cellSize);
          ctx.restore();

          // 하단 (0도)
          ctx.save();
          ctx.translate(cellSize * 1.5, cellSize * 2.5);
          ctx.rotate(0);
          ctx.scale(1, -1);
          ctx.drawImage(videos[3].video, -cellSize / 2, -cellSize / 2, cellSize, cellSize);
          ctx.restore();

          // 비디오가 끝나면 녹화 종료 (일반적으로 4초)
          if (videos[0].video.ended) {
            recorder.stop();
            return;
          }

          requestAnimationFrame(drawFrame);
        };

        // 첫 프레임 그리기 시작
        requestAnimationFrame(drawFrame);

        // 최대 5초 후 강제 종료 (안전장치)
        setTimeout(() => {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        }, 5000);
      });
    } catch (error) {
      console.error('4방면 다운로드 오류:', error);
      alert('4방면 영상 다운로드에 실패했습니다. 다시 시도해주세요.');
      setIsDownloading(false);
    }
  };

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

  // 전체화면 진입 시 가로 모드로 고정 (1면일 때만)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedVideo || selectedVideo.hologramType === "4sides") return;

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
          
          // 파일명에서 userId 추출: {userId}_{번호}.mp4 또는 anonymous_{timestamp}.mp4
          const fileNameWithoutExt = file.name.replace(".mp4", "");
          let userId: string | undefined;
          if (fileNameWithoutExt.startsWith("anonymous_")) {
            userId = undefined; // anonymous는 userId 없음
          } else {
            // 첫 번째 언더스코어(_) 앞부분이 userId
            const firstUnderscoreIndex = fileNameWithoutExt.indexOf("_");
            if (firstUnderscoreIndex > 0) {
              userId = fileNameWithoutExt.substring(0, firstUnderscoreIndex);
            } else {
              // 언더스코어가 없으면 전체가 userId일 수 있음 (UUID 형식)
              userId = fileNameWithoutExt;
            }
          }
          
          return {
            name: file.name,
            id: file.id,
            created_at: file.created_at || "",
            updated_at: file.updated_at || "",
            publicUrl: data.publicUrl,
            userId: userId,
          };
        });

      // holograms 테이블에서 hologram_type과 user_id 정보 가져오기
      const videoUrls = videosWithUrls.map(v => v.publicUrl);
      const { data: holograms, error: hologramsError } = await supabase
        .from("holograms")
        .select("video_url, hologram_type, user_id")
        .in("video_url", videoUrls);
      
      if (hologramsError) {
        console.error("holograms 조회 오류:", hologramsError);
      }
      
      const urlToHologramType = new Map<string, "1side" | "4sides">();
      const urlToUserId = new Map<string, string>();
      if (holograms) {
        holograms.forEach(h => {
          urlToHologramType.set(h.video_url, h.hologram_type);
          if (h.user_id) {
            urlToUserId.set(h.video_url, h.user_id);
          }
        });
      }

      // holograms 테이블에서 가져온 user_id로 nickname 조회
      const allUserIds = [
        ...new Set([
          ...Array.from(urlToUserId.values()).filter(Boolean),
          ...videosWithUrls.map(v => v.userId).filter(Boolean)
        ])
      ];
      
      const userIdToNickname = new Map<string, string>();
      if (allUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, nickname")
          .in("id", allUserIds);
        
        if (profilesError) {
          console.error("profiles 조회 오류:", profilesError);
        }
        
        if (profiles) {
          profiles.forEach(profile => {
            if (profile.nickname) {
              userIdToNickname.set(profile.id, profile.nickname);
            }
          });
        }
      }

      // 각 비디오에 nickname과 hologramType 추가
      const videosWithNicknames = videosWithUrls.map(video => {
        // holograms 테이블에서 가져온 user_id를 우선 사용, 없으면 파일명에서 추출한 userId 사용
        const finalUserId = urlToUserId.get(video.publicUrl) || video.userId;
        // userIdToNickname에서 nickname 가져오기 (없으면 undefined)
        const nickname = finalUserId ? userIdToNickname.get(finalUserId) : undefined;
        
        // 디버깅 로그
        if (finalUserId && !nickname) {
          console.warn(`닉네임을 찾을 수 없음: userId=${finalUserId}, videoUrl=${video.publicUrl}`);
        }
        
        return {
          ...video,
          userId: finalUserId,
          nickname: nickname || undefined,
          hologramType: urlToHologramType.get(video.publicUrl) || "1side",
        };
      });

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
            ref={fourSidesContainerRef}
            style={{
              width: "100%",
              maxWidth: isFullscreen ? "100vw" : "600px",
              height: isFullscreen ? "100vh" : "auto",
              aspectRatio: isFullscreen ? "auto" : "1 / 1",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gridTemplateRows: "1fr 1fr 1fr",
              gap: 0,
            }}
          >
            {/* 빈 공간 (좌상단) */}
            <div style={{ backgroundColor: "#000000" }} />

            {/* 상단: 180도 회전 + 위아래 뒤집기 */}
            <div style={{ overflow: "hidden", backgroundColor: "#000000" }}>
              <video
                key="top-180"
                ref={videoTopRef}
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
                  transform: `rotate(180deg) scaleY(-1) scale(${videoScale})`,
                }}
              />
            </div>

            {/* 빈 공간 (우상단) */}
            <div style={{ backgroundColor: "#000000" }} />

            {/* 좌측: 90도 회전 + 위아래 뒤집기 */}
            <div style={{ overflow: "hidden", backgroundColor: "#000000" }}>
              <video
                key="left-90"
                ref={videoLeftRef}
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
                  transform: `rotate(90deg) scaleY(-1) scale(${videoScale})`,
                }}
              />
            </div>

            {/* 중앙 빈 공간 (피라미드 위치) */}
            <div style={{ backgroundColor: "#000000" }} />

            {/* 우측: 270도 회전 + 위아래 뒤집기 */}
            <div style={{ overflow: "hidden", backgroundColor: "#000000" }}>
              <video
                key="right-270"
                ref={videoRightRef}
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
                  transform: `rotate(270deg) scaleY(-1) scale(${videoScale})`,
                }}
              />
            </div>

            {/* 빈 공간 (좌하단) */}
            <div style={{ backgroundColor: "#000000" }} />

            {/* 하단: 0도 (원본) + 위아래 뒤집기 */}
            <div style={{ overflow: "hidden", backgroundColor: "#000000" }}>
              <video
                key="bottom-0"
                ref={videoBottomRef}
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
                  transform: `rotate(0deg) scaleY(-1) scale(${videoScale})`,
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
        <div style={{ position: "absolute", top: "20px", right: "20px", display: "flex", gap: "10px", zIndex: 10000 }}>
          {hologramType === "4sides" && (
            <button
              onClick={handleFullscreen}
              style={{
                padding: "10px 20px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              {isFullscreen ? "⛶ 전체화면 종료" : "⛶ 전체화면"}
            </button>
          )}
          <button
            onClick={() => {
              if (hologramType === "4sides") {
                handleDownload4Sides(video.publicUrl, video?.name);
              } else {
                handleDownload(video.publicUrl, video?.name);
              }
            }}
            disabled={isDownloading}
            style={{
              padding: "10px 20px",
              backgroundColor: isDownloading ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "8px",
              color: "#ffffff",
              cursor: isDownloading ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: 600,
              opacity: isDownloading ? 0.6 : 1,
            }}
          >
            {isDownloading ? "다운로드 중..." : "⬇ 다운로드"}
          </button>
        </div>
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
