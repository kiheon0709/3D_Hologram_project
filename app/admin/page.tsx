"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

type FileItem = {
  name: string;
  id: string;
  created_at: string;
  updated_at: string;
  size?: number;
  publicUrl: string;
  folder: string;
};

type FolderType = "user_images" | "removed_backgrounds" | "veo_video";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123";
const AUTH_STORAGE_KEY = "admin_authenticated";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [activeFolder, setActiveFolder] = useState<FolderType>("user_images");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  useEffect(() => {
    // 로컬 스토리지에서 인증 상태 확인
    const authStatus = localStorage.getItem(AUTH_STORAGE_KEY);
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadFiles();
    }
  }, [activeFolder, isAuthenticated]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_STORAGE_KEY, "true");
      setPasswordError("");
      setPassword("");
    } else {
      setPasswordError("비밀번호가 올바르지 않습니다.");
      setPassword("");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      const bucket = "3D_hologram_images";
      
      const { data: fileList, error } = await supabase.storage
        .from(bucket)
        .list(activeFolder, {
          limit: 1000,
          offset: 0,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) {
        console.error("파일 목록 로드 오류:", error);
        return;
      }

      if (!fileList || fileList.length === 0) {
        setFiles([]);
        return;
      }

      const filesWithUrls = fileList.map((file) => {
        const { data } = supabase.storage
          .from(bucket)
          .getPublicUrl(`${activeFolder}/${file.name}`);
        
        return {
          name: file.name,
          id: file.id,
          created_at: file.created_at || "",
          updated_at: file.updated_at || "",
          size: file.metadata?.size,
          publicUrl: data.publicUrl,
          folder: activeFolder,
        };
      });

      setFiles(filesWithUrls);
    } catch (err) {
      console.error("파일 로드 중 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`정말로 "${file.name}" 파일을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const bucket = "3D_hologram_images";
      const { error } = await supabase.storage
        .from(bucket)
        .remove([`${file.folder}/${file.name}`]);

      if (error) {
        console.error("파일 삭제 오류:", error);
        alert(`파일 삭제 실패: ${error.message}`);
        return;
      }

      alert("파일이 삭제되었습니다.");
      loadFiles();
    } catch (err) {
      console.error("파일 삭제 중 오류:", err);
      alert("파일 삭제 중 오류가 발생했습니다.");
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileType = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) return "image";
    if (["mp4", "webm", "mov"].includes(ext || "")) return "video";
    return "unknown";
  };

  const folders: { key: FolderType; label: string }[] = [
    { key: "user_images", label: "원본 이미지" },
    { key: "removed_backgrounds", label: "배경 제거 이미지" },
    { key: "veo_video", label: "최종 영상" },
  ];

  // 인증되지 않았을 때 비밀번호 입력 폼 표시
  if (!isAuthenticated) {
    return (
      <main style={{ minHeight: "calc(100vh - 64px)", padding: "48px 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: "400px", width: "100%" }}>
          <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "8px", color: "#000000", textAlign: "center" }}>
            Admin
          </h1>
          <p style={{ fontSize: "16px", color: "#666666", marginBottom: "32px", textAlign: "center" }}>
            관리자 페이지에 접근하려면 비밀번호를 입력하세요.
          </p>
          <form onSubmit={handlePasswordSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                placeholder="비밀번호를 입력하세요"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "14px",
                  border: passwordError ? "1px solid #ff0000" : "1px solid #cccccc",
                  borderRadius: "8px",
                  outline: "none",
                }}
                autoFocus
              />
              {passwordError && (
                <p style={{ fontSize: "12px", color: "#ff0000", marginTop: "8px" }}>
                  {passwordError}
                </p>
              )}
            </div>
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px 24px",
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
              로그인
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "calc(100vh - 64px)", padding: "48px 24px" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "8px", color: "#000000" }}>
              Admin
            </h1>
            <p style={{ fontSize: "16px", color: "#666666" }}>
              Supabase 스토리지의 파일들을 관리할 수 있는 페이지입니다.
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: 600,
              border: "1px solid #666666",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              color: "#666666",
              cursor: "pointer",
              transition: "background-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#666666";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#ffffff";
              e.currentTarget.style.color = "#666666";
            }}
          >
            로그아웃
          </button>
        </div>

        {/* 폴더 탭 */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "1px solid #e5e5e5" }}>
          {folders.map((folder) => (
            <button
              key={folder.key}
              onClick={() => setActiveFolder(folder.key)}
              style={{
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: activeFolder === folder.key ? 600 : 400,
                border: "none",
                borderBottom: activeFolder === folder.key ? "2px solid #000000" : "2px solid transparent",
                backgroundColor: "transparent",
                color: activeFolder === folder.key ? "#000000" : "#666666",
                cursor: "pointer",
                transition: "color 0.2s",
              }}
            >
              {folder.label} {activeFolder === folder.key && `(${files.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ fontSize: "14px", color: "#999999" }}>로딩 중...</p>
        ) : files.length === 0 ? (
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
              이 폴더에 파일이 없습니다.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
              gap: "16px",
            }}
          >
            {files.map((file) => {
              const fileType = getFileType(file.name);
              return (
                <div
                  key={file.id}
                  style={{
                    border: "1px solid #e5e5e5",
                    borderRadius: "8px",
                    overflow: "hidden",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: fileType === "video" ? "16 / 9" : "1 / 1",
                      backgroundColor: "#000000",
                      position: "relative",
                      overflow: "hidden",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedFile(file)}
                  >
                    {fileType === "image" ? (
                      <img
                        src={file.publicUrl}
                        alt={file.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    ) : fileType === "video" ? (
                      <video
                        src={file.publicUrl}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
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
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#ffffff",
                        }}
                      >
                        {file.name.split(".").pop()?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "12px" }}>
                    <p
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        marginBottom: "4px",
                        color: "#000000",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <p style={{ fontSize: "11px", color: "#666666", marginBottom: "8px" }}>
                      {formatFileSize(file.size)}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file);
                      }}
                      style={{
                        width: "100%",
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        border: "1px solid #ff0000",
                        borderRadius: "6px",
                        backgroundColor: "#ffffff",
                        color: "#ff0000",
                        cursor: "pointer",
                        transition: "background-color 0.2s, color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#ff0000";
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#ffffff";
                        e.currentTarget.style.color = "#ff0000";
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 파일 상세 모달 */}
        {selectedFile && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0, 0, 0, 0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000,
            }}
            onClick={() => setSelectedFile(null)}
          >
            <div
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {getFileType(selectedFile.name) === "image" ? (
                <img
                  src={selectedFile.publicUrl}
                  alt={selectedFile.name}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "90vh",
                    objectFit: "contain",
                  }}
                />
              ) : getFileType(selectedFile.name) === "video" ? (
                <video
                  src={selectedFile.publicUrl}
                  controls
                  style={{
                    maxWidth: "100%",
                    maxHeight: "90vh",
                  }}
                />
              ) : null}
              <button
                onClick={() => setSelectedFile(null)}
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "20px",
                  padding: "10px 20px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "8px",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
