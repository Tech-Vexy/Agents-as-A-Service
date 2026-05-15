"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  BarVisualizer,
  useVoiceAssistant,
} from "@livekit/components-react";
import { Mic, Settings, Play, Square } from "lucide-react";
import type { BusinessProfile } from "@/lib/store";

export default function Home() {
  const [profile, setProfile] = useState<BusinessProfile>({
    name: "",
    industry: "",
    technicalSpecs: "",
    tone: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  const [roomToken, setRoomToken] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .catch((err) => console.error("Failed to load profile", err));
  }, []);

  const handleProfileChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const saveProfile = async () => {
    setIsSaving(true);
    setSaveStatus("Saving...");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setSaveStatus("Saved successfully!");
        setTimeout(() => setSaveStatus(""), 2000);
      } else {
        setSaveStatus("Failed to save.");
      }
    } catch {
      setSaveStatus("Error saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const connectToRoom = async () => {
    try {
      const res = await fetch("/api/token?roomName=test-room");
      const data = await res.json();
      if (data.token) {
        setRoomToken(data.token);
        setIsConnected(true);
      } else {
        alert("Failed to get token: " + data.error);
      }
    } catch {
      alert("Error getting token");
    }
  };

  const disconnectFromRoom = () => {
    setIsConnected(false);
    setRoomToken("");
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans p-4 flex flex-col">
      <header className="flex items-center justify-between py-4 px-6 bg-neutral-800 rounded-lg shadow-md mb-6">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-bold tracking-tight">Voice-Agent-as-a-Service</h1>
        </div>
        <div className="text-sm text-neutral-400">Control Tower</div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        {/* Left Pane: Config Side */}
        <section className="bg-neutral-800 rounded-xl p-6 shadow-lg flex flex-col gap-4 border border-neutral-700">
          <div className="flex justify-between items-center border-b border-neutral-700 pb-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Business Knowledge Base
            </h2>
            {saveStatus && <span className="text-sm text-green-400">{saveStatus}</span>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-neutral-400">Company Name</label>
            <input
              type="text"
              name="name"
              value={profile.name}
              onChange={handleProfileChange}
              className="bg-neutral-900 border border-neutral-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-neutral-400">Industry</label>
            <input
              type="text"
              name="industry"
              value={profile.industry}
              onChange={handleProfileChange}
              className="bg-neutral-900 border border-neutral-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <label className="text-sm font-medium text-neutral-400">Technical Specs & Logic</label>
            <textarea
              name="technicalSpecs"
              value={profile.technicalSpecs}
              onChange={handleProfileChange}
              className="bg-neutral-900 border border-neutral-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none flex-1 h-32"
              placeholder="e.g. N-Type bifacial panels vs monocrystalline..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-neutral-400">Tone & Persona</label>
            <textarea
              name="tone"
              value={profile.tone}
              onChange={handleProfileChange}
              className="bg-neutral-900 border border-neutral-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none h-20"
              placeholder="e.g. Professional, empathetic..."
            />
          </div>

          <button
            onClick={saveProfile}
            disabled={isSaving}
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Update Agent Brain"}
          </button>
        </section>

        {/* Right Pane: Live Side */}
        <section className="bg-neutral-800 rounded-xl p-6 shadow-lg flex flex-col gap-4 border border-neutral-700 items-center justify-center relative overflow-hidden">
          <div className="absolute top-6 left-6 text-lg font-semibold flex items-center gap-2">
            <Mic className="w-5 h-5 text-green-400" />
            Live Session
          </div>

          {!isConnected ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-24 h-24 bg-neutral-900 rounded-full flex items-center justify-center border-4 border-neutral-700">
                <Mic className="w-10 h-10 text-neutral-500" />
              </div>
              <div>
                <h3 className="text-xl font-medium mb-1">Agent is Offline</h3>
                <p className="text-sm text-neutral-400">
                  Update the profile and connect to start a real-time voice session.
                </p>
              </div>
              <button
                onClick={connectToRoom}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-full transition-colors mt-4"
              >
                <Play className="w-5 h-5" />
                Connect Agent
              </button>
            </div>
          ) : (
            <LiveKitRoom
              token={roomToken}
              serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
              connect={true}
              audio={true}
              video={false}
              className="w-full h-full flex flex-col items-center justify-center gap-8"
              onDisconnected={disconnectFromRoom}
            >
              <AgentVisualizer />
              <div className="mt-auto">
                <VoiceAssistantControlBar />
              </div>
              <button
                onClick={disconnectFromRoom}
                className="absolute top-6 right-6 flex items-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-500 font-medium py-2 px-4 rounded transition-colors"
              >
                <Square className="w-4 h-4" />
                Disconnect
              </button>
              <RoomAudioRenderer />
            </LiveKitRoom>
          )}
        </section>
      </main>
    </div>
  );
}

function AgentVisualizer() {
  const { state, audioTrack } = useVoiceAssistant();

  const statusColors: Record<string, string> = {
    disconnected: "text-neutral-500",
    connecting: "text-yellow-400",
    connected: "text-blue-400",
    listening: "text-green-400",
    thinking: "text-purple-400",
    speaking: "text-blue-400",
  };

  const currentState = state || "disconnected";
  const colorClass = statusColors[currentState] || "text-neutral-500";

  return (
    <div className="flex flex-col items-center gap-6">
      <div className={`text-sm font-mono uppercase tracking-widest ${colorClass}`}>
        Agent Status: {currentState}
      </div>

      <div className="h-32 w-full max-w-md flex items-center justify-center">
        {audioTrack ? (
          <BarVisualizer
            state={state}
            trackRef={audioTrack}
            barCount={7}
            options={{ minHeight: 10 }}
            className="w-full h-full text-blue-500"
          />
        ) : (
          <div className="flex gap-1 items-center h-full">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="w-3 bg-neutral-700 rounded-full h-4 animate-pulse"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
