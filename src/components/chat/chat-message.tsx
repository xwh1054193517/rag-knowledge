"use client";

import {
  useEffect,
  useMemo,
  useState,
  type RefObject,
  type UIEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { UIMessage } from "ai";

import MessageBubble from "@/components/chat/messageBubble";

interface ChatMessageProps {
  editingMessageId: string | null;
  editingValue: string;
  failureConversationId: string | null;
  isActionDisabled: boolean;
  isLoadingConversation: boolean;
  isThinking: boolean;
  lastUserMessageId: string | null;
  messages: UIMessage[];
  onEditCancel: () => void;
  onEditChange: (value: string) => void;
  onEditSend: () => void;
  onRetryLastUser: () => void;
  onStartEdit: () => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  scrollEndRef: RefObject<HTMLDivElement | null>;
}

/**
 * 聊天记录区域。
 */
export default function ChatMessage({
  editingMessageId,
  editingValue,
  failureConversationId,
  isActionDisabled,
  isLoadingConversation,
  isThinking,
  lastUserMessageId,
  messages,
  onEditCancel,
  onEditChange,
  onEditSend,
  onRetryLastUser,
  onStartEdit,
  scrollContainerRef,
  scrollEndRef,
}: ChatMessageProps) {
  const [showTopOverlay, setShowTopOverlay] = useState(false);
  const [showBottomOverlay, setShowBottomOverlay] = useState(false);
  const messageStreamSignature = useMemo(
    () =>
      messages
        .map(
          (message) =>
            `${message.id}:${message.parts
              .map((part) => {
                if (part.type === "text" || part.type === "reasoning") {
                  return `${part.type}-${part.text.length}`;
                }

                return part.type;
              })
              .join("|")}`
        )
        .join(";"),
    [messages]
  );

  /**
   * 同步顶部和底部遮罩状态，避免重复 setState。
   */
  function syncScrollState(nextIsAtTop: boolean, nextIsAtBottom: boolean) {
    setShowTopOverlay((current) =>
      current === !nextIsAtTop ? current : !nextIsAtTop
    );
    setShowBottomOverlay((current) =>
      current === !nextIsAtBottom ? current : !nextIsAtBottom
    );
  }

  useEffect(() => {
    const scrollElement = scrollContainerRef.current;

    if (!scrollElement) {
      return;
    }

    const isAtTop = scrollElement.scrollTop < 24;
    const isAtBottom =
      scrollElement.scrollHeight -
        scrollElement.scrollTop -
        scrollElement.clientHeight <
      24;

    syncScrollState(isAtTop, isAtBottom);
  }, [isThinking, messageStreamSignature, scrollContainerRef]);

  useEffect(() => {
    const scrollElement = scrollContainerRef.current;
    const scrollEndElement = scrollEndRef.current;

    if (!scrollElement || !scrollEndElement) {
      return;
    }

    const isNearBottom =
      scrollElement.scrollHeight -
        scrollElement.scrollTop -
        scrollElement.clientHeight <
      120;

    if (isNearBottom || isThinking) {
      scrollEndElement.scrollIntoView({
        block: "end",
        behavior: "auto",
      });
    }
  }, [isThinking, messageStreamSignature, scrollContainerRef, scrollEndRef]);

  /**
   * 处理消息区滚动状态。
   */
  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;
    const isAtTop = scrollTop < 24;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 24;

    syncScrollState(isAtTop, isAtBottom);
  }

  /**
   * 平滑滚动到底部。
   */
  function handleScrollToBottom() {
    scrollEndRef.current?.scrollIntoView({
      block: "end",
      behavior: "smooth",
    });
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <div
        ref={scrollContainerRef}
        className="chat-scrollbar h-full min-h-0 overflow-y-auto"
        onScroll={handleScroll}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-1 py-1 sm:px-2">
          {messages.map((message) => {
            const isLastUserMessage = message.id === lastUserMessageId;

            return (
              <MessageBubble
                key={message.id}
                message={message}
                canEdit={isLastUserMessage}
                canRetry={isLastUserMessage}
                editingValue={editingValue}
                isActionDisabled={isActionDisabled}
                isEditing={editingMessageId === message.id}
                onEditCancel={onEditCancel}
                onEditChange={onEditChange}
                onEditSend={onEditSend}
                onRetry={onRetryLastUser}
                onStartEdit={onStartEdit}
              />
            );
          })}

          {isThinking ? <MessageBubble isThinking /> : null}
          {failureConversationId ? <MessageBubble isFailure /> : null}

          <div ref={scrollEndRef} className="h-px w-full shrink-0" />
        </div>
      </div>

      <AnimatePresence>
        {isLoadingConversation ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ui-bg)_72%,transparent),color-mix(in_srgb,var(--ui-bg)_92%,transparent))] backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="w-full max-w-xl rounded-[1.6rem] border border-[var(--ui-border-soft)] bg-[color:rgba(255,255,255,0.38)] px-5 py-5 shadow-[0_16px_42px_var(--ui-shadow)] dark:bg-[color:rgba(255,255,255,0.03)]"
            >
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--ui-text-faint)]">
                <span>Loading Conversation</span>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((index) => (
                    <motion.span
                      key={index}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{
                        duration: 0.9,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: index * 0.12,
                      }}
                      className="block h-1.5 w-1.5 rounded-full bg-[var(--ui-accent-strong)]"
                    />
                  ))}
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {["w-[82%]", "w-[68%]", "w-[74%]"].map((widthClassName) => (
                  <motion.div
                    key={widthClassName}
                    animate={{ opacity: [0.45, 0.8, 0.45] }}
                    transition={{
                      duration: 1.2,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                    className={`h-4 rounded-full bg-[var(--ui-surface-muted)] ${widthClassName}`}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showTopOverlay ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-[linear-gradient(180deg,var(--ui-overlay-solid),var(--ui-overlay-soft)_32%,transparent)]"
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showBottomOverlay ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-[linear-gradient(180deg,transparent,var(--ui-overlay-soft)_68%,var(--ui-overlay-solid))]"
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showBottomOverlay ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2"
          >
            <div className="rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--ui-surface)_96%,transparent),color-mix(in_srgb,var(--ui-surface)_58%,transparent)_58%,transparent_78%)] p-2.5">
              <button
                type="button"
                onClick={handleScrollToBottom}
                className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-[var(--ui-border)] bg-[color:rgba(255,255,255,0.06)] text-[var(--ui-accent-strong)] shadow-[0_10px_24px_var(--ui-shadow)] transition hover:bg-[var(--ui-surface)] dark:bg-[var(--ui-surface)]"
                aria-label="回到底部"
              >
                <ChevronDown className="size-4" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
