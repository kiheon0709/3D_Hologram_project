import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// 빌드 타임에는 환경변수가 없을 수 있으므로 빈 문자열로 안전하게 처리
export const supabase = createClient(supabaseUrl, supabaseAnonKey);


