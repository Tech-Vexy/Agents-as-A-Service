"use client";

import { Settings } from "lucide-react";
import { useRoomContext } from "@livekit/components-react";

export function Header() {
  const room = useRoomContext();

  return (
    <header className="flex items-center justify-between py-4 px-6 bg-neutral-900 rounded-lg shadow-md mb-6 border border-neutral-800">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-blue-400" />
        <h1 className="text-xl font-bold tracking-tight">Voice-Agent-as-a-Service</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-neutral-800/50 px-3 py-1.5 rounded-full border border-neutral-700">
          <div className={`w-2 h-2 rounded-full ${room.state === 'connected' ? "bg-green-500 animate-pulse" : "bg-neutral-600"}`} />
          <span className="text-xs font-mono uppercase tracking-wider">{room.state === 'connected' ? "Online" : "Offline"}</span>
        </div>
      </div>
    </header>
  );
}
