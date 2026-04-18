import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// 싱글톤 인스턴스 (성능 최적화)
let clientInstance: SupabaseClient | null = null

/**
 * 싱글톤 인스턴스 초기화 (로그아웃 시 호출)
 */
export function resetClientInstance() {
  if (typeof window !== 'undefined') {
    clientInstance = null
    console.log('[Supabase Client] Instance reset')
  }
}

export function createClient() {
  // 브라우저 환경에서만 싱글톤 패턴 적용
  if (typeof window !== 'undefined' && clientInstance) {
    return clientInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 환경변수 체크
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase Client] Missing environment variables:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey
    })
  } else if (process.env.NODE_ENV === 'development') {
    console.log('[Supabase Client] Creating client with URL:', supabaseUrl)
  }

  const client = createBrowserClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      auth: {
        // Supabase가 세션을 관리하도록 설정
        persistSession: true,
        // 자동 토큰 갱신 활성화
        autoRefreshToken: true,
        // 탭 간 인증 상태 동기화
        detectSessionInUrl: true,
        // localStorage 사용 (업계 표준)
        // - 명시적 로그아웃 전까지 세션 유지
        // - scope: 'global' 로그아웃으로 보안 문제 해결
        // - 사용자 편의성 향상 (재방문 시 로그인 유지)
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      }
    }
  )

  // 브라우저 환경에서만 인스턴스 저장
  if (typeof window !== 'undefined') {
    clientInstance = client
    if (process.env.NODE_ENV === 'development') {
      console.log('[Supabase Client] Client instance created and stored')
    }
  }

  return client
}