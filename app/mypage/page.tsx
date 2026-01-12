"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

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
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [holograms, setHolograms] = useState<Hologram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHologram, setSelectedHologram] = useState<Hologram | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsCheckingAuth(false);
      
      if (session?.user) {
        loadHolograms();
      }
    };
    checkAuth();

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadHolograms();
      }
    });

    return () => subscription.unsubscribe();
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

  // 로그인 확인 중
  if (isCheckingAuth || (loading && user)) {
    return (
      <main style={{ minHeight: "calc(100vh - 64px)", padding: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "16px", color: "#666666" }}>
            {isCheckingAuth ? "로그인 확인 중..." : "작품을 불러오는 중..."}
          </p>
        </div>
      </main>
    );
  }

  // 로그인하지 않은 경우
  if (!user) {
    return (
      <main style={{ minHeight: "calc(100vh - 64px)", padding: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: "500px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "16px", color: "#000000" }}>
            로그인이 필요합니다
          </h1>
          <p style={{ fontSize: "16px", color: "#666666", marginBottom: "32px" }}>
            내 작품은 로그인한 사용자만 볼 수 있습니다.
          </p>
          <button
            onClick={() => router.push("/")}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              fontWeight: 600,
              backgroundColor: "#000000",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            홈으로 이동
          </button>
        </div>
      </main>
    );
  }

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
                    aspectRatio: selectedHologram.hologram_type === "4sides" ? "1 / 1" : "16 / 9",
                    backgroundColor: "#000000",
                    borderRadius: "8px",
                    overflow: "hidden",
                    marginBottom: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selectedHologram.hologram_type === "4sides" ? (
                    /* 4방면 홀로그램 십자가 배치 */
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "500px",
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
                          src={selectedHologram.video_url}
                          autoPlay
                          loop
                          muted
                          playsInline
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "center",
                            transform: "rotate(180deg)",
                          }}
                        />
                      </div>

                      {/* 빈 공간 (우상단) */}
                      <div style={{ backgroundColor: "#000000" }} />

                      {/* 좌측: 90도 회전 */}
                      <div style={{ overflow: "hidden", backgroundColor: "#000000" }}>
                        <video
                          key="left-90"
                          src={selectedHologram.video_url}
                          autoPlay
                          loop
                          muted
                          playsInline
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "center",
                            transform: "rotate(90deg)",
                          }}
                        />
                      </div>

                      {/* 중앙 빈 공간 (피라미드 위치) */}
                      <div style={{ backgroundColor: "#000000" }} />

                      {/* 우측: 270도 회전 */}
                      <div style={{ overflow: "hidden", backgroundColor: "#000000" }}>
                        <video
                          key="right-270"
                          src={selectedHologram.video_url}
                          autoPlay
                          loop
                          muted
                          playsInline
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "center",
                            transform: "rotate(270deg)",
                          }}
                        />
                      </div>

                      {/* 빈 공간 (좌하단) */}
                      <div style={{ backgroundColor: "#000000" }} />

                      {/* 하단: 0도 (원본) */}
                      <div style={{ overflow: "hidden", backgroundColor: "#000000" }}>
                        <video
                          key="bottom-0"
                          src={selectedHologram.video_url}
                          autoPlay
                          loop
                          muted
                          playsInline
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "center",
                            transform: "rotate(0deg)",
                          }}
                        />
                      </div>

                      {/* 빈 공간 (우하단) */}
                      <div style={{ backgroundColor: "#000000" }} />
                    </div>
                  ) : (
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
                  )}
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


