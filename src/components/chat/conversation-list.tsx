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
 * 会话列表管理组件，负责新建、选择、删除和自动加载更多会话。
 */
export default function ConversationList({
  activeConversationId,
  conversations,
  hasMore,
  isCollapsed,
  isLoadingMore,
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

    const shouldLoadMore =
      scrollElement.scrollHeight <= scrollElement.clientHeight + 24;

    if (shouldLoadMore) {
      onLoadMore();
    }
  }, [conversations, hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const scrollElement = scrollContainerRef.current;

    if (!scrollElement) {
      return;
    }

    const isCurrentlyAtBottom =
      scrollElement.scrollHeight -
        scrollElement.scrollTop -
        scrollElement.clientHeight <
      8;

    setIsAtBottom(isCurrentlyAtBottom);
  }, [conversations, isLoadingMore]);

  /**
   * 在滚动接近底部时自动加载更多会话。
   */
  function handleConversationScroll(
    event: UIEvent<HTMLDivElement, globalThis.UIEvent>
  ) {
    const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 80;
    const isCurrentBottom = scrollHeight - scrollTop - clientHeight < 8;

    setIsAtBottom(isCurrentBottom);

    if (!hasMore || isLoadingMore) {
      return;
    }

    if (isNearBottom) {
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
   * 确认删除当前待删除会话。
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
          "relative h-12 overflow-hidden rounded-2xl border border-[#e8ddd8] bg-[linear-gradient(135deg,#f7efea,#f1e5de)] text-[#7a625a] shadow-[0_10px_24px_rgba(179,147,136,0.14)] hover:bg-[linear-gradient(135deg,#faf4ef,#f4e9e2)]",
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
          "mb-3 mt-6 flex items-center text-xs uppercase tracking-[0.24em] text-[#b39d95]",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        {isCollapsed ? null : <span>Conversations</span>}
        {!isCollapsed ? <span>{conversations.length}</span> : null}
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
                <p className="px-1 text-sm font-medium text-[#9a837a]">
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
                        "group rounded-3xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9b9ae] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fcf7f4]",
                        isActive
                          ? "border-[#eaded8] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,242,238,0.92))] shadow-[0_16px_36px_rgba(195,162,149,0.14)]"
                          : "border-transparent bg-white/52 hover:border-[#f0e5df] hover:bg-white/76",
                        isCollapsed
                          ? "mx-auto flex h-12 w-12 items-center justify-center p-0"
                          : "p-3 text-left"
                      )}
                    >
                      {isCollapsed ? (
                        <MessagesSquare
                          className={cn(
                            "size-4 shrink-0",
                            isActive ? "text-[#9b6f63]" : "text-[#b18479]"
                          )}
                        />
                      ) : (
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "mt-0.5 rounded-2xl p-2",
                              isActive ? "bg-[#f7ede8]" : "bg-[#fdf9f6]"
                            )}
                          >
                            <MessageSquare
                              className={cn(
                                "size-4",
                                isActive ? "text-[#9b6f63]" : "text-[#b18479]"
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
                                      ? "text-[#5f4c45]"
                                      : "text-[#6f5c55]"
                                  )}
                                >
                                  {conversation.title}
                                </p>
                                <p className="mt-1 truncate text-xs text-[#a28a82]">
                                  {conversation.preview}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={(event) =>
                                  handleAskDelete(event, conversation.id)
                                }
                                className="rounded-xl p-2 text-[#c3aba3] opacity-0 transition group-hover:opacity-100 hover:bg-[#fdf5f1] hover:text-[#c37c72]"
                                aria-label="删除对话"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                            <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-[#baa49b]">
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
            <div className="flex items-center justify-center py-3 text-[#b39d95]">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : null}
        </div>

        {isAtBottom ? null : (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[rgba(250,243,238,0.96)] via-[rgba(250,243,238,0.72)] to-transparent" />
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
        <DialogContent className="border-[#eaded8] bg-[rgba(255,250,247,0.98)] text-[#5f4c45] shadow-[0_24px_60px_rgba(179,147,136,0.18)]">
          <DialogHeader>
            <DialogTitle>删除会话？</DialogTitle>
            <DialogDescription className="text-[#8f776f]">
              删除后将无法恢复，这条会话中的消息记录也会一并移除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelDelete}
              className="border-[#eaded8] bg-white/80 text-[#8f776f] hover:bg-[#fbf4ef]"
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              className="border border-[#e9cfc5] bg-[linear-gradient(135deg,#f7efea,#f1e5de)] text-[#7a625a] shadow-[0_10px_24px_rgba(179,147,136,0.14)] hover:bg-[linear-gradient(135deg,#faf4ef,#f4e9e2)]"
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
