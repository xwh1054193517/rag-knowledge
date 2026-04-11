import { redirect } from "next/navigation";

import KnowledgePageShell from "@/app/components/knowledge-page-shell";
import { getCurrentUser } from "@/lib/supabase-server";

export default async function KnowledgePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <KnowledgePageShell userEmail={user.email ?? "Signed-in user"} />;
}
