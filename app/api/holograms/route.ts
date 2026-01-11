import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

/**
 * 작품 목록 조회 API
 */
export async function GET(req: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseSecretKey) {
      console.error("Supabase 환경변수가 설정되지 않았습니다.", {
        supabaseUrl: !!supabaseUrl,
        supabaseSecretKey: !!supabaseSecretKey,
      });
      return NextResponse.json(
        { error: "Supabase 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey);

    // 현재 로그인된 사용자 확인 (향후 인증 구현 시 사용)
    // const { data: { user } } = await supabase.auth.getUser();
    
    // 임시: 모든 작품 조회 (인증 없이)
    const { data: holograms, error } = await supabase
      .from("holograms")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("작품 조회 오류:", error);
      return NextResponse.json(
        { error: "작품 조회 실패", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      holograms: holograms || [],
    });
  } catch (err: any) {
    console.error("작품 조회 API 오류:", err);
    return NextResponse.json(
      { error: "서버 내부 오류", detail: err.message },
      { status: 500 }
    );
  }
}

/**
 * 작품 저장 API
 */
export async function POST(req: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseSecretKey) {
      console.error("Supabase 환경변수가 설정되지 않았습니다.", {
        supabaseUrl: !!supabaseUrl,
        supabaseSecretKey: !!supabaseSecretKey,
      });
      return NextResponse.json(
        { error: "Supabase 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey);
    
    const body = await req.json();
    const {
      title,
      description,
      original_image_url,
      background_removed_image_url,
      video_url,
      platform,
      hologram_type,
      user_prompt,
    } = body;

    // 필수 필드 검증
    if (!original_image_url || !video_url || !platform || !hologram_type) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 현재 로그인된 사용자 확인 (향후 인증 구현 시 사용)
    // const { data: { user } } = await supabase.auth.getUser();
    // const user_id = user?.id;
    
    // 임시: user_id를 null로 설정 (인증 없이)
    const user_id = null;

    const { data: hologram, error } = await supabase
      .from("holograms")
      .insert({
        user_id,
        title,
        description,
        original_image_url,
        background_removed_image_url,
        video_url,
        platform,
        hologram_type,
        user_prompt,
      })
      .select()
      .single();

    if (error) {
      console.error("작품 저장 오류:", error);
      return NextResponse.json(
        { error: "작품 저장 실패", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      hologram,
    });
  } catch (err: any) {
    console.error("작품 저장 API 오류:", err);
    return NextResponse.json(
      { error: "서버 내부 오류", detail: err.message },
      { status: 500 }
    );
  }
}


