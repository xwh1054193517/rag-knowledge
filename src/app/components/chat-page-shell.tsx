"use client";

import dynamic from "next/dynamic";

interface ChatPageShellProps {
  userEmail: string;
}

const ChatShell = dynamic(() => import("@/components/chat/chat-shell"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-[var(--ui-bg)] text-sm text-[var(--ui-text-soft)]">
      正在进入聊天工作区...
    </div>
  ),
});

/**
 * 聊天页客户端包装组件，用于延迟加载纯客户端聊天工作区。
 */
export default function ChatPageShell({ userEmail }: ChatPageShellProps) {
  return <ChatShell userEmail={userEmail} />;
}
