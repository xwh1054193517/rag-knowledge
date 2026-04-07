"use client";

import { useEffect, useState, type RefObject, type UIEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  ChevronDown,
  Database,
  Globe,
  Sparkles,
  UserRound,
} from "lucide-react";

import type { PreviewMessage } from "@/components/chat/types";
import { cn } from "@/lib/utils";

interface ChatHistoryProps {
  messages: PreviewMessage[];
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  scrollEndRef: RefObject<HTMLDivElement | null>;
}

/**
 * 聊天记录组件，负责展示消息列表、底部渐隐和回到底部按钮。
 */
export default function ChatHistory({
  messages,
  scrollContainerRef,
  scrollEndRef,
}: ChatHistoryProps) {
  const [showTopOverlay, setShowTopOverlay] = useState(false);
  const [showBottomOverlay, setShowBottomOverlay] = useState(false);

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

    setShowTopOverlay(!isAtTop);
    setShowBottomOverlay(!isAtBottom);
  }, [messages, scrollContainerRef]);

  /**
   * 根据滚动位置更新底部渐隐和回到底部按钮的显隐状态。
   */
  function handleScroll(event: UIEvent<HTMLDivElement, globalThis.UIEvent>) {
    const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;
    const isAtTop = scrollTop < 24;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 24;

    setShowTopOverlay(!isAtTop);
    setShowBottomOverlay(!isAtBottom);
  }

  /**
   * 平滑滚动到消息底部。
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
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2rem] border border-[#f0e5df] bg-white/74 p-5 shadow-[0_18px_60px_rgba(195,162,149,0.08)] backdrop-blur-md"
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl bg-[#fbf3ef] p-3 text-[#b18479]">
                <Database className="size-5" />
              </div>
              <div className="rounded-2xl bg-[#f8eeea] p-3 text-[#c19d8f]">
                <Globe className="size-5" />
              </div>
              <div className="rounded-2xl bg-[#f7efeb] p-3 text-[#a98b86]">
                <Bot className="size-5" />
              </div>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-[#5a4741]">
              聊天区域 UI 已准备完成
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#8a746c]">
              右侧区域先以 ChatGPT
              风格的浅色工作台展示消息流、状态提示和输入区。后续只需要把会话列表、
              消息 API 和 RAG 检索结果接进来，就可以逐步变成真实聊天界面。
            </p>
          </motion.div>

          {messages.map((message, index) => {
            const isAssistant = message.role === "assistant";

            return (
              <motion.div
                key={`${message.id}-${index}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className={cn(
                  "flex items-end gap-3",
                  isAssistant ? "justify-start" : "justify-end"
                )}
              >
                {isAssistant ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#eaded8] bg-[#fbf3ef] text-[#b18479] shadow-sm">
                    <Sparkles className="size-4" />
                  </div>
                ) : null}

                <div
                  className={cn(
                    "relative max-w-3xl rounded-[1.65rem] border px-4 py-3 text-sm leading-7 shadow-sm",
                    isAssistant
                      ? "rounded-bl-md border-[#f0e5df] bg-white/84 text-[#6f5c55]"
                      : "rounded-br-md border-[#eaded8] bg-[linear-gradient(135deg,rgba(247,239,234,0.94),rgba(241,229,222,0.94))] text-[#7a625a]"
                  )}
                >
                  <p>{message.content}</p>
                </div>

                {isAssistant ? null : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#eaded8] bg-[linear-gradient(135deg,#f7efea,#f1e5de)] text-[#8c6a60] shadow-sm">
                    <UserRound className="size-4" />
                  </div>
                )}
              </motion.div>
            );
          })}

          <div ref={scrollEndRef} className="h-px w-full shrink-0" />
        </div>
      </div>

      <AnimatePresence>
        {showTopOverlay ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-[linear-gradient(180deg,rgba(250,245,242,0.98),rgba(250,245,242,0.92)_32%,rgba(250,245,242,0))]"
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showBottomOverlay ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-[linear-gradient(180deg,rgba(250,245,242,0),rgba(250,245,242,0.92)_68%,rgba(250,245,242,0.98))]"
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
            <div className="rounded-full bg-[radial-gradient(circle,rgba(255,250,247,0.96),rgba(255,250,247,0.58)_58%,transparent_78%)] p-2.5">
              <button
                type="button"
                onClick={handleScrollToBottom}
                className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#eaded8] bg-white/92 text-[#8c6a60] shadow-[0_10px_24px_rgba(179,147,136,0.18)] transition hover:bg-[#fffaf7]"
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
