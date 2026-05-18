"use client";

import { useEffect, useState, useMemo } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useSession,
} from "@livekit/components-react";
import { 
  Mic, 
  Settings, 
  Play, 
  Plus, 
  Loader2, 
  Rocket
} from "lucide-react";
import type { BusinessProfile } from "@/lib/store";
import { AgentSessionView_01 } from "@/components/agents-ui/blocks/agent-session-view-01";
import { TokenSource } from "livekit-client";
import { useAgentErrors } from "@/hooks/useAgentErrors";

export default function Home() {
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Partial<BusinessProfile>>({
    name: "",
    industry: "",
    technicalSpecs: "",
    tone: "",
    avatar_url: "",
  });

  const [activeAgentIds, setActiveAgentIds] = useState<number[]>([]);

  // Load all profiles
  const loadData = async (preserveSelectionId?: number) => {
    try {
      const [profilesRes, activeRes] = await Promise.all([
        fetch("/api/profiles"),
        fetch("/api/agents/active")
      ]);
      
      const profilesData = await profilesRes.json();
      const activeData = await activeRes.json();

      setProfiles(profilesData || []);
      setActiveAgentIds(activeData?.activeServices?.map((s: { profileId: number }) => s.profileId) || []);

      if (profilesData?.length > 0) {
         const targetId = preserveSelectionId || profilesData[0].id;
         const targetProfile = profilesData.find((p: BusinessProfile) => p.id === targetId) || profilesData[0];
         if (targetProfile) setCurrentProfile(targetProfile);
      }
    } catch (err) {
      console.error("Failed to load data", err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(currentProfile.id), 5000);
    return () => clearInterval(interval);
  }, [currentProfile.id]);

  const tokenSource = useMemo(() => {
    if (!currentProfile?.id) return undefined;
    return TokenSource.endpoint(`/api/token?profileId=${currentProfile.id}`);
  }, [currentProfile?.id]);

  const session = useSession(tokenSource!);

  return (
    <>
      {/* @ts-expect-error */}
      <LiveKitRoom
      room={session.room}
      connect={session.isConnected}
      className="flex flex-col min-h-screen"
    >
      <AppContent 
        profiles={profiles}
        currentProfile={currentProfile}
        setCurrentProfile={setCurrentProfile}
        session={session}
        activeAgentIds={activeAgentIds}
      />
    </LiveKitRoom>
    </>
  );
}

function AppContent({ 
  profiles, 
  currentProfile, 
  setCurrentProfile, 
  session, 
  activeAgentIds
}: {
  profiles: BusinessProfile[];
  currentProfile: Partial<BusinessProfile>;
  setCurrentProfile: (p: Partial<BusinessProfile>) => void;
  session: ReturnType<typeof useSession>;
  activeAgentIds: number[];
}) {
  useAgentErrors();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState("");

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCurrentProfile({ ...currentProfile, [e.target.name]: e.target.value });
  };

  const handleSelectProfile = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const profileId = parseInt(e.target.value);
    const selected = profiles.find((p: BusinessProfile) => p.id === profileId);
    if (selected) setCurrentProfile(selected);
  };

  const saveProfile = async () => {
    if (!currentProfile.id) return;
    setIsSaving(true);
    setSaveStatus("Saving...");
    try {
      const res = await fetch(`/api/profiles/${currentProfile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentProfile),
      });
      if (res.ok) {
        setSaveStatus("Saved successfully!");
        setTimeout(() => setSaveStatus(""), 2000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const deployAgent = async () => {
    if (!currentProfile.id) return;
    setIsDeploying(true);
    setDeployStatus("Deploying...");
    try {
      const resp = await fetch("/api/agents/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          profileId: currentProfile.id, 
          profileName: currentProfile.name 
        })
      });
      const data = await resp.json();
      if (resp.ok) {
        setDeployStatus(data.message || "Deployed!");
      } else {
        setDeployStatus("Deployment failed.");
      }
      setTimeout(() => setDeployStatus(""), 5000);
    } catch (err) {
      console.error(err);
      setDeployStatus("Error deploying.");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-4 flex flex-col">
      <header className="flex items-center justify-between py-4 px-6 bg-neutral-900 rounded-lg shadow-md mb-6 border border-neutral-800">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-bold tracking-tight">Voice-Agent-as-a-Service</h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 bg-neutral-800/50 px-3 py-1.5 rounded-full border border-neutral-700">
             <div className={`w-2 h-2 rounded-full ${session.isConnected ? "bg-green-500 animate-pulse" : "bg-neutral-600"}`} />
             <span className="text-xs font-mono uppercase tracking-wider">{session.isConnected ? "Online" : "Offline"}</span>
           </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        <section className="bg-neutral-900 rounded-xl p-6 shadow-lg flex flex-col gap-4 border border-neutral-800 relative">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">Business Knowledge Base</h2>
            <div className="flex gap-2">
              <select
                className="bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 max-w-[200px]"
                value={currentProfile.id || ""}
                onChange={handleSelectProfile}
              >
                {profiles.map(p => (
                   <option key={p.id} value={p.id}>
                     {p.name} {activeAgentIds.includes(p.id!) ? "🟢" : ""}
                   </option>
                ))}
              </select>
              <button className="bg-neutral-800 hover:bg-neutral-700 p-2 rounded border border-neutral-700 transition-colors" title="Create New Profile">
                <Plus className="w-4 h-4 text-neutral-300" />
              </button>
            </div>
          </div>
          
          <div className="space-y-4 flex-1">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono text-neutral-500 uppercase">Agent Name</label>
              <input 
                name="name" 
                value={currentProfile.name} 
                onChange={handleProfileChange} 
                className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 font-medium focus:border-blue-500 outline-none" 
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono text-neutral-500 uppercase">Knowledge Base / Specs</label>
              <textarea 
                name="technicalSpecs" 
                value={currentProfile.technicalSpecs} 
                onChange={handleProfileChange} 
                className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 h-40 resize-none focus:border-blue-500 outline-none" 
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono text-neutral-500 uppercase">Persona / Tone</label>
              <textarea 
                name="tone" 
                value={currentProfile.tone} 
                onChange={handleProfileChange} 
                className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 h-24 resize-none focus:border-blue-500 outline-none" 
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 border-t border-neutral-800 pt-4">
             {saveStatus && <span className="text-sm text-green-400 self-center mr-2">{saveStatus}</span>}
             {deployStatus && <span className="text-sm text-blue-400 self-center mr-2">{deployStatus}</span>}
             
             <button 
               onClick={saveProfile} 
               disabled={isSaving} 
               className="bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded text-sm font-medium transition-colors border border-neutral-700"
             >
               {isSaving ? "Saving..." : "Update Brain"}
             </button>

             <button 
               onClick={deployAgent} 
               disabled={isDeploying || !currentProfile.id} 
               className="bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
             >
               {isDeploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
               {activeAgentIds.includes(currentProfile.id || -1) ? "Redeploy Agent" : "Deploy Agent"}
             </button>
          </div>
        </section>

        <section className="bg-neutral-900 rounded-xl p-6 shadow-lg flex flex-col border border-neutral-800 relative overflow-hidden min-h-[500px]">
          {!session.isConnected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 animate-in fade-in zoom-in duration-500 h-full">
               <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center border border-blue-500/30">
                 <Mic className="w-10 h-10 text-blue-500" />
               </div>
               <div>
                 <h3 className="text-2xl font-bold">{currentProfile.name || "Select a Profile"}</h3>
                 <p className="text-neutral-400 max-w-sm mt-2">Ready to test the live consultation flow for this tenant.</p>
               </div>
               <button 
                 onClick={() => session.start()} 
                 disabled={(session.room?.state === 'connecting') || !currentProfile.id}
                 className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-10 py-4 rounded-full font-bold text-lg flex items-center gap-3 shadow-xl shadow-blue-900/20 transition-all active:scale-95"
               >
                 {(session.room?.state === 'connecting') ? <><Loader2 className="w-6 h-6 animate-spin" /> Connecting...</> : <><Play className="w-6 h-6 fill-current" /> Initialize Session</>}
               </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col animate-in fade-in duration-700 h-full">
              <AgentSessionView_01 
                className="flex-1"
                onDisconnect={() => session.end()}
              />
              <RoomAudioRenderer />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
