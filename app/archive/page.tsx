"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

type VideoFile = {
  name: string;
  id: string;
  created_at: string;
  updated_at: string;
  publicUrl: string;
  userId?: string;
  nickname?: string;
};

export default function ArchivePage() {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

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

      // 각 비디오에 nickname 추가
      const videosWithNicknames = videosWithUrls.map(video => ({
        ...video,
        nickname: video.userId ? (userIdToNickname.get(video.userId) || video.userId) : undefined,
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
    const video = videos.find((v) => v.publicUrl === selectedVideo);
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
        <video
          src={selectedVideo}
          controls
          autoPlay
          loop
          playsInline
          style={{
            maxWidth: "90vw",
            maxHeight: "90vh",
          }}
        />
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
                onClick={() => setSelectedVideo(video.publicUrl)}
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
