"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  X,
} from "lucide-react";

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
          "shrink-0",
          isCollapsed ? "flex flex-col items-center gap-2" : "space-y-3"
        )}
      >
        <div
          className={cn(
            "flex items-center",
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
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--ui-border)] bg-[color:rgba(255,255,255,0.08)] px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--ui-accent)] shadow-sm backdrop-blur-sm dark:bg-[var(--ui-surface)]">
                  <Sparkles className="size-3.5 shrink-0" />
                  <span className="truncate whitespace-nowrap">
                    Rag Workspace
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="sidebar-brand-collapsed"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.16 }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--ui-border)] bg-[color:rgba(255,255,255,0.08)] text-[var(--ui-accent)] shadow-sm dark:bg-[var(--ui-surface)]">
                  <Sparkles className="size-4" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex shrink-0 items-center gap-2">
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

        <Button
          type="button"
          variant="outline"
          asChild
          className={cn(
            "rounded-2xl border-[var(--ui-border)] bg-[color:rgba(255,255,255,0.06)] text-[var(--ui-accent)] shadow-sm hover:bg-[var(--ui-surface)] dark:bg-[var(--ui-surface)]",
            isCollapsed
              ? "h-10 w-10 p-0"
              : "h-11 w-full justify-start px-4 text-sm font-medium"
          )}
        >
          <Link href="/knowledge" aria-label="Open knowledge base">
            <BookOpen className="size-4 shrink-0" />
            {isCollapsed ? null : <span className="ml-2">Knowledge Base</span>}
          </Link>
        </Button>
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
