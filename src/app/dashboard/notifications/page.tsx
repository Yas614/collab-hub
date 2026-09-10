export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationsList from "@/components/shared/NotificationsList";
import BackButton from "@/components/shared/BackButton";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <BackButton />
      <h1 className="text-xl font-black text-slate-900 mb-1">Notifications</h1>
      <p className="text-xs text-slate-400 font-semibold mb-6">Task assignments and workspace invites, most recent first.</p>
      <NotificationsList initialNotifications={notifications ?? []} />
    </div>
  );
}