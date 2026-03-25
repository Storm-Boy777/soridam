// 튜터링 프롬프트 DB 로더
// evaluation_prompts 테이블에서 system + schema + user 3행을 읽어 GPT 메시지로 조립

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PromptSet {
  system: string;
  schema: string;
  user_template: string;
  model: string;
  version: string;
}

/**
 * DB에서 프롬프트 3행 (system, schema, user)을 로드
 * @param supabase - Supabase client (service role)
 * @param keyPrefix - e.g. "tutoring_diagnosis", "tutoring_prescription"
 */
export async function loadPromptSet(
  supabase: SupabaseClient,
  keyPrefix: string
): Promise<PromptSet> {
  const keys = [keyPrefix, `${keyPrefix}_schema`, `${keyPrefix}_user`];

  const { data, error } = await supabase
    .from("evaluation_prompts")
    .select("key, prompt_text, model, prompt_version")
    .in("key", keys);

  if (error) {
    throw new Error(`프롬프트 로드 실패 (${keyPrefix}): ${error.message}`);
  }

  const map = new Map(
    (data ?? []).map((row: { key: string; prompt_text: string; model: string; prompt_version: string }) => [row.key, row])
  );

  const systemRow = map.get(keyPrefix);
  const schemaRow = map.get(`${keyPrefix}_schema`);
  const userRow = map.get(`${keyPrefix}_user`);

  if (!systemRow?.prompt_text || !schemaRow?.prompt_text || !userRow?.prompt_text) {
    throw new Error(`프롬프트가 비어있습니다 (${keyPrefix}). DB를 확인하세요.`);
  }

  return {
    system: systemRow.prompt_text,
    schema: schemaRow.prompt_text,
    user_template: userRow.prompt_text,
    model: systemRow.model ?? "gpt-4.1",
    version: systemRow.prompt_version ?? "v1",
  };
}

/**
 * PromptSet + 입력 데이터 → GPT 메시지 배열 생성
 */
export function buildMessages(
  promptSet: PromptSet,
  inputData: Record<string, unknown>
): { role: string; content: string }[] {
  // system = system prompt + "\n\n## 출력 JSON 스키마\n" + schema
  const systemContent = `${promptSet.system}\n\n## 출력 JSON 스키마\n${promptSet.schema}`;

  // user = user_template의 {input_json}을 실제 데이터로 치환
  const userContent = promptSet.user_template.replace(
    "{input_json}",
    JSON.stringify(inputData)
  );

  return [
    { role: "system", content: systemContent },
    { role: "user", content: userContent },
  ];
}
