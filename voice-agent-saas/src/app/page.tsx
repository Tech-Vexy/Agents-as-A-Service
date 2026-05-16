"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
} from "@livekit/components-react";
import { Mic, Settings, Play, Plus, Trash2, CheckCircle2 } from "lucide-react";
import type { BusinessProfile } from "@/lib/store";
import { AgentSessionView_01 } from "@/components/agents-ui/blocks/agent-session-view-01";

export default function Home() {
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<number | null>(null);

  const [currentProfile, setCurrentProfile] = useState<Partial<BusinessProfile>>({
    name: "",
    industry: "",
    technicalSpecs: "",
    tone: "",
    avatar_url: "",
  });

  const [activeProfileData, setActiveProfileData] = useState<BusinessProfile | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState("");

  const [roomToken, setRoomToken] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  // Load all profiles and the active profile ID
  const loadData = async (preserveSelectionId?: number) => {
    try {
      const [profilesRes, activeRes] = await Promise.all([
        fetch("/api/profiles"),
        fetch("/api/profile/active")
      ]);
      const profilesData = await profilesRes.json();
      const activeData = await activeRes.json();

      setProfiles(profilesData);
      setActiveProfileId(activeData.activeId);

      // Determine which profile to show
      if (profilesData.length > 0) {
         const activeProfile = profilesData.find((p: BusinessProfile) => p.id === activeData.activeId) || profilesData[0];
         setActiveProfileData(activeProfile);

         const targetId = preserveSelectionId || activeData.activeId || profilesData[0].id;
         const targetProfile = profilesData.find((p: BusinessProfile) => p.id === targetId);
         if (targetProfile) setCurrentProfile(targetProfile);
      } else {
         setCurrentProfile({ name: "", industry: "", technicalSpecs: "", tone: "", avatar_url: "" });
         setActiveProfileData(null);
      }
    } catch (err) {
      console.error("Failed to load data", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProfileChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setCurrentProfile({ ...currentProfile, [e.target.name]: e.target.value });
  };

  const handleSelectProfile = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value, 10);
    const p = profiles.find(prof => prof.id === id);
    if (p) setCurrentProfile(p);
  };

  useEffect(() => {
     // Ensure currentProfile state stays in sync if it gets updated from save loadData
     if (currentProfile.id) {
        const p = profiles.find(prof => prof.id === currentProfile.id);
        if (p) setCurrentProfile(p);
     }
  }, [profiles]);

  const createNewProfile = async () => {
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Agent Brain" }),
      });
      if (res.ok) {
        const newP = await res.json();
        setProfiles([...profiles, newP]);
        setCurrentProfile(newP);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteCurrentProfile = async () => {
    if (!currentProfile.id || !confirm("Are you sure you want to delete this agent profile?")) return;
    try {
      const res = await fetch(`/api/profiles/${currentProfile.id}`, { method: "DELETE" });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deployAgentToCloud = async () => {
    if (!currentProfile.id) return;
    setIsDeploying(true);
    setDeployStatus("Deploying distinct agent...");
    try {
      const res = await fetch('/api/agents/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: currentProfile.id, profileName: currentProfile.name })
      });
      if (res.ok) {
        setDeployStatus("Deployed successfully!");
        setTimeout(() => setDeployStatus(""), 3000);
      } else {
        const err = await res.json();
        setDeployStatus("Deploy failed.");
        console.error("Deploy failed:", err);
      }
    } catch (e) {
      setDeployStatus("Deploy failed.");
      console.error(e);
    } finally {
      setIsDeploying(false);
    }
  };

  const saveProfile = async () => {
    setIsSaving(true);
    setSaveStatus("Saving...");
    try {
      if (currentProfile.id) {
         const res = await fetch(`/api/profiles/${currentProfile.id}`, {
           method: "PUT",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify(currentProfile),
         });
         if (res.ok) {
           setSaveStatus("Saved successfully!");
           await loadData(currentProfile.id); // Reload to get updated list, preserve selection
           setTimeout(() => setSaveStatus(""), 2000);
         } else {
           setSaveStatus("Failed to save.");
         }
      }
    } catch {
      setSaveStatus("Error saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const makeProfileLive = async () => {
      if (!currentProfile.id) return;
      try {
        const res = await fetch("/api/profile/active", {
           method: "PUT",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ activeId: currentProfile.id })
        });
        if (res.ok) {
           const data = await res.json();
           setActiveProfileId(data.activeId);
        }
      } catch (e) {
        console.error(e);
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

  const isActive = currentProfile.id && currentProfile.id === activeProfileId;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-4 flex flex-col">
      <header className="flex items-center justify-between py-4 px-6 bg-neutral-900 rounded-lg shadow-md mb-6 border border-neutral-800">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-bold tracking-tight">Voice-Agent-as-a-Service</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-neutral-400">Tenant Control Tower</div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        {/* Left Pane: Config Side */}
        <section className="bg-neutral-900 rounded-xl p-6 shadow-lg flex flex-col gap-4 border border-neutral-800 relative">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Business Knowledge Base
            </h2>
            <div className="flex gap-2">
              <select
                className="bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 max-w-[200px]"
                value={currentProfile.id || ""}
                onChange={handleSelectProfile}
              >
                {profiles.map(p => (
                   <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                onClick={createNewProfile}
                className="bg-neutral-800 hover:bg-neutral-700 p-2 rounded border border-neutral-700 transition-colors"
                title="Create New Profile"
              >
                <Plus className="w-4 h-4 text-neutral-300" />
              </button>
            </div>
          </div>

          {currentProfile.id ? (
            <>
            <div className="flex items-center justify-between bg-neutral-950 p-3 rounded border border-neutral-800">
              <div className="flex items-center gap-2">
                 <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-neutral-600'}`}></div>
                 <span className="text-sm font-medium">{isActive ? 'This profile is currently LIVE' : 'This profile is inactive'}</span>
              </div>
              {!isActive && (
                <button
                  onClick={makeProfileLive}
                  className="text-xs bg-green-600/20 text-green-400 hover:bg-green-600/30 px-3 py-1.5 rounded transition-colors font-medium border border-green-600/30"
                >
                  Hot Swap to Live
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <label className="text-sm font-medium text-neutral-400">Company Name</label>
              <input
                type="text"
                name="name"
                value={currentProfile.name}
                onChange={handleProfileChange}
                className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-neutral-400">Industry</label>
              <input
                type="text"
                name="industry"
                value={currentProfile.industry}
                onChange={handleProfileChange}
                className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-neutral-400">Avatar Image URL (Optional)</label>
              <input
                type="url"
                name="avatar_url"
                value={currentProfile.avatar_url || ''}
                onChange={handleProfileChange}
                className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="https://example.com/avatar.png"
              />
            </div>

            <div className="flex flex-col gap-2 flex-1">
              <label className="text-sm font-medium text-neutral-400">Technical Specs & Logic</label>
              <textarea
                name="technicalSpecs"
                value={currentProfile.technicalSpecs}
                onChange={handleProfileChange}
                className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none flex-1 h-32"
                placeholder="e.g. N-Type bifacial panels vs monocrystalline..."
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-neutral-400">Tone & Persona</label>
              <textarea
                name="tone"
                value={currentProfile.tone}
                onChange={handleProfileChange}
                className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none h-20"
                placeholder="e.g. Professional, empathetic..."
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={deleteCurrentProfile}
                className="text-red-400 hover:text-red-300 p-2 transition-colors flex items-center gap-1 text-sm"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>

              <div className="flex items-center gap-4">
                {saveStatus && <span className="text-sm text-green-400 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> {saveStatus}</span>}
                {deployStatus && <span className="text-sm text-blue-400 flex items-center gap-1">{deployStatus}</span>}

                <button
                  onClick={saveProfile}
                  disabled={isSaving}
                  className="bg-neutral-700 hover:bg-neutral-600 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50 text-sm"
                >
                  {isSaving ? "Saving..." : "Save Config"}
                </button>

                <button
                  onClick={deployAgentToCloud}
                  disabled={isDeploying || isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {isDeploying ? "Deploying..." : "Deploy to Cloud"}
                </button>
              </div>
            </div>
            </>
          ) : (
             <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-4">
               <p>No profiles found.</p>
               <button onClick={createNewProfile} className="bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded text-neutral-300">Create One</button>
             </div>
          )}
        </section>

        {/* Right Pane: Live Side */}
        <section className="bg-neutral-900 rounded-xl p-6 shadow-lg flex flex-col gap-4 border border-neutral-800 items-center justify-center relative overflow-hidden">
          <div className="absolute top-6 left-6 text-lg font-semibold flex items-center gap-2">
            <Mic className="w-5 h-5 text-green-400" />
            Live Session
          </div>

          {!isConnected ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-24 h-24 bg-neutral-950 rounded-full flex items-center justify-center border-4 border-neutral-800 overflow-hidden relative group">
                {activeProfileData?.avatar_url ? (
                  <img src={activeProfileData.avatar_url} alt="Agent Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Mic className="w-10 h-10 text-neutral-600" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-medium mb-1">Agent is Offline</h3>
                <p className="text-sm text-neutral-400 max-w-sm">
                  Connect to start a real-time voice session with the currently <span className="text-green-400">LIVE</span> agent profile.
                </p>
              </div>
              <button
                onClick={connectToRoom}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-full transition-colors mt-4 shadow-lg shadow-green-900/20"
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
              className="w-full h-full flex flex-col relative"
              onDisconnected={disconnectFromRoom}
            >
              <AgentSessionView_01
                className="w-full h-full"
                audioVisualizerType="aura"
                supportsVideoInput={false}
                supportsScreenShare={false}
              />
              <RoomAudioRenderer />
            </LiveKitRoom>
          )}
        </section>
      </main>
    </div>
  );
}
