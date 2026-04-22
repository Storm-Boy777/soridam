# 스크립트 이전 가이드: v1 → v2

## 개요

소리담 v1의 스크립트(`ai_training_scripts`) + 패키지(`ai_training_packages`) 데이터를
v2 테이블(`v2_scripts`, `v2_script_packages`)로 이전하는 전체 절차.

**soridamhub@gmail.com 샘플(스크립트 97개, 패키지 72개)로 검증 완료.**

## 사전 조건

- v2_questions가 v1 question_id 체계로 채워져 있어야 함 (✅ 완료)
- v2_profiles, v2_user_credits, v2_polar_balances에 사용자 행이 존재해야 함 (✅ 트리거로 자동 생성)
- `script-packages` 버킷이 소리담 Storage에 존재해야 함 (✅ 완료)

## 데이터 현황

| 항목 | 건수 |
|------|------|
| v1 스크립트 (ai_training_scripts) | 2,652개 |
| v1 패키지 (ai_training_packages, completed) | 2,384개 |
| WAV 파일 | 2,384개 (~12.1GB) |
| JSON 파일 | 2,384개 |
| 제외 대상 (공원/하이킹/카페 토픽) | ~40개 스크립트 |

## 이전 순서

### Step 1: 스크립트 INSERT

```sql
SET client_encoding TO 'UTF8';

INSERT INTO v2_scripts (
  id, user_id, question_id, title, english_text, korean_translation,
  key_expressions, highlighted_script, user_story, target_grade,
  question_type, question_korean, question_english, topic, category,
  ai_model, word_count, generation_time, source, status, refine_count,
  created_at, updated_at
)
SELECT
  s.id::uuid,
  s.user_id,
  s.question_id,
  s.title,
  s.english_text,
  s.korean_translation,
  s.key_expressions,
  s.highlighted_script,
  s.user_story,
  COALESCE(s.target_level, 'IM3'),
  COALESCE(s.answer_type, 'unknown'),
  s.question_korean,
  s.question_english,
  s.topic,
  s.category,
  s.ai_model,
  s.word_count,
  s.generation_time,
  'v1_migration',          -- source: 이전 데이터 표시
  'confirmed',             -- status: v2에서 '확정' 상태
  0,                       -- refine_count
  s.created_at,
  s.updated_at
FROM ai_training_scripts s
WHERE s.question_id IN (SELECT id FROM v2_questions)  -- 공원/하이킹/카페 자동 제외
ON CONFLICT DO NOTHING;
```

**주의:**
- `question_id IN (SELECT id FROM v2_questions)` 조건으로 v2_questions에 없는 질문(공원/하이킹/카페)은 자동 제외됨
- `status`는 `'confirmed'`으로 설정 (v2에서 '확정' 상태, '초안'으로 표시되지 않음)
- `source`는 `'v1_migration'`으로 표시하여 이전 데이터 식별 가능

### Step 2: question_type 매핑 UPDATE

v1의 `answer_type`과 v2의 `question_type_eng`가 다르므로 매핑 필요.

```sql
UPDATE v2_scripts s
SET question_type = q.question_type_eng
FROM v2_questions q
WHERE s.question_id = q.id
  AND s.source = 'v1_migration'
  AND s.question_type != q.question_type_eng;
```

**매핑 테이블:**

| v1 answer_type | v2 question_type_eng |
|----------------|---------------------|
| advanced_14 | adv_14 |
| advanced_15 | adv_15 |
| comparison | comparison |
| description | description |
| past_experience_childhood | past_childhood |
| past_experience_memorable | past_special |
| past_experience_recent | past_recent |
| roleplay_11 | rp_11 |
| roleplay_12 | rp_12 |
| routine | routine |

### Step 3: 패키지 INSERT

```sql
INSERT INTO v2_script_packages (
  id, user_id, script_id, status, progress,
  wav_file_path, json_file_path, timestamp_data,
  wav_file_size, tts_voice, error_message,
  created_at, completed_at
)
SELECT
  p.id::uuid,
  p.user_id,
  p.script_id::uuid,
  COALESCE(p.status, 'completed'),
  COALESCE(p.progress, 100)::smallint,
  -- 상대 경로로 변환 (script-packages 버킷용)
  regexp_replace(p.wav_file_path, '^https://[^/]+/storage/v1/object/public/ai-training-packages/', ''),
  regexp_replace(p.json_file_path, '^https://[^/]+/storage/v1/object/public/ai-training-packages/', ''),
  p.timestamp_data,
  p.wav_file_size,
  NULL,                    -- tts_voice
  p.error_message,
  p.created_at,
  p.completed_at
FROM ai_training_packages p
WHERE p.script_id::uuid IN (SELECT id FROM v2_scripts)  -- v2에 존재하는 스크립트만
  AND p.status = 'completed'
ON CONFLICT DO NOTHING;
```

**주의:**
- `wav_file_path`와 `json_file_path`를 전체 URL → 상대 경로로 변환
- v2 코드의 `supabase.storage.from("script-packages").getPublicUrl(path)`가 상대 경로를 기대함

### Step 4: timestamp_data 키 변환

v1 패키지의 `timestamp_data` 아이템 구조가 다름:
- v1: `{ text, start, end }`
- v2: `{ english, start, end }`

```sql
UPDATE v2_script_packages
SET timestamp_data = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'english', item->>'text',
      'start', (item->>'start')::numeric,
      'end', (item->>'end')::numeric
    )
  )
  FROM jsonb_array_elements(timestamp_data) AS item
)
WHERE timestamp_data IS NOT NULL
  AND timestamp_data->0 ? 'text'
  AND NOT (timestamp_data->0 ? 'english');
```

### Step 5: Storage 파일 복사

v1 버킷(`ai-training-packages`) → v2 버킷(`script-packages`)으로 파일 복사.

**5-1. 복사할 파일 목록 추출:**

```sql
-- WAV 파일
SELECT regexp_replace(wav_file_path, '^https://[^/]+/storage/v1/object/public/ai-training-packages/', '')
FROM ai_training_packages
WHERE status = 'completed' AND wav_file_path IS NOT NULL
  AND script_id::uuid IN (SELECT id FROM v2_scripts);

-- JSON 파일
SELECT regexp_replace(json_file_path, '^https://[^/]+/storage/v1/object/public/ai-training-packages/', '')
FROM ai_training_packages
WHERE status = 'completed' AND json_file_path IS NOT NULL AND json_file_path != ''
  AND script_id::uuid IN (SELECT id FROM v2_scripts);
```

**5-2. 일괄 복사 스크립트:**

```bash
SB_URL="https://fkkdbnebsaecjpqhhdvl.supabase.co"
SB_KEY="서비스 롤 키"

while IFS= read -r key; do
  [ -z "$key" ] && continue
  curl -s -X POST \
    -H "Authorization: Bearer $SB_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"bucketId\":\"ai-training-packages\",\"sourceKey\":\"$key\",\"destinationBucket\":\"script-packages\",\"destinationKey\":\"$key\"}" \
    "$SB_URL/storage/v1/object/copy" > /dev/null
done < copy_files.txt
```

**예상 소요 시간:** ~4,768개 파일 × ~12.1GB → 약 30분~1시간

### Step 6: 검증

```sql
-- 스크립트 수 확인
SELECT count(*) FROM v2_scripts WHERE source = 'v1_migration';

-- 패키지 수 확인
SELECT count(*) FROM v2_script_packages;

-- question_type이 올바르게 매핑되었는지
SELECT question_type, count(*) FROM v2_scripts WHERE source = 'v1_migration' GROUP BY question_type;

-- 패키지 timestamp_data가 english 키를 사용하는지
SELECT count(*) FROM v2_script_packages WHERE timestamp_data->0 ? 'english';

-- Storage 파일 접근 가능한지 (샘플)
SELECT wav_file_path FROM v2_script_packages LIMIT 1;
-- → supabase.storage.from("script-packages").getPublicUrl(결과값) 으로 접근 확인
```

## 주의사항

1. **공원/하이킹/카페 토픽 제외** — v2_questions에 없으므로 FK 위반 방지를 위해 자동 제외
2. **ID 타입 캐스팅** — v1은 varchar, v2는 uuid이지만 값 자체가 UUID 형식이라 `::uuid` 캐스팅 가능
3. **status = 'confirmed'** — v2 코드에서 '확정' 표시를 위해 필수 (completed는 '초안'으로 표시됨)
4. **timestamp_data 키 변환** — `text` → `english` 변환 필수 (쉐도잉 에러 방지)
5. **파일 경로 = 상대 경로** — v2 코드가 `getPublicUrl(상대경로)` 사용
6. **Storage 복사 시간** — 12GB 복사에 30분~1시간 소요 예상, 백그라운드 실행 권장

## 롤백

문제 발생 시:
```sql
DELETE FROM v2_script_packages WHERE script_id IN (SELECT id FROM v2_scripts WHERE source = 'v1_migration');
DELETE FROM v2_scripts WHERE source = 'v1_migration';
```

Storage 파일은 script-packages 버킷을 비우면 됨 (원본 ai-training-packages는 그대로).

---
*최종 업데이트: 2026-04-06*
*검증: soridamhub@gmail.com — 스크립트 97개, 패키지 72개, WAV/JSON 143개 파일 복사 완료*
