import React from "react";
import { createClient } from "@/lib/supabase/server";
import InviteMemberForm from "@/components/team/InviteMemberForm";
import RemoveMemberButton from "@/components/team/RemoveMemberButton";
import { User } from "lucide-react";

interface TeamPageProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { workspaceId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: members } = await supabase
    .from("workspace_members")
    .select("id, role, user_id, profiles(display_name, email, avatar_url)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  const isOwner = members?.some((m) => m.user_id === user?.id && m.role === "owner") ?? false;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Team Members</h1>
        <p className="text-xs text-slate-500">Manage who has access to this workspace.</p>
      </div>

      {isOwner && <InviteMemberForm workspaceId={workspaceId} />}

      <div className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden">
        {(members || []).map((member) => {
          const profile = member.profiles as any;
          return (
            <div key={member.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {profile?.display_name || profile?.email || "Unknown user"}
                  </p>
                  <p className="text-xs text-slate-400">{profile?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
                    member.role === "owner"
                      ? "bg-indigo-50 text-indigo-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {member.role}
                </span>
                {isOwner && member.role !== "owner" && (
                  <RemoveMemberButton memberId={member.id} />
                )}
              </div>
            </div>
          );
        })}

        {(!members || members.length === 0) && (
          <div className="p-6 text-center text-sm text-slate-400">No members yet.</div>
        )}
      </div>
    </div>
  );
}
