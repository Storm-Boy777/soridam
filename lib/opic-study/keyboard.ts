/**
 * 오픽 스터디 — 키보드 접근성 헬퍼
 *
 * <div role="button" tabIndex={0} onClick onKeyDown={onCardKey(handler)}>
 * 와 같이 사용. Enter/Space 키 누름 시 handler 실행 + preventDefault.
 */

import type { KeyboardEvent } from "react";

/**
 * Enter 또는 Space 키 누름 시 handler 실행.
 * 클릭 가능한 div/span에 키보드 활성화 핸들러 부여.
 */
export function onCardKey<E extends HTMLElement>(handler: () => void) {
  return (e: KeyboardEvent<E>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handler();
    }
  };
}
