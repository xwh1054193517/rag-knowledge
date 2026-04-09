"use client";

import { useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
  MessagesSquare,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";

import type { ConversationItem } from "@/components/chat/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  activeConversationId: string;
  conversations: ConversationItem[];
  conversationTotal: number;
  hasMore: boolean;
  isCollapsed: boolean;
  isLoadingMore: boolean;
  onCreateConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onLoadMore: () => void;
  onSelectConversation: (conversationId: string) => void;
}

const groupOrder: Record<ConversationItem["dateGroup"], number> = {
  今天: 0,
  昨天: 1,
  更早: 2,
};

/**
 * 会话列表管理组件。
 */
export default function ConversationList({
  activeConversationId,
  conversations,
  hasMore,
  isCollapsed,
  isLoadingMore,
  conversationTotal,
  onCreateConversation,
  onDeleteConversation,
  onLoadMore,
  onSelectConversation,
}: ConversationListProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const groupedConversations = useMemo(() => {
    const sortedConversations = [...conversations].sort((left, right) => {
      if (groupOrder[left.dateGroup] !== groupOrder[right.dateGroup]) {
        return groupOrder[left.dateGroup] - groupOrder[right.dateGroup];
      }

      return left.sortOrder - right.sortOrder;
    });

    return sortedConversations.reduce<
      Array<{
        dateGroup: ConversationItem["dateGroup"];
        items: ConversationItem[];
      }>
    >((groups, conversation) => {
      const existingGroup = groups.find(
        (group) => group.dateGroup === conversation.dateGroup
      );

      if (existingGroup) {
        existingGroup.items.push(conversation);
        return groups;
      }

      groups.push({
        dateGroup: conversation.dateGroup,
        items: [conversation],
      });

      return groups;
    }, []);
  }, [conversations]);

  useEffect(() => {
    const scrollElement = scrollContainerRef.current;

    if (!scrollElement || !hasMore || isLoadingMore) {
      return;
    }

    if (scrollElement.scrollHeight <= scrollElement.clientHeight + 24) {
      onLoadMore();
    }
  }, [conversations, hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const scrollElement = scrollContainerRef.current;

    if (!scrollElement) {
      return;
    }

    setIsAtBottom(
      scrollElement.scrollHeight -
        scrollElement.scrollTop -
        scrollElement.clientHeight <
        8
    );
  }, [conversations, isLoadingMore]);

  /**
   * 处理滚动加载更多。
   */
  function handleConversationScroll(event: UIEvent<HTMLDivElement>) {
    const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 80;
    const isCurrentBottom = scrollHeight - scrollTop - clientHeight < 8;

    setIsAtBottom(isCurrentBottom);

    if (isNearBottom && hasMore && !isLoadingMore) {
      onLoadMore();
    }
  }

  /**
   * 打开删除确认弹窗。
   */
  function handleAskDelete(
    event: React.MouseEvent<HTMLButtonElement>,
    conversationId: string
  ) {
    event.stopPropagation();
    setPendingDeleteId(conversationId);
  }

  /**
   * 确认删除当前会话。
   */
  function handleConfirmDelete() {
    if (!pendingDeleteId) {
      return;
    }

    onDeleteConversation(pendingDeleteId);
    setPendingDeleteId(null);
  }

  /**
   * 关闭删除确认弹窗。
   */
  function handleCancelDelete() {
    setPendingDeleteId(null);
  }

  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-hidden">
      <Button
        type="button"
        onClick={onCreateConversation}
        className={cn(
          "relative h-12 overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[linear-gradient(135deg,var(--ui-surface),var(--ui-surface-muted))] text-[var(--ui-accent-strong)] shadow-[0_10px_24px_var(--ui-shadow)] hover:bg-[linear-gradient(135deg,var(--ui-bg-soft),var(--ui-surface-strong))]",
          isCollapsed
            ? "w-12 self-center px-0"
            : "w-full justify-start gap-2 px-4"
        )}
      >
        <Plus className="size-4 shrink-0" />
        <AnimatePresence initial={false} mode="wait">
          {!isCollapsed ? (
            <motion.span
              key="new-chat-label"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.14 }}
            >
              新增对话
            </motion.span>
          ) : null}
        </AnimatePresence>
      </Button>

      <div
        className={cn(
          "mb-3 mt-6 flex items-center text-xs uppercase tracking-[0.24em] text-[var(--ui-text-faint)]",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        {isCollapsed ? null : <span>Conversations</span>}
        {!isCollapsed ? <span>{conversationTotal}</span> : null}
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollContainerRef}
          style={
            isCollapsed
              ? {
                  scrollbarGutter: "auto",
                  scrollbarWidth: "none",
                }
              : undefined
          }
          className={cn(
            "chat-scrollbar flex h-full min-h-0 flex-col overflow-y-auto pr-0.5",
            isCollapsed
              ? "items-center gap-3 overflow-x-hidden pr-0 [&::-webkit-scrollbar]:hidden"
              : "gap-4"
          )}
          onScroll={handleConversationScroll}
        >
          {groupedConversations.map((group) => (
            <div
              key={group.dateGroup}
              className={cn("space-y-2", isCollapsed && "w-full")}
            >
              {!isCollapsed ? (
                <p className="px-1 text-sm font-medium text-[var(--ui-text-faint)]">
                  {group.dateGroup}
                </p>
              ) : null}

              <div
                className={cn(
                  "space-y-2",
                  isCollapsed && "flex flex-col items-center"
                )}
              >
                {group.items.map((conversation) => {
                  const isActive = conversation.id === activeConversationId;

                  return (
                    <div
                      key={conversation.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectConversation(conversation.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelectConversation(conversation.id);
                        }
                      }}
                      className={cn(
                        "group rounded-3xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-bg)]",
                        isActive
                          ? "border-[var(--ui-border)] bg-[linear-gradient(180deg,var(--ui-surface),color-mix(in_srgb,var(--ui-surface-muted)_78%,transparent))] shadow-[0_16px_36px_var(--ui-shadow)]"
                          : "border-transparent bg-[color:rgba(255,255,255,0.04)] hover:border-[var(--ui-border-soft)] hover:bg-[color:rgba(255,255,255,0.08)] dark:bg-[var(--ui-surface)]",
                        isCollapsed
                          ? "mx-auto flex h-12 w-12 items-center justify-center p-0"
                          : "p-3 text-left"
                      )}
                    >
                      {isCollapsed ? (
                        <MessagesSquare
                          className={cn(
                            "size-4 shrink-0",
                            isActive
                              ? "text-[var(--ui-accent-strong)]"
                              : "text-[var(--ui-accent)]"
                          )}
                        />
                      ) : (
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "mt-0.5 rounded-2xl p-2",
                              isActive
                                ? "bg-[var(--ui-surface-muted)]"
                                : "bg-[color:rgba(255,255,255,0.08)] dark:bg-[var(--ui-surface)]"
                            )}
                          >
                            <MessageSquare
                              className={cn(
                                "size-4",
                                isActive
                                  ? "text-[var(--ui-accent-strong)]"
                                  : "text-[var(--ui-accent)]"
                              )}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p
                                  className={cn(
                                    "truncate text-sm font-medium",
                                    isActive
                                      ? "text-[var(--ui-text)]"
                                      : "text-[var(--ui-text-soft)]"
                                  )}
                                >
                                  {conversation.title}
                                </p>
                                <p className="mt-1 truncate text-xs text-[var(--ui-text-faint)]">
                                  {conversation.preview}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={(event) =>
                                  handleAskDelete(event, conversation.id)
                                }
                                className="rounded-xl p-2 text-[var(--ui-text-faint)] opacity-0 transition group-hover:opacity-100 hover:bg-[var(--ui-surface-muted)] hover:text-[var(--ui-accent-strong)]"
                                aria-label="删除对话"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                            <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-[var(--ui-text-faint)]">
                              {conversation.updatedAt}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {isLoadingMore ? (
            <div className="flex items-center justify-center py-3 text-[var(--ui-text-faint)]">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : null}
        </div>

        {isAtBottom ? null : (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--ui-overlay-solid)] via-[var(--ui-overlay-soft)] to-transparent" />
        )}
      </div>

      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelDelete();
          }
        }}
      >
        <DialogContent className="border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text)] shadow-[0_24px_60px_var(--ui-shadow)]">
          <DialogHeader>
            <DialogTitle>删除会话？</DialogTitle>
            <DialogDescription className="text-[var(--ui-text-soft)]">
              删除后将无法恢复，这条会话中的消息记录也会一并移除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelDelete}
              className="border-[var(--ui-border)] bg-[color:rgba(255,255,255,0.06)] text-[var(--ui-text-soft)] hover:bg-[var(--ui-surface-muted)] dark:bg-[var(--ui-surface)]"
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              className="border border-[var(--ui-border)] bg-[linear-gradient(135deg,var(--ui-surface),var(--ui-surface-muted))] text-[var(--ui-accent-strong)] shadow-[0_10px_24px_var(--ui-shadow)] hover:bg-[linear-gradient(135deg,var(--ui-bg-soft),var(--ui-surface-strong))]"
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
