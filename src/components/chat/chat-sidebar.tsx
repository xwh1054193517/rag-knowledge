"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen, Sparkles, X } from "lucide-react";

import ConversationList from "@/components/chat/conversation-list";
import type { ConversationItem } from "@/components/chat/types";
import UserInfo from "@/components/chat/user-info";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
  activeConversationId: string;
  conversations: ConversationItem[];
  hasMore: boolean;
  isCollapsed: boolean;
  isLoadingMore: boolean;
  onCloseMobile?: () => void;
  onCreateConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onLoadMore: () => void;
  onSelectConversation: (conversationId: string) => void;
  onToggleCollapse: () => void;
  showMobileClose: boolean;
  userEmail: string;
}

/**
 * 侧边栏组件，组合会话列表和用户信息模块。
 */
export default function ChatSidebar({
  activeConversationId,
  conversations,
  hasMore,
  isCollapsed,
  isLoadingMore,
  onCloseMobile,
  onCreateConversation,
  onDeleteConversation,
  onLoadMore,
  onSelectConversation,
  onToggleCollapse,
  showMobileClose,
  userEmail,
}: ChatSidebarProps) {
  return (
    <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          "flex shrink-0 items-center",
          isCollapsed ? "justify-center" : "justify-between gap-3"
        )}
      >
        <AnimatePresence initial={false} mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="sidebar-brand"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="min-w-0 flex-1"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-[#eaded8] bg-white/90 px-3 py-2 text-xs uppercase tracking-[0.2em] text-[#b18479] shadow-sm">
                <Sparkles className="size-3.5" />
                Rag Workspace
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          {showMobileClose ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCloseMobile}
              className="h-10 w-10 rounded-2xl border-[#eaded8] bg-white/84 p-0 text-[#b18479] hover:bg-white md:hidden"
            >
              <X className="size-4" />
            </Button>
          ) : null}

          {showMobileClose ? null : (
            <Button
              type="button"
              variant="outline"
              onClick={onToggleCollapse}
              className="h-10 w-10 rounded-2xl border-[#eaded8] bg-white/84 p-0 text-[#b18479] hover:bg-white"
            >
              {isCollapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      <ConversationList
        activeConversationId={activeConversationId}
        conversations={conversations}
        hasMore={hasMore}
        isCollapsed={isCollapsed}
        isLoadingMore={isLoadingMore}
        onCreateConversation={onCreateConversation}
        onDeleteConversation={onDeleteConversation}
        onLoadMore={onLoadMore}
        onSelectConversation={onSelectConversation}
      />

      <UserInfo isCollapsed={isCollapsed} userEmail={userEmail} />
    </div>
  );
}
