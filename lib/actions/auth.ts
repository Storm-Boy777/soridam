"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { T } from "@/lib/constants/tables";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

// 공통 응답 타입
type AuthResult = {
  error?: string;
};

export async function login(formData: FormData): Promise<AuthResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "입력값을 확인해주세요" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      return { error: "이메일 또는 비밀번호가 올바르지 않습니다" };
    }
  } catch (err) {
    // redirect()는 Next.js에서 throw하므로 재전파
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    console.error("login 오류:", err);
    return { error: "로그인 처리 중 오류가 발생했습니다" };
  }

  redirect("/dashboard");
}

// SA용 스키마: confirmPassword/agreeTerms는 클라이언트에서만 검증
const signupServerSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
});

export async function signup(formData: FormData): Promise<AuthResult> {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = signupServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "입력값을 확인해주세요" };
  }

  // 이메일 가입 채널 + 도메인 화이트리스트 체크
  try {
    const { getSignupSettings } = await import("@/lib/actions/admin/settings");
    const cfg = await getSignupSettings();
    if (!cfg.emailEnabled) {
      return { error: "현재 이메일 가입이 비활성화되어 있습니다." };
    }
    if (cfg.emailWhitelist.length > 0) {
      const domain = parsed.data.email.split("@")[1]?.toLowerCase();
      if (!domain || !cfg.emailWhitelist.includes(domain)) {
        return { error: `현재 허용되지 않은 이메일 도메인입니다. 허용 도메인: ${cfg.emailWhitelist.join(", ")}` };
      }
    }
  } catch {
    // 설정 조회 실패 시 가입 허용 (설정 서버 장애로 가입 차단 방지)
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          display_name: parsed.data.name,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        return { error: "이미 가입된 이메일입니다" };
      }
      if (error.message.includes("email_address_invalid") || error.message.includes("invalid")) {
        return { error: "유효하지 않은 이메일 주소입니다" };
      }
      if (error.message.includes("rate limit")) {
        return { error: "잠시 후 다시 시도해주세요 (요청이 너무 많습니다)" };
      }
      console.error("[signup] Supabase signUp error:", error.message, error.status);
      return { error: "회원가입에 실패했습니다. 다시 시도해주세요" };
    }
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    console.error("signup 오류:", err);
    return { error: "회원가입 처리 중 오류가 발생했습니다" };
  }

  redirect("/auth-success?type=signup");
}

export async function forgotPassword(formData: FormData): Promise<AuthResult> {
  const raw = {
    email: formData.get("email") as string,
  };

  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "입력값을 확인해주세요" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
      }
    );

    if (error) {
      return { error: "비밀번호 재설정 메일 발송에 실패했습니다" };
    }
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    console.error("forgotPassword 오류:", err);
    return { error: "비밀번호 재설정 처리 중 오류가 발생했습니다" };
  }

  redirect("/auth-success?type=forgot-password");
}

export async function resetPassword(formData: FormData): Promise<AuthResult> {
  const raw = {
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "입력값을 확인해주세요" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      return { error: "비밀번호 변경에 실패했습니다. 다시 시도해주세요" };
    }
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    console.error("resetPassword 오류:", err);
    return { error: "비밀번호 변경 처리 중 오류가 발생했습니다" };
  }

  redirect("/auth-success?type=reset-password");
}

export async function loginWithOAuth(provider: "google" | "kakao") {
  // 프로바이더 설정 체크
  try {
    const { getSignupSettings } = await import("@/lib/actions/admin/settings");
    const cfg = await getSignupSettings();
    if (provider === "google" && !cfg.googleEnabled) {
      return { error: "Google 로그인이 현재 비활성화되어 있습니다." };
    }
    if (provider === "kakao" && !cfg.kakaoEnabled) {
      return { error: "Kakao 로그인이 현재 비활성화되어 있습니다." };
    }
  } catch {
    // 설정 조회 실패 시 허용
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error || !data.url) {
    return { error: "소셜 로그인에 실패했습니다" };
  }

  redirect(data.url);
}

export async function updateProfile(formData: FormData): Promise<AuthResult> {
  const name = formData.get("name") as string;
  if (!name?.trim()) {
    return { error: "이름을 입력해주세요" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const trimmed = name.trim();

    // user_metadata 업데이트 (네비바 표시용)
    const { data: { user }, error } = await supabase.auth.updateUser({
      data: { display_name: trimmed },
    });

    if (error) {
      return { error: "프로필 업데이트에 실패했습니다" };
    }

    // profiles 테이블 동기화
    if (user) {
      await supabase
        .from(T.profiles)
        .update({ display_name: trimmed })
        .eq("id", user.id);
    }
  } catch (err) {
    console.error("updateProfile 오류:", err);
    return { error: "프로필 업데이트 처리 중 오류가 발생했습니다" };
  }

  revalidatePath("/mypage");
  revalidatePath("/dashboard");
  return {};
}

export async function updateGoals(formData: FormData): Promise<AuthResult> {
  const currentGrade = formData.get("currentGrade") as string;
  const targetGrade = formData.get("targetGrade") as string;
  const examDate = formData.get("examDate") as string;
  const weeklyGoal = formData.get("weeklyGoal") as string;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.updateUser({
      data: {
        current_grade: currentGrade || null,
        target_grade: targetGrade || null,
        exam_date: examDate || null,
        weekly_goal: weeklyGoal || null,
      },
    });

    if (error) {
      return { error: "목표 설정 저장에 실패했습니다" };
    }

    // profiles 테이블 동기화 (target_grade)
    if (user) {
      await supabase
        .from(T.profiles)
        .update({ target_grade: targetGrade || null })
        .eq("id", user.id);
    }
  } catch (err) {
    console.error("updateGoals 오류:", err);
    return { error: "목표 설정 처리 중 오류가 발생했습니다" };
  }

  revalidatePath("/mypage");
  revalidatePath("/dashboard");
  return {};
}

export async function logout() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    console.error("logout 오류:", err);
    // 로그아웃 실패해도 홈으로 리다이렉트
  }
  redirect("/");
}
