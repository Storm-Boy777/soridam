"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { signup, loginWithOAuth } from "@/lib/actions/auth";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { isInAppBrowser, openInExternalBrowser } from "@/lib/utils/detect-webview";
import { getSignupSettings, type SignupSettings } from "@/lib/actions/admin/settings";

export default function SignupPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [webviewWarning, setWebviewWarning] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [signupCfg, setSignupCfg] = useState<SignupSettings | null>(null);

  useEffect(() => {
    getSignupSettings().then(setSignupCfg);
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
  });

  // 이메일 도메인 화이트리스트 + 초대 이메일 실시간 검증
  const watchedEmail = watch("email");
  const domainError = (() => {
    if (!signupCfg || signupCfg.emailWhitelist.length === 0 || !watchedEmail) return null;
    // 초대 이메일이면 도메인 제한 우회
    if (signupCfg.invitedEmails.includes(watchedEmail.toLowerCase())) return null;
    const domain = watchedEmail.split("@")[1]?.toLowerCase();
    if (!domain) return null;
    return signupCfg.emailWhitelist.includes(domain)
      ? null
      : `허용되지 않은 도메인입니다 (허용: ${signupCfg.emailWhitelist.join(", ")})`;
  })();

  const handleOAuth = (provider: "google" | "kakao") => {
    if (isInAppBrowser()) {
      setWebviewWarning(true);
      return;
    }
    startTransition(async () => {
      await loginWithOAuth(provider);
    });
  };

  const onSubmit = (data: SignupInput) => {
    if (domainError) return; // 도메인 화이트리스트 미통과 시 제출 차단
    setServerError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("email", data.email);
      formData.append("password", data.password);
      const result = await signup(formData);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  };

  return (
    <>
      <h1 className="text-center text-2xl font-bold">회원가입</h1>
      <p className="mt-2 text-center text-sm text-foreground-secondary">
        무료 계정을 만들고 OPIc 학습을 시작하세요
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

      {/* 소셜 회원가입 */}
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
          Google로 시작하기
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
          카카오로 시작하기
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
            또는 이메일로 가입
          </span>
        </div>
      </div>

      {/* 에러 메시지 */}
      {serverError && (
        <div className="rounded-[var(--radius-md)] border border-accent-200 bg-accent-50 p-3 text-sm text-accent-600">
          {serverError}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        {/* 이름 */}
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            이름
          </label>
          <Input
            id="name"
            type="text"
            placeholder="홍길동"
            autoComplete="name"
            error={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-accent-500">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* 이메일 */}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            이메일
          </label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            error={!!errors.email || !!domainError}
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-accent-500">
              {errors.email.message}
            </p>
          )}
          {!errors.email && domainError && (
            <p className="mt-1 text-xs text-accent-500">
              {domainError}
            </p>
          )}
          {signupCfg && signupCfg.emailWhitelist.length > 0 && !domainError && (
            <p className="mt-1 text-xs text-foreground-muted">
              허용 도메인: {signupCfg.emailWhitelist.join(", ")}
            </p>
          )}
        </div>

        {/* 비밀번호 */}
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium"
          >
            비밀번호
          </label>
          <PasswordInput
            id="password"
            placeholder="8자 이상"
            autoComplete="new-password"
            error={!!errors.password}
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-accent-500">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* 비밀번호 확인 */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block text-sm font-medium"
          >
            비밀번호 확인
          </label>
          <PasswordInput
            id="confirmPassword"
            placeholder="비밀번호를 다시 입력"
            autoComplete="new-password"
            error={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-accent-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* 이용약관 동의 */}
        <div>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary-500"
              {...register("agreeTerms")}
            />
            <span className="text-sm text-foreground-secondary">
              <Link
                href="/terms"
                className="text-primary-500 hover:text-primary-600 underline"
                target="_blank"
              >
                이용약관
              </Link>
              {" 및 "}
              <Link
                href="/privacy"
                className="text-primary-500 hover:text-primary-600 underline"
                target="_blank"
              >
                개인정보처리방침
              </Link>
              에 동의합니다
            </span>
          </label>
          {errors.agreeTerms && (
            <p className="mt-1 text-xs text-accent-500">
              {errors.agreeTerms.message}
            </p>
          )}
        </div>

        <Button type="submit" className="mt-2 w-full" disabled={isPending}>
          {isPending ? "가입 중..." : "회원가입"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-foreground-secondary">
        이미 계정이 있으신가요?{" "}
        <Link
          href="/login"
          className="font-medium text-primary-500 hover:text-primary-600"
        >
          로그인
        </Link>
      </p>
    </>
  );
}
