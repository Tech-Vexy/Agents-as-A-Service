import { useQuery } from "@tanstack/react-query";

export function useLiveKitToken(profileId?: number) {
  return useQuery<{ token: string }>({
    queryKey: ["livekit-token", profileId],
    queryFn: async () => {
      const url = profileId 
        ? `/api/token?profileId=${profileId}`
        : `/api/token`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch token");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, 
  });
}
