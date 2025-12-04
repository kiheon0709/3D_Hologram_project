import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HoloFrame Studio",
  description: "사진을 3D 홀로그램 프로젝터용 영상으로 변환하는 웹 스튜디오"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}


