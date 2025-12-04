import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // 런타임에서 환경변수 누락을 빠르게 알 수 있도록 로그를 남긴다.
  // (빌드 타임에는 접근 불가할 수 있으므로 console.warn 수준으로 처리)
  console.warn(
    "[Supabase] NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY 가 설정되지 않았습니다."
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");


