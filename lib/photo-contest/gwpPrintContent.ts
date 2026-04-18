import type { ThemeCode } from '@/lib/api/photo-contest'

export interface GwpPrintGuideItem {
  title: string
  body: string
}

export interface GwpPrintCriterion {
  label: string
  score: number
  description: string
  tip: string
}

export interface GwpPrintThemeGuide {
  code: ThemeCode
  emoji: string
  title: string
  shortTitle: string
  location: string
  accent: string
  themeColor: string
  softColor: string
  mission: string
  photoTips: GwpPrintGuideItem[]
  criteria: GwpPrintCriterion[]
}

export const GWP_PRINT_EVENT_TITLE = '공정기술그룹 GWP'

export const GWP_PRINT_STEPS: string[] = [
  '촬영 직후 QR 코드를 스캔합니다.',
  '자기 파트를 선택합니다.',
  '테마별 최종 사진 1장을 업로드하고 저장합니다.',
  '저장 완료 메시지를 꼭 확인합니다.',
]

export const GWP_PRINT_COMMON_RULES: GwpPrintGuideItem[] = [
  {
    title: '테마별 최종 제출 1장',
    body: '테마마다 최종 사진 1장만 심사 대상으로 인정됩니다.',
  },
  {
    title: '저장 완료까지 제출 인정',
    body: '저장 완료 메시지까지 떠야 제출이 인정됩니다.',
  },
  {
    title: '재업로드 시 최신본 반영',
    body: '다시 저장하면 최신 사진으로 교체됩니다.',
  },
  {
    title: '과도한 편집 금지',
    body: '밝기·크롭만 허용되며 합성·생성형 편집은 제외됩니다.',
  },
]

export const GWP_PRINT_THEMES: GwpPrintThemeGuide[] = [
  {
    code: 'bamboo',
    emoji: '🎋',
    title: '대나무숲에서 사진찍기',
    shortTitle: '대나무숲',
    location: '대나무숲 포인트',
    accent: 'linear-gradient(135deg, #065f46 0%, #10b981 55%, #34d399 100%)',
    themeColor: '#059669',
    softColor: 'rgba(5, 150, 105, 0.12)',
    mission: '대나무숲의 깊이감과 팀의 조화로운 분위기를 한 컷 안에 담아주세요.',
    photoTips: [
      {
        title: '장소가 넓게 보이게',
        body: '숲길 라인이 길게 보이도록 한두 걸음 물러서세요.',
      },
      {
        title: '팀 간격 먼저 정리',
        body: '좌우 균형과 앞뒤 거리만 맞춰도 훨씬 안정적입니다.',
      },
      {
        title: '차분한 표정과 톤',
        body: '과한 포즈보다 자연스러운 리액션이 더 유리합니다.',
      },
    ],
    criteria: [
      {
        label: '장소 활용도',
        score: 30,
        description: '대나무숲의 선과 깊이감이 화면에서 또렷하게 살아 있는지 평가합니다.',
        tip: '숲길이 뒤로 길게 보이도록 프레임을 조금 더 넓게 잡아 주세요.',
      },
      {
        label: '구도/원근감',
        score: 25,
        description: '앞뒤 층위와 시선 흐름이 자연스럽고 안정적인지 평가합니다.',
        tip: '인물만 두지 말고 숲의 라인을 함께 살리면 더 좋습니다.',
      },
      {
        label: '팀 배치',
        score: 20,
        description: '사람 간격, 자세, 시선이 한 장면처럼 정리되어 있는지 봅니다.',
        tip: '키 차이와 포즈를 맞춰 좌우 균형을 먼저 잡아 주세요.',
      },
      {
        label: '분위기',
        score: 15,
        description: '숲의 차분한 느낌과 팀의 표정이 자연스럽게 어우러지는지 평가합니다.',
        tip: '서로 교감하는 표정이 더 높은 몰입감을 만듭니다.',
      },
      {
        label: '완성도',
        score: 10,
        description: '흔들림, 노출, 수평, 화면 마감이 안정적인지 평가합니다.',
        tip: '촬영 직후 기울기와 밝기만 마지막으로 점검해 주세요.',
      },
    ],
  },
  {
    code: 'jump',
    emoji: '🕺',
    title: '점프샷 사진찍기',
    shortTitle: '점프샷',
    location: '점프샷 포인트',
    accent: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #38bdf8 100%)',
    themeColor: '#2563eb',
    softColor: 'rgba(37, 99, 235, 0.12)',
    mission: '가장 역동적이고 에너지 넘치는 점프샷을 완성해 주세요.',
    photoTips: [
      {
        title: '타이밍부터 맞추기',
        body: '점프 높이보다 같은 순간에 뜬 장면이 더 중요합니다.',
      },
      {
        title: '표정까지 함께',
        body: '표정과 손동작까지 살아 있어야 현장감이 생깁니다.',
      },
      {
        title: '머리 위 공간 확보',
        body: '점프 높이를 고려해 위쪽 여백을 넉넉하게 남겨 주세요.',
      },
    ],
    criteria: [
      {
        label: '타이밍 일치도',
        score: 30,
        description: '공중에 뜬 순간이 가장 정확하게 맞아떨어지는지 비교 평가합니다.',
        tip: '연속 촬영 후 가장 동시에 뜬 장면을 골라 주세요.',
      },
      {
        label: '역동성',
        score: 25,
        description: '사진만 봐도 움직임과 에너지가 크게 느껴지는지 평가합니다.',
        tip: '팔과 다리 각도를 크게 써서 정적인 점프를 피해 주세요.',
      },
      {
        label: '표정/몰입감',
        score: 20,
        description: '참가자 전원이 점프를 즐기고 있다는 인상이 살아 있는지 봅니다.',
        tip: '구호를 맞춘 뒤 뛰면 표정과 타이밍을 함께 맞추기 쉽습니다.',
      },
      {
        label: '프레임 안정성',
        score: 15,
        description: '피사체가 잘리지 않고 화면 균형이 안정적인지 평가합니다.',
        tip: '머리 위 여백과 수평을 먼저 맞춘 뒤 반복 촬영해 주세요.',
      },
      {
        label: '완성도',
        score: 10,
        description: '초점, 셔터 타이밍, 흔들림이 안정적인지 종합 평가합니다.',
        tip: '촬영 전 테스트 컷으로 초점과 밝기를 확인해 주세요.',
      },
    ],
  },
  {
    code: 'angel',
    emoji: '😇',
    title: '파트장은 천사',
    shortTitle: '천사',
    location: '천사 날개 배경 포인트',
    accent: 'linear-gradient(135deg, #be185d 0%, #ec4899 55%, #f9a8d4 100%)',
    themeColor: '#ec4899',
    softColor: 'rgba(236, 72, 153, 0.12)',
    mission: '파트장이 진짜 천사처럼 보이도록 센스와 스토리를 살려주세요.',
    photoTips: [
      {
        title: '파트장이 중심',
        body: '파트장 1인이 주인공으로 보이게 중앙 구도를 먼저 잡아 주세요.',
      },
      {
        title: '날개 정렬 확인',
        body: '날개와 어깨선이 자연스럽게 연결되도록 높이를 맞춰 주세요.',
      },
      {
        title: '주변 반응 살리기',
        body: '주변 인물은 파트장을 돋보이게 하는 리액션을 맡아 주세요.',
      },
    ],
    criteria: [
      {
        label: '테마 전달력',
        score: 35,
        description: '보는 순간 천사 콘셉트가 바로 이해되는지 비교 평가합니다.',
        tip: '날개, 표정, 주변 반응이 한 화면에 함께 보이게 구성해 주세요.',
      },
      {
        label: '중심 인물 존재감',
        score: 20,
        description: '파트장이 사진의 주인공으로 가장 또렷하게 보이는지 봅니다.',
        tip: '주변 인물은 시선과 제스처로 파트장을 강조해 주세요.',
      },
      {
        label: '날개 정렬',
        score: 20,
        description: '날개 배경과 파트장의 위치가 정확하게 맞는지 평가합니다.',
        tip: '셔터 전 어깨선과 날개 축이 맞는지 먼저 확인해 주세요.',
      },
      {
        label: '스토리/리액션',
        score: 15,
        description: '주변 인물의 반응이 장면의 재미와 스토리를 만드는지 봅니다.',
        tip: '감탄, 보호, 환영 같은 역할을 나눠주면 장면이 살아납니다.',
      },
      {
        label: '센스',
        score: 10,
        description: '위트와 콘셉트 소화력이 인상적으로 드러나는지 평가합니다.',
        tip: '작은 제스처 하나만 더해도 기억에 남는 컷이 됩니다.',
      },
    ],
  },
  {
    code: 'star',
    emoji: '⭐',
    title: '별손가락 사진찍기',
    shortTitle: '별손가락',
    location: '별손가락 포인트',
    accent: 'linear-gradient(135deg, #7c2d12 0%, #f59e0b 55%, #fde68a 100%)',
    themeColor: '#d97706',
    softColor: 'rgba(217, 119, 6, 0.12)',
    mission: '손가락 별 모양의 정확도와 팀 협업 완성도를 보여주세요.',
    photoTips: [
      {
        title: '별 모양부터 확인',
        body: '화면에서 별이 바로 읽히는지 먼저 확인해 주세요.',
      },
      {
        title: '높이와 각도 맞추기',
        body: '손 위치가 조금만 어긋나도 형태가 깨지니 순서대로 맞춰 주세요.',
      },
      {
        title: '배경은 단순하게',
        body: '별손가락이 먼저 보이도록 복잡한 배경은 피해주세요.',
      },
    ],
    criteria: [
      {
        label: '별 형태 정확도',
        score: 30,
        description: '손과 손의 연결이 별 형태로 명확하게 읽히는지 평가합니다.',
        tip: '촬영 전 화면으로 별 모양을 보고 어긋난 곳을 바로 수정해 주세요.',
      },
      {
        label: '협업 완성도',
        score: 25,
        description: '여러 사람이 만든 형태가 하나의 도형처럼 정교한지 봅니다.',
        tip: '순서를 정해 한 사람씩 위치를 맞추면 완성도가 크게 올라갑니다.',
      },
      {
        label: '시선 집중도',
        score: 20,
        description: '배경보다 별손가락과 팀의 의도가 먼저 보이는지 평가합니다.',
        tip: '형태를 화면 중심에 두고 배경 요소를 과감히 덜어 주세요.',
      },
      {
        label: '앵글 창의성',
        score: 15,
        description: '테마를 더 매력적으로 보이게 하는 각도를 선택했는지 봅니다.',
        tip: '정면만 고집하지 말고 약간 위나 아래 각도도 시도해 보세요.',
      },
      {
        label: '완성도',
        score: 10,
        description: '초점, 노출, 전체 정리가 깔끔한지 종합 평가합니다.',
        tip: '손 끝이 흐려지지 않도록 초점을 정확히 맞춰 주세요.',
      },
    ],
  },
  {
    code: 'smart_city',
    emoji: '🗽',
    title: 'SMART CITY 조형물에서 사진찍기',
    shortTitle: 'SMART CITY',
    location: 'SMART CITY 조형물 앞',
    accent: 'linear-gradient(135deg, #0f172a 0%, #334155 50%, #64748b 100%)',
    themeColor: '#334155',
    softColor: 'rgba(51, 65, 85, 0.12)',
    mission: '조형물과 사람의 관계를 미래지향적인 장면으로 표현해 주세요.',
    photoTips: [
      {
        title: '조형물 비중 확보',
        body: '인물만 크게 찍지 말고 조형물 존재감을 먼저 살려 주세요.',
      },
      {
        title: '미래감 있는 시선',
        body: '직선 구도와 당당한 자세가 세련된 인상을 만듭니다.',
      },
      {
        title: '공간 차이 살리기',
        body: '한두 걸음 물러서면 조형물과 인물의 크기 차가 살아납니다.',
      },
    ],
    criteria: [
      {
        label: '조형물 활용도',
        score: 30,
        description: '조형물이 사진의 핵심 장치로 자연스럽게 쓰였는지 평가합니다.',
        tip: '조형물이 인물 뒤에 묻히지 않도록 비중을 먼저 확보해 주세요.',
      },
      {
        label: '미래감/브랜드 이미지',
        score: 25,
        description: '세련되고 스마트한 인상이 화면 전체에 전달되는지 평가합니다.',
        tip: '직선 구도와 자신감 있는 자세가 가장 빠르게 분위기를 만듭니다.',
      },
      {
        label: '인물-배경 관계성',
        score: 20,
        description: '인물과 조형물이 하나의 장면으로 연결되어 보이는지 봅니다.',
        tip: '조형물을 바라보거나 가리키는 제스처를 활용해 주세요.',
      },
      {
        label: '공간감',
        score: 15,
        description: '조형물의 크기와 현장감이 충분히 느껴지는지 평가합니다.',
        tip: '너무 붙기보다 한 걸음 물러서서 스케일을 살려 주세요.',
      },
      {
        label: '완성도',
        score: 10,
        description: '노출, 색감, 수평, 화면 정리가 안정적인지 평가합니다.',
        tip: '조형물과 하늘이 같이 들어가면 수평부터 맞춰 주세요.',
      },
    ],
  },
]
