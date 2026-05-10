// 강의 모듈 타입 정의

export interface Lecture {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  lecture_id: string;
  thumbnail_url: string | null;
  duration: number;
  instructor_name: string | null;
  order_index: number;
  is_active: boolean;
  playlist_url: string | null;
  summary_markdown: string | null;
  summary_created_at: string | null;
  summary_created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface LectureMaterial {
  id: string;
  lecture_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  description: string | null;
  uploaded_by: string | null;
  download_count: number;
  created_at: string;
  updated_at: string | null;
}

export interface LectureProgress {
  id: string;
  user_id: string;
  lecture_id: string;
  watched_seconds: number;
  total_seconds: number;
  progress_percentage: number;
  last_position: number;
  playback_speed: number;
  completed_at: string | null;
  last_watched_at: string;
  created_at: string;
  updated_at: string;
}

// 목록 페이지에서 쓰는 가벼운 타입 (썸네일/진도 합산)
export interface LectureListItem
  extends Pick<
    Lecture,
    | "id"
    | "title"
    | "description"
    | "level"
    | "lecture_id"
    | "thumbnail_url"
    | "duration"
    | "instructor_name"
    | "order_index"
    | "is_active"
  > {
  progress_percentage: number;
  is_completed: boolean;
}

// 상세 페이지 응답 (SA 결과)
export interface LectureDetailData {
  lecture: Lecture;
  materials: LectureMaterial[];
  progress: LectureProgress | null;
  allLectures: LectureListItem[];
}

// HLS playlist URL 발급 응답 (Edge Function)
export interface PlaylistResponse {
  success: true;
  playlistUrl: string;
  segmentBaseUrl: string;
  lecture: {
    id: string;
    title: string;
    description: string | null;
    duration: number;
    instructor_name: string | null;
    playlist_url: string;
  };
  progress: {
    last_position: number;
    progress_percentage: number;
    playback_speed: number;
  };
}

// Level별 그룹화 표시용 정렬 순서
export const LEVEL_ORDER = [
  "내 시험을 결정하는 두가지 변수",
  "AL필승전략 1",
  "AL필승전략 2",
  "AL필승전략 3",
  "AL필승전략 4",
  "AL필승전략 5",
  "실제수업편(AL)",
] as const;
