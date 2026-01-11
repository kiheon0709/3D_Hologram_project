"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Hologram = {
  id: string;
  title: string | null;
  description: string | null;
  original_image_url: string;
  background_removed_image_url: string | null;
  video_url: string;
  platform: "replicate" | "veo";
  hologram_type: "1side" | "4sides";
  user_prompt: string | null;
  created_at: string;
  updated_at: string;
};

export default function MyPage() {
  const [holograms, setHolograms] = useState<Hologram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHologram, setSelectedHologram] = useState<Hologram | null>(null);

  useEffect(() => {
    loadHolograms();
  }, []);

  const loadHolograms = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/holograms");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "작품 불러오기 실패");
      }

      setHolograms(data.holograms);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main style={{ minHeight: "calc(100vh - 64px)", padding: "48px 24px" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "8px", color: "#000000" }}>
            내 작품
          </h1>
          <p style={{ fontSize: "16px", color: "#666666" }}>
            생성한 홀로그램 작품을 확인하고 관리하세요.
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "48px", color: "#666666" }}>
            작품을 불러오는 중...
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "16px",
              backgroundColor: "#fee",
              border: "1px solid #fcc",
              borderRadius: "8px",
              color: "#c00",
              marginBottom: "24px",
            }}
          >
            ❌ 오류: {error}
          </div>
        )}

        {!loading && !error && holograms.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "48px",
              backgroundColor: "#f9f9f9",
              borderRadius: "12px",
              border: "1px solid #dddddd",
            }}
          >
            <p style={{ fontSize: "16px", color: "#666666", marginBottom: "16px" }}>
              아직 생성된 작품이 없습니다.
            </p>
            <Link
              href="/make"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                backgroundColor: "#000000",
                color: "#ffffff",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              새 작품 만들기
            </Link>
          </div>
        )}

        {!loading && !error && holograms.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "24px",
            }}
          >
            {holograms.map((hologram) => (
              <div
                key={hologram.id}
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #dddddd",
                  borderRadius: "12px",
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onClick={() => setSelectedHologram(hologram)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* 비디오 썸네일 */}
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "16 / 9",
                    backgroundColor: "#000000",
                    position: "relative",
                  }}
                >
                  <video
                    src={hologram.video_url}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    muted
                    loop
                    playsInline
                  />
                </div>

                {/* 작품 정보 */}
                <div style={{ padding: "16px" }}>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      marginBottom: "8px",
                      color: "#000000",
                    }}
                  >
                    {hologram.title || "제목 없음"}
                  </h3>
                  
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        padding: "4px 8px",
                        backgroundColor: hologram.platform === "veo" ? "#e3f2fd" : "#f3e5f5",
                        color: hologram.platform === "veo" ? "#1976d2" : "#7b1fa2",
                        borderRadius: "4px",
                        fontWeight: 600,
                      }}
                    >
                      {hologram.platform === "veo" ? "Veo" : "Replicate"}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        padding: "4px 8px",
                        backgroundColor: "#f5f5f5",
                        color: "#666666",
                        borderRadius: "4px",
                      }}
                    >
                      {hologram.hologram_type === "4sides" ? "4방면" : "1면"}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: "12px",
                      color: "#999999",
                      margin: 0,
                    }}
                  >
                    {formatDate(hologram.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 모달 - 작품 상세보기 */}
        {selectedHologram && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "24px",
            }}
            onClick={() => setSelectedHologram(null)}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                maxWidth: "900px",
                width: "100%",
                maxHeight: "90vh",
                overflow: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "24px",
                  }}
                >
                  <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#000000", margin: 0 }}>
                    {selectedHologram.title || "제목 없음"}
                  </h2>
                  <button
                    onClick={() => setSelectedHologram(null)}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#f5f5f5",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    닫기
                  </button>
                </div>

                {/* 비디오 */}
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "16 / 9",
                    backgroundColor: "#000000",
                    borderRadius: "8px",
                    overflow: "hidden",
                    marginBottom: "24px",
                  }}
                >
                  <video
                    src={selectedHologram.video_url}
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>

                {/* 작품 정보 */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "#666666" }}>
                      설명
                    </h3>
                    <p style={{ fontSize: "14px", color: "#000000", margin: 0 }}>
                      {selectedHologram.description || "설명 없음"}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "24px" }}>
                    <div>
                      <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "#666666" }}>
                        생성 플랫폼
                      </h3>
                      <p style={{ fontSize: "14px", color: "#000000", margin: 0 }}>
                        {selectedHologram.platform === "veo" ? "Veo (Gemini API)" : "Replicate"}
                      </p>
                    </div>
                    <div>
                      <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "#666666" }}>
                        타입
                      </h3>
                      <p style={{ fontSize: "14px", color: "#000000", margin: 0 }}>
                        {selectedHologram.hologram_type === "4sides" ? "4방면 홀로그램" : "1면 홀로그램"}
                      </p>
                    </div>
                  </div>

                  {selectedHologram.user_prompt && (
                    <div>
                      <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "#666666" }}>
                        추가 프롬프트
                      </h3>
                      <p style={{ fontSize: "14px", color: "#000000", margin: 0 }}>
                        {selectedHologram.user_prompt}
                      </p>
                    </div>
                  )}

                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "#666666" }}>
                      생성 일시
                    </h3>
                    <p style={{ fontSize: "14px", color: "#000000", margin: 0 }}>
                      {formatDate(selectedHologram.created_at)}
                    </p>
                  </div>

                  {/* 이미지 */}
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "#666666" }}>
                      원본 이미지
                    </h3>
                    <img
                      src={selectedHologram.original_image_url}
                      alt="원본 이미지"
                      style={{
                        width: "100%",
                        maxWidth: "300px",
                        borderRadius: "8px",
                        border: "1px solid #dddddd",
                      }}
                    />
                  </div>

                  {selectedHologram.background_removed_image_url && (
                    <div>
                      <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "#666666" }}>
                        배경 제거된 이미지
                      </h3>
                      <img
                        src={selectedHologram.background_removed_image_url}
                        alt="배경 제거된 이미지"
                        style={{
                          width: "100%",
                          maxWidth: "300px",
                          borderRadius: "8px",
                          border: "1px solid #dddddd",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


