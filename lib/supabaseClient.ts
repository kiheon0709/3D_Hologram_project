import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// 빌드 타임에는 환경변수가 없을 수 있으므로 placeholder로 안전하게 처리
// createClient는 빈 문자열을 받으면 에러를 던지므로 유효한 형식의 placeholder 사용
const safeUrl = supabaseUrl || "https://placeholder.supabase.co";
const safeKey = supabasePublishableKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.placeholder";

export const supabase = createClient(safeUrl, safeKey);


