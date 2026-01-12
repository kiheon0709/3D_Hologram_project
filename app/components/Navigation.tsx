"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import AuthModal from "./AuthModal";
import type { User } from "@supabase/supabase-js";

export default function Navigation() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ nickname: string; credit: number } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // 프로필 정보 가져오기
        supabase
          .from("profiles")
          .select("nickname, credit")
          .eq("id", session.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setProfile(data);
            }
          });
      } else {
        setProfile(null);
      }
    });

    // 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // 프로필 정보 가져오기
        supabase
          .from("profiles")
          .select("nickname, credit")
          .eq("id", session.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setProfile(data);
            }
          });
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowProfileMenu(false);
  };

  const openAuthModal = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        width: "100%",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e5e5",
        zIndex: 1000,
        padding: isMobile ? "12px 16px" : "0 24px",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? "12px" : "16px",
        }}
      >
        {/* 첫 번째 줄: HoloFrame 제목 + 프로필 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            height: isMobile ? "auto" : "64px",
          }}
        >
          {/* 로고 */}
          <Link
            href="/"
            style={{
              fontSize: isMobile ? "18px" : "20px",
              fontWeight: 700,
              color: "#000000",
              textDecoration: "none",
              letterSpacing: "-0.02em",
            }}
          >
            HoloFrame
          </Link>

          {/* 프로필 섹션 */}
          <div style={{ position: "relative" }}>
            {user ? (
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    border: "1px solid #e5e5e5",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    backgroundColor: showProfileMenu ? "#f5f5f5" : "#ffffff",
                  }}
                  onMouseEnter={(e) => {
                    if (!showProfileMenu) e.currentTarget.style.backgroundColor = "#f5f5f5";
                  }}
                  onMouseLeave={(e) => {
                    if (!showProfileMenu) e.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "#000000",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
                    {user.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                  {!isMobile && (
                    <span style={{ fontSize: "14px", color: "#333333" }}>
                      {profile?.nickname || user.email?.split("@")[0] || "User"}
                    </span>
                  )}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      transform: showProfileMenu ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  >
                    <path
                      d="M3 4.5L6 7.5L9 4.5"
                      stroke="#666666"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {showProfileMenu && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e5e5",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      minWidth: "200px",
                      zIndex: 1001,
                    }}
                  >
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e5e5" }}>
                      <div style={{ fontSize: "12px", color: "#666666", marginBottom: "4px" }}>닉네임</div>
                      <div style={{ fontSize: "14px", color: "#000000", fontWeight: 500, marginBottom: "12px" }}>
                        {profile?.nickname || user.email?.split("@")[0] || "User"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#666666", marginBottom: "4px" }}>크래딧</div>
                      <div style={{ fontSize: "14px", color: "#000000", fontWeight: 500 }}>
                        {profile?.credit ?? 0} 크래딧
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        textAlign: "left",
                        border: "none",
                        fontSize: "14px",
                        color: "#dc2626",
                        cursor: "pointer",
                        transition: "background-color 0.2s",
                        backgroundColor: "transparent",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#fee2e2";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => openAuthModal("login")}
                  style={{
                    padding: isMobile ? "6px 12px" : "8px 16px",
                    fontSize: isMobile ? "13px" : "14px",
                    fontWeight: 500,
                    border: "1px solid #e5e5e5",
                    borderRadius: "8px",
                    backgroundColor: "#ffffff",
                    color: "#333333",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                >
                  로그인
                </button>
                <button
                  onClick={() => openAuthModal("signup")}
                  style={{
                    padding: isMobile ? "6px 12px" : "8px 16px",
                    fontSize: isMobile ? "13px" : "14px",
                    fontWeight: 600,
                    border: "1px solid #000000",
                    borderRadius: "8px",
                    backgroundColor: "#000000",
                    color: "#ffffff",
                    cursor: "pointer",
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.8";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  회원가입
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 두 번째 줄: 메뉴 */}
        <div
          style={{
            display: "flex",
            gap: isMobile ? "16px" : "32px",
            alignItems: "center",
            flexWrap: "wrap",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            paddingBottom: isMobile ? "4px" : "0",
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: isMobile ? "13px" : "14px",
              fontWeight: pathname === "/" ? 600 : 400,
              color: pathname === "/" ? "#000000" : "#666666",
              textDecoration: "none",
              transition: "color 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            Home
          </Link>
          <Link
            href="/archive"
            style={{
              fontSize: isMobile ? "13px" : "14px",
              fontWeight: pathname === "/archive" ? 600 : 400,
              color: pathname === "/archive" ? "#000000" : "#666666",
              textDecoration: "none",
              transition: "color 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            Archive
          </Link>
          <Link
            href="/make"
            style={{
              fontSize: isMobile ? "13px" : "14px",
              fontWeight: pathname === "/make" ? 600 : 400,
              color: pathname === "/make" ? "#000000" : "#666666",
              textDecoration: "none",
              transition: "color 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            Make
          </Link>
          <Link
            href="/mypage"
            style={{
              fontSize: isMobile ? "13px" : "14px",
              fontWeight: pathname === "/mypage" ? 600 : 400,
              color: pathname === "/mypage" ? "#000000" : "#666666",
              textDecoration: "none",
              transition: "color 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            MyPage
          </Link>
          <Link
            href="/admin"
            style={{
              fontSize: isMobile ? "13px" : "14px",
              fontWeight: pathname === "/admin" ? 600 : 400,
              color: pathname === "/admin" ? "#000000" : "#666666",
              textDecoration: "none",
              transition: "color 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            Admin
          </Link>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />

      {/* 프로필 메뉴 외부 클릭 시 닫기 */}
      {showProfileMenu && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
          }}
          onClick={() => setShowProfileMenu(false)}
        />
      )}
    </nav>
  );
}
