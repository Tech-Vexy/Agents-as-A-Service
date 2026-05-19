"use client";

import { Mic, Play, Loader2 } from "lucide-react";
import { useRoomContext, RoomAudioRenderer, useConnectionState, useRemoteParticipants, SessionProvider } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { AgentSessionView_01 } from "@/components/agents-ui/blocks/agent-session-view-01";
import { useAgentErrors } from "@/hooks/useAgentErrors";
import { useMemo } from "react";

function AgentErrorHandler() {
  useAgentErrors();
  return null;
}

interface AgentConsoleProps {
  onConnect: () => void;
  onDisconnect: () => void;
  profileName?: string;
  canConnect: boolean;
}

export function AgentConsole({ onConnect, onDisconnect, profileName, canConnect }: AgentConsoleProps) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const remoteParticipants = useRemoteParticipants();
  
  const displayName = profileName || "Default Agent";
  const description = profileName 
    ? "Ready to test the live consultation flow for this tenant."
    : "Connect without a profile to test the default agent.";

  const isConnected = connectionState === ConnectionState.Connected;
  const isConnecting = connectionState === ConnectionState.Connecting;

  // Find the agent participant (agents typically have specific metadata or attributes)
  const agentParticipant = useMemo(() => {
    return remoteParticipants.find(p => p.isAgent || p.kind === 'agent');
  }, [remoteParticipants]);

  // Create a session object when agent is present
  const session = useMemo(() => {
    if (!agentParticipant || !room) return null;
    
    return {
      room,
      participant: agentParticipant,
      isConnected: true,
      end: () => {
        room.disconnect();
        onDisconnect();
      }
    };
  }, [agentParticipant, room, onDisconnect]);

  return (
    <section className="bg-neutral-900 rounded-xl p-6 shadow-lg flex flex-col border border-neutral-800 relative overflow-hidden min-h-[500px] h-full">
      {!isConnected ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 animate-in fade-in zoom-in duration-500 h-full">
           <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center border border-blue-500/30">
             <Mic className="w-10 h-10 text-blue-500" />
           </div>
           <div>
             <h3 className="text-2xl font-bold">{displayName}</h3>
             <p className="text-neutral-400 max-w-sm mt-2">{description}</p>
           </div>
           <button 
             onClick={onConnect} 
             disabled={isConnecting}
             className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-10 py-4 rounded-full font-bold text-lg flex items-center gap-3 shadow-xl shadow-blue-900/20 transition-all active:scale-95"
           >
             {isConnecting ? <><Loader2 className="w-6 h-6 animate-spin" /> Connecting...</> : <><Play className="w-6 h-6 fill-current" /> Initialize Session</>}
           </button>
        </div>
      ) : session ? (
        <SessionProvider session={session}>
          <div className="flex-1 flex flex-col animate-in fade-in duration-700 h-full">
            <AgentSessionView_01 
              className="flex-1"
              onDisconnect={() => { room.disconnect(); onDisconnect(); }}
            />
            <RoomAudioRenderer />
            <AgentErrorHandler />
          </div>
        </SessionProvider>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
          <p className="text-neutral-400">Waiting for agent to join...</p>
        </div>
      )}
    </section>
  );
}
