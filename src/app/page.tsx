import { redirect } from "next/navigation";

import ChatPageShell from "@/app/components/chat-page-shell";
import { getCurrentUser } from "@/lib/supabase-server";

/**
 * 聊天首页，服务端校验登录态后再加载客户端聊天工作区。
 */
export default async function ChatPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <ChatPageShell userEmail={user.email ?? "已登录用户"} />;
}
