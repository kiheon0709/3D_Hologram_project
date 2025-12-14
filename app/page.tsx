import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ minHeight: "calc(100vh - 64px)", padding: "48px 24px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "48px", fontWeight: 700, marginBottom: "16px", color: "#000000" }}>
          HoloFrame Studio
        </h1>
        <p style={{ fontSize: "20px", color: "#666666", marginBottom: "48px" }}>
          한 장의 사진으로 스마트폰 3D 홀로그램 프로젝터용 영상을 만들어 보세요.
        </p>

        <div style={{ marginBottom: "48px" }}>
          <div style={{ width: "100%", maxWidth: "800px", margin: "0 auto", aspectRatio: "16 / 9", borderRadius: "12px", overflow: "hidden", border: "1px solid #e5e5e5" }}>
            <iframe
              src="https://www.youtube.com/embed/Y60mfBvXCj8?autoplay=0&loop=1&playlist=Y60mfBvXCj8"
              title="3D hologram sample"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ width: "100%", height: "100%", border: 0 }}
            />
          </div>
        </div>
        
        <Link
          href="/make"
          style={{
            display: "inline-block",
            padding: "16px 32px",
            fontSize: "16px",
            fontWeight: 600,
            border: "1px solid #000000",
            borderRadius: "8px",
            backgroundColor: "#000000",
            color: "#ffffff",
            textDecoration: "none",
            transition: "opacity 0.2s",
          }}
          className="home-cta-button"
        >
          영상 만들기 시작하기 →
        </Link>
      </div>
    </main>
  );
}
