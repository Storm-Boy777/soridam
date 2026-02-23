import { QueryClient, isServer } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5분
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) return makeQueryClient(); // 서버: 매 요청마다 새로 생성
  if (!browserQueryClient) browserQueryClient = makeQueryClient(); // 브라우저: 싱글턴
  return browserQueryClient;
}
