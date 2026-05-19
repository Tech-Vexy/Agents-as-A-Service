"use client";

import { useState, useEffect } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import { Header } from "@/components/dashboard/header";
import { ProfileEditor } from "@/components/dashboard/profile-editor";
import { AgentConsole } from "@/components/dashboard/agent-console";
import { useProfiles } from "@/hooks/use-profiles";
import { useLiveKitToken } from "@/hooks/use-livekit-token";
import { Loader2 } from "lucide-react";


export default function Home() {
  const [selectedProfileId, setSelectedProfileId] = useState<number | undefined>();
  const [shouldConnect, setShouldConnect] = useState(false);

  const { data: profiles = [], isLoading: isLoadingProfiles } = useProfiles();
  
  // Stabilize initial profile selection: only set once when profiles load
  useEffect(() => {
    if (!selectedProfileId && profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

  const { data: tokenData, isLoading: isLoadingToken, error: tokenError } = useLiveKitToken(selectedProfileId);

  // Debug logging
  useEffect(() => {
    console.log('=== Debug Info ===');
    console.log('Token data:', tokenData);
    console.log('Token loading:', isLoadingToken);
    console.log('Token error:', tokenError);
    console.log('Selected profile ID:', selectedProfileId);
    console.log('Should connect:', shouldConnect);
    console.log('LiveKit URL:', process.env.NEXT_PUBLIC_LIVEKIT_URL);
    console.log('==================');
  }, [tokenData, isLoadingToken, tokenError, selectedProfileId, shouldConnect]);

  // Additional debug for connection attempts
  useEffect(() => {
    if (shouldConnect) {
      console.log('🔄 Attempting to connect with:', {
        hasToken: !!tokenData?.token,
        token: tokenData?.token?.substring(0, 20) + '...',
        serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL
      });
    }
  }, [shouldConnect, tokenData]);

  // Loading state only for initial load
  if (isLoadingProfiles) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-neutral-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-lg">Initializing dashboard...</p>
        </div>
      </div>
    );
  }

  const currentProfile = profiles.find(p => p.id === selectedProfileId);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-4 flex flex-col">
      <LiveKitRoom
        token={tokenData?.token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        connect={shouldConnect}
        audio={true}
        video={false}
        className="flex flex-col flex-1"
      >
        <Header />
        
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProfileEditor 
            onProfileSelect={(id) => {
              setSelectedProfileId(id);
              setShouldConnect(false); 
            }}
            selectedProfileId={selectedProfileId}
          />

          <AgentConsole 
            profileName={currentProfile?.name}
            canConnect={!!tokenData?.token}
            onConnect={() => {
              console.log('Connect button clicked!');
              console.log('Setting shouldConnect to true');
              setShouldConnect(true);
            }}
            onDisconnect={() => {
              console.log('Disconnect button clicked!');
              setShouldConnect(false);
            }}
          />
        </main>
      </LiveKitRoom>
    </div>
  );
}
