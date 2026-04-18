import { createClient } from '@/lib/supabase/client'

export type ThemeCode = 'bamboo' | 'jump' | 'angel' | 'star' | 'smart_city'

export type PhotoContestSessionStatus =
  | 'collecting'
  | 'theme_evaluating'
  | 'theme_completed'
  | 'overall_completed'
  | 'uploading'
  | 'evaluating'
  | 'completed'

export type PhotoContestRevealState =
  | 'idle'
  | 'revealing_theme'
  | 'revealing_overall'
  | 'finished'

export interface ThemeCriterion {
  key: string
  label: string
  maxScore: number
}

export interface PhotoContestThemeDefinition {
  code: ThemeCode
  emoji: string
  title: string
  shortTitle: string
  mission: string
  criteria: ThemeCriterion[]
}

export interface PhotoContestPart {
  partNumber: number
  partName: string
}

export interface PhotoContestSession {
  id: string
  title: string
  status: PhotoContestSessionStatus
  active_themes: ThemeCode[]
  reveal_state: PhotoContestRevealState
  theme_overall_comments: Partial<Record<ThemeCode, string>>
  overall_summary_comment: string | null
  created_at: string
  completed_at: string | null
}

export interface PhotoContestThemeSubmission {
  id: string
  session_id: string
  theme_code: ThemeCode
  part_number: number
  part_name: string
  photo_url: string
  storage_path: string
  submitted_at: string
  updated_at: string
}

export interface PhotoContestThemeResult {
  id: string
  session_id: string
  theme_code: ThemeCode
  part_number: number
  part_name: string
  theme_scores: Record<string, number>
  theme_score_total: number
  theme_rank: number
  theme_comment: string
  evaluated_at: string
}

export interface PhotoContestOverallBreakdownItem {
  theme_code: ThemeCode
  score: number
  rank: number
  comment: string
}

export interface PhotoContestOverallResult {
  id: string
  session_id: string
  part_number: number
  part_name: string
  overall_total_score: number
  overall_rank: number
  overall_comment: string
  representative_theme_code: ThemeCode
  theme_breakdown: PhotoContestOverallBreakdownItem[]
  evaluated_at: string
}

export interface PhotoContestSessionSummary {
  session: PhotoContestSession
  progress: Record<ThemeCode, number>
  completedThemes: ThemeCode[]
  overallReady: boolean
}

export const PHOTO_CONTEST_DEFAULT_TITLE = '공정기술그룹 GWP'

export const PHOTO_CONTEST_PARTS: PhotoContestPart[] = [
  { partNumber: 1, partName: 'Global 공정품질' },
  { partNumber: 2, partName: 'JIG 해체 솔루션' },
  { partNumber: 3, partName: 'SMD공정기술' },
  { partNumber: 4, partName: 'SMD신기술' },
  { partNumber: 5, partName: '공정기술운영' },
  { partNumber: 6, partName: '공정설계' },
  { partNumber: 7, partName: '스마트 NC제품검증' },
  { partNumber: 8, partName: '폴더블/응용제품검증' },
]

export const PHOTO_CONTEST_THEMES: PhotoContestThemeDefinition[] = [
  {
    code: 'bamboo',
    emoji: '🎋',
    title: '대나무숲에서 사진찍기',
    shortTitle: '대나무숲',
    mission: '대나무숲의 공간감과 팀의 조화로운 분위기를 가장 잘 담아주세요.',
    criteria: [
      { key: 'location_use', label: '장소 활용도', maxScore: 30 },
      { key: 'composition', label: '구도/원근감', maxScore: 25 },
      { key: 'team_harmony', label: '팀 배치', maxScore: 20 },
      { key: 'mood', label: '분위기', maxScore: 15 },
      { key: 'technical', label: '완성도', maxScore: 10 },
    ],
  },
  {
    code: 'jump',
    emoji: '🕺',
    title: '점프샷 사진찍기',
    shortTitle: '점프샷',
    mission: '가장 역동적이고 에너지가 넘치는 점프샷을 완성해주세요.',
    criteria: [
      { key: 'timing', label: '타이밍 일치도', maxScore: 30 },
      { key: 'energy', label: '역동성', maxScore: 25 },
      { key: 'expression', label: '표정/몰입감', maxScore: 20 },
      { key: 'frame_balance', label: '프레임 안정성', maxScore: 15 },
      { key: 'technical', label: '완성도', maxScore: 10 },
    ],
  },
  {
    code: 'angel',
    emoji: '😇',
    title: '파트장은 천사',
    shortTitle: '천사',
    mission: '파트장이 진짜 천사처럼 보이도록 센스와 스토리를 살려주세요.',
    criteria: [
      { key: 'theme_fit', label: '테마 전달력', maxScore: 35 },
      { key: 'leader_presence', label: '중심 인물 존재감', maxScore: 20 },
      { key: 'wing_alignment', label: '날개 정렬', maxScore: 20 },
      { key: 'storytelling', label: '스토리/리액션', maxScore: 15 },
      { key: 'wit', label: '센스', maxScore: 10 },
    ],
  },
  {
    code: 'star',
    emoji: '⭐',
    title: '별손가락 사진찍기',
    shortTitle: '별손가락',
    mission: '손가락 별 모양의 정확도와 팀 협업 완성도를 보여주세요.',
    criteria: [
      { key: 'shape_accuracy', label: '별 형태 정확도', maxScore: 30 },
      { key: 'teamwork', label: '협업 완성도', maxScore: 25 },
      { key: 'focus', label: '시선 집중도', maxScore: 20 },
      { key: 'angle', label: '앵글 창의성', maxScore: 15 },
      { key: 'technical', label: '완성도', maxScore: 10 },
    ],
  },
  {
    code: 'smart_city',
    emoji: '🗽',
    title: 'SMART CITY 조형물에서 사진찍기',
    shortTitle: 'SMART CITY',
    mission: '조형물과 인물의 관계를 미래지향적으로 표현해주세요.',
    criteria: [
      { key: 'object_use', label: '조형물 활용도', maxScore: 30 },
      { key: 'future_branding', label: '미래감/브랜드 이미지', maxScore: 25 },
      { key: 'relationship', label: '인물-배경 관계성', maxScore: 20 },
      { key: 'scale', label: '공간감', maxScore: 15 },
      { key: 'technical', label: '완성도', maxScore: 10 },
    ],
  },
]

export const PHOTO_CONTEST_THEME_MAP = PHOTO_CONTEST_THEMES.reduce((acc, theme) => {
  acc[theme.code] = theme
  return acc
}, {} as Record<ThemeCode, PhotoContestThemeDefinition>)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function normalizePhotoContestErrorMessage(message: string) {
  if (
    /schema cache/i.test(message) ||
    /Could not find the table 'public\.photo_contest_/i.test(message) ||
    /Could not find the 'active_themes' column/i.test(message) ||
    /relation "public\.photo_contest_/i.test(message)
  ) {
    return '신규 GWP 콘테스트 스키마가 아직 적용되지 않았습니다. Supabase 마이그레이션과 Edge Function 배포 후 다시 시도해주세요.'
  }

  return message
}

function formatPhotoContestError(action: string, message: string) {
  return `${action}: ${normalizePhotoContestErrorMessage(message)}`
}

function parseThemeCodes(value: unknown): ThemeCode[] {
  if (!Array.isArray(value)) return PHOTO_CONTEST_THEMES.map((theme) => theme.code)
  return value.filter((themeCode): themeCode is ThemeCode => themeCode in PHOTO_CONTEST_THEME_MAP)
}

function parseThemeComments(value: unknown): Partial<Record<ThemeCode, string>> {
  if (!value || typeof value !== 'object') return {}

  return Object.entries(value as Record<string, unknown>).reduce((acc, [key, rawValue]) => {
    if (key in PHOTO_CONTEST_THEME_MAP && typeof rawValue === 'string') {
      acc[key as ThemeCode] = rawValue
    }
    return acc
  }, {} as Partial<Record<ThemeCode, string>>)
}

function normalizeSession(row: Record<string, unknown>): PhotoContestSession {
  return {
    id: String(row.id),
    title: String(row.title),
    status: row.status as PhotoContestSessionStatus,
    active_themes: parseThemeCodes(row.active_themes),
    reveal_state: (row.reveal_state as PhotoContestRevealState) || 'idle',
    theme_overall_comments: parseThemeComments(row.theme_overall_comments),
    overall_summary_comment: typeof row.overall_summary_comment === 'string' ? row.overall_summary_comment : null,
    created_at: String(row.created_at),
    completed_at: typeof row.completed_at === 'string' ? row.completed_at : null,
  }
}

function callEdgeFunction<T>(functionName: string, body: Record<string, unknown>) {
  return fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  }).then(async (response) => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(normalizePhotoContestErrorMessage(errorData.error || '요청에 실패했습니다'))
    }
    return response.json() as Promise<T>
  })
}

export async function createSession(title = PHOTO_CONTEST_DEFAULT_TITLE): Promise<PhotoContestSession> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('photo_contest_sessions')
    .insert({
      title,
      status: 'collecting',
      active_themes: PHOTO_CONTEST_THEMES.map((theme) => theme.code),
      reveal_state: 'idle',
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(formatPhotoContestError('콘테스트 생성 실패', error?.message || '세션 데이터가 없습니다'))
  }

  return normalizeSession(data)
}

export async function listSessions(): Promise<PhotoContestSession[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('photo_contest_sessions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(formatPhotoContestError('세션 조회 실패', error.message))
  }

  return (data || []).map((row) => normalizeSession(row))
}

export async function getSessionById(sessionId: string): Promise<PhotoContestSession | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('photo_contest_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (error) {
    throw new Error(formatPhotoContestError('세션 조회 실패', error.message))
  }

  return data ? normalizeSession(data) : null
}

export async function getActiveSession(): Promise<PhotoContestSession | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('photo_contest_sessions')
    .select('*')
    .in('status', ['collecting', 'theme_evaluating', 'theme_completed', 'overall_completed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(formatPhotoContestError('활성 세션 조회 실패', error.message))
  }

  return data ? normalizeSession(data) : null
}

export async function deleteSession(sessionId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('photo_contest_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) {
    throw new Error(formatPhotoContestError('세션 삭제 실패', error.message))
  }
}

export async function updateSessionRevealState(sessionId: string, revealState: PhotoContestRevealState) {
  const supabase = createClient()
  const { error } = await supabase
    .from('photo_contest_sessions')
    .update({ reveal_state: revealState })
    .eq('id', sessionId)

  if (error) {
    throw new Error(formatPhotoContestError('발표 상태 업데이트 실패', error.message))
  }
}

export async function uploadThemePhoto(
  sessionId: string,
  themeCode: ThemeCode,
  partNumber: number,
  file: File
): Promise<{ publicUrl: string; storagePath: string }> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const storagePath = `photo-contest/v2/${sessionId}/${themeCode}/${partNumber}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('event-photos')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    throw new Error(formatPhotoContestError('사진 업로드 실패', uploadError.message))
  }

  const { data } = supabase.storage.from('event-photos').getPublicUrl(storagePath)
  return {
    publicUrl: data.publicUrl,
    storagePath,
  }
}

export async function upsertThemeSubmission(params: {
  session_id: string
  theme_code: ThemeCode
  part_number: number
  part_name: string
  photo_url: string
  storage_path: string
}): Promise<PhotoContestThemeSubmission> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('photo_contest_theme_submissions')
    .upsert(params, { onConflict: 'session_id,theme_code,part_number' })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(formatPhotoContestError('제출 저장 실패', error?.message || '제출 데이터가 없습니다'))
  }

  return data
}

export async function submitThemePhoto(params: {
  session_id: string
  theme_code: ThemeCode
  part_number: number
  part_name: string
  file: File
}) {
  const { publicUrl, storagePath } = await uploadThemePhoto(
    params.session_id,
    params.theme_code,
    params.part_number,
    params.file
  )

  return upsertThemeSubmission({
    session_id: params.session_id,
    theme_code: params.theme_code,
    part_number: params.part_number,
    part_name: params.part_name,
    photo_url: publicUrl,
    storage_path: storagePath,
  })
}

export async function listThemeSubmissions(
  sessionId: string,
  themeCode: ThemeCode
): Promise<PhotoContestThemeSubmission[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('photo_contest_theme_submissions')
    .select('*')
    .eq('session_id', sessionId)
    .eq('theme_code', themeCode)
    .order('part_number')

  if (error) {
    throw new Error(formatPhotoContestError('제출 목록 조회 실패', error.message))
  }

  return data || []
}

export async function deleteThemeSubmission(submissionId: string, storagePath: string): Promise<void> {
  const supabase = createClient()

  const { error: storageError } = await supabase.storage
    .from('event-photos')
    .remove([storagePath])

  if (storageError) {
    console.error('스토리지 삭제 실패:', storageError.message)
  }

  const { error } = await supabase
    .from('photo_contest_theme_submissions')
    .delete()
    .eq('id', submissionId)

  if (error) {
    throw new Error(formatPhotoContestError('사진 삭제 실패', error.message))
  }
}

export async function listAllThemeSubmissions(sessionId: string): Promise<PhotoContestThemeSubmission[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('photo_contest_theme_submissions')
    .select('*')
    .eq('session_id', sessionId)
    .order('theme_code')
    .order('part_number')

  if (error) {
    throw new Error(formatPhotoContestError('전체 제출 목록 조회 실패', error.message))
  }

  return data || []
}

export async function getThemeResults(
  sessionId: string,
  themeCode: ThemeCode
): Promise<PhotoContestThemeResult[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('photo_contest_theme_results')
    .select('*')
    .eq('session_id', sessionId)
    .eq('theme_code', themeCode)
    .order('theme_rank')

  if (error) {
    throw new Error(formatPhotoContestError('테마 결과 조회 실패', error.message))
  }

  return (data || []).map((row) => ({
    ...row,
    theme_scores: (row.theme_scores || {}) as Record<string, number>,
  }))
}

export async function listAllThemeResults(sessionId: string): Promise<PhotoContestThemeResult[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('photo_contest_theme_results')
    .select('*')
    .eq('session_id', sessionId)
    .order('theme_code')
    .order('theme_rank')

  if (error) {
    throw new Error(formatPhotoContestError('전체 테마 결과 조회 실패', error.message))
  }

  return (data || []).map((row) => ({
    ...row,
    theme_scores: (row.theme_scores || {}) as Record<string, number>,
  }))
}

export async function getOverallResults(sessionId: string): Promise<PhotoContestOverallResult[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('photo_contest_overall_results')
    .select('*')
    .eq('session_id', sessionId)
    .order('overall_rank')

  if (error) {
    throw new Error(formatPhotoContestError('종합 결과 조회 실패', error.message))
  }

  return (data || []).map((row) => ({
    ...row,
    theme_breakdown: (row.theme_breakdown || []) as PhotoContestOverallBreakdownItem[],
  }))
}

export async function evaluateTheme(sessionId: string, themeCode: ThemeCode) {
  return callEdgeFunction<{
    success: boolean
    theme_overall_comment: string
    results: PhotoContestThemeResult[]
  }>('photo-contest-evaluate', {
    session_id: sessionId,
    theme_code: themeCode,
  })
}

export async function evaluateOverall(sessionId: string) {
  return callEdgeFunction<{
    success: boolean
    overall_comment: string
    results: PhotoContestOverallResult[]
  }>('photo-contest-evaluate-overall', {
    session_id: sessionId,
  })
}

export async function getSessionSummary(sessionId: string): Promise<PhotoContestSessionSummary> {
  const [session, submissions, themeResults, overallResults] = await Promise.all([
    getSessionById(sessionId),
    listAllThemeSubmissions(sessionId),
    listAllThemeResults(sessionId),
    getOverallResults(sessionId),
  ])

  if (!session) {
    throw new Error('세션을 찾을 수 없습니다')
  }

  const progress = PHOTO_CONTEST_THEMES.reduce((acc, theme) => {
    acc[theme.code] = submissions.filter((submission) => submission.theme_code === theme.code).length
    return acc
  }, {} as Record<ThemeCode, number>)

  const completedThemes = PHOTO_CONTEST_THEMES
    .filter((theme) => themeResults.filter((result) => result.theme_code === theme.code).length === PHOTO_CONTEST_PARTS.length)
    .map((theme) => theme.code)

  return {
    session,
    progress,
    completedThemes,
    overallReady: overallResults.length === PHOTO_CONTEST_PARTS.length,
  }
}

export function getThemeUploadUrl(themeCode: ThemeCode) {
  return `/events/photo-contest/upload/${themeCode}`
}

export function getThemeRevealUrl(sessionId: string, themeCode: ThemeCode) {
  return `/events/photo-contest/reveal/${sessionId}?view=theme&theme=${themeCode}`
}

export function getOverallRevealUrl(sessionId: string) {
  return `/events/photo-contest/reveal/${sessionId}?view=overall`
}
