"use client";

import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { login, loginWithOAuth } from "@/lib/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { isInAppBrowser, openInExternalBrowser } from "@/lib/utils/detect-webview";
import { getSignupSettings, type SignupSettings } from "@/lib/actions/admin/settings";

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [signupCfg, setSignupCfg] = useState<SignupSettings | null>(null);

  useEffect(() => {
    getSignupSettings().then(setSignupCfg);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginInput) => {
    setServerError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("email", data.email);
      formData.append("password", data.password);
      const result = await login(formData);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  };

  const [webviewWarning, setWebviewWarning] = useState(false);

  const handleOAuth = (provider: "google" | "kakao") => {
    // 인앱 브라우저 감지 시 외부 브라우저로 유도
    if (isInAppBrowser()) {
      setWebviewWarning(true);
      return;
    }
    startTransition(async () => {
      await loginWithOAuth(provider);
    });
  };

  const errorMessage =
    serverError ||
    (urlError === "auth_callback_error"
      ? "인증 처리 중 오류가 발생했습니다"
      : urlError === "email_confirm_error"
        ? "이메일 확인에 실패했습니다"
        : null);

  return (
    <>
      <h1 className="text-center text-2xl font-bold">로그인</h1>
      <p className="mt-2 text-center text-sm text-foreground-secondary">
        계정에 로그인하고 학습을 시작하세요
      </p>

      {/* 인앱 브라우저 경고 */}
      {webviewWarning && (
        <div className="mt-4 rounded-[var(--radius-md)] border border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="font-medium text-amber-800">
            인앱 브라우저에서는 소셜 로그인이 지원되지 않습니다
          </p>
          <p className="mt-1 text-amber-700">
            아래 버튼을 눌러 외부 브라우저에서 열어주세요
          </p>
          <button
            type="button"
            className="mt-3 w-full rounded-[var(--radius-md)] bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            onClick={() => openInExternalBrowser()}
          >
            외부 브라우저에서 열기
          </button>
        </div>
      )}

      {/* 소셜 로그인 */}
      <div className="mt-6 flex flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          className={`w-full gap-2${signupCfg?.googleEnabled === false ? " opacity-50" : ""}`}
          disabled={!signupCfg?.googleEnabled}
          onClick={() => handleOAuth("google")}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google로 계속하기
        </Button>
        <button
          type="button"
          className={`flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[#FEE500] bg-[#FEE500] px-4 py-2.5 text-sm font-medium text-[#000000]${signupCfg?.kakaoEnabled === false ? " opacity-50" : ""}`}
          disabled={!signupCfg?.kakaoEnabled}
          onClick={() => handleOAuth("kakao")}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 4C7.029 4 3 7.13 3 10.95c0 2.414 1.605 4.536 4.02 5.726l-1.02 3.784c-.09.332.287.6.578.41L10.7 18.28c.424.046.858.07 1.3.07 4.971 0 9-3.13 9-6.95S16.971 4 12 4z" fill="#000000" />
          </svg>
          카카오로 계속하기
        </button>
      </div>
      <div className="mt-6">
        <p className="text-center text-xs text-foreground-muted">
          계속하면{" "}
          <Link href="/terms" className="underline hover:text-foreground-secondary" target="_blank">
            이용약관
          </Link>
          {" 및 "}
          <Link href="/privacy" className="underline hover:text-foreground-secondary" target="_blank">
            개인정보처리방침
          </Link>
          에 동의하게 됩니다
        </p>
      </div>

      {/* 구분선 */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-surface px-2 text-foreground-muted">
            또는 이메일로 로그인
          </span>
        </div>
      </div>

      {/* 에러 메시지 */}
      {errorMessage && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-accent-200 bg-accent-50 p-3 text-sm text-accent-600">
          {errorMessage}
        </div>
      )}

      {/* 이메일 로그인 폼 */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            이메일
          </label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            error={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-accent-500">
              {errors.email.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            비밀번호
          </label>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            autoComplete="current-password"
            error={!!errors.password}
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-accent-500">
              {errors.password.message}
            </p>
          )}
        </div>
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-primary-500 hover:text-primary-600"
          >
            비밀번호 찾기
          </Link>
        </div>

        <Button type="submit" className="mt-2 w-full" disabled={isPending}>
          {isPending ? "로그인 중..." : "로그인"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-foreground-secondary">
        계정이 없으신가요?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary-500 hover:text-primary-600"
        >
          회원가입
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
