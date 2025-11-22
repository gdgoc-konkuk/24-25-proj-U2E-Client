import { useQuery } from "@tanstack/react-query";
import { fetchPinList } from "../api/pinApi";
import { Pin } from "../types/pin";

/**
 * pin 목록을 조회하기 위한 React Query 커스텀 훅
 * @returns 핀 조회 쿼리 결과 객체
 */
export const usePinQuery = (
  region?: string | null,
  climate?: string | null
) => {
  return useQuery<Pin[]>({
    queryKey: ["pins", { region, climate }],
    queryFn: () => fetchPinList({ region, climate }),
    staleTime: 1000 * 60 * 500,
    select: (pins) => {
      // id 기준으로 정렬
      const sorted = [...pins].sort((a, b) => b.pinId - a.pinId);
      return sorted.slice(0, 70);
    },
  });
};
