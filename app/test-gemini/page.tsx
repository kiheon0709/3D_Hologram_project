"use client";

import { useState } from "react";

export default function TestGeminiPage() {
  const [prompt, setPrompt] = useState("안녕하세요! 간단하게 자기소개를 해주세요.");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        setError(`오류 (${response.status}): ${data.message || data.error || JSON.stringify(data)}`);
        return;
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "알 수 없는 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  // Gemini 응답에서 텍스트 추출
  const getResponseText = () => {
    if (!result?.response?.candidates?.[0]?.content?.parts) {
      return null;
    }
    
    return result.response.candidates[0].content.parts
      .map((part: any) => part.text || "")
      .join("");
  };

  const responseText = getResponseText();

  return (
    <main style={{ minHeight: "calc(100vh - 64px)", padding: "48px 24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "8px", color: "#000000" }}>
          Gemini API 테스트
        </h1>
        <p style={{ fontSize: "16px", color: "#666666", marginBottom: "32px" }}>
          Gemini API 키를 사용한 Gemini API 호출 테스트 페이지입니다.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <label 
              style={{ 
                display: "block", 
                marginBottom: "8px", 
                fontWeight: 600,
                fontSize: "14px",
                color: "#000000",
              }}
            >
              Prompt:
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="테스트할 프롬프트를 입력하세요"
              style={{
                width: "100%",
                minHeight: "120px",
                padding: "12px",
                fontSize: "14px",
                fontFamily: "inherit",
                border: "1px solid #cccccc",
                borderRadius: "8px",
                backgroundColor: "#ffffff",
                color: "#000000",
                resize: "vertical",
                outline: "none",
              }}
            />
            <p style={{ fontSize: "12px", color: "#666666", marginTop: "4px" }}>
              프롬프트를 입력하고 테스트 버튼을 클릭하세요.
            </p>
          </div>

          <button
            onClick={handleTest}
            disabled={loading || !prompt.trim()}
            style={{
              width: "100%",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: 600,
              backgroundColor: "#000000",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
              opacity: loading || !prompt.trim() ? 0.5 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {loading ? "테스트 중..." : "API 테스트 실행"}
          </button>

          {error && (
            <div
              style={{
                padding: "16px",
                backgroundColor: "#fee",
                border: "1px solid #fcc",
                borderRadius: "8px",
                color: "#c00",
              }}
            >
              <strong style={{ display: "block", marginBottom: "8px" }}>❌ 오류 발생:</strong>
              <pre style={{ 
                margin: 0, 
                whiteSpace: "pre-wrap", 
                wordBreak: "break-word",
                fontSize: "13px",
                fontFamily: "monospace",
              }}>
                {error}
              </pre>
            </div>
          )}

          {result && (
            <div
              style={{
                padding: "16px",
                backgroundColor: "#f5f5f5",
                border: "1px solid #cccccc",
                borderRadius: "8px",
              }}
            >
              <strong style={{ display: "block", marginBottom: "16px", fontSize: "16px" }}>
                ✅ 성공! 응답 받음
              </strong>

              {responseText && (
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ 
                    fontSize: "14px", 
                    fontWeight: 600, 
                    marginBottom: "8px",
                    color: "#000000",
                  }}>
                    Gemini 응답:
                  </h3>
                  <div
                    style={{
                      padding: "16px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #dddddd",
                      borderRadius: "8px",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontSize: "14px",
                      lineHeight: "1.6",
                      color: "#000000",
                    }}
                  >
                    {responseText}
                  </div>
                </div>
              )}

              <details style={{ marginTop: "16px" }}>
                <summary
                  style={{
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#666666",
                    marginBottom: "8px",
                  }}
                >
                  전체 응답 JSON 보기
                </summary>
                <pre
                  style={{
                    marginTop: "8px",
                    padding: "16px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #dddddd",
                    borderRadius: "8px",
                    overflow: "auto",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    maxHeight: "500px",
                  }}
                >
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}

          <div
            style={{
              padding: "16px",
              backgroundColor: "#f9f9f9",
              border: "1px solid #dddddd",
              borderRadius: "8px",
              fontSize: "13px",
              color: "#666666",
            }}
          >
            <strong style={{ display: "block", marginBottom: "8px", color: "#000000" }}>
              💡 테스트 정보:
            </strong>
            <ul style={{ margin: 0, paddingLeft: "20px" }}>
              <li>GEMINI_API_KEY 환경 변수로 인증합니다</li>
              <li>Gemini API (generativelanguage.googleapis.com)를 직접 호출합니다</li>
              <li>기본 모델: gemini-1.5-flash (GEMINI_MODEL_ID로 변경 가능)</li>
              <li>에러 발생 시 서버 로그를 확인하세요</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
