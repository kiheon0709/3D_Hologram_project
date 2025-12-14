"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

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
        </div>
      </div>
    </nav>
  );
}
