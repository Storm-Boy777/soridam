import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 인증이 필요한 보호 라우트
const protectedRoutes = ["/dashboard", "/profile", "/reviews", "/store", "/scripts", "/mock-exam", "/tutoring", "/patterns", "/mypage", "/admin"];

// 인증된 사용자가 접근하면 리다이렉트할 라우트
const authRoutes = ["/login", "/signup"];

// 점검 모드: 프로덕션에서 모든 페이지를 점검 안내로 전환
const MAINTENANCE_MODE = true;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 점검 모드: 프로덕션 환경에서만 점검 페이지로 리다이렉트
  if (MAINTENANCE_MODE) {
    const host = request.headers.get("host") ?? "";
    const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
    // 점검 페이지 자체, API, 정적 리소스는 허용
    const isAllowed = pathname === "/maintenance" || pathname.startsWith("/api") || pathname.startsWith("/_next");

    if (!isLocal && !isAllowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/maintenance";
      return NextResponse.rewrite(url);
    }
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 보호 경로 또는 인증 경로에서만 세션 체크 (공개 페이지는 스킵)
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Server Action 요청은 redirect하지 않음
  // - Server Action은 데이터 요청이지 페이지 네비게이션이 아님
  // - redirect 응답을 받으면 Next.js 클라이언트 라우터가 페이지를 튕김
  // - 인증은 각 Server Action 내부의 requireUser()가 담당
  const isServerAction = request.headers.has("Next-Action");

  if ((isProtected || isAuthRoute) && !isServerAction) {
    // getSession(): 쿠키에서 JWT 로컬 읽기 — 네트워크 호출 없음 (빠름)
    // getUser(): Supabase API 왕복 — 200-300ms (느림)
    // 라우팅 판단은 getSession()으로 충분, 실제 보안은 RLS가 담당
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // 보호 라우트: 비인증 사용자 → /login 리다이렉트
    if (!session && isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // 인증 라우트: 인증된 사용자 → /dashboard 리다이렉트
    if (session && isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
