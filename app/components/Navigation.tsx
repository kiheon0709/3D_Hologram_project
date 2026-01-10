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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
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
        padding: "0 24px",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "64px",
        }}
      >
        {/* 로고 */}
        <Link
          href="/"
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#000000",
            textDecoration: "none",
            letterSpacing: "-0.02em",
          }}
        >
          HoloFrame
        </Link>

        {/* 메뉴 */}
        <div
          style={{
            display: "flex",
            gap: "32px",
            alignItems: "center",
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: "14px",
              fontWeight: pathname === "/" ? 600 : 400,
              color: pathname === "/" ? "#000000" : "#666666",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
          >
            Home
          </Link>
          <Link
            href="/archive"
            style={{
              fontSize: "14px",
              fontWeight: pathname === "/archive" ? 600 : 400,
              color: pathname === "/archive" ? "#000000" : "#666666",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
          >
            Archive
          </Link>
          <Link
            href="/make"
            style={{
              fontSize: "14px",
              fontWeight: pathname === "/make" ? 600 : 400,
              color: pathname === "/make" ? "#000000" : "#666666",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
          >
            Make
          </Link>
          <Link
            href="/admin"
            style={{
              fontSize: "14px",
              fontWeight: pathname === "/admin" ? 600 : 400,
              color: pathname === "/admin" ? "#000000" : "#666666",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
          >
            Admin
          </Link>

          {/* 프로필 섹션 */}
          <div style={{ position: "relative", marginLeft: "32px" }}>
            {user ? (
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "none",
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
                  <span style={{ fontSize: "14px", color: "#333333" }}>
                    {user.email?.split("@")[0] || "User"}
                  </span>
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
                      <div style={{ fontSize: "12px", color: "#666666", marginBottom: "4px" }}>이메일</div>
                      <div style={{ fontSize: "14px", color: "#000000", fontWeight: 500 }}>
                        {user.email}
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        fontSize: "14px",
                        color: "#dc2626",
                        cursor: "pointer",
                        transition: "background-color 0.2s",
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
              <div style={{ display: "flex", gap: "8px", marginLeft: "32px" }}>
                <button
                  onClick={() => openAuthModal("login")}
                  style={{
                    padding: "8px 16px",
                    fontSize: "14px",
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
                    padding: "8px 16px",
                    fontSize: "14px",
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
