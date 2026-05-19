"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, Rocket, UserCircle } from "lucide-react";
import type { BusinessProfile } from "@/lib/store";
import { useProfiles, useActiveAgents, useUpdateProfile, useCreateProfile, useDeployAgent } from "@/hooks/use-profiles";

interface ProfileEditorProps {
  onProfileSelect: (id: number) => void;
  selectedProfileId?: number;
}

export function ProfileEditor({ onProfileSelect, selectedProfileId }: ProfileEditorProps) {
  const { data: profiles = [], isLoading: isLoadingProfiles } = useProfiles();
  const { data: activeAgents } = useActiveAgents();
  const updateProfile = useUpdateProfile();
  const createProfile = useCreateProfile();
  const deployAgent = useDeployAgent();

  const [localProfile, setLocalProfile] = useState<Partial<BusinessProfile>>({
    name: "",
    industry: "",
    technicalSpecs: "",
    tone: "",
    avatar_url: "",
  });

  const activeAgentIds = activeAgents?.activeServices?.map(s => s.profileId) || [];

  useEffect(() => {
    if (selectedProfileId) {
      const selected = profiles.find(p => p.id === selectedProfileId);
      if (selected) {
        setLocalProfile(selected);
      }
    } else if (profiles.length === 0) {
      // If no profiles exist, show empty form for creating first profile
      setLocalProfile({
        name: "",
        industry: "",
        technicalSpecs: "",
        tone: "",
        avatar_url: "",
      });
    }
  }, [selectedProfileId, profiles]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setLocalProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = () => {
    if (localProfile.id) {
      updateProfile.mutate(localProfile as BusinessProfile & { id: number });
    } else {
      createProfile.mutate(localProfile, {
        onSuccess: (newProfile) => {
          onProfileSelect(newProfile.id);
        }
      });
    }
  };

  const handleDeploy = () => {
    if (localProfile.id && localProfile.name) {
      deployAgent.mutate({ profileId: localProfile.id, profileName: localProfile.name });
    }
  };

  const handleNewProfile = () => {
    setLocalProfile({
      name: "New Agent",
      industry: "",
      technicalSpecs: "",
      tone: "",
      avatar_url: "",
    });
  };

  return (
    <section className="bg-neutral-900 rounded-xl p-6 shadow-lg flex flex-col gap-4 border border-neutral-800 relative h-full">
      <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">Business Knowledge Base</h2>
        <div className="flex gap-2">
          {profiles.length > 0 && (
            <select
              className="bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 max-w-[200px]"
              value={selectedProfileId || ""}
              onChange={(e) => onProfileSelect(parseInt(e.target.value))}
            >
              <option value="" disabled>Select a Profile</option>
              {profiles.map(p => (
                 <option key={p.id} value={p.id}>
                   {p.name} {activeAgentIds.includes(p.id!) ? "🟢" : ""}
                 </option>
              ))}
            </select>
          )}
          <button 
            onClick={handleNewProfile}
            className="bg-neutral-800 hover:bg-neutral-700 p-2 rounded border border-neutral-700 transition-colors" 
            title="Create New Profile"
          >
            <Plus className="w-4 h-4 text-neutral-300" />
          </button>
        </div>
      </div>
      
      <div className="space-y-4 flex-1 overflow-y-auto pr-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono text-neutral-500 uppercase">Agent Name</label>
          <input 
            name="name" 
            value={localProfile.name} 
            onChange={handleInputChange} 
            className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 font-medium focus:border-blue-500 outline-none" 
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono text-neutral-500 uppercase">Avatar URL</label>
          <div className="flex gap-2 items-center">
            <input 
              name="avatar_url" 
              value={localProfile.avatar_url || ""} 
              onChange={handleInputChange} 
              placeholder="https://example.com/avatar.png"
              className="flex-1 bg-neutral-950 border border-neutral-700 rounded px-3 py-2 font-medium focus:border-blue-500 outline-none" 
            />
            {localProfile.avatar_url ? (
              <img src={localProfile.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-neutral-700" />
            ) : (
              <UserCircle className="w-10 h-10 text-neutral-700" />
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono text-neutral-500 uppercase">Knowledge Base / Specs</label>
          <textarea 
            name="technicalSpecs" 
            value={localProfile.technicalSpecs} 
            onChange={handleInputChange} 
            className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 h-40 resize-none focus:border-blue-500 outline-none" 
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono text-neutral-500 uppercase">Persona / Tone</label>
          <textarea 
            name="tone" 
            value={localProfile.tone} 
            onChange={handleInputChange} 
            className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 h-24 resize-none focus:border-blue-500 outline-none" 
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4 border-t border-neutral-800 pt-4">
         <button 
           onClick={handleSave} 
           disabled={updateProfile.isPending || createProfile.isPending} 
           className="bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded text-sm font-medium transition-colors border border-neutral-700"
         >
           {updateProfile.isPending || createProfile.isPending ? "Saving..." : localProfile.id ? "Update Brain" : "Create Brain"}
         </button>

         <button 
           onClick={handleDeploy} 
           disabled={deployAgent.isPending || !localProfile.id} 
           className="bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
         >
           {deployAgent.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
           {activeAgentIds.includes(localProfile.id || -1) ? "Redeploy Agent" : "Deploy Agent"}
         </button>
      </div>
    </section>
  );
}
