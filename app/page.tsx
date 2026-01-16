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
        
        <div
          style={{
            display: "inline-block",
            padding: "16px 32px",
            fontSize: "16px",
            fontWeight: 600,
            border: "1px solid #cccccc",
            borderRadius: "8px",
            backgroundColor: "#f5f5f5",
            color: "#999999",
            cursor: "not-allowed",
          }}
        >
          영상 만들기 일시 중단 중
        </div>
        <p style={{ fontSize: "14px", color: "#666666", marginTop: "16px" }}>
          현재 영상 제작 기능이 일시적으로 중단되었습니다.
        </p>
      </div>
    </main>
  );
}
