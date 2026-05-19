import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { BusinessProfile } from "@/lib/store";
import { toast } from "sonner";

export function useProfiles() {
  return useQuery<BusinessProfile[]>({
    queryKey: ["profiles"],
    queryFn: async () => {
      const res = await fetch("/api/profiles");
      if (!res.ok) throw new Error("Failed to fetch profiles");
      return res.json();
    },
  });
}

export function useActiveAgents() {
  return useQuery<{ activeServices: { profileId: number }[] }>({
    queryKey: ["active-agents"],
    queryFn: async () => {
      const res = await fetch("/api/agents/active");
      if (!res.ok) throw new Error("Failed to fetch active agents");
      return res.json();
    },
    refetchInterval: 10000, 
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Partial<BusinessProfile> & { id: number }) => {
      const res = await fetch(`/api/profiles/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Profile updated successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile");
    }
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Partial<BusinessProfile>) => {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Failed to create profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Profile created successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create profile");
    }
  });
}

export function useDeployAgent() {
  return useMutation({
    mutationFn: async ({ profileId, profileName }: { profileId: number; profileName: string }) => {
      const resp = await fetch("/api/agents/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, profileName })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Deployment failed");
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Agent deployed successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to deploy agent");
    }
  });
}
