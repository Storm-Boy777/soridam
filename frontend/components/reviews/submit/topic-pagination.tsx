"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  HelpCircle,
  PenLine,
  ChevronLeft,
  ChevronRight,
  // 주제 아이콘
  Home,
  Tv,
  Armchair,
  Plug,
  Users,
  HeartPulse,
  TreePine,
  Bus,
  MapPin,
  Laptop,
  Sun,
  Scissors,
  Stethoscope,
  Building2,
  Briefcase,
  ShoppingBag,
  Pill,
  CalendarCheck,
  Gamepad2,
  Film,
  Landmark,
  UtensilsCrossed,
  Music,
  Globe,
  Recycle,
  Smartphone,
  Mountain,
  Coffee,
  Shirt,
  Plane,
  Hotel,
  Gift,
  Headphones,
  Ticket,
  Search,
  Tag,
  ShoppingCart,
  Car,
  Wrench,
  Bike,
  Dumbbell,
  PartyPopper,
  CloudSun,
  Truck,
  Leaf,
  Map,
  Smile,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { getTopicsByCategory } from "@/lib/queries/master-questions";

// 주제별 Lucide 아이콘 매핑
export const TOPIC_ICONS: Record<string, LucideIcon> = {
  // ── 일반 ──
  집: Home,
  TV: Tv,
  가구: Armchair,
  가전제품: Plug,
  "가전/전자제품": Plug,
  "가족/친구": Users,
  건강: HeartPulse,
  공원: TreePine,
  교통: Bus,
  국내여행: MapPin,
  기술: Laptop,
  날씨: Sun,
  모임: Users,
  미용실: Scissors,
  병원: Stethoscope,
  산업: Building2,
  선호회사: Briefcase,
  쇼핑: ShoppingBag,
  약국: Pill,
  약속: CalendarCheck,
  여가시간: Gamepad2,
  영화: Film,
  은행: Landmark,
  음식: UtensilsCrossed,
  음식점: UtensilsCrossed,
  음악: Music,
  인터넷: Globe,
  재활용: Recycle,
  전화기: Smartphone,
  지형: Mountain,
  "지형(인접국가)": Mountain,
  직장: Briefcase,
  "집에서 보내는 휴가": Sun,
  치과: Smile,
  카페: Coffee,
  패션: Shirt,
  하이킹: Mountain,
  해외여행: Plane,
  호텔: Hotel,
  "휴일/명절 (Holiday)": Gift,
  명절: Gift,
  휴대폰: Smartphone,
  "외식/배달 문화": Truck,
  "지역 축제/행사": Ticket,

  // ── 롤플레이 ──
  "MP3 Player 구매": Headphones,
  "가구 구매": Armchair,
  "가족 집 돌봐주기": Home,
  "건강식품 구매": Leaf,
  "공연 예매": Ticket,
  "공원 방문": TreePine,
  "공항 (비행 지연)": Plane,
  "기술 산업 정보 조사": Search,
  "기차표 예매": Ticket,
  "병원 예약": Stethoscope,
  "부동산 (새 집 찾기)": Home,
  "세일 상품 구매": Tag,
  "쇼핑 정보 문의": ShoppingCart,
  "식당 방문": UtensilsCrossed,
  "식료품점 이용": ShoppingCart,
  "여행 계획": Map,
  "영양 상담 예약": Leaf,
  "영화 관람 계획": Film,
  "옷 구매": Shirt,
  "외국인의 방문 지원": Globe,
  "웹사이트 정보": Globe,
  "은행 계좌 개설": Landmark,
  "자동차 고장": Car,
  "자전거 대여": Bike,
  "재활용 규정": Recycle,
  "차량 렌트": Car,
  "취업 면접": Briefcase,
  "친구 만남 계획": Users,
  "친구 초대 행사": PartyPopper,
  "친구들과 영화 관람 준비": Film,
  "친구의 미국 여행": Plane,
  "카페 이용": Coffee,
  "파티 초대 및 준비": PartyPopper,
  "해외 친구 방문 / 지리": Globe,
  "해외여행 날씨": CloudSun,
  "헬스장 이용": Dumbbell,
  "호텔 이용": Hotel,
  "휴대폰 구매": Smartphone,
  "휴일 식사초대": UtensilsCrossed,
};

// 폴백 아이콘
const DEFAULT_ICON: LucideIcon = BookOpen;

interface TopicPaginationProps {
  category: "일반" | "롤플레이" | "어드밴스";
  selectedTopic: string | null;
  onSelectTopic: (topic: string) => void;
  onNotRemembered?: () => void;
  onCustomInput?: () => void;
  excludedTopics?: string[];
}

export function TopicPagination({
  category,
  selectedTopic,
  onSelectTopic,
  onNotRemembered,
  onCustomInput,
  excludedTopics = [],
}: TopicPaginationProps) {
  const [page, setPage] = useState(0);

  // 반응형 페이지 크기: 모바일 3×3=9개, PC 5×2=10개
  const [itemsPerPage, setItemsPerPage] = useState(9);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setItemsPerPage(mq.matches ? 10 : 9);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const { data: topics = [], isLoading: loading } = useQuery({
    queryKey: ["topics", category],
    queryFn: () => getTopicsByCategory(category),
    staleTime: Infinity, // 고정 데이터, 세션 내 1회 로드
  });

  // category, 제외 주제, 페이지 크기 변경 시 page 리셋
  useEffect(() => {
    setPage(0);
  }, [category, excludedTopics.length, itemsPerPage]);

  // 이전 콤보에서 선택한 주제 제외 (같은 카테고리 내)
  const filteredTopics = excludedTopics.length > 0
    ? topics.filter((t) => !excludedTopics.includes(t.topic))
    : topics;

  const totalPages = Math.ceil(filteredTopics.length / itemsPerPage) || 1;
  const currentTopics = filteredTopics.slice(
    page * itemsPerPage,
    (page + 1) * itemsPerPage
  );

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-2.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-[var(--radius-lg)] bg-surface-secondary"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 주제 그리드 */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-2.5">
        {currentTopics.map(({ topic, count }) => {
          const Icon = TOPIC_ICONS[topic] || DEFAULT_ICON;
          const isSelected = selectedTopic === topic;
          return (
            <button
              key={topic}
              onClick={() => onSelectTopic(topic)}
              className={`flex flex-col items-center gap-1 rounded-[var(--radius-lg)] border p-3 text-center transition-all ${
                isSelected
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-border bg-surface text-foreground hover:border-primary-300 hover:bg-primary-50/30"
              }`}
            >
              <Icon
                size={18}
                className={isSelected ? "text-primary-600" : "text-primary-400"}
              />
              <span className="text-xs font-medium leading-tight">{topic}</span>
              <span className="text-[10px] text-foreground-muted">{count}문항</span>
            </button>
          );
        })}

        {/* 특수 옵션: 마지막 페이지에서만 표시 (핸들러가 있을 때만) */}
        {page >= totalPages - 1 && (onNotRemembered || onCustomInput) && (
          <>
            {onNotRemembered && (
              <button
                onClick={onNotRemembered}
                className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-[var(--radius-lg)] border border-border bg-surface p-3 text-center text-foreground-secondary transition-all hover:border-primary-300 hover:bg-primary-50/30"
              >
                <HelpCircle size={18} />
                <span className="text-xs font-medium">기억 안남</span>
              </button>
            )}
            {onCustomInput && (
              <button
                onClick={onCustomInput}
                className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-[var(--radius-lg)] border border-border bg-surface p-3 text-center text-foreground-secondary transition-all hover:border-primary-300 hover:bg-primary-50/30"
              >
                <PenLine size={18} />
                <span className="text-xs font-medium">직접 입력</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-border text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-foreground-muted">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-border text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
