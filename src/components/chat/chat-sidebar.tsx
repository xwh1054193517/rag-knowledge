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
  conversationTotal: number;
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
  conversationTotal,
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
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ui-border)] bg-[color:rgba(255,255,255,0.06)] px-3 py-2 text-xs uppercase tracking-[0.2em] text-[var(--ui-accent)] shadow-sm dark:bg-[var(--ui-surface)]">
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
              className="h-10 w-10 rounded-2xl border-[var(--ui-border)] bg-[color:rgba(255,255,255,0.06)] p-0 text-[var(--ui-accent)] hover:bg-[var(--ui-surface)] md:hidden dark:bg-[var(--ui-surface)]"
            >
              <X className="size-4" />
            </Button>
          ) : null}

          {showMobileClose ? null : (
            <Button
              type="button"
              variant="outline"
              onClick={onToggleCollapse}
              className="h-10 w-10 rounded-2xl border-[var(--ui-border)] bg-[color:rgba(255,255,255,0.06)] p-0 text-[var(--ui-accent)] hover:bg-[var(--ui-surface)] dark:bg-[var(--ui-surface)]"
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
        conversationTotal={conversationTotal}
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
